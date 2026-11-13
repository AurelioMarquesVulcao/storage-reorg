import { useState, useCallback, useEffect } from 'react'
import { actionsService } from '../services/actionsService'
import type { ActionLog } from '../../../shared/types'

export function useActions() {
  const [items, setItems] = useState<ActionLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'delete' | 'move' | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<'success' | 'error' | undefined>(undefined)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const load = useCallback(
    async (
      newOffset = 0,
      type?: 'delete' | 'move',
      status?: 'success' | 'error',
    ) => {
      setLoading(true)
      setError(null)
      try {
        const res = await actionsService.logs({ limit, offset: newOffset, type, status })
        setItems(res.items)
        setTotal(res.total)
        setOffset(newOffset)
      } catch {
        setError('Erro ao carregar histórico. Verifique se o backend está rodando.')
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void load(0, typeFilter, statusFilter)
  }, [load, typeFilter, statusFilter])

  const nextPage = useCallback(() => {
    if (offset + limit < total) void load(offset + limit, typeFilter, statusFilter)
  }, [load, offset, total, typeFilter, statusFilter])

  const prevPage = useCallback(() => {
    if (offset > 0) void load(Math.max(0, offset - limit), typeFilter, statusFilter)
  }, [load, offset, typeFilter, statusFilter])

  return {
    items,
    total,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    offset,
    limit,
    reload: () => load(offset, typeFilter, statusFilter),
    nextPage,
    prevPage,
  }
}
