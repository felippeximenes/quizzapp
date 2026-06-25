import json
import os

import boto3
from botocore.exceptions import ClientError

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-pro-v1:0")

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

DOMAIN_LABELS = {
    "cloud_concepts": "Conceitos de Nuvem",
    "security": "Segurança e Conformidade",
    "technology": "Tecnologia e Serviços Cloud",
    "billing": "Faturamento, Preços e Suporte",
}

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}


def make_response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False),
    }


def build_prompt(score: int, total: int, answers: list[dict]) -> str:
    domain_stats: dict[str, dict] = {}
    for a in answers:
        d = a.get("domain", "unknown")
        if d not in domain_stats:
            domain_stats[d] = {"correct": 0, "total": 0}
        domain_stats[d]["total"] += 1
        if a.get("correct"):
            domain_stats[d]["correct"] += 1

    stats_lines = []
    for domain, stats in domain_stats.items():
        label = DOMAIN_LABELS.get(domain, domain)
        pct = int(stats["correct"] / stats["total"] * 100) if stats["total"] else 0
        stats_lines.append(f"- {label}: {stats['correct']}/{stats['total']} ({pct}%)")

    stats_text = "\n".join(stats_lines)
    percentage = int(score / total * 100)

    return f"""Você é um coach especialista em certificações AWS analisando o desempenho de um estudante no simulado CLF-C02.

Resultado do simulado:
- Pontuação: {score}/{total} ({percentage}%)
- Desempenho por domínio:
{stats_text}

Sua tarefa:
1. Analise os pontos fracos com base nos domínios com menor aproveitamento
2. Seja encorajador e construtivo — o estudante está se dedicando
3. Forneça um plano de estudo prático e específico
4. Escreva tudo em português brasileiro, mantendo nomes de serviços AWS em inglês

Responda APENAS com um objeto JSON — sem markdown, sem texto extra:
{{
  "encouragement": "mensagem motivacional de 1-2 frases baseada no desempenho geral",
  "strong_areas": ["domínio que o estudante foi bem, se houver"],
  "weak_areas": ["domínio com pior desempenho e o que revisar"],
  "study_plan": [
    "ação concreta de estudo para o ponto mais fraco",
    "recurso específico da AWS (documentação, whitepaper, curso) para revisar",
    "dica de como abordar questões de cenário no exame"
  ],
  "next_step": "próximo passo concreto e motivador para o estudante"
}}"""


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        body: dict = json.loads(event.get("body") or "{}")
        score: int = body.get("score", 0)
        total: int = body.get("total", 10)
        answers: list = body.get("answers", [])

        if not answers:
            return make_response(400, {"error": "Campo 'answers' é obrigatório"})

        bedrock_response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": (
                "Você é um coach especialista em certificações AWS. "
                "Responda sempre com JSON válido apenas — sem markdown, sem comentários."
            )}],
            messages=[{"role": "user", "content": [{"text": build_prompt(score, total, answers)}]}],
            inferenceConfig={"maxTokens": 1024, "temperature": 0.7},
        )

        raw_text: str = bedrock_response["output"]["message"]["content"][0]["text"]
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()

        summary_data: dict = json.loads(clean)
        return make_response(200, summary_data)

    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        message = exc.response["Error"]["Message"]
        print(f"[Bedrock ClientError] {code}: {message}")
        return make_response(502, {"error": f"Bedrock error: {code}", "detail": message})
    except (json.JSONDecodeError, KeyError, IndexError):
        return make_response(502, {"error": "Modelo retornou formato inesperado"})
    except Exception as exc:  # noqa: BLE001
        return make_response(500, {"error": str(exc)})
