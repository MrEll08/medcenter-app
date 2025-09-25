FROM python:3.12-slim

ADD https://install.python-poetry.org /tmp/install-poetry.py
RUN python3 /tmp/install-poetry.py
ENV POETRY_VIRTUALENVS_IN_PROJECT=true POETRY_NO_INTERACTION=1
ENV PATH="/root/.local/bin:${PATH}"

ENV PYTHONPATH=/app

WORKDIR /app
COPY pyproject.toml poetry.lock* ./
RUN poetry install --no-root

COPY ./app ./app

EXPOSE 8000
CMD ["poetry", "run", "python", "-m", "app"]
