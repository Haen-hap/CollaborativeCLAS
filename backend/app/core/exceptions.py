import logging
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from sqlalchemy.exc import SQLAlchemyError, IntegrityError

logger = logging.getLogger(__name__)


class AppException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


async def app_exception_handler(request: Request, exc: AppException):
    logger.warning(f"Application error: {exc.detail} | "
                   f"Path: {request.url.path}"
                   )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error | Path: %s | Error count: %s", request.url.path, len(exc.errors()))
    safe_errors = [
        {
            "type": error.get("type", "validation_error"),
            "loc": error.get("loc", ()),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data",
                 "errors": safe_errors
                 },

    )

async def integrity_error_handler(request: Request,ext: IntegrityError):
    logger.error("Database integrity error | Path: %s", request.url.path)
    return JSONResponse(
        status_code=409,
        content={"detail": "Database constraint violation"}
    )

async def database_exception_handler(request:Request,ext: SQLAlchemyError):
    logger.error("Database error | Path: %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error occurred"}
    )

async def general_exception_handler(request:Request,ext: Exception):
    logger.error("Unexpected error | Path: %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
