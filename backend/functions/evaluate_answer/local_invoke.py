"""
Run locally without Docker/SAM to test the Lambda handler directly.
Requires AWS credentials configured (aws configure or environment variables).

Usage:
  python local_invoke.py
"""
import json
import os

os.environ.setdefault("BEDROCK_REGION", "us-east-1")
os.environ.setdefault("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

from handler import lambda_handler  # noqa: E402

event = {
    "body": json.dumps({
        "question": "Which AWS service provides a managed relational database?",
        "options": [
            "A) Amazon DynamoDB",
            "B) Amazon RDS",
            "C) Amazon S3",
            "D) Amazon ElastiCache",
        ],
        "correct_answer": "B",
        "selected_answer": "A",
        "domain": "technology",
        "explanation": "Amazon RDS is the managed relational database service. DynamoDB is NoSQL.",
    })
}

result = lambda_handler(event, None)

print(f"Status: {result['statusCode']}\n")
print(json.dumps(json.loads(result["body"]), indent=2, ensure_ascii=False))
