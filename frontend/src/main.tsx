import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Global Fetch Interceptor to handle JWT token expiration/invalidation
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401 || response.status === 403) {
    try {
      const clone = response.clone();
      const json = await clone.json();
      if (json && (
        json.message?.includes('Token') || 
        json.message?.includes('Expired') ||
        json.message?.includes('Denied')
      )) {
        localStorage.removeItem('forge_token');
        localStorage.removeItem('forge_user');
        window.dispatchEvent(new Event('auth-change'));
        
        const publicPaths = ['/login', '/signup', '/forgot-password', '/verify-reset-otp', '/reset-password', '/', '/projects', '/pricing', '/about', '/contact'];
        if (!publicPaths.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
      }
    } catch (_) {
      // Ignored
    }
  }
  return response;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
