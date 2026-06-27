import json
import os

import boto3
import stripe

STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
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

        customer_id = sub.get("stripeCustomerId")
        if not customer_id:
            return _cors({"error": "Nenhuma assinatura encontrada."}, 404)

        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{FRONTEND_URL}/assinatura",
        )

        return _cors({"portalUrl": session.url})

    except Exception as exc:
        print(f"[customer-portal] Error: {exc}")
        return _cors({"error": str(exc)}, 500)
