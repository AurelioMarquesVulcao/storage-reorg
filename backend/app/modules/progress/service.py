import asyncio
import json
from datetime import datetime, timezone
from typing import AsyncGenerator

from app.shared.logger import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Global SSE state — updated by scanner / action workers
# ---------------------------------------------------------------------------
_state: dict = {
    "status": "idle",          # idle | scanning | moving | deleting | done | error
    "phase": "",
    "current_file": "",
    "files_scanned": 0,
    "files_total": 0,
    "actions_done": 0,
    "actions_total": 0,
    "bytes_freed": 0,
    "bytes_freed_human": "0 B",
    "percent": 0,
    "message": "",
    "updated_at": datetime.now(timezone.utc).isoformat(),
}


def update_progress(**kwargs) -> None:
    """Update any subset of the global progress state."""
    _state.update(kwargs)
    _state["updated_at"] = datetime.now(timezone.utc).isoformat()
    logger.info(f"progress update: {kwargs}")


def get_status() -> dict:
    return dict(_state)


async def progress_stream() -> AsyncGenerator[str, None]:
    """
    Async generator for SSE.  Yields one event every 500 ms.
    Format:  data:<json>\\n\\n
    """
    logger.info("SSE client connected")
    try:
        while True:
            payload = json.dumps(get_status())
            yield f"data:{payload}\n\n"
            await asyncio.sleep(0.5)
    except asyncio.CancelledError:
        logger.info("SSE client disconnected")
        raise
