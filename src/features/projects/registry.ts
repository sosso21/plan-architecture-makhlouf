/**
 * Registre des projets, découvert à la compilation : chaque dossier
 * `content/projects/<slug>/` contenant un `project.ts` devient un projet.
 * Les fichiers de `documents/` et `models/` sont publiés avec une empreinte
 * dans leur nom (cache immuable).
 *
 * Ajouter un projet = créer un dossier. Aucun autre fichier à modifier.
 */
import { RESERVED_SLUGS, type ProjectDocument, type ProjectManifest } from '@/domain/project';

const manifestModules = import.meta.glob<{ default: ProjectManifest }>('/content/projects/*/project.ts', { eager: true });
const documentFiles = import.meta.glob<string>('/content/projects/*/documents/*', { eager: true, query: '?url', import: 'default' });
const modelFiles = import.meta.glob<string>('/content/projects/*/models/*', { eager: true, query: '?url', import: 'default' });

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ResolvedDocument extends ProjectDocument {
  readonly url: string;
}

export interface Project extends ProjectManifest {
  readonly resolvedDocuments: readonly ResolvedDocument[];
  readonly models: readonly { file: string; url: string }[];
}

const folderOf = (path: string) => path.split('/')[3] ?? '';
const fileOf = (path: string) => path.split('/').pop() ?? '';

/** Valide et assemble les projets ; lève une erreur explicite en cas d'incohérence. */
export function buildRegistry(
  manifests: Record<string, { default: ProjectManifest }>,
  documents: Record<string, string>,
  models: Record<string, string>,
): Project[] {
  const seen = new Set<string>();
  return Object.entries(manifests)
    .map(([path, mod]) => {
      const m = mod.default;
      const folder = folderOf(path);
      if (!SLUG.test(m.slug)) throw new Error(`Slug invalide « ${m.slug} » (${path})`);
      if (m.slug !== folder) throw new Error(`Le slug « ${m.slug} » doit correspondre au dossier « ${folder} »`);
      if (RESERVED_SLUGS.includes(m.slug)) throw new Error(`Slug réservé : ${m.slug}`);
      if (seen.has(m.slug)) throw new Error(`Slug en double : ${m.slug}`);
      seen.add(m.slug);

      const docs = m.documents.map((d) => {
        const url = documents[`/content/projects/${folder}/documents/${d.file}`];
        if (!url) throw new Error(`Document introuvable : ${folder}/documents/${d.file}`);
        return { ...d, url };
      });
      const projectModels = Object.entries(models)
        .filter(([p]) => folderOf(p) === folder)
        .map(([p, url]) => ({ file: fileOf(p), url }));
      if (m.scene.kind === 'gltf') {
        const file = m.scene.file;
        if (!projectModels.some((x) => x.file === file)) throw new Error(`Modèle introuvable : ${folder}/models/${file}`);
      }
      return { ...m, resolvedDocuments: docs, models: projectModels };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const registry = buildRegistry(manifestModules, documentFiles, modelFiles);

export const listProjects = (): readonly Project[] => registry;
export const findProject = (slug: string | undefined): Project | undefined =>
  slug ? registry.find((p) => p.slug === slug.toLowerCase()) : undefined;
