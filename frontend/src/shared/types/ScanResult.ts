export interface ScanResult {
  scan_id: string
  status: 'running' | 'done' | 'error'
  total_files: number
  total_duplicates: number
  total_wasted_bytes: number
  total_wasted_human: string
  scanned_at: string
}
