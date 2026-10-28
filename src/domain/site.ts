import type { Rect, Vec2 } from './building';

/** Courbe de niveau relevée sur le plan topographique (repère « plan »). */
export interface Contour {
  readonly height: number;
  readonly points: readonly Vec2[];
}

/**
 * Plateforme de terrassement : sur `rect` (élargi de `feather` mètres en
 * talus), le terrain naturel est remplacé par un plan incliné allant de
 * `heightStart` (côté `axisStart`) à `heightEnd` (côté opposé).
 */
export interface GradingPad {
  readonly id: string;
  readonly rect: Rect;
  readonly axis: 'x' | 'y';
  readonly heightStart: number;
  readonly heightEnd: number;
  readonly feather: number;
  readonly surface: 'gravel' | 'paving' | 'none';
}

export interface SitePole {
  readonly at: Vec2;
  readonly height: number;
  /** Tracé de la ligne aérienne partant du poteau. */
  readonly line: readonly Vec2[];
}

export interface Site {
  /** Altitude (repère terrain) du niveau 0 du bâtiment. */
  readonly buildingBase: number;
  readonly boundary: readonly Vec2[];
  readonly contours: readonly Contour[];
  /** Hypothèse d'équidistance des courbes (non cotée sur le plan source). */
  readonly contourInterval: number;
  /** Bords de la piste (deux polylignes). */
  readonly road: readonly [readonly Vec2[], readonly Vec2[]];
  readonly pads: readonly GradingPad[];
  readonly poles: readonly SitePole[];
  /** Demi-étendue du terrain modélisé autour du centre de la parcelle. */
  readonly extent: number;
  /** Zones sans arbres (bâtiment, accès). */
  readonly treeExclusions: readonly Rect[];
}
