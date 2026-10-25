
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode
from pydantic import field_validator


class Settings(BaseSettings):
    POSTGRES_DB: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int = 5432

    ENTRA_TENANT_ID: str
    ENTRA_API_CLIENT_ID: str

    ENTRA_METADATA_URL: str = (
        "https://login.microsoftonline.com/common/v2.0/"
        ".well-known/openid-configuration"
    )

    model_config = SettingsConfigDict(
        env_file="../.env",
        extra="ignore",
    )

    CORS_ORIGINS: NoDecode[list[str]] = [
        "http://localhost:5173",
        "https://eventhub-a-devops-driven-event-4sxy.onrender.com",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [
                origin.strip()
                for origin in value.split(",")
                if origin.strip()
            ]
        return value

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://"
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/"
            f"{self.POSTGRES_DB}"
        )


settings = Settings()
