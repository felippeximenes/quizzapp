import json
import os

import boto3
from botocore.exceptions import ClientError
from rag import get_context

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-pro-v1:0")

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

# ── Per-certification domain descriptions ───────────────────────────────────

CERT_DOMAINS: dict[str, dict[str, str]] = {
    "clf-c02": {
        "cloud_concepts": (
            "Cloud Concepts — benefits of cloud computing, design principles "
            "(elasticity, high availability, fault tolerance), and cloud migration strategies"
        ),
        "security": (
            "Security and Compliance — shared responsibility model, IAM users/roles/policies, "
            "encryption, AWS Shield, WAF, Inspector, Macie, and compliance programs"
        ),
        "technology": (
            "Cloud Technology and Services — global infrastructure (Regions, AZs, Edge Locations), "
            "compute (EC2, Lambda, ECS), storage (S3, EBS, EFS, Glacier), "
            "networking (VPC, CloudFront, Route 53), databases (RDS, DynamoDB, Aurora)"
        ),
        "billing": (
            "Billing, Pricing and Support — pay-as-you-go, Reserved/Spot Instances, "
            "Free Tier, Cost Explorer, Budgets, Pricing Calculator, support plans"
        ),
    },
    "saa-c03": {
        "design_resilient": (
            "Design Resilient Architectures — multi-AZ and multi-Region strategies, "
            "Auto Scaling, Elastic Load Balancing, RDS Multi-AZ, S3 replication, Route 53 failover"
        ),
        "design_high_performing": (
            "Design High-Performing Architectures — ElastiCache, CloudFront, Aurora, "
            "SQS/SNS decoupling, DynamoDB DAX, S3 Transfer Acceleration, EBS volume types"
        ),
        "design_secure": (
            "Design Secure Architectures — VPC security groups/NACLs, IAM roles, "
            "KMS encryption, Secrets Manager, WAF, Shield, Cognito, S3 bucket policies"
        ),
        "design_cost_optimized": (
            "Design Cost-Optimized Architectures — Reserved vs Spot Instances, S3 storage classes, "
            "Compute Savings Plans, Right Sizing, Trusted Advisor, Cost Explorer"
        ),
    },
    "dva-c02": {
        "development_with_aws": (
            "Development with AWS Services — AWS SDKs, CLI, Lambda, API Gateway, DynamoDB, "
            "S3 event-driven patterns, SQS/SNS, Step Functions, AppSync"
        ),
        "security": (
            "Security — IAM policies for developers, Cognito User Pools, STS AssumeRole, "
            "KMS data encryption, Secrets Manager, Parameter Store, S3 pre-signed URLs"
        ),
        "deployment": (
            "Deployment — CodeCommit, CodeBuild, CodeDeploy, CodePipeline, "
            "SAM/CloudFormation, Elastic Beanstalk, ECS/ECR, blue/green and canary deployments"
        ),
        "troubleshooting": (
            "Troubleshooting and Optimization — CloudWatch Logs/Metrics/Alarms, "
            "X-Ray tracing, Lambda performance tuning, DynamoDB capacity modes, API Gateway caching"
        ),
    },
}

CERT_NAMES: dict[str, str] = {
    "clf-c02": "AWS Cloud Practitioner (CLF-C02)",
    "saa-c03": "AWS Solutions Architect Associate (SAA-C03)",
    "dva-c02": "AWS Developer Associate (DVA-C02)",
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


def build_prompt(domain_key: str, difficulty: str, cert_id: str, context: str = "") -> str:
    domain_desc = CERT_DOMAINS[cert_id][domain_key]
    cert_name = CERT_NAMES[cert_id]
    context_block = (
        f"\n\n{context}\n\nBaseie a questão nos trechos acima sempre que relevante."
        if context else ""
    )
    return f"""Você é um instrutor especialista em certificações AWS escrevendo questões para o exame {cert_name}.

Gere UMA questão de múltipla escolha com as seguintes especificações:
- Domínio: {domain_desc}
- Dificuldade: {difficulty} — {DIFFICULTY_GUIDE[difficulty]}

Regras:
1. A questão deve seguir exatamente o estilo e escopo do exame oficial {cert_name}
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
}}{context_block}"""


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        body: dict = json.loads(event.get("body") or "{}")
        domain: str = body.get("domain", "technology")
        difficulty: str = body.get("difficulty", "medium")
        cert_id: str = body.get("certification", "clf-c02").lower()

        if cert_id not in CERT_DOMAINS:
            cert_id = "clf-c02"

        domains_for_cert = CERT_DOMAINS[cert_id]
        if domain not in domains_for_cert:
            domain = next(iter(domains_for_cert))

        if difficulty not in DIFFICULTY_GUIDE:
            return make_response(400, {
                "error": "Invalid difficulty. Must be one of: easy, medium, hard"
            })

        context = get_context(domain, difficulty, cert_id)
        bedrock_response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": (
                "Você é um especialista em certificações AWS. "
                "Responda sempre com JSON válido apenas — sem markdown, sem comentários."
            )}],
            messages=[{"role": "user", "content": [{"text": build_prompt(domain, difficulty, cert_id, context)}]}],
            inferenceConfig={"maxTokens": 1024, "temperature": 0.7},
        )

        raw_text: str = bedrock_response["output"]["message"]["content"][0]["text"]
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
