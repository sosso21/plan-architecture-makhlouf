/**
 * Export de la maquette au format glTF binaire (.glb), généré dans le
 * navigateur à partir des mêmes données que la visionneuse : le fichier
 * téléchargé est toujours synchrone avec le modèle affiché.
 */
import * as THREE from 'three';
import type { Building } from '@/domain/building';
import { buildBuilding } from './builders/building';
import { MaterialLibrary } from './materials/library';
import { findFacade, findInterior } from './materials/palettes';

export interface GlbOptions {
  readonly withFurniture: boolean;
  readonly facade?: string;
  readonly interior?: string;
}

export async function exportBuildingGlb(building: Building, options: GlbOptions): Promise<Blob> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const lib = new MaterialLibrary(4);
  try {
    lib.applyFacade(findFacade(options.facade));
    lib.applyInterior(findInterior(options.interior));
    // Les plans de coupe et extensions de shader ne sont pas exportés.
    lib.all().forEach((m) => (m.clippingPlanes = null));
    const model = buildBuilding(building, lib, 0);
    const root = new THREE.Group();
    root.name = 'maquette';
    model.levels.forEach((level) => {
      level.group.name = level.name;
      if (!options.withFurniture) level.group.remove(level.furniture);
      root.add(level.group);
    });
    root.add(model.roof);
    const result = await new GLTFExporter().parseAsync(root, { binary: true, onlyVisible: false });
    if (!(result instanceof ArrayBuffer)) throw new Error('Export GLB inattendu');
    root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    return new Blob([result], { type: 'model/gltf-binary' });
  } finally {
    lib.dispose();
  }
}
