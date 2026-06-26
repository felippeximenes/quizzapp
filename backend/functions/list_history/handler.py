import json
import os

import boto3
from boto3.dynamodb.conditions import Key

TABLE_NAME = os.environ["HISTORY_TABLE"]
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


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

        response = table.query(
            KeyConditionExpression=Key("userId").eq(user_id),
            ScanIndexForward=False,  # most recent first
            Limit=50,
        )

        items = response.get("Items", [])

        # DynamoDB returns Decimal — convert to int/float for JSON
        def fix(obj):
            if isinstance(obj, dict):
                return {k: fix(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [fix(v) for v in obj]
            try:
                from decimal import Decimal
                if isinstance(obj, Decimal):
                    return int(obj) if obj == int(obj) else float(obj)
            except Exception:
                pass
            return obj

        return _cors({"items": fix(items)})

    except Exception as exc:
        print(f"[list-history] Erro: {exc}")
        return _cors({"error": str(exc)}, 500)
