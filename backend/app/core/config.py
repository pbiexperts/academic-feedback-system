from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Academic Feedback & Analytics System"
    API_V1_STR: str = "/api/v1"
    
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "Mysql@123"
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: str = "3306"
    MYSQL_DATABASE: str = "safas"

    JWT_SECRET: str = "your_super_secret_jwt_key"
    JWT_EXPIRATION: int = 1440 # 24 hours in minutes

    MINIMUM_RESPONSES_FOR_ANALYTICS: int = 5

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        import urllib.parse
        encoded_password = urllib.parse.quote_plus(self.MYSQL_PASSWORD)
        return f"mysql+pymysql://{self.MYSQL_USER}:{encoded_password}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
