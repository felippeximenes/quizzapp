import json
import os

import boto3
from botocore.exceptions import ClientError

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}

REQUIRED_FIELDS = ["question", "options", "correct_answer", "selected_answer"]


def make_response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False),
    }


def build_prompt(
    question: str,
    options: list[str],
    correct_answer: str,
    selected_answer: str,
    domain: str,
    explanation: str,
) -> str:
    is_correct = selected_answer.upper() == correct_answer.upper()
    result_label = "CORRECT ✓" if is_correct else "INCORRECT ✗"

    return f"""You are an encouraging AWS Cloud Practitioner (CLF-C02) study coach.
A student just answered the following exam question.

Question: {question}
Options: {json.dumps(options, ensure_ascii=False)}
Correct answer: {correct_answer}
Student selected: {selected_answer}
Result: {result_label}
Domain: {domain}
Base explanation: {explanation}

Your task:
- If correct: celebrate briefly, reinforce WHY the answer is right, and deepen understanding.
- If incorrect: be gentle, explain the mistake clearly, and make the correct concept memorable.
- Always add 3 actionable study tips tailored to this specific topic.

Respond ONLY with a JSON object — no markdown fences, no extra text:
{{
  "correct": {str(is_correct).lower()},
  "feedback": "2-3 sentences: what the question tests, why the answer is correct/incorrect, key concept to lock in",
  "study_tips": [
    "specific actionable tip directly related to this topic",
    "exact AWS documentation page, whitepaper, or service to review",
    "memory trick, analogy, or mnemonic to remember this concept"
  ],
  "aws_docs_topic": "the most relevant AWS documentation topic or service name to review next"
}}"""


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        body: dict = json.loads(event.get("body") or "{}")

        missing = [f for f in REQUIRED_FIELDS if f not in body]
        if missing:
            return make_response(400, {"error": f"Missing required fields: {missing}"})

        bedrock_response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": (
                "You are a motivating AWS certification coach. "
                "Always respond with valid JSON only — no markdown, no commentary."
            )}],
            messages=[{"role": "user", "content": [{"text": build_prompt(
                question=body["question"],
                options=body["options"],
                correct_answer=body["correct_answer"],
                selected_answer=body["selected_answer"],
                domain=body.get("domain", ""),
                explanation=body.get("explanation", ""),
            )}]}],
            inferenceConfig={"maxTokens": 1024, "temperature": 0.7},
        )

        raw_text: str = bedrock_response["output"]["message"]["content"][0]["text"]
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()
        feedback_data: dict = json.loads(clean)

        return make_response(200, feedback_data)

    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        return make_response(502, {"error": f"Bedrock error: {code}"})
    except (json.JSONDecodeError, KeyError, IndexError):
        return make_response(502, {"error": "Model returned an unexpected response format"})
    except Exception as exc:  # noqa: BLE001
        return make_response(500, {"error": str(exc)})
