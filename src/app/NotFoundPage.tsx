import { Link } from 'react-router-dom';
import { useDocumentTitle } from './useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page introuvable');
  return (
    <main className="empty-state">
      <p className="display">404</p>
      <h1 style={{ margin: 0, fontSize: '1.3rem' }}>Cette page n'existe pas.</h1>
      <p style={{ margin: 0, color: 'var(--muted)' }}>Le lien est peut-être incomplet ou le projet a été renommé.</p>
      <Link className="btn btn--primary" to="/">
        Retour à l'accueil
      </Link>
    </main>
  );
}
