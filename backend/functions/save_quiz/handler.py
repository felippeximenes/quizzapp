import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from boto3.dynamodb.conditions import Attr  # noqa: F401

TABLE_NAME = os.environ["HISTORY_TABLE"]
SUBSCRIPTIONS_TABLE = os.environ.get("SUBSCRIPTIONS_TABLE", "")

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)
_sub_table = dynamodb.Table(SUBSCRIPTIONS_TABLE) if SUBSCRIPTIONS_TABLE else None


def _user_id(event: dict) -> str:
    return event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]


def _cors(body: dict, status: int = 200) -> dict:
    return {
        "statusCode": status,
        "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def lambda_handler(event, _context):
    try:
        user_id = _user_id(event)
        body = json.loads(event.get("body") or "{}")

        score = int(body.get("score", 0))
        total = int(body.get("total", 10))
        difficulty = str(body.get("difficulty", ""))
        answers = body.get("answers", [])

        # Aggregate per-domain stats
        domains: dict[str, dict] = {}
        for a in answers:
            d = a.get("domain", "unknown")
            if d not in domains:
                domains[d] = {"correct": 0, "total": 0}
            domains[d]["total"] += 1
            if a.get("correct"):
                domains[d]["correct"] += 1

        quiz_id = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f") + "_" + str(uuid.uuid4())[:8]

        table.put_item(Item={
            "userId": user_id,
            "quizId": quiz_id,
            "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "score": score,
            "total": total,
            "pct": round(score / total * 100) if total else 0,
            "difficulty": difficulty,
            "domains": domains,
        })

        # Increment daily free-tier quota counter
        if _sub_table:
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            try:
                _sub_table.update_item(
                    Key={"userId": user_id, "sortKey": f"QUOTA#{today}"},
                    UpdateExpression="ADD #c :one",
                    ExpressionAttributeNames={"#c": "count"},
                    ExpressionAttributeValues={":one": 1},
                )
            except Exception as quota_exc:
                print(f"[save-quiz] Quota increment failed (non-fatal): {quota_exc}")

        return _cors({"saved": True, "quizId": quiz_id})

    except Exception as exc:
        print(f"[save-quiz] Erro: {exc}")
        return _cors({"error": str(exc)}, 500)
