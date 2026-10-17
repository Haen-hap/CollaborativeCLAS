from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.routers.db_health import router as health_router
import logging
from app.core.logging_config import setup_logging
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    database_exception_handler,
    general_exception_handler,
    integrity_error_handler,
    validation_exception_handler

)

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(SQLAlchemyError, database_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

app.include_router(health_router)


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/test-errors")
def test_errors():
    result=10/0
    return result
