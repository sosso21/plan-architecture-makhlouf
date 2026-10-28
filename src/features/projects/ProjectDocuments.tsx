import { useState } from 'react';
import { Icon } from '@/app/Icon';
import { Toast, useToast } from '@/app/Toast';
import { fetchBytes, saveBlob } from '@/lib/download';
import { createZip } from '@/lib/zip';
import { useProjectContext } from './ProjectLayout';
import type { ResolvedDocument } from './registry';

export function ProjectDocuments() {
  const { project } = useProjectContext();
  const [preview, setPreview] = useState<ResolvedDocument | null>(null);
  const [zipping, setZipping] = useState(false);
  const toast = useToast();

  const downloadAll = async () => {
    setZipping(true);
    try {
      const entries = await Promise.all(project.resolvedDocuments.map(async (d) => ({ name: `${project.slug}/${d.file}`, data: await fetchBytes(d.url) })));
      saveBlob(new Blob([createZip(entries)], { type: 'application/zip' }), `${project.slug}-documents.zip`);
      toast.show('Archive prête');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Échec du téléchargement');
    } finally {
      setZipping(false);
    }
  };

  return (
    <>
      <div className="page__head" style={{ marginBottom: 18 }}>
        <p className="page__lead" style={{ margin: 0 }}>
          Plans d'origine fournis pour ce projet, consultables en ligne ou téléchargeables.
        </p>
        <button type="button" className="btn" onClick={downloadAll} disabled={zipping || project.resolvedDocuments.length === 0}>
          <Icon name="download" size={18} /> {zipping ? 'Préparation…' : 'Tout télécharger (.zip)'}
        </button>
      </div>
      <ul className="doc-list">
        {project.resolvedDocuments.map((d) => (
          <li key={d.id} className="doc-item">
            <span className="doc-item__icon">PDF</span>
            <div>
              <h3>{d.title}</h3>
              {d.description && <p>{d.description}</p>}
            </div>
            <div className="doc-item__actions">
              <button
                type="button"
                className="btn btn--sm"
                aria-pressed={preview?.id === d.id}
                onClick={() => setPreview((p) => (p?.id === d.id ? null : d))}
              >
                <Icon name="eye" size={16} /> {preview?.id === d.id ? 'Fermer' : 'Aperçu'}
              </button>
              <a className="btn btn--primary btn--sm" href={d.url} download={d.file}>
                <Icon name="download" size={16} /> Télécharger
              </a>
            </div>
          </li>
        ))}
      </ul>
      {preview && (
        <section className="section" aria-label={`Aperçu : ${preview.title}`}>
          <h2>{preview.title}</h2>
          <object className="pdf-frame" data={preview.url} type="application/pdf">
            <p className="callout">
              L'aperçu PDF n'est pas disponible sur cet appareil.{' '}
              <a href={preview.url} target="_blank" rel="noreferrer">
                Ouvrir le document
              </a>
            </p>
          </object>
        </section>
      )}
      <Toast state={toast} />
    </>
  );
}
