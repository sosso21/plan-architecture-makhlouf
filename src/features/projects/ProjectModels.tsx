import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/app/Icon';
import { Toast, useToast } from '@/app/Toast';
import { formatBytes, saveBlob } from '@/lib/download';
import { useProjectContext } from './ProjectLayout';

type Job = 'meuble' | 'nu' | null;

export function ProjectModels() {
  const { project, scene } = useProjectContext();
  const [job, setJob] = useState<Job>(null);
  const toast = useToast(3200);

  const exportGlb = async (withFurniture: boolean) => {
    if (scene.status !== 'ready') return;
    setJob(withFurniture ? 'meuble' : 'nu');
    try {
      // Le moteur 3D n'est chargé qu'à la demande.
      const { exportBuildingGlb } = await import('@/engine/export');
      const blob = await exportBuildingGlb(scene.building, { withFurniture });
      saveBlob(blob, `${project.slug}${withFurniture ? '-meuble' : ''}.glb`);
      toast.show(`Modèle exporté (${formatBytes(blob.size)})`);
    } catch (e) {
      toast.show(e instanceof Error ? `Export impossible : ${e.message}` : 'Export impossible');
    } finally {
      setJob(null);
    }
  };

  const shareUrl = `${window.location.origin}/${project.slug}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.show('Lien copié');
    } catch {
      toast.show(shareUrl);
    }
  };

  return (
    <>
      <div className="model-grid">
        {scene.status === 'ready' && (
          <>
            <article className="model-card">
              <Icon name="cube" size={28} />
              <h3>Maquette meublée (.glb)</h3>
              <p>Trois niveaux, toiture, menuiseries et mobilier. Compatible Blender, SketchUp (extension glTF), Visionneuse 3D Windows.</p>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => exportGlb(true)} disabled={job !== null}>
                <Icon name="download" size={16} /> {job === 'meuble' ? 'Génération…' : 'Télécharger'}
              </button>
            </article>
            <article className="model-card">
              <Icon name="layers" size={28} />
              <h3>Maquette nue (.glb)</h3>
              <p>Structure seule (murs, dalles, escaliers, menuiseries) : idéale pour retravailler les volumes.</p>
              <button type="button" className="btn btn--sm" onClick={() => exportGlb(false)} disabled={job !== null}>
                <Icon name="download" size={16} /> {job === 'nu' ? 'Génération…' : 'Télécharger'}
              </button>
            </article>
          </>
        )}
        {project.models.map((m) => (
          <article className="model-card" key={m.file}>
            <Icon name="file" size={28} />
            <h3>{m.file}</h3>
            <p>Fichier 3D fourni avec le projet.</p>
            <a className="btn btn--sm" href={m.url} download={m.file}>
              <Icon name="download" size={16} /> Télécharger
            </a>
          </article>
        ))}
        <article className="model-card">
          <Icon name="link" size={28} />
          <h3>Lien de la maquette interactive</h3>
          <p>La visite 3D est publique (sans code) : partagez-la avec le client ou l'entreprise.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
            <button type="button" className="btn btn--sm" onClick={copyLink}>
              <Icon name="share" size={16} /> Copier le lien
            </button>
            <Link className="btn btn--ghost btn--sm" to={`/${project.slug}`}>
              Ouvrir
            </Link>
          </div>
        </article>
      </div>
      {scene.status === 'loading' && <p className="callout">Préparation des modèles…</p>}
      {scene.status === 'error' && <p className="callout">Modèle indisponible : {scene.message}</p>}
      <p className="callout">
        Les fichiers .glb sont générés dans votre navigateur à partir des données du projet : ils correspondent toujours exactement à la maquette en ligne.
      </p>
      <Toast state={toast} />
    </>
  );
}
