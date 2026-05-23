import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="err-boundary">
          <h2 className="err-title">Something went wrong</h2>
          <pre className="err-message">{this.state.error.message}</pre>
          <button className="btn btn-ghost" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <style>{`
            .err-boundary { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; padding: 40px; color: var(--text-muted); }
            .err-title { font-size: 1rem; font-weight: 700; color: var(--accent); }
            .err-message { font-size: 0.8rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px; max-width: 480px; white-space: pre-wrap; word-break: break-word; }
          `}</style>
        </div>
      )
    }
    return this.props.children
  }
}
