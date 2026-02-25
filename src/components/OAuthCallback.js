import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Handles the OAuth callback redirect.
 * The hash router lands here when Supabase returns #access_token=...
 *
 * Strategy:
 * - Only act on SIGNED_IN (the new OAuth token), not INITIAL_SESSION.
 *   INITIAL_SESSION can fire with an old stored session that predates the
 *   admin role being set, causing a false "access denied" before the new
 *   token is processed.
 * - getSession() fallback handles the race where Supabase finishes
 *   processing the token before our onAuthStateChange subscription is set up.
 */
function OAuthCallback() {
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    let handled = false;

    const handleSession = (session) => {
      if (handled) return;
      handled = true;

      const userRole = session?.user?.app_metadata?.user_role;
      const dest = sessionStorage.getItem('auth_redirect') || '/admin';
      sessionStorage.removeItem('auth_redirect');

      if (userRole === 'admin') {
        window.location.hash = dest.replace(/^#/, '');
      } else {
        setStatus('Access denied: admin role required.');
        setTimeout(() => { window.location.hash = '/'; }, 2000);
      }
    };

    // Primary: wait for SIGNED_IN from the OAuth token processing.
    // Ignore INITIAL_SESSION — it may carry an old session without the role.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        handleSession(session);
      }
    });

    // Fallback: token may have been processed before the subscription was set up.
    // Only redirect if the session already has the admin role (i.e. it's fresh).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.app_metadata?.user_role === 'admin') {
        handleSession(session);
      }
      // Otherwise wait for SIGNED_IN above.
    });

    // Safety: if nothing resolves in 10s, send back to login.
    const timeout = setTimeout(() => {
      if (!handled) window.location.hash = '/admin/login';
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
