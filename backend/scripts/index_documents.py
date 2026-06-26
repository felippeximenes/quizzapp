"""
Script de indexação RAG para o QuizzApp.

Lê os PDFs em backend/scripts/docs/<cert>/, divide em chunks,
gera embeddings via Amazon Titan e indexa no Qdrant Cloud.

Uso:
    cd backend
    py -3.11 scripts/index_documents.py --cert clf-c02
    py -3.11 scripts/index_documents.py --cert saa-c03
    py -3.11 scripts/index_documents.py --cert dva-c02
"""

import argparse
import json
import os
import sys
import uuid
from pathlib import Path

import boto3
from pypdf import PdfReader
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

# ── Configuração ─────────────────────────────────────────────────────────────

QDRANT_URL = os.environ.get("QDRANT_URL", "")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
EMBED_MODEL = "amazon.titan-embed-text-v2:0"
EMBED_DIM = 1024
BEDROCK_REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 150
BATCH_SIZE = 50

CERT_COLLECTIONS = {
    "clf-c02": "clfc02_docs",
    "saa-c03": "saac03_docs",
    "dva-c02": "dvac02_docs",
}

# Domain keywords per certification for automatic tagging
DOMAIN_KEYWORDS: dict[str, dict[str, list[str]]] = {
    "clf-c02": {
        "security":       ["iam", "security", "encryption", "compliance", "shield", "waf", "macie", "inspector"],
        "billing":        ["pricing", "billing", "cost", "free tier", "reserved", "savings plan", "budget"],
        "technology":     ["s3", "ec2", "lambda", "rds", "vpc", "cloudfront", "dynamodb", "ecs", "eks"],
        "cloud_concepts": [],
    },
    "saa-c03": {
        "design_resilient":         ["multi-az", "failover", "auto scaling", "load balancing", "replication", "disaster recovery"],
        "design_high_performing":   ["elasticache", "cloudfront", "aurora", "sqs", "sns", "dax", "performance"],
        "design_secure":            ["iam", "kms", "secrets manager", "waf", "shield", "cognito", "nacl", "security group"],
        "design_cost_optimized":    ["reserved", "spot", "savings plan", "s3 storage class", "right sizing", "cost explorer"],
    },
    "dva-c02": {
        "development_with_aws":    ["sdk", "api gateway", "lambda", "dynamodb", "s3", "step functions", "appsync"],
        "security":                ["iam", "cognito", "sts", "kms", "secrets manager", "pre-signed", "parameter store"],
        "deployment":              ["codepipeline", "codedeploy", "codebuild", "codecommit", "beanstalk", "sam", "cloudformation", "ecs", "ecr"],
        "troubleshooting":         ["cloudwatch", "x-ray", "xray", "logs", "metrics", "alarm", "tracing", "debug"],
    },
}

DOCS_BASE = Path(__file__).parent / "docs"
bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)


def embed(text: str) -> list[float]:
    response = bedrock.invoke_model(
        modelId=EMBED_MODEL,
        body=json.dumps({"inputText": text, "dimensions": EMBED_DIM}),
    )
    return json.loads(response["body"].read())["embedding"]


def chunk_text(text: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        chunk = text[start:start + CHUNK_SIZE].strip()
        if chunk:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def extract_pdf_text(path: Path) -> list[dict]:
    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = " ".join(text.split())
        if len(text) > 100:
            pages.append({"text": text, "page": i + 1, "source": path.name})
    return pages


def infer_domain(text: str, cert: str) -> str:
    text_lower = text.lower()
    keywords = DOMAIN_KEYWORDS.get(cert, {})
    for domain, words in keywords.items():
        if words and any(w in text_lower for w in words):
            return domain
    return next(iter(keywords), "general")


def setup_collection(qdrant: QdrantClient, collection: str):
    existing = [c.name for c in qdrant.get_collections().collections]
    if collection in existing:
        print(f"Coleção '{collection}' já existe. Recriando...")
        qdrant.delete_collection(collection)
    qdrant.create_collection(
        collection_name=collection,
        vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
    )
    print(f"Coleção '{collection}' criada.")


def index_pdfs(cert: str, collection: str, qdrant: QdrantClient):
    # Aceita PDFs da pasta raiz (retrocompatível) ou de docs/<cert>/
    cert_dir = DOCS_BASE / cert
    root_dir = DOCS_BASE

    pdfs = list(cert_dir.glob("*.pdf")) if cert_dir.exists() else []
    if not pdfs:
        pdfs = list(root_dir.glob("*.pdf"))

    if not pdfs:
        print(f"\nNenhum PDF encontrado.")
        print(f"Coloque os PDFs em: backend/scripts/docs/{cert}/")
        sys.exit(1)

    print(f"\nEncontrados {len(pdfs)} PDF(s): {[p.name for p in pdfs]}")
    all_points: list[PointStruct] = []

    for pdf_path in pdfs:
        print(f"\nProcessando: {pdf_path.name}")
        pages = extract_pdf_text(pdf_path)
        print(f"  {len(pages)} páginas extraídas")

        for page_data in pages:
            for chunk in chunk_text(page_data["text"]):
                if len(chunk) < 80:
                    continue
                domain = infer_domain(chunk, cert)
                vector = embed(chunk)
                all_points.append(PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "text": chunk,
                        "source": page_data["source"],
                        "page": page_data["page"],
                        "domain": domain,
                        "cert": cert,
                    },
                ))

        print(f"  Chunks gerados até agora: {len(all_points)}")

    print(f"\nTotal de chunks: {len(all_points)}")
    print("Enviando para o Qdrant em batches...")

    for i in range(0, len(all_points), BATCH_SIZE):
        batch = all_points[i:i + BATCH_SIZE]
        qdrant.upsert(collection_name=collection, points=batch)
        print(f"  Upload: {min(i + BATCH_SIZE, len(all_points))}/{len(all_points)}")

    print(f"\nIndexação concluída! {len(all_points)} chunks na coleção '{collection}'.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Indexa PDFs no Qdrant para RAG")
    parser.add_argument(
        "--cert",
        choices=list(CERT_COLLECTIONS.keys()),
        default="clf-c02",
        help="Certificação a indexar (padrão: clf-c02)",
    )
    args = parser.parse_args()

    if not QDRANT_URL or not QDRANT_API_KEY:
        print("Erro: QDRANT_URL e QDRANT_API_KEY precisam estar definidos.")
        print("  Windows: $env:QDRANT_URL='...'; $env:QDRANT_API_KEY='...'")
        sys.exit(1)

    cert = args.cert
    collection = CERT_COLLECTIONS[cert]
    print(f"\n=== Indexando: {cert.upper()} → coleção '{collection}' ===")

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    setup_collection(client, collection)
    index_pdfs(cert, collection, client)
