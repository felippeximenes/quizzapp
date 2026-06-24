"""
Run locally without Docker/SAM to test the Lambda handler directly.
Requires AWS credentials configured (aws configure or environment variables).

Usage:
  python local_invoke.py
  python local_invoke.py security hard
"""
import json
import os
import sys

os.environ.setdefault("BEDROCK_REGION", "us-east-1")
os.environ.setdefault("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

from handler import lambda_handler  # noqa: E402

domain = sys.argv[1] if len(sys.argv) > 1 else "technology"
difficulty = sys.argv[2] if len(sys.argv) > 2 else "medium"

event = {"body": json.dumps({"domain": domain, "difficulty": difficulty})}
result = lambda_handler(event, None)

print(f"Status: {result['statusCode']}\n")
print(json.dumps(json.loads(result["body"]), indent=2, ensure_ascii=False))
