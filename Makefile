include .env
export

APPLICATION_NAME = app

env:
	@$(eval SHELL:=/bin/bash)
	@cp .env.sample .env
	@echo "SECRET_KEY=$$(openssl rand -hex 32)" >> .env

run:
	poetry run python3 -m $(APPLICATION_NAME)

start-db:
	docker compose up db -d

stop-db:
	docker compose down

clean-restart-db:
	docker-compose down -v
	docker-compose up -d

psql:
	docker compose exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

ALEMBIC = poetry run alembic -c app/db/alembic.ini

MSG ?=
REV ?=head

migrate:
	$(ALEMBIC) revision --autogenerate -m "$(MSG)"

upgrade:
	$(ALEMBIC) upgrade $(REV)

downgrade:
	$(ALEMBIC) downgrade $(or $(REV), -1)

lint:
	poetry run ruff check .

format:
	poetry run ruff check . --fix

format-unsafe:
	poetry run ruff check . --fix --unsafe-fixes

.PHONY: env run start-db stop-db psql migrate upgrade downgrade lint format format-unsafe
