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
    logger.warning(f"Validation error: {request.url.path} | "
                   f"Errors: {exc.errors()}"
                   )
    return JSONResponse(
        status_code=422,
        content={"detail": "Invalid request data",
                 "errors": exc.errors()
                 },

    )

async def integrity_error_handler(request: Request,ext: IntegrityError):
    logger.error(f"Database integrity error | Path: {request.url.path} | ",
                 exc_info=True
                   )
    return JSONResponse(
        status_code=409,
        content={"detail": "Database constraint violation"}
    )

async def database_exception_handler(request:Request,ext: SQLAlchemyError):
    logger.error(
        f"Database Error | Path: {request.url.path} | ",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Database error occurred"}
    )

async def general_exception_handler(request:Request,ext: Exception):
    logger.exception(
        f"Unexpected Error | Path: {request.url.path} | ",
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )