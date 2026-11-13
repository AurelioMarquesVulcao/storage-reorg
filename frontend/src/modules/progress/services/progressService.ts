export interface ProgressEvent {
  type: 'progress'
  done: number
  total: number
  current_path: string
  pct: number
}

export interface LogEvent {
  type: 'log'
  message: string
  status: 'success' | 'error'
}

export interface DoneEvent {
  type: 'done'
  total_deleted: number
  total_moved: number
  freed_bytes: number
  freed_human: string
}

export interface ErrorEvent {
  type: 'error'
  message: string
}

export type SSEEvent = ProgressEvent | LogEvent | DoneEvent | ErrorEvent

export interface ProgressState {
  running: boolean
  done: number
  total: number
  pct: number
  current_path: string
}

export interface ProgressCurrentResponse {
  job_id: string
  running: boolean
  done: number
  total: number
  pct: number
  current_path: string
}

import { api } from '../../../shared/http/api'

export const progressService = {
  async current(): Promise<ProgressCurrentResponse> {
    const res = await api.get<ProgressCurrentResponse>('/progress/current')
    return res.data
  },

  streamUrl(): string {
    return '/api/progress/stream'
  },
}
