export interface MoveProposal {
  id: string
  folder: string
  size_bytes: number
  size_human: string
  from_hd: string
  to_hd: string
  reason: string
  approved: boolean
  status: 'pending' | 'approved' | 'moved' | 'error'
}
