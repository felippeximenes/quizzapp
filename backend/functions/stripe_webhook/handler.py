import json
import os
from datetime import datetime, timezone

import boto3
import stripe

STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]
TABLE_NAME = os.environ["SUBSCRIPTIONS_TABLE"]

stripe.api_key = STRIPE_SECRET_KEY

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)

CORS = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}


def _cors(body: dict, status: int = 200) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(body)}


def _upsert_subscription(user_id: str, stripe_sub: object) -> None:
    table.put_item(Item={
        "userId": user_id,
        "sortKey": "SUBSCRIPTION",
        "stripeSubscriptionId": stripe_sub.id,
        "stripeCustomerId": stripe_sub.customer,
        "status": stripe_sub.status,
        "currentPeriodEnd": stripe_sub.current_period_end,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })


def _user_id_from_customer(customer_id: str) -> str | None:
    customer = stripe.Customer.retrieve(customer_id)
    return customer.metadata.get("userId")


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        payload = event.get("body") or ""
        headers = event.get("headers") or {}
        sig = headers.get("stripe-signature") or headers.get("Stripe-Signature", "")

        webhook_event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
        event_type: str = webhook_event.type
        print(f"[stripe-webhook] {event_type}")

        if event_type == "checkout.session.completed":
            session = webhook_event.data.object
            user_id = session.metadata.get("userId")
            if session.mode == "subscription" and user_id and session.subscription:
                sub = stripe.Subscription.retrieve(session.subscription)
                _upsert_subscription(user_id, sub)

        elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
            sub = webhook_event.data.object
            user_id = _user_id_from_customer(sub.customer)
            if user_id:
                _upsert_subscription(user_id, sub)

        elif event_type == "invoice.payment_failed":
            invoice = webhook_event.data.object
            if invoice.subscription:
                sub = stripe.Subscription.retrieve(invoice.subscription)
                user_id = _user_id_from_customer(sub.customer)
                if user_id:
                    _upsert_subscription(user_id, sub)

        return _cors({"received": True})

    except stripe.error.SignatureVerificationError as exc:
        print(f"[stripe-webhook] Invalid signature: {exc}")
        return _cors({"error": "Invalid signature"}, 400)
    except Exception as exc:
        print(f"[stripe-webhook] Error: {exc}")
        return _cors({"error": str(exc)}, 500)
