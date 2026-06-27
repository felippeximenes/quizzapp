import json
import os
from datetime import datetime, timezone

import boto3
import stripe

STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
TABLE_NAME = os.environ["SUBSCRIPTIONS_TABLE"]

stripe.api_key = STRIPE_SECRET_KEY

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}


def _user_id(event: dict) -> str:
    return event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]


def _cors(body: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body)}


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        user_id = _user_id(event)

        sub_resp = table.get_item(Key={"userId": user_id, "sortKey": "SUBSCRIPTION"})
        sub = sub_resp.get("Item", {})

        stripe_sub_id = sub.get("stripeSubscriptionId")
        if not stripe_sub_id:
            return _cors({"error": "Nenhuma assinatura ativa encontrada."}, 404)

        # Cancel at end of billing period (não corta acesso imediatamente)
        stripe.Subscription.modify(stripe_sub_id, cancel_at_period_end=True)

        table.update_item(
            Key={"userId": user_id, "sortKey": "SUBSCRIPTION"},
            UpdateExpression="SET cancelAtPeriodEnd = :v, updatedAt = :ts",
            ExpressionAttributeValues={
                ":v": True,
                ":ts": datetime.now(timezone.utc).isoformat(),
            },
        )

        return _cors({"canceled": True})

    except Exception as exc:
        print(f"[cancel-subscription] Error: {exc}")
        return _cors({"error": str(exc)}, 500)
