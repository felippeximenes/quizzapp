import json
import os

import boto3
from botocore.exceptions import ClientError

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

# Official CLF-C02 domains with context for the model
DOMAINS: dict[str, str] = {
    "cloud_concepts": (
        "Cloud Concepts — benefits of cloud computing, cloud design principles "
        "(elasticity, high availability, fault tolerance), and cloud migration strategies"
    ),
    "security": (
        "Security and Compliance — AWS shared responsibility model, IAM users/roles/policies, "
        "encryption at rest and in transit, AWS Shield, WAF, Inspector, Macie, and compliance programs"
    ),
    "technology": (
        "Cloud Technology and Services — AWS global infrastructure (Regions, AZs, Edge Locations), "
        "compute (EC2, Lambda, ECS), storage (S3, EBS, EFS, Glacier), "
        "networking (VPC, CloudFront, Route 53), and databases (RDS, DynamoDB, Aurora)"
    ),
    "billing": (
        "Billing, Pricing and Support — pay-as-you-go model, Reserved and Spot Instances, "
        "AWS Free Tier, Cost Explorer, Budgets, Pricing Calculator, and AWS support plans"
    ),
}

DIFFICULTY_GUIDE: dict[str, str] = {
    "easy": "a straightforward definitional question for someone just starting AWS study",
    "medium": "a scenario-based question requiring understanding of when and why to use a service",
    "hard": (
        "a complex scenario requiring comparison between two or more services "
        "or understanding of architectural trade-offs"
    ),
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


def build_prompt(domain_key: str, difficulty: str) -> str:
    return f"""Você é um instrutor especialista em certificações AWS escrevendo questões para o exame AWS Cloud Practitioner (CLF-C02).

Gere UMA questão de múltipla escolha com as seguintes especificações:
- Domínio: {DOMAINS[domain_key]}
- Dificuldade: {difficulty} — {DIFFICULTY_GUIDE[difficulty]}

Regras:
1. A questão deve seguir exatamente o estilo e escopo do exame oficial CLF-C02
2. Escreva a questão e as alternativas em português brasileiro
3. Mantenha os nomes dos serviços AWS em inglês (ex: Amazon S3, AWS Lambda, Amazon EC2)
4. Forneça exatamente 4 alternativas rotuladas A, B, C, D
5. Apenas uma alternativa está correta
6. As alternativas erradas devem ser plausíveis, mas claramente incorretas para um candidato bem preparado
7. A explicação deve reforçar o conceito AWS sendo avaliado, também em português

Responda APENAS com um objeto JSON — sem markdown, sem texto extra:
{{
  "question": "texto completo da questão em português",
  "options": ["A) texto da alternativa", "B) texto da alternativa", "C) texto da alternativa", "D) texto da alternativa"],
  "answer": "A",
  "explanation": "por que a resposta correta está certa e por que cada alternativa errada está incorreta",
  "domain": "{domain_key}",
  "difficulty": "{difficulty}"
}}"""


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        body: dict = json.loads(event.get("body") or "{}")
        domain: str = body.get("domain", "technology")
        difficulty: str = body.get("difficulty", "medium")

        if domain not in DOMAINS:
            return make_response(400, {
                "error": f"Invalid domain '{domain}'. Valid options: {list(DOMAINS.keys())}"
            })
        if difficulty not in DIFFICULTY_GUIDE:
            return make_response(400, {
                "error": "Invalid difficulty. Must be one of: easy, medium, hard"
            })

        bedrock_response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": (
                "Você é um especialista em certificações AWS. "
                "Responda sempre com JSON válido apenas — sem markdown, sem comentários."
            )}],
            messages=[{"role": "user", "content": [{"text": build_prompt(domain, difficulty)}]}],
            inferenceConfig={"maxTokens": 1024, "temperature": 0.7},
        )

        raw_text: str = bedrock_response["output"]["message"]["content"][0]["text"]
        # Strip markdown fences if model wrapped the JSON
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()
        question_data: dict = json.loads(clean)

        return make_response(200, question_data)

    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        message = exc.response["Error"]["Message"]
        print(f"[Bedrock ClientError] {code}: {message}")
        return make_response(502, {"error": f"Bedrock error: {code}", "detail": message})
    except (json.JSONDecodeError, KeyError, IndexError):
        return make_response(502, {"error": "Model returned an unexpected response format"})
    except Exception as exc:  # noqa: BLE001
        return make_response(500, {"error": str(exc)})
