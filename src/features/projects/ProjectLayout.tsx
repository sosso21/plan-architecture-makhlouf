import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { Icon } from '@/app/Icon';
import { NotFoundPage } from '@/app/NotFoundPage';
import { TopBar } from '@/app/TopBar';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { findProject, type Project } from './registry';
import { useProjectScene, type SceneState } from './useProjectScene';

export interface ProjectOutletContext {
  readonly project: Project;
  readonly scene: SceneState;
}

export const useProjectContext = () => useOutletContext<ProjectOutletContext>();

export function ProjectLayout() {
  const { slug } = useParams();
  const project = findProject(slug);
  const scene = useProjectScene(project);
  useDocumentTitle(project?.title ?? 'Projet introuvable');
  if (!project) return <NotFoundPage />;

  return (
    <div className="page">
      <TopBar />
      <main className="page__main">
        <Link to="/projects" className="btn btn--ghost btn--sm" style={{ marginLeft: -12, marginBottom: 18 }}>
          <Icon name="back" size={18} /> Tous les projets
        </Link>
        <header className="project-hero">
          <div>
            <p className="eyebrow">
              {project.location} · {project.status}
            </p>
            <h1 className="display">{project.title}</h1>
          </div>
          <div className="project-hero__actions">
            <Link className="btn btn--primary" to={`/${project.slug}`}>
              <Icon name="cube" size={18} /> Ouvrir la maquette 3D
            </Link>
          </div>
        </header>
        <nav className="tabs" aria-label="Sections du projet">
          <NavLink to="" end>
            Aperçu
          </NavLink>
          <NavLink to="documents">Documents</NavLink>
          <NavLink to="modeles-3d">Modèles 3D</NavLink>
        </nav>
        <Outlet context={{ project, scene } satisfies ProjectOutletContext} />
      </main>
    </div>
  );
}
