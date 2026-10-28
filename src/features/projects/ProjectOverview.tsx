import { PlanSketch } from './PlanSketch';
import { useProjectContext } from './ProjectLayout';

export function ProjectOverview() {
  const { project, scene } = useProjectContext();
  return (
    <>
      <p className="page__lead" style={{ fontSize: '1.08rem', marginBottom: 26 }}>
        {project.summary}
      </p>
      <dl className="facts">
        {project.facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

      {scene.status === 'ready' && (
        <section className="section" aria-labelledby="plans-title">
          <h2 id="plans-title">Plans de niveaux</h2>
          <div className="plans-grid">
            {scene.building.levels.map((level) => (
              <figure className="plan-tile" key={level.id}>
                <PlanSketch level={level} />
                <figcaption>{level.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      {scene.status === 'error' && <p className="callout">Plans indisponibles : {scene.message}</p>}

      {project.assumptions.length > 0 && (
        <section className="section" aria-labelledby="hyp-title">
          <h2 id="hyp-title">Hypothèses de modélisation</h2>
          <ul className="note-list">
            {project.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
