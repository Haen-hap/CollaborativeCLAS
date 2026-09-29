from fastapi import FastAPI
from app.routers.db_health import router as health_router


app = FastAPI()
app.include_router(health_router)



@app.get("/")
async def root():
    return {"message": "Hello World"}

