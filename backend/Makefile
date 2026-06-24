.PHONY: build deploy local test-generate test-evaluate logs-generate logs-evaluate

# ── Build & Deploy ─────────────────────────────────────────────────────────

build:
	sam build

# First deploy: runs guided wizard that saves answers to samconfig.toml
deploy-first: build
	sam deploy --guided

# Subsequent deploys: uses saved samconfig.toml
deploy: build
	sam deploy

# ── Local development (requires Docker Desktop running) ───────────────────

local: build
	sam local start-api --port 4000 --warm-containers EAGER

# ── Smoke tests against local server (run `make local` first) ─────────────

test-generate:
	@echo "Testing POST /generate-question..."
	curl -s -X POST http://localhost:4000/generate-question \
		-H "Content-Type: application/json" \
		-d '{"domain": "technology", "difficulty": "medium"}' \
		| python -m json.tool

test-generate-security:
	@echo "Testing POST /generate-question (security, hard)..."
	curl -s -X POST http://localhost:4000/generate-question \
		-H "Content-Type: application/json" \
		-d '{"domain": "security", "difficulty": "hard"}' \
		| python -m json.tool

test-evaluate:
	@echo "Testing POST /evaluate-answer..."
	curl -s -X POST http://localhost:4000/evaluate-answer \
		-H "Content-Type: application/json" \
		-d '{ \
			"question": "Which AWS service is used for object storage?", \
			"options": ["A) Amazon EBS", "B) Amazon S3", "C) Amazon EFS", "D) Amazon RDS"], \
			"correct_answer": "B", \
			"selected_answer": "A", \
			"domain": "technology", \
			"explanation": "S3 is the AWS object storage service." \
		}' \
		| python -m json.tool

# ── Direct local invocation (no Docker needed, uses your AWS credentials) ──

invoke-generate:
	cd functions/generate_question && python local_invoke.py

invoke-generate-security:
	cd functions/generate_question && python local_invoke.py security hard

invoke-evaluate:
	cd functions/evaluate_answer && python local_invoke.py

# ── CloudWatch Logs (after deploy) ────────────────────────────────────────

logs-generate:
	sam logs -n GenerateQuestionFunction --stack-name quizzapp-backend --tail

logs-evaluate:
	sam logs -n EvaluateAnswerFunction --stack-name quizzapp-backend --tail
