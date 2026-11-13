import { api } from '../../../shared/http/api'
import type { ActionLog } from '../../../shared/types'

export interface ActionLogsResponse {
  total: number
  items: ActionLog[]
}

export interface ExecuteResponse {
  job_id: string
  status: string
}

export const actionsService = {
  async logs(params?: {
    type?: 'delete' | 'move'
    status?: 'success' | 'error'
    limit?: number
    offset?: number
  }): Promise<ActionLogsResponse> {
    const res = await api.get<ActionLogsResponse>('/actions/logs', { params })
    return res.data
  },

  async getLog(id: string): Promise<ActionLog> {
    const res = await api.get<ActionLog>(`/actions/logs/${id}`)
    return res.data
  },

  async execute(): Promise<ExecuteResponse> {
    const res = await api.post<ExecuteResponse>('/actions/execute')
    return res.data
  },
}
