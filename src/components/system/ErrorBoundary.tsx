import React from 'react';

interface State { error: Error | null }

/** Catches render errors so one broken module can't take down the suite. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2 style={{ color: 'var(--red)' }}>حدث خطأ غير متوقع</h2>
          <p style={{ color: 'var(--soft)', margin: '8px 0 16px' }}>{String(this.state.error)}</p>
          <button className="btn btn-primary" onClick={() => { this.setState({ error: null }); location.reload(); }}>
            إعادة تحميل النظام
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
