include .env
export

env:  ##@Environment Create .env file with variables
	@$(eval SHELL:=/bin/bash)
	@cp .env.sample .env
	@echo "SECRET_KEY=$$(openssl rand -hex 32)" >> .env

start-db:
	docker compose up db -d

stop-db:
	docker compose down

psql:
	docker compose exec db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
