import { useAuth } from '../contexts/AuthContext';

/**
 * Generic protected route - requires any authenticated user
 * Redirects to home if not authenticated
 */
function ProtectedRoute({ children, redirectTo = '/' }) {
  const { user, loading } = useAuth();

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
    // Using hash-based navigation
    window.location.hash = redirectTo;
    return null;
  }

  return children;
}

export default ProtectedRoute;
