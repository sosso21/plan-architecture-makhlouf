import { Link } from 'react-router-dom';
import { Icon } from '@/app/Icon';
import { TopBar } from '@/app/TopBar';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { PlanSketch } from './PlanSketch';
import { listProjects, type Project } from './registry';
import { useProjectScene } from './useProjectScene';

export function ProjectsPage() {
  useDocumentTitle('Projets');
  const projects = listProjects();
  return (
    <div className="page">
      <TopBar />
      <main className="page__main">
        <div className="page__head">
          <div>
            <p className="eyebrow">Portefeuille</p>
            <h1 className="display">Projets</h1>
            <p className="page__lead">Maquettes 3D interactives, plans et pièces téléchargeables de chaque projet de l'atelier.</p>
          </div>
          <p className="project-card__meta">
            {projects.length} projet{projects.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const scene = useProjectScene(project);
  const ground = scene.status === 'ready' ? scene.building.levels[1] ?? scene.building.levels[0] : undefined;
  return (
    <article className="project-card" style={{ ['--card-accent' as string]: project.accent }}>
      <Link to={`/projects/${project.slug}`} className="project-card__visual" aria-label={`Ouvrir le dossier ${project.title}`}>
        <span className="project-card__badge">{project.status}</span>
        {ground ? <PlanSketch level={ground} title={`Plan du ${ground.name.toLowerCase()}`} /> : <Icon name="cube" size={64} />}
      </Link>
      <div className="project-card__body">
        <h2 className="project-card__title">{project.title}</h2>
        <p className="project-card__meta">
          {project.location} · mis à jour le {new Date(project.updatedAt).toLocaleDateString('fr-FR')}
        </p>
        <p className="project-card__summary">{project.summary}</p>
        <ul className="chips">
          {project.facts.slice(0, 3).map((f) => (
            <li key={f.label}>{f.value}</li>
          ))}
        </ul>
        <div className="project-card__actions">
          <Link className="btn btn--primary btn--sm" to={`/${project.slug}`}>
            <Icon name="cube" size={18} /> Maquette 3D
          </Link>
          <Link className="btn btn--sm" to={`/projects/${project.slug}`}>
            Dossier <Icon name="arrow" size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
