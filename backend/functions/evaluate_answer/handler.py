import json
import os

import boto3
from botocore.exceptions import ClientError

BEDROCK_REGION = os.environ.get("BEDROCK_REGION", "us-east-1")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION)

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}

REQUIRED_FIELDS = ["question", "options", "correct_answer", "selected_answer"]


def make_response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False),
    }


def build_prompt(
    question: str,
    options: list[str],
    correct_answer: str,
    selected_answer: str,
    domain: str,
    explanation: str,
) -> str:
    is_correct = selected_answer.upper() == correct_answer.upper()
    result_label = "CORRECT ✓" if is_correct else "INCORRECT ✗"

    return f"""Você é um coach de estudos encorajador para o exame AWS Cloud Practitioner (CLF-C02).
Um estudante acabou de responder a seguinte questão do exame.

Questão: {question}
Alternativas: {json.dumps(options, ensure_ascii=False)}
Resposta correta: {correct_answer}
Alternativa escolhida: {selected_answer}
Resultado: {result_label}
Domínio: {domain}
Explicação base: {explanation}

Sua tarefa:
- Se correto: parabenize brevemente, reforce POR QUE a resposta está certa e aprofunde o entendimento.
- Se incorreto: seja gentil, explique o erro com clareza e torne o conceito correto memorável.
- Sempre adicione 3 dicas de estudo práticas e específicas para este tópico.
- Escreva tudo em português brasileiro, mantendo nomes de serviços AWS em inglês.

Responda APENAS com um objeto JSON — sem markdown, sem texto extra:
{{
  "correct": {str(is_correct).lower()},
  "feedback": "2-3 frases: o que a questão avalia, por que a resposta está certa/errada, conceito-chave a fixar",
  "study_tips": [
    "dica prática e específica diretamente relacionada a este tópico",
    "página exata da documentação AWS, whitepaper ou serviço para revisar",
    "truque de memória, analogia ou mnemônico para lembrar este conceito"
  ],
  "aws_docs_topic": "o tópico ou nome do serviço AWS mais relevante para revisar em seguida"
}}"""


def lambda_handler(event: dict, _context: object) -> dict:
    try:
        body: dict = json.loads(event.get("body") or "{}")

        missing = [f for f in REQUIRED_FIELDS if f not in body]
        if missing:
            return make_response(400, {"error": f"Missing required fields: {missing}"})

        bedrock_response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": (
                "Você é um coach motivador de certificações AWS. "
                "Responda sempre com JSON válido apenas — sem markdown, sem comentários."
            )}],
            messages=[{"role": "user", "content": [{"text": build_prompt(
                question=body["question"],
                options=body["options"],
                correct_answer=body["correct_answer"],
                selected_answer=body["selected_answer"],
                domain=body.get("domain", ""),
                explanation=body.get("explanation", ""),
            )}]}],
            inferenceConfig={"maxTokens": 1024, "temperature": 0.7},
        )

        raw_text: str = bedrock_response["output"]["message"]["content"][0]["text"]
        clean = raw_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```", 2)[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0].strip()
        feedback_data: dict = json.loads(clean)

        return make_response(200, feedback_data)

    except ClientError as exc:
        code = exc.response["Error"]["Code"]
        return make_response(502, {"error": f"Bedrock error: {code}"})
    except (json.JSONDecodeError, KeyError, IndexError):
        return make_response(502, {"error": "Model returned an unexpected response format"})
    except Exception as exc:  # noqa: BLE001
        return make_response(500, {"error": str(exc)})
