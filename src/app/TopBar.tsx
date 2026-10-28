import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { pinGuard } from '@/features/auth/pin';
import { BrandMark, Icon } from './Icon';

export function TopBar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const logout = () => {
    pinGuard.logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="topbar">
      <Link to="/projects" className="brand">
        <BrandMark />
        <span>Atelier Makhlouf</span>
      </Link>
      <button
        type="button"
        className="topbar__burger"
        aria-expanded={open}
        aria-controls="main-nav"
        aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? 'close' : 'menu'} />
      </button>
      <nav id="main-nav" className="topbar__nav" data-open={open} aria-label="Navigation principale">
        <NavLink to="/projects" end className="topbar__link">
          Projets
        </NavLink>
        <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
          <Icon name="logout" size={18} /> Verrouiller
        </button>
      </nav>
    </header>
  );
}
