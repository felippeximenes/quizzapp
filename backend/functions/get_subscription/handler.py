import json
import os
from datetime import datetime, timezone
from decimal import Decimal

import boto3

TABLE_NAME = os.environ["SUBSCRIPTIONS_TABLE"]
DAILY_FREE_LIMIT = 5

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}


def _user_id(event: dict) -> str:
    return event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]


def _cors(body: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body, default=lambda o: int(o) if isinstance(o, Decimal) else str(o))}


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        user_id = _user_id(event)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        sub_resp = table.get_item(Key={"userId": user_id, "sortKey": "SUBSCRIPTION"})
        sub = sub_resp.get("Item", {})

        now_ts = datetime.now(timezone.utc).timestamp()
        is_premium = (
            sub.get("status") == "active"
            and int(sub.get("currentPeriodEnd", 0)) > now_ts
        )

        quota_resp = table.get_item(Key={"userId": user_id, "sortKey": f"QUOTA#{today}"})
        quizzes_today = int((quota_resp.get("Item") or {}).get("count", 0))

        if is_premium:
            return _cors({
                "plan": "premium",
                "status": sub.get("status"),
                "currentPeriodEnd": sub.get("currentPeriodEnd"),
                "stripeSubscriptionId": sub.get("stripeSubscriptionId"),
                "quizzesRemaining": None,
                "quizzesToday": quizzes_today,
            })

        remaining = max(0, DAILY_FREE_LIMIT - quizzes_today)
        return _cors({
            "plan": "free",
            "quizzesRemaining": remaining,
            "quizzesToday": quizzes_today,
            "dailyLimit": DAILY_FREE_LIMIT,
        })

    except Exception as exc:
        print(f"[get-subscription] Error: {exc}")
        return _cors({"error": str(exc)}, 500)
