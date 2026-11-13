import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { optimizeService } from '../modules/optimize/services/optimizeService'
import { api } from '../shared/http/api'

vi.mock('../shared/http/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

const mockedGet = api.get as Mock
const mockedPatch = api.patch as Mock

const fakeProposal = {
  id: 'prop-1',
  folder: '/mnt/1tera/Series',
  size_bytes: 107374182400,
  size_human: '100 GB',
  from_hd: '/mnt/1tera',
  to_hd: '/mnt/samsung300',
  reason: 'HD origem com 88% uso; destino com 27% uso',
  approved: false,
  status: 'pending' as const,
}

describe('optimizeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('proposals returns items and total', async () => {
    mockedGet.mockResolvedValueOnce({ data: { total: 1, items: [fakeProposal] } })
    const res = await optimizeService.proposals()
    expect(res.total).toBe(1)
    expect(res.items[0].from_hd).toBe('/mnt/1tera')
  })

  it('hdState returns array', async () => {
    mockedGet.mockResolvedValueOnce({
      data: [{ mount: '/mnt/1tera', current_use_pct: 88, projected_use_pct: 72, delta_bytes: -16106127360 }],
    })
    const res = await optimizeService.hdState()
    expect(res[0].mount).toBe('/mnt/1tera')
    expect(res[0].projected_use_pct).toBe(72)
  })

  it('approve calls correct endpoint', async () => {
    mockedPatch.mockResolvedValueOnce({ data: { id: 'prop-1', approved: true, status: 'approved' } })
    const res = await optimizeService.approve('prop-1')
    expect(res.approved).toBe(true)
    expect(mockedPatch).toHaveBeenCalledWith('/optimize/proposals/prop-1/approve')
  })

  it('skip calls correct endpoint', async () => {
    mockedPatch.mockResolvedValueOnce({ data: { id: 'prop-1', approved: false, status: 'skipped' } })
    const res = await optimizeService.skip('prop-1')
    expect(res.status).toBe('skipped')
    expect(mockedPatch).toHaveBeenCalledWith('/optimize/proposals/prop-1/skip')
  })
})
