import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullPageLoader } from './ui/Misc';

/** Gate for authenticated routes. Redirects to /login when signed out. */
export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Gate for trainer-only routes. */
export function RequireTrainer() {
  const { profile, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (profile?.role !== 'trainer' && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
