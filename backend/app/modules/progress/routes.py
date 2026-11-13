from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.modules.progress import service

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/stream")
async def stream_progress():
    """Server-Sent Events endpoint — streams progress state every 500 ms."""
    return StreamingResponse(
        service.progress_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )


@router.get("/status")
async def get_status():
    """Snapshot of the current progress state (non-streaming)."""
    return service.get_status()
