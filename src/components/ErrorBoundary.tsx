import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** Optional reset hook, e.g. re-run a failed fetch when the user retries. */
  onReset?: () => void
}

type State = {
  error: Error | null
}

/**
 * Catches render-time errors so one broken screen can never blank the whole
 * app. Instead of unmounting everything, it shows a retryable panel; "Try
 * again" clears the error and re-renders the children. App renders it with a
 * per-route key, so navigating away from a failed screen also recovers.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /* Keep the real error in the console for developers; the user sees the
       friendly fallback below. */
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  private reset = (): void => {
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="dashboard-content">
          <div className="page-state page-state--error" role="alert">
            <p className="page-state__title">Something went wrong</p>
            <p className="page-state__text">
              This screen ran into an unexpected error. Try again, or reload the page.
            </p>
            <button type="button" className="claims-btn claims-btn--primary" onClick={this.reset}>
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
