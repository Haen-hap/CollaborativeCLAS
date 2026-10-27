from fastapi import APIRouter
from app.core.database import check_database_connection

router = APIRouter()

@router.get("/health/")
async def health_check():
    return {"status": "healthy"}


@router.get("/database-status")
async def database_status():
    return{
        "Connection:": check_database_connection()
    }
