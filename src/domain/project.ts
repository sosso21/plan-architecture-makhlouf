import type { Building } from './building';
import type { Site } from './site';

export type DocumentKind = 'plan' | 'topographie' | 'notice' | 'autre';

export interface ProjectDocument {
  readonly id: string;
  readonly title: string;
  readonly kind: DocumentKind;
  /** Nom du fichier dans le dossier `documents/` du projet. */
  readonly file: string;
  readonly description?: string;
}

export interface ProjectFact {
  readonly label: string;
  readonly value: string;
}

/** Une scène 3D est soit générée depuis des données, soit un fichier .glb. */
export type ProjectScene =
  | {
      readonly kind: 'procedural';
      readonly load: () => Promise<{ building: Building; site: Site }>;
    }
  | {
      readonly kind: 'gltf';
      /** Nom du fichier dans le dossier `models/` du projet. */
      readonly file: string;
    };

export interface ProjectManifest {
  /** Identifiant d'URL : `/<slug>` et `/projects/<slug>`. */
  readonly slug: string;
  readonly title: string;
  readonly client?: string;
  readonly location: string;
  readonly status: string;
  readonly summary: string;
  readonly updatedAt: string;
  readonly facts: readonly ProjectFact[];
  readonly documents: readonly ProjectDocument[];
  readonly scene: ProjectScene;
  /** Hypothèses de modélisation affichées à l'utilisateur. */
  readonly assumptions: readonly string[];
  /** Couleur d'accent de la carte projet. */
  readonly accent?: string;
}

export const RESERVED_SLUGS: readonly string[] = ['projects', 'assets', 'api'];
