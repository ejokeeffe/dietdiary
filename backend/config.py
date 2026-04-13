from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    DATABASE_URL: str = "sqlite:///./diary.db"

    model_config = {"env_file": ".env"}


settings = Settings()
