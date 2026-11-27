from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import check_database_connection
from app.core.network_gate import require_admin_network

router = APIRouter()


@router.get("/health/")
async def health_check():
    return {"status": "healthy"}


@router.get("/database-status", dependencies=[Depends(require_admin_network)])
async def database_status():
    if not check_database_connection():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed",
        )
    return {"Connection:": True}
