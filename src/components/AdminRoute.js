import { useAuth } from '../contexts/AuthContext';

/**
 * Admin-only route guard
 * Redirects to admin login if not authenticated
 * Redirects to home if authenticated but not admin
 */
function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Store intended destination for post-login redirect
    sessionStorage.setItem('auth_redirect', window.location.hash);
    window.location.hash = '#/admin/login';
    return null;
  }

  if (!isAdmin()) {
    // User is logged in but not an admin
    // Redirect to home with a message (or could show access denied)
    console.warn('Access denied: Admin role required');
    window.location.hash = '#/';
    return null;
  }

  return children;
}

export default AdminRoute;
