export interface DuplicateFile {
  id: string
  filename: string
  size_bytes: number
  size_human: string
  master_path: string
  master_hd: string
  copies: Array<{ path: string; hd: string }>
  approved: boolean
  status: 'pending' | 'approved' | 'deleted' | 'skipped' | 'error'
}
