from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


class CopyInfo(BaseModel):
    path: str
    hd: str


class DuplicateFile(BaseModel):
    id: str
    filename: str
    size_bytes: int
    size_human: str
    master_path: str
    master_hd: str
    copies: List[CopyInfo]
    approved: bool = False
    status: Literal['pending', 'approved', 'deleted', 'skipped', 'error'] = 'pending'


class MoveProposal(BaseModel):
    id: str
    folder: str
    size_bytes: int
    size_human: str
    from_hd: str
    to_hd: str
    reason: str
    approved: bool = False
    status: Literal['pending', 'approved', 'moved', 'error'] = 'pending'


class ActionLog(BaseModel):
    id: str
    type: Literal['delete', 'move']
    path: str
    size_bytes: int
    size_human: str
    hd: str
    timestamp: str
    status: Literal['success', 'error']
    error_msg: Optional[str] = None


class ScanResult(BaseModel):
    scan_id: str
    status: Literal['running', 'done', 'error']
    total_files: int = 0
    total_duplicates: int = 0
    total_wasted_bytes: int = 0
    total_wasted_human: str = '0 B'
    scanned_at: str


class HdInfo(BaseModel):
    mount: str
    label: str
    size_bytes: int
    used_bytes: int
    free_bytes: int
    use_pct: float
    size_human: str
    used_human: str
    free_human: str
