import json
import os
from datetime import datetime, timezone

import boto3
import stripe

STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
STRIPE_PRICE_ID = os.environ["STRIPE_PRICE_ID"]
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://quizzapp-six-cyan.vercel.app")
TABLE_NAME = os.environ["SUBSCRIPTIONS_TABLE"]

stripe.api_key = STRIPE_SECRET_KEY

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}


def _user_id(event: dict) -> str:
    return event["requestContext"]["authorizer"]["jwt"]["claims"]["sub"]


def _user_email(event: dict) -> str:
    return event["requestContext"]["authorizer"]["jwt"]["claims"].get("email", "")


def _cors(body: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body)}


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        user_id = _user_id(event)
        user_email = _user_email(event)

        # Reuse existing Stripe customer if it exists
        sub_resp = table.get_item(Key={"userId": user_id, "sortKey": "SUBSCRIPTION"})
        existing = (sub_resp.get("Item") or {})
        customer_id = existing.get("stripeCustomerId")

        if not customer_id:
            customer = stripe.Customer.create(
                email=user_email,
                metadata={"userId": user_id},
            )
            customer_id = customer.id
            table.update_item(
                Key={"userId": user_id, "sortKey": "SUBSCRIPTION"},
                UpdateExpression="SET stripeCustomerId = :cid, updatedAt = :ts",
                ExpressionAttributeValues={
                    ":cid": customer_id,
                    ":ts": datetime.now(timezone.utc).isoformat(),
                },
            )

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
            success_url=f"{FRONTEND_URL}/assinatura?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/assinatura?canceled=true",
            metadata={"userId": user_id},
            allow_promotion_codes=True,
        )

        return _cors({"checkoutUrl": session.url})

    except Exception as exc:
        print(f"[create-checkout-session] Error: {exc}")
        return _cors({"error": str(exc)}, 500)
