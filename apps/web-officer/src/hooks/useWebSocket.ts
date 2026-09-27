import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface WSMessage {
  type: string
  data?: any
}

type MessageHandler = (message: WSMessage) => void

export function useWebSocket(onMessage?: MessageHandler) {
  const wsRef = useRef<WebSocket | null>(null)
  const onMessageRef = useRef<MessageHandler | undefined>(onMessage)
  const { token } = useAuthStore()

  // Keep the callback ref up to date without triggering reconnects
  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/${token}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('[WS] Connected')
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage
        onMessageRef.current?.(message)
      } catch (e) {
        console.error('[WS] Failed to parse message:', e)
      }
    }

    ws.onclose = (event) => {
      console.log(`[WS] Disconnected: ${event.code}`)
      wsRef.current = null
      // Auto-reconnect after 3 seconds (unless auth expired)
      if (event.code !== 4001) {
        setTimeout(connect, 3000)
      }
    }

    ws.onerror = (error) => {
      console.error('[WS] Error:', error)
    }

    wsRef.current = ws
  }, [token])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  return { send, ws: wsRef }
}
