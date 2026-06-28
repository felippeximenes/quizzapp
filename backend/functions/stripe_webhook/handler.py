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


def _period_end(stripe_sub: object) -> int:
    """Extract current_period_end from Stripe subscription across API versions."""
    for attr in ("current_period_end",):
        val = getattr(stripe_sub, attr, None)
        if val:
            return int(val)
        try:
            val = stripe_sub[attr]  # type: ignore[index]
            if val:
                return int(val)
        except (KeyError, TypeError, AttributeError):
            pass
    # Fallback: try through items (newer API versions)
    try:
        items_data = stripe_sub.items.data  # type: ignore[union-attr]
        if items_data:
            val = getattr(items_data[0], "current_period_end", None)
            if val:
                return int(val)
    except (AttributeError, IndexError):
        pass
    # Last resort: 30 days from now
    return int(datetime.now(timezone.utc).timestamp()) + 30 * 86400


def _upsert_subscription(user_id: str, stripe_sub: object) -> None:
    table.put_item(Item={
        "userId": user_id,
        "sortKey": "SUBSCRIPTION",
        "stripeSubscriptionId": stripe_sub.id,
        "stripeCustomerId": stripe_sub.customer,
        "status": stripe_sub.status,
        "currentPeriodEnd": _period_end(stripe_sub),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    })


def _meta_get(obj, key: str) -> str | None:
    """Safely read a metadata key from any Stripe object (dict or StripeObject)."""
    try:
        meta = obj.metadata
        if meta is None:
            return None
        return meta[key]
    except (KeyError, TypeError, AttributeError):
        return None


def _user_id_from_customer(customer_id: str) -> str | None:
    customer = stripe.Customer.retrieve(customer_id)
    return _meta_get(customer, "userId")


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
            user_id = _meta_get(session, "userId")
            print(f"[stripe-webhook] checkout userId={user_id} sub={getattr(session, 'subscription', None)}")
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
