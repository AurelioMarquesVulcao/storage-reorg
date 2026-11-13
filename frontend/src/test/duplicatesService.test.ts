import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { duplicatesService } from '../modules/duplicates/services/duplicatesService'
import { api } from '../shared/http/api'

vi.mock('../shared/http/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedGet = api.get as Mock
const mockedPatch = api.patch as Mock
const mockedPost = api.post as Mock

const fakeItem = {
  id: 'dup-1',
  filename: 'Filme.mkv',
  size_bytes: 4294967296,
  size_human: '4.0 GB',
  master_path: '/mnt/dados/Filmes/Filme.mkv',
  master_hd: '/mnt/dados',
  copies: [{ path: '/mnt/aurelio-yasmin/Filmes/Filme.mkv', hd: '/mnt/aurelio-yasmin' }],
  approved: false,
  status: 'pending' as const,
}

describe('duplicatesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('list returns items and total', async () => {
    mockedGet.mockResolvedValueOnce({ data: { total: 1, items: [fakeItem] } })
    const res = await duplicatesService.list({ limit: 50, offset: 0 })
    expect(res.total).toBe(1)
    expect(res.items[0].id).toBe('dup-1')
    expect(mockedGet).toHaveBeenCalledWith('/duplicates/list', { params: { limit: 50, offset: 0 } })
  })

  it('summary returns aggregates', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { total: 10, pending: 5, approved: 3, deleted: 2, skipped: 0, total_wasted_bytes: 1024, total_wasted_human: '1 KB' },
    })
    const res = await duplicatesService.summary()
    expect(res.total).toBe(10)
    expect(res.total_wasted_human).toBe('1 KB')
  })

  it('approve calls correct endpoint', async () => {
    mockedPatch.mockResolvedValueOnce({ data: { id: 'dup-1', approved: true, status: 'approved' } })
    const res = await duplicatesService.approve('dup-1')
    expect(res.approved).toBe(true)
    expect(mockedPatch).toHaveBeenCalledWith('/duplicates/dup-1/approve')
  })

  it('skip calls correct endpoint', async () => {
    mockedPatch.mockResolvedValueOnce({ data: { id: 'dup-1', approved: false, status: 'skipped' } })
    const res = await duplicatesService.skip('dup-1')
    expect(res.status).toBe('skipped')
    expect(mockedPatch).toHaveBeenCalledWith('/duplicates/dup-1/skip')
  })

  it('approveAll calls correct endpoint', async () => {
    mockedPost.mockResolvedValueOnce({ data: { approved_count: 42 } })
    const res = await duplicatesService.approveAll()
    expect(res.approved_count).toBe(42)
    expect(mockedPost).toHaveBeenCalledWith('/duplicates/approve-all')
  })
})
