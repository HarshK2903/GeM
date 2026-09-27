import { StrictMode, Component, ErrorInfo, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error Boundary caught:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1a1a2e', color: '#e94560', minHeight: '100vh' }}>
          <h1 style={{ color: '#fff' }}>⚠️ Application Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: '#ff6b6b', marginTop: 20 }}>
            {this.state.error.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#888', marginTop: 10 }}>
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
} catch (e: any) {
  document.getElementById('root')!.innerHTML = `
    <div style="padding:40px;font-family:monospace;background:#1a1a2e;color:#e94560;min-height:100vh">
      <h1 style="color:#fff">⚠️ Fatal Error (module load)</h1>
      <pre style="white-space:pre-wrap;font-size:14px;color:#ff6b6b;margin-top:20px">${e?.message}</pre>
      <pre style="white-space:pre-wrap;font-size:12px;color:#888;margin-top:10px">${e?.stack}</pre>
    </div>
  `
}
