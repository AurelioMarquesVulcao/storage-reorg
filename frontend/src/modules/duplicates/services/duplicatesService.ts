import { api } from '../../../shared/http/api'
import type { DuplicateFile } from '../../../shared/types'

export interface DuplicateListResponse {
  total: number
  items: DuplicateFile[]
}

export interface DuplicateSummary {
  total: number
  pending: number
  approved: number
  deleted: number
  skipped: number
  total_wasted_bytes: number
  total_wasted_human: string
}

export const duplicatesService = {
  async list(params?: { status?: string; limit?: number; offset?: number }): Promise<DuplicateListResponse> {
    const res = await api.get<DuplicateListResponse>('/duplicates/list', { params })
    return res.data
  },

  async summary(): Promise<DuplicateSummary> {
    const res = await api.get<DuplicateSummary>('/duplicates/summary')
    return res.data
  },

  async approve(id: string): Promise<Pick<DuplicateFile, 'id' | 'approved' | 'status'>> {
    const res = await api.patch(`/duplicates/${id}/approve`)
    return res.data
  },

  async skip(id: string): Promise<Pick<DuplicateFile, 'id' | 'approved' | 'status'>> {
    const res = await api.patch(`/duplicates/${id}/skip`)
    return res.data
  },

  async approveAll(): Promise<{ approved_count: number }> {
    const res = await api.post('/duplicates/approve-all')
    return res.data
  },
}
