export interface ActionLog {
  id: string
  type: 'delete' | 'move'
  path: string
  size_bytes: number
  size_human: string
  hd: string
  timestamp: string
  status: 'success' | 'error'
  error_msg?: string
}
