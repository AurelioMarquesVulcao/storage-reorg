import { useState, useCallback, useEffect } from 'react'
import { optimizeService, type HdStateEntry } from '../services/optimizeService'
import type { MoveProposal } from '../../../shared/types'

export function useOptimize() {
  const [items, setItems] = useState<MoveProposal[]>([])
  const [hdState, setHdState] = useState<HdStateEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const load = useCallback(async (newOffset = 0, status?: string) => {
    setLoading(true)
    setError(null)
    try {
      const [proposalsRes, hdRes] = await Promise.all([
        optimizeService.proposals({ limit, offset: newOffset, status }),
        optimizeService.hdState(),
      ])
      setItems(proposalsRes.items)
      setTotal(proposalsRes.total)
      setHdState(hdRes)
      setOffset(newOffset)
    } catch {
      setError('Erro ao carregar propostas. Verifique se o backend está rodando.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(0, statusFilter)
  }, [load, statusFilter])

  const approve = useCallback(async (id: string) => {
    const res = await optimizeService.approve(id)
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...res } : item)))
    // Refresh HD state after approval since projections change
    optimizeService.hdState().then(setHdState).catch(() => undefined)
  }, [])

  const skip = useCallback(async (id: string) => {
    const res = await optimizeService.skip(id)
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...res } : item)))
  }, [])

  const nextPage = useCallback(() => {
    if (offset + limit < total) void load(offset + limit, statusFilter)
  }, [load, offset, total, statusFilter])

  const prevPage = useCallback(() => {
    if (offset > 0) void load(Math.max(0, offset - limit), statusFilter)
  }, [load, offset, statusFilter])

  return {
    items,
    hdState,
    total,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    offset,
    limit,
    approve,
    skip,
    reload: () => load(offset, statusFilter),
    nextPage,
    prevPage,
  }
}
