import { useEffect, useState } from 'react';
import type { Building } from '@/domain/building';
import type { Site } from '@/domain/site';
import type { Project } from './registry';

export type SceneState =
  | { status: 'loading' }
  | { status: 'ready'; building: Building; site: Site }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

/** Charge (à la demande) les données 3D d'un projet procédural. */
export function useProjectScene(project: Project | undefined): SceneState {
  const [state, setState] = useState<SceneState>({ status: 'loading' });
  useEffect(() => {
    if (!project || project.scene.kind !== 'procedural') {
      setState({ status: 'unavailable' });
      return;
    }
    let alive = true;
    setState({ status: 'loading' });
    project.scene
      .load()
      .then(({ building, site }) => alive && setState({ status: 'ready', building, site }))
      .catch((e: unknown) => alive && setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [project]);
  return state;
}
