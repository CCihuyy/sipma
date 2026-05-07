import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext, Role } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const auth = useContext(AuthContext);

  if (auth?.isLoading) {
    return <div className="flex items-center justify-center h-screen bg-slate-900"><div className="text-slate-200">Loading...</div></div>;
  }

  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (auth.user && !allowedRoles.includes(auth.user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
