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
    return f"""You are an expert AWS certification instructor writing questions for the AWS Cloud Practitioner (CLF-C02) exam.

Generate ONE multiple-choice question for the following specifications:
- Domain: {DOMAINS[domain_key]}
- Difficulty: {difficulty} — {DIFFICULTY_GUIDE[difficulty]}

Rules:
1. The question must match the official CLF-C02 exam style and scope exactly
2. Provide exactly 4 answer options labeled A, B, C, D
3. Only one option is correct
4. Distractors must be plausible but clearly wrong to a well-prepared candidate
5. The explanation must reinforce the key AWS concept being tested

Respond ONLY with a JSON object — no markdown fences, no extra text:
{{
  "question": "the full question text",
  "options": ["A) option text", "B) option text", "C) option text", "D) option text"],
  "answer": "A",
  "explanation": "why the correct answer is right and why each wrong option is incorrect",
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
                "You are an AWS certification expert. "
                "Always respond with valid JSON only — no markdown, no commentary."
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
