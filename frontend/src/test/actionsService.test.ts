import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { actionsService } from '../modules/actions/services/actionsService'
import { api } from '../shared/http/api'

vi.mock('../shared/http/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedGet = api.get as Mock
const mockedPost = api.post as Mock

const fakeLog = {
  id: 'log-1',
  type: 'delete' as const,
  path: '/mnt/aurelio-yasmin/Filmes/Filme.mkv',
  size_bytes: 4294967296,
  size_human: '4.0 GB',
  hd: '/mnt/aurelio-yasmin',
  timestamp: '2026-11-13T12:00:00Z',
  status: 'success' as const,
  error_msg: undefined,
}

describe('actionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs returns items and total', async () => {
    mockedGet.mockResolvedValueOnce({ data: { total: 1, items: [fakeLog] } })
    const res = await actionsService.logs()
    expect(res.total).toBe(1)
    expect(res.items[0].type).toBe('delete')
  })

  it('logs passes filter params', async () => {
    mockedGet.mockResolvedValueOnce({ data: { total: 0, items: [] } })
    await actionsService.logs({ type: 'move', status: 'error', limit: 10, offset: 0 })
    expect(mockedGet).toHaveBeenCalledWith('/actions/logs', {
      params: { type: 'move', status: 'error', limit: 10, offset: 0 },
    })
  })

  it('getLog returns single item', async () => {
    mockedGet.mockResolvedValueOnce({ data: fakeLog })
    const res = await actionsService.getLog('log-1')
    expect(res.id).toBe('log-1')
    expect(mockedGet).toHaveBeenCalledWith('/actions/logs/log-1')
  })

  it('execute calls correct endpoint', async () => {
    mockedPost.mockResolvedValueOnce({ data: { job_id: 'job-123', status: 'running' } })
    const res = await actionsService.execute()
    expect(res.job_id).toBe('job-123')
    expect(mockedPost).toHaveBeenCalledWith('/actions/execute')
  })
})
