import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          gap: '1rem',
          padding: '2rem',
          background: 'var(--green-dark)',
          color: 'white',
          textAlign: 'center',
          fontFamily: 'var(--font-sans)',
        }}>
          <div style={{ fontSize: '2.5rem' }}>⛳</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Something went wrong</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.7, maxWidth: '280px' }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1.25rem',
              borderRadius: '999px',
              border: '1.5px solid rgba(255,255,255,0.5)',
              background: 'none',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
