"""
RAG helper — busca contexto no Qdrant via REST API (sem dependências pesadas).
"""

import json
import os
import urllib.request

import boto3

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
QDRANT_URL = os.environ.get("QDRANT_URL", "").rstrip("/")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", "")
EMBED_MODEL = "amazon.titan-embed-text-v2:0"
TOP_K = 4

# Qdrant collection name per certification (index docs separately per cert)
COLLECTIONS: dict[str, str] = {
    "clf-c02": "clfc02_docs",
    "saa-c03": "saac03_docs",
    "dva-c02": "dvac02_docs",
}

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)


def _embed(text: str) -> list[float]:
    response = bedrock.invoke_model(
        modelId=EMBED_MODEL,
        body=json.dumps({"inputText": text, "dimensions": 1024}),
    )
    return json.loads(response["body"].read())["embedding"]


def _search_qdrant(vector: list[float], collection: str) -> list[str]:
    url = f"{QDRANT_URL}/collections/{collection}/points/search"
    payload = json.dumps({"vector": vector, "limit": TOP_K, "with_payload": True}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Api-Key": QDRANT_API_KEY,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read())
    return [r["payload"].get("text", "") for r in data.get("result", []) if r.get("payload")]


def get_context(domain: str, difficulty: str, cert_id: str = "clf-c02") -> str:
    if not QDRANT_URL or not QDRANT_API_KEY:
        return ""
    collection = COLLECTIONS.get(cert_id, "clfc02_docs")
    try:
        query = f"AWS {cert_id.upper()} {domain} exam question {difficulty} level certification"
        vector = _embed(query)
        chunks = _search_qdrant(vector, collection)
        if not chunks:
            return ""
        context = "\n\n---\n\n".join(chunks)
        return f"Trechos relevantes da documentação oficial AWS:\n\n{context}"
    except Exception as exc:
        print(f"[RAG] Erro ao buscar contexto ({cert_id}/{collection}): {exc}")
        return ""
