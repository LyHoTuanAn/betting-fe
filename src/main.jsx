import React, {Component} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './app.jsx';
import './shared/preload.js';
import './styles.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error) {
    return {hasError: true, error};
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          color: '#f5c542',
          background: '#0d0d11',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h2 style={{fontSize: '24px', marginBottom: '12px'}}>Đã xảy ra sự cố khi tải giao diện</h2>
          <p style={{color: '#aaa', maxWidth: '480px', marginBottom: '24px', fontSize: '14px'}}>
            {this.state.error?.message || 'Có sự cố ngoài dự kiến. Vui lòng tải lại trang.'}
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              location.hash = '#home';
              location.reload();
            }}
            style={{
              padding: '12px 28px',
              background: 'linear-gradient(135deg, #f5c542, #b8860b)',
              color: '#000',
              fontWeight: 'bold',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
