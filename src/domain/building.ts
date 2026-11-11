/**
 * Modèle de données d'un bâtiment, indépendant du moteur 3D.
 *
 * Convention de repère « plan » : x = vers la droite du plan, y = vers le haut
 * du plan, en mètres. L'origine est le centre du poteau en bas à gauche de la
 * trame. Les altitudes sont relatives au sol fini du niveau le plus bas.
 */

export type Vec2 = readonly [number, number];

export interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export const rect = (x0: number, y0: number, x1: number, y1: number): Rect => ({
  x0: Math.min(x0, x1),
  y0: Math.min(y0, y1),
  x1: Math.max(x0, x1),
  y1: Math.max(y0, y1),
});

export type OpeningKind =
  | 'window'
  | 'highWindow'
  | 'door'
  | 'entryDoor'
  | 'slidingDoor'
  | 'garageDoor'
  | 'passage';

/**
 * Ouverture dans un mur. `from` / `to` sont exprimés dans la coordonnée
 * absolue le long de l'axe du mur (x pour un mur horizontal, y pour un mur
 * vertical), comme on les relève sur le plan.
 */
export interface Opening {
  readonly kind: OpeningKind;
  readonly from: number;
  readonly to: number;
  readonly sill?: number;
  readonly head?: number;
}

export type WallFinish = 'exterior' | 'interior' | 'basement';

export interface Wall {
  readonly a: Vec2;
  readonly b: Vec2;
  readonly thickness: number;
  readonly finish: WallFinish;
  readonly openings?: readonly Opening[];
  /** Hauteur propre (par défaut : hauteur sous plafond + dalle). */
  readonly height?: number;
}

/**
 * Mur courbe en arc de cercle (cage d'escalier en demi-lune, bow-window
 * arrondi). L'extérieur est toujours le côté convexe. Angles en degrés,
 * sens trigonométrique depuis +x.
 */
export interface CurvedWall {
  readonly center: Vec2;
  /** Rayon de l'axe médian du mur. */
  readonly radius: number;
  readonly fromDeg: number;
  readonly toDeg: number;
  readonly thickness: number;
  readonly finish: WallFinish;
  readonly height?: number;
}

export type FloorFinish = 'parquet' | 'tile' | 'stone' | 'concrete' | 'deck' | 'wet' | 'terracotta';

export interface Room {
  readonly id: string;
  readonly name: string;
  readonly rects: readonly Rect[];
  readonly floor: FloorFinish;
  /** Position de l'étiquette ; par défaut le centre du premier rectangle. */
  readonly label?: Vec2;
  /** Point de vue intérieur proposé dans la visite guidée. */
  readonly tour?: boolean;
  /** Pièce extérieure (terrasse) : pas d'éclairage nocturne intérieur. */
  readonly outdoor?: boolean;
}

export type Direction = 'N' | 'S' | 'E' | 'W';

export type StairRun =
  | {
      readonly kind: 'straight';
      /** Coin de départ du volée, côté gauche dans le sens de la montée. */
      readonly rect: Rect;
      readonly dir: Direction;
      readonly count: number;
    }
  | {
      readonly kind: 'winder';
      readonly rect: Rect;
      /** Point de rotation des marches balancées. */
      readonly pivot: Vec2;
      /** Angles (degrés, sens trigonométrique depuis +x) de début et fin. */
      readonly fromDeg: number;
      readonly toDeg: number;
      readonly count: number;
    }
  | {
      /** Palier de forme libre (une seule marche), p. ex. palier en demi-lune. */
      readonly kind: 'landing';
      readonly polygon: readonly Vec2[];
    };

export interface Stair {
  readonly id: string;
  readonly runs: readonly StairRun[];
  /** Dénivelé total franchi, depuis l'altitude du niveau qui le porte. */
  readonly rise: number;
  /** Marche de départ décalée sous le niveau (escalier descendant). */
  readonly descending?: boolean;
  /** Marches massives (béton, pierre) ou suspendues (bois). */
  readonly style?: 'solid' | 'floating';
}

export interface Railing {
  readonly path: readonly Vec2[];
  /** Altitude du pied de garde-corps à chaque sommet (rampant d'escalier). */
  readonly base?: readonly number[];
  readonly height?: number;
  readonly style: 'glass' | 'metal';
}

export type FurnitureType =
  | 'doubleBed'
  | 'singleBed'
  | 'nightstand'
  | 'wardrobe'
  | 'sofa'
  | 'cornerSofa'
  | 'armchair'
  | 'coffeeTable'
  | 'tvUnit'
  | 'diningTable'
  | 'kitchenRun'
  | 'kitchenIsland'
  | 'fridge'
  | 'desk'
  | 'bookshelf'
  | 'toilet'
  | 'vanity'
  | 'shower'
  | 'bathtub'
  | 'washer'
  | 'plant'
  | 'rug'
  | 'car'
  | 'outdoorLounge'
  | 'outdoorDining'
  | 'shelving'
  | 'floorLamp';

export interface FurnitureItem {
  readonly type: FurnitureType;
  /** Centre de l'objet. */
  readonly at: Vec2;
  /** Largeur (x local) × profondeur (y local), avant rotation. */
  readonly size?: Vec2;
  /** Rotation en degrés, sens trigonométrique. 0 = « face » vers -y. */
  readonly rot?: number;
  readonly variant?: string;
}

export type LevelId = string;

export interface Slab {
  /** Contour extérieur (polygone orthogonal, sens quelconque). */
  readonly outline: readonly Vec2[];
  readonly holes?: readonly (readonly Vec2[])[];
}

export interface Level {
  readonly id: LevelId;
  readonly name: string;
  readonly shortName: string;
  /** Altitude du sol fini, relative au niveau 0 du bâtiment. */
  readonly elevation: number;
  /** Hauteur sous plafond. */
  readonly height: number;
  /** Plancher porteur de ce niveau (absent pour un dallage sur terre-plein). */
  readonly slab?: Slab;
  readonly walls: readonly Wall[];
  readonly curvedWalls?: readonly CurvedWall[];
  readonly rooms: readonly Room[];
  readonly columns: readonly Vec2[];
  readonly stairs: readonly Stair[];
  readonly railings: readonly Railing[];
  readonly furniture: readonly FurnitureItem[];
}

export interface Roof {
  readonly elevation: number;
  readonly slab: Slab;
  readonly parapetHeight: number;
  readonly parapetThickness: number;
  /** Pergola à lames posée à hauteur de toiture (terrasse d'étage). */
  readonly pergola?: Rect;
}

export interface Building {
  readonly levels: readonly Level[];
  readonly roof: Roof;
  readonly slabThickness: number;
  /** Taille de section des poteaux (carrés). */
  readonly columnSize: number;
  /** Emprise enterrée : le terrain est évidé à l'intérieur de ces rectangles. */
  readonly footprint: readonly Rect[];
}
