import { useState, useEffect, useRef, useCallback } from 'react'
import type { SSEEvent, DoneEvent } from '../services/progressService'
import { progressService } from '../services/progressService'

export interface ProgressHookState {
  running: boolean
  done: number
  total: number
  pct: number
  current_path: string
  logs: Array<{ message: string; status: 'success' | 'error' }>
  finished: DoneEvent | null
  connected: boolean
  error: string | null
}

export function useProgress() {
  const [state, setState] = useState<ProgressHookState>({
    running: false,
    done: 0,
    total: 0,
    pct: 0,
    current_path: '',
    logs: [],
    finished: null,
    connected: false,
    error: null,
  })

  const esRef = useRef<EventSource | null>(null)
  const logsRef = useRef<ProgressHookState['logs']>([])

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
    }

    logsRef.current = []
    setState((s) => ({
      ...s,
      running: true,
      done: 0,
      total: 0,
      pct: 0,
      current_path: '',
      logs: [],
      finished: null,
      connected: false,
      error: null,
    }))

    const es = new EventSource(progressService.streamUrl())
    esRef.current = es

    es.onopen = () => {
      setState((s) => ({ ...s, connected: true, error: null }))
    }

    es.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as SSEEvent

        if (data.type === 'progress') {
          setState((s) => ({
            ...s,
            running: true,
            done: data.done,
            total: data.total,
            pct: data.pct,
            current_path: data.current_path,
          }))
        } else if (data.type === 'log') {
          const entry = { message: data.message, status: data.status }
          logsRef.current = [...logsRef.current.slice(-199), entry]
          setState((s) => ({ ...s, logs: logsRef.current }))
        } else if (data.type === 'done') {
          setState((s) => ({
            ...s,
            running: false,
            pct: 100,
            finished: data,
            connected: false,
          }))
          es.close()
        } else if (data.type === 'error') {
          const entry = { message: data.message, status: 'error' as const }
          logsRef.current = [...logsRef.current.slice(-199), entry]
          setState((s) => ({ ...s, logs: logsRef.current }))
        }
      } catch {
        /* ignore parse errors */
      }
    }

    es.onerror = () => {
      setState((s) => ({
        ...s,
        connected: false,
        running: false,
        error: 'Conexão SSE perdida. Verifique se o backend está rodando.',
      }))
      es.close()
    }
  }, [])

  const disconnect = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setState((s) => ({ ...s, connected: false, running: false }))
  }, [])

  // Check current state on mount (for already-running jobs)
  useEffect(() => {
    progressService
      .current()
      .then((res) => {
        if (res.running) {
          setState((s) => ({
            ...s,
            running: res.running,
            done: res.done,
            total: res.total,
            pct: res.pct,
            current_path: res.current_path,
          }))
        }
      })
      .catch(() => undefined)

    return () => {
      esRef.current?.close()
    }
  }, [])

  return { ...state, connect, disconnect }
}
