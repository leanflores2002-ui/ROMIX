import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = () => {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-zinc-200 border-t-pink-500" />
          <p className="mt-3 text-sm text-zinc-500">Cargando ROMIX…</p>
        </div>
      </div>
    );
  }

  return session ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
};
