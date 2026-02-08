import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function CustomerAuth({ onSuccess, redirectTo = '#/account' }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (onSuccess) {
        onSuccess(user);
      } else {
        window.location.hash = redirectTo.replace('#', '');
      }
    }
  }, [user, onSuccess, redirectTo]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    }
    // Success handled by useEffect watching user
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name
        },
        emailRedirectTo: `${window.location.origin}${window.location.pathname}#/account`
      }
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else if (data.user && !data.session) {
      // Email confirmation required
      setMessage('Check your email for a confirmation link.');
    }
    // Success with session handled by useEffect
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}${redirectTo}`
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // Success: page redirects to Google
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    marginTop: 4
  };

  const buttonStyle = {
    width: '100%',
    padding: '12px 24px',
    fontSize: 14,
    fontWeight: 500,
    border: 'none',
    borderRadius: 6,
    cursor: loading ? 'not-allowed' : 'pointer'
  };

  return (
    <div style={{
      maxWidth: 400,
      margin: '2rem auto',
      padding: 24,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ marginBottom: 8, textAlign: 'center' }}>
        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
      </h2>
      <p style={{ marginBottom: 24, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
        {mode === 'login'
          ? 'Sign in to view your orders'
          : 'Create an account to track orders'}
      </p>

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

      {message && (
        <div style={{
          color: '#059669',
          background: '#ecfdf5',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14
        }}>
          {message}
        </div>
      )}

      {/* Google OAuth button */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{
          ...buttonStyle,
          background: '#fff',
          color: '#374151',
          border: '1px solid #d1d5db',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 16
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '16px 0',
        color: '#9ca3af',
        fontSize: 13
      }}>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        <span style={{ padding: '0 12px' }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      </div>

      {/* Email/Password form */}
      <form onSubmit={mode === 'login' ? handleEmailLogin : handleEmailSignup}>
        {mode === 'signup' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 500 }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              style={inputStyle}
            />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 500 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
            required
            minLength={6}
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyle,
            background: loading ? '#9ca3af' : '#2563eb',
            color: '#fff'
          }}
        >
          {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
        </button>
      </form>

      <p style={{ marginTop: 16, textAlign: 'center', fontSize: 14 }}>
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button
              onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
              style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              onClick={() => { setMode('login'); setError(null); setMessage(null); }}
              style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

export default CustomerAuth;
