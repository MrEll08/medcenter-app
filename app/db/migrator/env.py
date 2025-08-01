import asyncio
from logging.config import fileConfig

from alembic import context
from app.config import get_settings
from app.db import DeclarativeBase
from app.db.models import *  # noqa
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
load_dotenv()
config = context.config
section = config.config_ini_section
settings = get_settings()
DATABASE_URL = settings.database_uri
config.set_section_option(section, "POSTGRES_DB", settings.POSTGRES_DB)
config.set_section_option(section, "POSTGRES_HOST", settings.POSTGRES_HOST)
config.set_section_option(section, "POSTGRES_USER", settings.POSTGRES_USER)
config.set_section_option(section, "POSTGRES_PASSWORD", settings.POSTGRES_PASSWORD)
config.set_section_option(section, "POSTGRES_PORT", str(settings.POSTGRES_PORT))

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = DeclarativeBase.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Online migrations using asyncpg."""
    connectable = create_async_engine(DATABASE_URL, future=True)

    async def run_async_migrations():
        async with connectable.begin() as conn:
            await conn.run_sync(do_run_migrations)

    def do_run_migrations(connection):
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()

    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
