import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { pinGuard } from './pin';

/** Redirige vers la saisie du code PIN si la session n'est pas ouverte. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!pinGuard.isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
