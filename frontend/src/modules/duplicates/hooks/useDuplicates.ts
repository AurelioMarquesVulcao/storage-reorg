import { useState, useCallback, useEffect } from 'react'
import { duplicatesService, type DuplicateSummary } from '../services/duplicatesService'
import type { DuplicateFile } from '../../../shared/types'

export function useDuplicates() {
  const [items, setItems] = useState<DuplicateFile[]>([])
  const [summary, setSummary] = useState<DuplicateSummary | null>(null)
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
      const [listRes, summaryRes] = await Promise.all([
        duplicatesService.list({ limit, offset: newOffset, status }),
        duplicatesService.summary(),
      ])
      setItems(listRes.items)
      setTotal(listRes.total)
      setSummary(summaryRes)
      setOffset(newOffset)
    } catch {
      setError('Erro ao carregar duplicatas. Verifique se o backend está rodando.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(0, statusFilter)
  }, [load, statusFilter])

  const approve = useCallback(async (id: string) => {
    const res = await duplicatesService.approve(id)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...res } : item))
    )
    setSummary((s) =>
      s
        ? { ...s, pending: s.pending - 1, approved: s.approved + 1 }
        : s
    )
  }, [])

  const skip = useCallback(async (id: string) => {
    const res = await duplicatesService.skip(id)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...res } : item))
    )
    setSummary((s) =>
      s
        ? { ...s, pending: s.pending - 1, skipped: s.skipped + 1 }
        : s
    )
  }, [])

  const approveAll = useCallback(async () => {
    await duplicatesService.approveAll()
    await load(offset, statusFilter)
  }, [load, offset, statusFilter])

  const nextPage = useCallback(() => {
    if (offset + limit < total) void load(offset + limit, statusFilter)
  }, [load, offset, total, statusFilter])

  const prevPage = useCallback(() => {
    if (offset > 0) void load(Math.max(0, offset - limit), statusFilter)
  }, [load, offset, statusFilter])

  return {
    items,
    summary,
    total,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    offset,
    limit,
    approve,
    skip,
    approveAll,
    reload: () => load(offset, statusFilter),
    nextPage,
    prevPage,
  }
}
