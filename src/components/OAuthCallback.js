import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Handles the OAuth callback redirect.
 * The hash router lands here when Supabase returns #access_token=...
 * We wait for SIGNED_IN (async token processing) before redirecting.
 */
function OAuthCallback() {
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        const userRole = session.user?.app_metadata?.user_role;
        const redirect = sessionStorage.getItem('auth_redirect') || '/admin';
        sessionStorage.removeItem('auth_redirect');

        if (userRole === 'admin') {
          window.location.hash = redirect.replace(/^#/, '');
        } else {
          setStatus('Access denied: admin role required.');
          setTimeout(() => { window.location.hash = '/'; }, 2000);
        }
      }
      // If INITIAL_SESSION fires with null, Supabase is still processing
      // the access_token — just wait for SIGNED_IN
    });

    // Safety timeout: if OAuth processing hangs, go back to login
    const timeout = setTimeout(() => {
      window.location.hash = '/admin/login';
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: 16,
      color: '#6b7280'
    }}>
      {status}
    </div>
  );
}

export default OAuthCallback;
