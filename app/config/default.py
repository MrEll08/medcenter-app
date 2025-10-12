import secrets
from os import environ
from typing import ClassVar

from fastapi.security import OAuth2PasswordBearer
from pydantic_settings import BaseSettings


class DefaultSettings(BaseSettings):
    """
    Default configs for application.

    Usually, we have three environments: for development, testing and production.
    But in this situation, we only have standard settings for local development.
    """

    ENV: str = environ.get("ENV", "local")
    PATH_PREFIX_API: str = environ.get("PATH_PREFIX_API", "/api/v1")
    PATH_PREFIX_FRONTEND: str = environ.get("PATH_PREFIX_FRONTEND", "/")
    API_HOST: str = environ.get("APP_HOST", "http://127.0.0.1")
    API_PORT: int = int(environ.get("API_PORT", 8000))

    POSTGRES_DB: str = environ.get("POSTGRES_DB", "bookmarker_db")
    POSTGRES_HOST: str = environ.get("POSTGRES_HOST", "localhost")
    POSTGRES_USER: str = environ.get("POSTGRES_USER", "user")
    POSTGRES_PORT: int = int(environ.get("POSTGRES_PORT", "5432"))
    POSTGRES_PASSWORD: str = environ.get("POSTGRES_PASSWORD", "hackme")
    DB_CONNECT_RETRY: int = environ.get("DB_CONNECT_RETRY", 20)
    DB_POOL_SIZE: int = environ.get("DB_POOL_SIZE", 15)
    DB_ECHO: bool = environ.get("DB_ECHO", False)

    # to get a string like this run: "openssl rand -hex 32"
    SECRET_KEY: str = environ.get("SECRET_KEY", secrets.token_hex(32))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

    OAUTH2_SCHEME: ClassVar[OAuth2PasswordBearer] = OAuth2PasswordBearer(tokenUrl=f"{API_HOST}:{API_PORT}{PATH_PREFIX_API}/user/authentication")

    @property
    def database_settings(self) -> dict:
        """
        Get all settings for connection with database.
        """
        return {
            "database": self.POSTGRES_DB,
            "user": self.POSTGRES_USER,
            "password": self.POSTGRES_PASSWORD,
            "host": self.POSTGRES_HOST,
            "port": self.POSTGRES_PORT,
        }

    @property
    def database_uri(self) -> str:
        """
        Get uri for connection with database.
        """
        return "postgresql+asyncpg://{user}:{password}@{host}:{port}/{database}".format(
            **self.database_settings,
        )

    @property
    def database_uri_sync(self) -> str:
        """
        Get uri for connection with database.
        """
        return "postgresql://{user}:{password}@{host}:{port}/{database}".format(
            **self.database_settings,
        )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
