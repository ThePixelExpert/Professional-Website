import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function AdminLogin() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, isAdmin } = useAuth();

  // If already logged in as admin, redirect to dashboard
  useEffect(() => {
    if (user && isAdmin()) {
      // Check for stored redirect destination
      const redirectTo = sessionStorage.getItem('auth_redirect') || '#/admin';
      sessionStorage.removeItem('auth_redirect');
      window.location.hash = redirectTo.replace('#', '');
    } else if (user && !isAdmin()) {
      // Logged in but not admin
      setError('Access denied. Admin privileges required.');
    }
  }, [user, isAdmin]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}#/admin`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        console.error('OAuth error:', error);
        setError(error.message);
        setLoading(false);
      }
      // If successful, the page will redirect to Google
      // After auth, Supabase will redirect back to redirectTo URL
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 400,
      margin: '4rem auto',
      padding: 32,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: 24, textAlign: 'center' }}>Admin Login</h2>

      {error && (
        <div style={{
          color: '#dc2626',
          background: '#fef2f2',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px 24px',
          fontSize: 16,
          fontWeight: 500,
          color: '#fff',
          background: loading ? '#9ca3af' : '#4285f4',
          border: 'none',
          borderRadius: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12
        }}
      >
        {loading ? (
          'Redirecting...'
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </>
        )}
      </button>

      <p style={{
        marginTop: 24,
        fontSize: 13,
        color: '#6b7280',
        textAlign: 'center'
      }}>
        Admin access is restricted to authorized accounts.
      </p>
    </div>
  );
}

export default AdminLogin;
