/**
 * ErrorBoundary - Catches and displays React errors gracefully
 */

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo: errorInfo.componentStack || null,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.errorBox}>
            <h1 style={styles.title}>🚨 Something went wrong</h1>
            <div style={styles.errorMessage}>
              <strong>Error:</strong> {this.state.error?.message}
            </div>
            {this.state.errorInfo && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details</summary>
                <pre style={styles.pre}>{this.state.errorInfo}</pre>
              </details>
            )}
            <button
              style={styles.button}
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '2rem',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '2px solid #ef4444',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '600px',
    width: '100%',
  },
  title: {
    color: '#ef4444',
    marginBottom: '1rem',
    fontSize: '1.5rem',
  },
  errorMessage: {
    color: '#e0e0e0',
    marginBottom: '1rem',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '8px',
  },
  details: {
    marginTop: '1rem',
    color: '#e0e0e0',
  },
  summary: {
    cursor: 'pointer',
    padding: '0.5rem',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '4px',
    marginBottom: '0.5rem',
  },
  pre: {
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '1rem',
    borderRadius: '8px',
    overflow: 'auto',
    fontSize: '0.875rem',
    color: '#fca5a5',
  },
  button: {
    marginTop: '1.5rem',
    padding: '0.75rem 1.5rem',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
};
