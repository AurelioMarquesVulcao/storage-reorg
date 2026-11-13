"""
Unit tests for backend/app/modules/progress/service.py
No DB needed — service uses in-memory global state.
"""
import pytest
import asyncio


# ---------------------------------------------------------------------------
# Test 1 — update_progress e get_status: estado reflete as atualizações
# ---------------------------------------------------------------------------

def test_update_and_get_status():
    """update_progress deve persistir campos e get_status deve refleti-los."""
    from app.modules.progress.service import update_progress, get_status, _state

    # Reset to known state
    _state.update({
        "status": "idle",
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
    })

    update_progress(
        status="scanning",
        phase="hd_scan",
        files_scanned=42,
        files_total=100,
        percent=42,
        message="Escaneando /mnt/dados",
    )

    status = get_status()
    assert status["status"] == "scanning"
    assert status["phase"] == "hd_scan"
    assert status["files_scanned"] == 42
    assert status["files_total"] == 100
    assert status["percent"] == 42
    assert status["message"] == "Escaneando /mnt/dados"
    assert "updated_at" in status  # campo de timestamp deve estar presente

    # Atualização parcial não apaga campos existentes
    update_progress(files_scanned=80)
    status2 = get_status()
    assert status2["files_scanned"] == 80
    assert status2["status"] == "scanning"  # não foi zerado


# ---------------------------------------------------------------------------
# Test 2 — progress_stream: gera eventos SSE no formato correto
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_progress_stream_format():
    """progress_stream deve gerar eventos SSE com prefixo 'data:' e JSON válido."""
    import json
    from app.modules.progress.service import progress_stream, update_progress, _state

    # Set a known state
    update_progress(status="done", percent=100, message="Concluído")

    events = []
    gen = progress_stream()
    try:
        # Collect 3 events with a short timeout
        for _ in range(3):
            event = await asyncio.wait_for(gen.__anext__(), timeout=2.0)
            events.append(event)
    except (StopAsyncIteration, asyncio.TimeoutError):
        pass
    finally:
        await gen.aclose()

    assert len(events) >= 1, "Deve gerar ao menos 1 evento SSE"

    for event in events:
        # Must start with "data:" and end with double newline
        assert event.startswith("data:"), f"Evento deve começar com 'data:': {event!r}"
        assert event.endswith("\n\n"), f"Evento deve terminar com \\n\\n: {event!r}"

        # Payload must be valid JSON
        payload_str = event[len("data:"):].strip()
        payload = json.loads(payload_str)

        # Must contain expected keys
        assert "status" in payload
        assert "percent" in payload
        assert "updated_at" in payload
