include .env
export

APPLICATION_NAME = app
DB_SVC ?= db
SEED_SQL ?= app/sql/seed_medcenter.sql

env:
	@$(eval SHELL:=/bin/bash)
	@cp .env.sample .env
	@echo "SECRET_KEY=$$(openssl rand -hex 32)" >> .env

run:
	poetry run python3 -m $(APPLICATION_NAME)

start-db:
	docker compose up $(DB_SVC) -d

stop-db:
	docker compose down

clean-restart-db:
	docker-compose down -v
	docker-compose up -d

psql:
	docker compose exec $(DB_SVC) psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}

seed:
	docker compose cp $(SEED_SQL) $(DB_SVC):/tmp/seed.sql
	docker compose exec -T $(DB_SVC) psql -U $$POSTGRES_USER -d $$POSTGRES_DB -v ON_ERROR_STOP=1 -f /tmp/seed.sql

seed-reset:
	docker compose cp $(SEED_SQL) $(DB_SVC):/tmp/seed.sql
	docker compose exec -T $(DB_SVC) psql -U $$POSTGRES_USER -d $$POSTGRES_DB -v ON_ERROR_STOP=1 -c "TRUNCATE TABLE visit, doctor, client RESTART IDENTITY CASCADE;"
	docker compose exec -T $(DB_SVC) psql -U $$POSTGRES_USER -d $$POSTGRES_DB -v ON_ERROR_STOP=1 -f /tmp/seed.sql

ALEMBIC = poetry run alembic -c app/db/alembic.ini

MSG ?=
REV ?=head

migrate:
	$(ALEMBIC) revision --autogenerate $(MSG)

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

.PHONY: env run start-db stop-db psql migrate upgrade downgrade lint format format-unsafe seed seed-reset
