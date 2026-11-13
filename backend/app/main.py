from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .shared.database import connect_db, close_db
from .modules.scanner.routes import router as scanner_router
from .modules.duplicates.routes import router as duplicates_router
from .modules.optimize.routes import router as optimize_router
from .modules.actions.routes import router as actions_router
from .modules.progress.routes import router as progress_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="Storage Reorg API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3040"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scanner_router)
app.include_router(duplicates_router)
app.include_router(optimize_router)
app.include_router(actions_router)
app.include_router(progress_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
