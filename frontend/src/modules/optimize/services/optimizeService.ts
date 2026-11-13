import { api } from '../../../shared/http/api'
import type { MoveProposal } from '../../../shared/types'

export interface ProposalsResponse {
  total: number
  items: MoveProposal[]
}

export interface HdStateEntry {
  mount: string
  current_use_pct: number
  projected_use_pct: number
  delta_bytes: number
}

export const optimizeService = {
  async proposals(params?: { status?: string; limit?: number; offset?: number }): Promise<ProposalsResponse> {
    const res = await api.get<ProposalsResponse>('/optimize/proposals', { params })
    return res.data
  },

  async hdState(): Promise<HdStateEntry[]> {
    const res = await api.get<HdStateEntry[]>('/optimize/hd-state')
    return res.data
  },

  async approve(id: string): Promise<Pick<MoveProposal, 'id' | 'approved' | 'status'>> {
    const res = await api.patch(`/optimize/proposals/${id}/approve`)
    return res.data
  },

  async skip(id: string): Promise<Pick<MoveProposal, 'id' | 'approved' | 'status'>> {
    const res = await api.patch(`/optimize/proposals/${id}/skip`)
    return res.data
  },
}
