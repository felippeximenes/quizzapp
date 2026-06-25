"""
Script de indexação RAG para o QuizzApp CLF-C02.

Lê os PDFs em backend/scripts/docs/, divide em chunks,
gera embeddings via Amazon Titan e indexa no Qdrant Cloud.

Uso:
    cd backend
    py -3.11 scripts/index_documents.py
"""

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
COLLECTION_NAME = "clfc02_docs"
EMBED_MODEL = "amazon.titan-embed-text-v2:0"
EMBED_DIM = 1024
BEDROCK_REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")

CHUNK_SIZE = 1200    # caracteres por chunk
CHUNK_OVERLAP = 150  # sobreposição entre chunks
BATCH_SIZE = 50      # pontos por upload

DOCS_DIR = Path(__file__).parent / "docs"

# ── Clientes ─────────────────────────────────────────────────────────────────

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)
qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def embed(text: str) -> list[float]:
    """Gera embedding via Amazon Titan Embed Text v2."""
    response = bedrock.invoke_model(
        modelId=EMBED_MODEL,
        body=json.dumps({"inputText": text, "dimensions": EMBED_DIM}),
    )
    return json.loads(response["body"].read())["embedding"]


def chunk_text(text: str) -> list[str]:
    """Divide o texto em chunks com sobreposição."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def extract_pdf_text(path: Path) -> list[dict]:
    """Extrai texto de cada página de um PDF."""
    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = " ".join(text.split())  # normaliza espaços
        if len(text) > 100:
            pages.append({"text": text, "page": i + 1, "source": path.name})
    return pages


def setup_collection():
    """Cria a coleção no Qdrant se não existir."""
    existing = [c.name for c in qdrant.get_collections().collections]
    if COLLECTION_NAME in existing:
        print(f"Coleção '{COLLECTION_NAME}' já existe. Recriando...")
        qdrant.delete_collection(COLLECTION_NAME)

    qdrant.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
    )
    print(f"Coleção '{COLLECTION_NAME}' criada.")


def infer_domain(text: str) -> str:
    """Infere o domínio CLF-C02 com base em palavras-chave."""
    text_lower = text.lower()
    if any(w in text_lower for w in ["iam", "security", "encryption", "compliance", "shield", "waf", "macie"]):
        return "security"
    if any(w in text_lower for w in ["pricing", "billing", "cost", "free tier", "reserved", "savings plan", "budget"]):
        return "billing"
    if any(w in text_lower for w in ["s3", "ec2", "lambda", "rds", "vpc", "cloudfront", "dynamodb", "ecs", "eks"]):
        return "technology"
    return "cloud_concepts"


def index_pdfs():
    pdfs = list(DOCS_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"\nNenhum PDF encontrado em: {DOCS_DIR}")
        print("Baixe os documentos listados no README e coloque nessa pasta.")
        sys.exit(1)

    print(f"\nEncontrados {len(pdfs)} PDF(s): {[p.name for p in pdfs]}")

    all_points: list[PointStruct] = []

    for pdf_path in pdfs:
        print(f"\nProcessando: {pdf_path.name}")
        pages = extract_pdf_text(pdf_path)
        print(f"  {len(pages)} páginas extraídas")

        for page_data in pages:
            chunks = chunk_text(page_data["text"])
            for chunk in chunks:
                if len(chunk) < 80:
                    continue
                domain = infer_domain(chunk)
                vector = embed(chunk)
                all_points.append(PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "text": chunk,
                        "source": page_data["source"],
                        "page": page_data["page"],
                        "domain": domain,
                    },
                ))

        print(f"  Chunks gerados até agora: {len(all_points)}")

    print(f"\nTotal de chunks: {len(all_points)}")
    print("Enviando para o Qdrant em batches...")

    for i in range(0, len(all_points), BATCH_SIZE):
        batch = all_points[i:i + BATCH_SIZE]
        qdrant.upsert(collection_name=COLLECTION_NAME, points=batch)
        print(f"  Upload: {min(i + BATCH_SIZE, len(all_points))}/{len(all_points)}")

    print(f"\nIndexação concluída! {len(all_points)} chunks no Qdrant.")


if __name__ == "__main__":
    if not QDRANT_URL or not QDRANT_API_KEY:
        print("Erro: QDRANT_URL e QDRANT_API_KEY precisam estar definidos.")
        print("  Windows: $env:QDRANT_URL='...'; $env:QDRANT_API_KEY='...'")
        sys.exit(1)

    setup_collection()
    index_pdfs()
