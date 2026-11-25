/**
 * Maison Youcef 003 — Oued Ksari (version 3 du projet).
 *
 * Données relevées sur les plans vectoriels « proposition 003 » (sous-sol,
 * rez-de-chaussée, étage, grenier). Les plans n'ont pas de plan de masse :
 * l'échelle est déduite des cotes de pièces (4,15 / 8,65 / 4,20 m) et les
 * quatre niveaux sont recalés sur la trame des poteaux du RDC :
 *   axes x : 0 · 4,20 · 8,70 · 13,10 m (-0,50 au sous-sol)
 *   axes y : 0 · 4,00 · 8,00 · 11,80 · 14,80 m (porche devant les garages)
 * Toutes les cotes sont en mètres, origine = poteau bas-gauche du plan.
 *
 * Nouveautés : escalier central en U superposé sur trois niveaux, salon en
 * double hauteur, cuisine dans le bow-window nord et grenier aménagé
 * (studio, rangement, grande terrasse avec coin cuisine d'été).
 */
import { rect, type Building, type Level, type Slab, type Stair, type Vec2, type Wall } from '@/domain/building';

const EXT = 0.3;
const INT = 0.1;
const FLOOR_TO_FLOOR = 3.06;
const CEILING = 2.9;

const ext = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = EXT): Wall => ({ a, b, thickness, finish: 'exterior', openings });
const base = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = EXT): Wall => ({ a, b, thickness, finish: 'basement', openings });
const int = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = INT): Wall => ({ a, b, thickness, finish: 'interior', openings });

/** Trame des poteaux de la maison (RDC, étage). */
const GRID_COLUMNS: Vec2[] = [
  [0, 0], [4.2, 0], [8.7, 0], [13.1, 0],
  [0, 4], [4.2, 4], [8.7, 4], [13.1, 4],
  [0, 8], [4.2, 8], [8.7, 8], [13.1, 8],
  [0, 11.8], [4.2, 11.8], [8.7, 11.8], [13.1, 11.8],
];

/** Au sous-sol, la file ouest des garages est décalée à -0,50 et le porche ajoute une file à 14,80. */
const BASEMENT_COLUMNS: Vec2[] = [
  [0, 0], [4.2, 0], [8.7, 0], [13.1, 0],
  [-0.5, 4], [4.2, 4], [8.7, 4], [13.1, 4],
  [-0.5, 8], [4.2, 8], [8.7, 8], [13.1, 8],
  [-0.5, 11.8], [4.2, 11.8], [8.7, 11.8], [13.1, 11.8],
  [-0.5, 14.8], [4.2, 14.8], [8.7, 14.8],
];

/** Au grenier, seuls les poteaux du studio et ceux de la pergola (file ouest) montent. */
const ATTIC_COLUMNS: Vec2[] = [
  [0, 0], [4.2, 0], [8.7, 0], [13.1, 0],
  [0, 4], [4.2, 4], [8.7, 4], [13.1, 4],
  [0, 8], [4.2, 8], [8.7, 8], [13.1, 8],
  [0, 11.8],
];

/* ------------------------------------------------------------------ */
/*                  Escalier central en U (3 volées)                   */
/* ------------------------------------------------------------------ */

/** Volées et balancements, identiques à chaque étage : on monte vers l'est, le nord puis l'ouest. */
const centralStair = (id: string): Stair => ({
  id,
  rise: FLOOR_TO_FLOOR,
  style: 'floating',
  runs: [
    { kind: 'straight', rect: rect(8.85, 4.15, 10.27, 5.32), dir: 'E', count: 4 },
    { kind: 'winder', rect: rect(10.27, 4.15, 11.44, 5.32), pivot: [10.27, 5.32], fromDeg: -90, toDeg: 0, count: 3 },
    { kind: 'straight', rect: rect(10.27, 5.32, 11.44, 6.75), dir: 'N', count: 5 },
    { kind: 'winder', rect: rect(10.27, 6.75, 11.44, 7.92), pivot: [10.27, 6.75], fromDeg: 0, toDeg: 90, count: 3 },
    { kind: 'straight', rect: rect(8.85, 6.75, 10.27, 7.92), dir: 'W', count: 4 },
  ],
});

const CENTRAL_STAIR_HOLE: Vec2[] = [[8.85, 4.15], [11.44, 4.15], [11.44, 7.92], [8.85, 7.92]];

/* ------------------------------------------------------------------ */
/*                               Dalles                                */
/* ------------------------------------------------------------------ */

/** Façade jardin, avancée est (cellier / dressings / rangement) jusqu'à la façade nord. */
const SOUTH_AND_EAST: Vec2[] = [
  [-0.15, -0.15], [13.25, -0.15], [13.25, 3.85], [14.4, 3.85], [14.4, 8.15], [13.25, 8.15],
];

const BASEMENT_STAIR_HOLE: Vec2[] = [[11.55, 0.15], [13.0, 0.15], [13.0, 2.45], [11.55, 2.45]];

/** Double hauteur du salon, ouverte sur la coursive de l'étage. */
const LIVING_VOID: Vec2[] = [[4.35, 5.8], [7.55, 5.8], [7.55, 11.65], [4.35, 11.65]];

/** Plancher du RDC : maison, cuisine en bow-window, terrasse sur les garages et le porche. */
const groundFloorSlab: Slab = {
  outline: [
    ...SOUTH_AND_EAST, [13.25, 11.8], [13.4, 11.8], [13.4, 13.57], [8.85, 13.57], [8.85, 15.05], [-0.15, 15.05],
    [-0.15, 11.95], [-0.65, 11.95], [-0.65, 3.85], [-0.15, 3.85],
  ],
  holes: [BASEMENT_STAIR_HOLE],
};

/** Plancher de l'étage : maison, terrasse ouest, terrasse en L de la chambre nord-est. */
const upperFloorSlab: Slab = {
  outline: [
    ...SOUTH_AND_EAST, [14.45, 8.15], [14.45, 13.57], [8.55, 13.57], [8.55, 11.95], [-0.65, 11.95], [-0.65, 3.85], [-0.15, 3.85],
  ],
  holes: [LIVING_VOID, CENTRAL_STAIR_HOLE],
};

/** Plancher du grenier : studio et terrasse sur toute la moitié ouest et nord. */
const atticFloorSlab: Slab = {
  outline: [...SOUTH_AND_EAST, [13.25, 11.95], [-0.15, 11.95]],
  holes: [CENTRAL_STAIR_HOLE],
};

/* ------------------------------------------------------------------ */
/*                              SOUS-SOL                               */
/* ------------------------------------------------------------------ */
const basement: Level = {
  id: 'sous-sol',
  name: 'Sous-sol',
  shortName: 'SS',
  elevation: 0,
  height: CEILING,
  walls: [
    base([-0.65, 11.8], [13.25, 11.8], [
      { kind: 'garageDoor', from: -0.3, to: 4.0 },
      { kind: 'garageDoor', from: 4.4, to: 8.55 },
      { kind: 'entryDoor', from: 8.95, to: 10.2 },
      { kind: 'window', from: 11.7, to: 12.95, sill: 1.0 },
    ]),
    base([-0.5, 4.15], [-0.5, 11.65]),
    base([-0.65, 4.0], [-0.15, 4.0]),
    base([0, 0.15], [0, 3.85]),
    base([-0.15, 0], [13.25, 0]),
    base([13.1, 0.15], [13.1, 11.65]),
    // Studio
    int([8.7, 4.15], [8.7, 11.65], [], 0.2),
    int([8.8, 4.0], [12.95, 4.0], [{ kind: 'door', from: 8.95, to: 9.85 }], 0.2),
    int([10.05, 4.1], [10.05, 7.6], [{ kind: 'door', from: 4.25, to: 5.0 }]),
    int([10.1, 5.35], [12.95, 5.35]),
    // Technique, WC et escalier vers le RDC
    int([10.25, 1.15], [10.25, 3.9], [{ kind: 'door', from: 2.9, to: 3.65 }]),
    int([10.3, 2.5], [12.95, 2.5]),
    int([10.2, 1.15], [12.07, 1.15], [{ kind: 'door', from: 10.5, to: 11.2 }]),
    int([12.1, 1.2], [12.1, 2.45]),
  ],
  rooms: [
    { id: 'garage-01', name: 'Garage 01', rects: [rect(-0.35, 4.15, 4.2, 11.65), rect(0.15, 0.15, 4.2, 4.15)], floor: 'concrete', label: [1.9, 7.0], tour: true },
    { id: 'garage-02', name: 'Garage 02', rects: [rect(4.2, 0.15, 8.6, 11.65), rect(8.6, 0.15, 10.2, 3.9)], floor: 'concrete', label: [6.45, 6.5] },
    { id: 'passage-ss', name: '', rects: [rect(10.3, 0.15, 12.07, 1.1)], floor: 'concrete' },
    { id: 'technique', name: 'Technique', rects: [rect(10.3, 2.55, 12.95, 3.9)], floor: 'concrete' },
    { id: 'wc-ss', name: 'WC', rects: [rect(10.3, 1.2, 12.05, 2.45)], floor: 'wet' },
    { id: 'studio-sejour', name: 'Studio · séjour', rects: [rect(8.8, 7.6, 12.95, 11.65), rect(8.8, 4.1, 10.0, 7.6)], floor: 'parquet', label: [10.9, 9.6], tour: true },
    { id: 'studio-cuisine', name: 'Cuisine', rects: [rect(10.1, 5.4, 12.95, 7.6)], floor: 'tile' },
    { id: 'studio-sde', name: "Salle d'eau", rects: [rect(10.1, 4.1, 12.95, 5.3)], floor: 'wet' },
  ],
  columns: BASEMENT_COLUMNS,
  stairs: [
    {
      id: 'escalier-ss-rdc',
      rise: FLOOR_TO_FLOOR,
      style: 'solid',
      runs: [
        { kind: 'straight', rect: rect(10.3, 0.15, 12.12, 1.08), dir: 'E', count: 6 },
        { kind: 'winder', rect: rect(12.12, 0.15, 13.0, 1.08), pivot: [12.12, 1.08], fromDeg: -90, toDeg: 0, count: 4 },
        { kind: 'straight', rect: rect(12.12, 1.08, 13.0, 2.45), dir: 'N', count: 5 },
      ],
    },
  ],
  railings: [],
  furniture: [
    { type: 'car', at: [1.95, 7.6], rot: 180, variant: 'graphite' },
    { type: 'car', at: [6.45, 7.6], rot: 180, variant: 'pearl' },
    { type: 'shelving', at: [2.2, 0.45], size: [3.0, 0.5], rot: 180 },
    { type: 'shelving', at: [6.4, 0.45], size: [3.0, 0.5], rot: 180 },
    { type: 'shelving', at: [11.6, 3.6], size: [2.2, 0.45] },
    { type: 'toilet', at: [11.7, 1.8], rot: 270 },
    { type: 'vanity', at: [10.6, 2.2], size: [0.5, 0.4] },
    { type: 'sofa', at: [11.1, 8.4], size: [2.2, 0.92], rot: 180 },
    { type: 'coffeeTable', at: [11.1, 9.6] },
    { type: 'rug', at: [11.1, 9.5], size: [2.4, 1.7] },
    { type: 'tvUnit', at: [11.1, 11.4] },
    { type: 'desk', at: [9.1, 10.3], rot: 90 },
    { type: 'plant', at: [12.55, 11.2] },
    { type: 'kitchenRun', at: [11.5, 5.72], size: [2.7, 0.6], rot: 180 },
    { type: 'kitchenRun', at: [12.65, 6.75], size: [1.3, 0.6], rot: 270, variant: 'plain' },
    { type: 'diningTable', at: [11.1, 6.9], size: [0.8, 0.8], variant: 'two' },
    { type: 'shower', at: [12.5, 4.7], size: [0.8, 0.8] },
    { type: 'toilet', at: [11.5, 4.45], rot: 180 },
    { type: 'vanity', at: [10.6, 4.4], rot: 180 },
  ],
};

/* ------------------------------------------------------------------ */
/*                           REZ-DE-CHAUSSÉE                           */
/* ------------------------------------------------------------------ */
const groundFloor: Level = {
  id: 'rdc',
  name: 'Rez-de-chaussée',
  shortName: 'RDC',
  elevation: FLOOR_TO_FLOOR,
  height: CEILING,
  slab: groundFloorSlab,
  walls: [
    ext([-0.15, 0], [13.25, 0], [
      { kind: 'highWindow', from: 6.8, to: 7.3 },
      { kind: 'highWindow', from: 8.45, to: 8.9 },
      { kind: 'highWindow', from: 12.25, to: 12.8 },
    ]),
    ext([0, 0.15], [0, 3.85], [{ kind: 'window', from: 0.9, to: 3.1, sill: 0.9 }]),
    ext([-0.65, 4.0], [4.35, 4.0]),
    ext([4.2, 4.15], [4.2, 11.95], [
      { kind: 'entryDoor', from: 4.3, to: 5.45 },
      { kind: 'window', from: 5.5, to: 6.75, sill: 0.1, head: 2.25 },
      { kind: 'window', from: 8.8, to: 10.9, sill: 0.9 },
    ]),
    ext([4.05, 11.8], [8.85, 11.8], [{ kind: 'window', from: 5.25, to: 7.65, sill: 0.9 }]),
    // Bow-window de la cuisine
    ext([8.72, 11.95], [8.72, 13.57], [], 0.25),
    ext([8.6, 13.45], [13.4, 13.45], [{ kind: 'window', from: 9.0, to: 13.0, sill: 1.05 }], 0.25),
    ext([13.25, 11.95], [13.25, 13.57], [{ kind: 'window', from: 12.1, to: 13.25, sill: 0.9 }], 0.25),
    ext([13.1, 8.15], [13.1, 11.95], [{ kind: 'window', from: 8.8, to: 10.9, sill: 1.1 }]),
    ext([13.1, 0.15], [13.1, 3.85]),
    // Avancée du cellier
    ext([13.25, 4.0], [14.4, 4.0]),
    ext([13.25, 8.0], [14.4, 8.0]),
    ext([14.28, 4.15], [14.28, 7.85], [], 0.25),
    // Suite parentale : chambre, dressing, salle d'eau
    int([4.25, 0.15], [4.25, 3.45], [{ kind: 'door', from: 2.55, to: 3.35 }]),
    int([4.3, 3.5], [6.33, 3.5]),
    int([6.33, 2.4], [6.33, 3.45], [{ kind: 'door', from: 2.5, to: 3.4 }]),
    int([4.3, 2.35], [9.55, 2.35], [
      { kind: 'slidingDoor', from: 4.9, to: 5.95 },
      { kind: 'door', from: 8.3, to: 8.95 },
    ]),
    int([6.5, 0.15], [6.5, 1.42]),
    // WC, rangement, porte de l'escalier du sous-sol
    int([8.1, 0.15], [8.1, 2.3]),
    int([9.57, 0.15], [9.57, 2.6]),
    int([9.62, 2.65], [12.95, 2.65], [
      { kind: 'door', from: 9.9, to: 10.7 },
      { kind: 'door', from: 12.15, to: 12.9 },
    ]),
    int([11.5, 0.15], [11.5, 2.6]),
    // Cage de l'escalier central et cellier
    int([8.8, 4.0], [12.95, 4.0], [], 0.12),
    int([11.5, 4.1], [11.5, 7.9]),
    int([8.8, 8.0], [13.1, 8.0], [{ kind: 'door', from: 11.6, to: 12.45 }]),
    int([8.75, 5.35], [8.75, 7.9]),
  ],
  rooms: [
    { id: 'chambre-rdc', name: 'Chambre', rects: [rect(0.15, 0.15, 4.2, 3.85)], floor: 'parquet', tour: true },
    { id: 'dressing-rdc', name: 'Dressing', rects: [rect(4.3, 0.15, 6.45, 2.3)], floor: 'parquet' },
    { id: 'sde-rdc', name: "Salle d'eau", rects: [rect(6.55, 0.15, 8.05, 2.3)], floor: 'wet' },
    { id: 'wc-rdc', name: 'WC', rects: [rect(8.15, 0.15, 9.52, 2.3)], floor: 'wet' },
    { id: 'rangement-rdc', name: 'Rangement', rects: [rect(9.62, 0.15, 11.45, 2.6)], floor: 'tile' },
    {
      id: 'degagement-rdc',
      name: '',
      rects: [rect(4.3, 2.4, 6.28, 3.45), rect(6.38, 2.4, 9.57, 3.95), rect(9.57, 2.7, 12.95, 3.95)],
      floor: 'stone',
    },
    { id: 'hall', name: 'Hall', rects: [rect(4.3, 3.55, 8.7, 5.8)], floor: 'stone', label: [6.6, 4.9], tour: true },
    { id: 'salon', name: 'Salon', rects: [rect(4.3, 5.8, 8.7, 11.65)], floor: 'stone', label: [6.0, 8.6], tour: true },
    { id: 'cage-escalier-rdc', name: '', rects: [rect(8.85, 4.1, 11.45, 7.95)], floor: 'stone' },
    { id: 'cuisine', name: 'Cuisine · repas', rects: [rect(8.7, 8.05, 12.95, 11.8), rect(8.85, 11.8, 13.12, 13.32)], floor: 'stone', label: [10.6, 10.2], tour: true },
    { id: 'cellier', name: 'Cellier', rects: [rect(11.55, 4.1, 13.1, 7.95), rect(13.1, 4.12, 14.15, 7.88)], floor: 'tile', label: [12.8, 6.0] },
    {
      id: 'terrasse-rdc',
      name: 'Terrasse',
      rects: [rect(-0.63, 4.15, 4.05, 11.95), rect(-0.15, 11.95, 8.85, 14.95)],
      floor: 'deck',
      label: [1.8, 9.5],
      outdoor: true,
      tour: true,
    },
  ],
  columns: GRID_COLUMNS,
  stairs: [
    centralStair('escalier-rdc-etage'),
    {
      id: 'perron-terrasse',
      rise: 1.05,
      descending: true,
      style: 'solid',
      runs: [{ kind: 'straight', rect: rect(-2.45, 4.7, -0.65, 7.25), dir: 'W', count: 6 }],
    },
  ],
  railings: [
    { path: [[-0.63, 4.15], [-0.63, 4.7]], style: 'metal' },
    { path: [[-0.63, 7.25], [-0.63, 11.95], [-0.15, 11.95], [-0.15, 14.95], [8.85, 14.95], [8.85, 13.57]], style: 'metal' },
  ],
  furniture: [
    { type: 'doubleBed', at: [2.0, 1.22], rot: 180 },
    { type: 'nightstand', at: [0.9, 0.4], rot: 180 },
    { type: 'nightstand', at: [3.1, 0.4], rot: 180 },
    { type: 'rug', at: [2.0, 1.6], size: [2.4, 1.7] },
    { type: 'desk', at: [1.5, 3.5] },
    { type: 'plant', at: [3.7, 2.2] },
    { type: 'shelving', at: [5.3, 0.4], size: [1.9, 0.45], rot: 180, variant: 'dressing' },
    { type: 'shelving', at: [4.6, 1.3], size: [1.2, 0.45], rot: 90, variant: 'dressing' },
    { type: 'shower', at: [6.95, 0.55], size: [0.7, 0.7] },
    { type: 'toilet', at: [7.6, 0.45], rot: 180 },
    { type: 'vanity', at: [7.8, 1.9], size: [0.6, 0.45], rot: 270 },
    { type: 'toilet', at: [8.56, 0.45], rot: 180 },
    { type: 'vanity', at: [9.27, 1.75], size: [0.5, 0.4], rot: 270 },
    { type: 'shelving', at: [10.55, 0.4], size: [1.7, 0.45], rot: 180 },
    { type: 'shelving', at: [9.92, 1.5], size: [1.5, 0.45], rot: 90 },
    { type: 'wardrobe', at: [5.3, 3.85], size: [1.95, 0.55], rot: 180 },
    { type: 'rug', at: [6.6, 4.8], size: [2.0, 1.4], variant: 'runner' },
    { type: 'plant', at: [8.4, 5.5] },
    { type: 'cornerSofa', at: [5.6, 7.0], size: [2.8, 1.9], rot: 180 },
    { type: 'coffeeTable', at: [6.0, 8.3] },
    { type: 'rug', at: [6.1, 8.1], size: [3.0, 2.2] },
    { type: 'armchair', at: [7.7, 8.4], rot: 270 },
    { type: 'tvUnit', at: [6.3, 11.44], size: [1.9, 0.42] },
    { type: 'floorLamp', at: [4.65, 11.25] },
    { type: 'diningTable', at: [8.0, 10.05], size: [2.0, 1.0], rot: 90 },
    { type: 'kitchenRun', at: [11.1, 13.0], size: [3.6, 0.62], rot: 180, variant: 'hob' },
    { type: 'kitchenRun', at: [12.68, 10.6], size: [2.8, 0.62], rot: 270 },
    { type: 'fridge', at: [9.4, 13.0], rot: 180 },
    { type: 'kitchenIsland', at: [10.6, 10.15], size: [1.0, 1.6] },
    { type: 'shelving', at: [12.4, 7.65], size: [1.6, 0.45] },
    { type: 'shelving', at: [13.85, 6.0], size: [3.2, 0.45], rot: 270 },
    { type: 'outdoorLounge', at: [1.8, 6.6] },
    { type: 'outdoorDining', at: [1.8, 10.4] },
    { type: 'outdoorLounge', at: [4.5, 13.4] },
    { type: 'plant', at: [0.2, 14.6], variant: 'olive' },
    { type: 'plant', at: [8.4, 14.6], variant: 'olive' },
  ],
};

/* ------------------------------------------------------------------ */
/*                                ÉTAGE                                */
/* ------------------------------------------------------------------ */
const upperFloor: Level = {
  id: 'etage',
  name: 'Étage',
  shortName: 'R+1',
  elevation: FLOOR_TO_FLOOR * 2,
  height: CEILING,
  slab: upperFloorSlab,
  walls: [
    ext([-0.15, 0], [13.25, 0], [{ kind: 'highWindow', from: 6.65, to: 7.05 }]),
    ext([0, 0.15], [0, 3.85], [{ kind: 'window', from: 1.1, to: 3.25, sill: 0.9 }]),
    ext([-0.65, 4.0], [4.35, 4.0]),
    ext([4.2, 4.15], [4.2, 11.95], [
      { kind: 'entryDoor', from: 4.3, to: 5.45 },
      { kind: 'window', from: 8.8, to: 10.9, sill: 0.9 },
    ]),
    ext([4.05, 11.8], [8.7, 11.8], [{ kind: 'window', from: 5.25, to: 7.65, sill: 0.9 }]),
    ext([8.55, 11.8], [13.25, 11.8], [{ kind: 'slidingDoor', from: 10.05, to: 11.65 }]),
    ext([13.1, 8.15], [13.1, 11.65], [{ kind: 'window', from: 9.0, to: 10.9, sill: 0.9 }]),
    ext([13.1, 0.15], [13.1, 3.85], [{ kind: 'window', from: 0.9, to: 3.0, sill: 0.9 }]),
    ext([13.25, 4.0], [14.4, 4.0]),
    ext([13.25, 8.0], [14.4, 8.0]),
    ext([14.28, 4.15], [14.28, 7.85], [], 0.25),
    // Chambre sud-ouest, dressing, salle d'eau
    int([4.25, 0.15], [4.25, 3.9], [{ kind: 'door', from: 2.85, to: 3.75 }]),
    int([4.3, 2.75], [8.7, 2.75], [
      { kind: 'door', from: 5.2, to: 6.1 },
      { kind: 'door', from: 6.25, to: 7.0 },
    ]),
    int([6.15, 0.15], [6.15, 2.7]),
    // Chambre sud-est, cage d'escalier, dressings
    int([8.75, 0.15], [8.75, 3.9], [{ kind: 'door', from: 2.9, to: 3.8 }]),
    int([8.8, 4.0], [12.95, 4.0], [{ kind: 'door', from: 11.7, to: 12.5 }]),
    int([11.5, 4.1], [11.5, 7.9]),
    int([11.55, 6.05], [14.15, 6.05]),
    // Chambre nord-est
    int([8.8, 8.0], [13.1, 8.0], [{ kind: 'slidingDoor', from: 11.55, to: 12.5 }]),
    int([8.62, 8.1], [8.62, 11.7], [{ kind: 'door', from: 8.25, to: 9.05 }], 0.15),
  ],
  rooms: [
    { id: 'chambre-etage-sud-ouest', name: 'Chambre', rects: [rect(0.15, 0.15, 4.2, 3.85)], floor: 'parquet', tour: true },
    { id: 'dressing-etage-ouest', name: 'Dressing', rects: [rect(4.3, 0.15, 6.1, 2.7)], floor: 'parquet' },
    { id: 'sde-etage', name: "Salle d'eau", rects: [rect(6.2, 0.15, 8.7, 2.7)], floor: 'wet', tour: true },
    { id: 'palier-etage', name: '', rects: [rect(4.3, 2.8, 8.7, 5.8), rect(7.6, 5.8, 8.55, 11.65)], floor: 'parquet' },
    { id: 'chambre-etage-sud-est', name: 'Chambre', rects: [rect(8.85, 0.15, 12.95, 3.9)], floor: 'parquet', tour: true },
    { id: 'dressing-etage-nord', name: 'Dressing', rects: [rect(11.55, 6.1, 14.15, 7.9)], floor: 'parquet' },
    { id: 'dressing-etage-sud', name: 'Dressing', rects: [rect(11.55, 4.1, 14.15, 6.0)], floor: 'parquet' },
    { id: 'chambre-etage-nord-est', name: 'Chambre', rects: [rect(8.7, 8.1, 12.95, 11.65)], floor: 'parquet', tour: true },
    { id: 'terrasse-etage-ouest', name: 'Terrasse', rects: [rect(-0.63, 4.15, 4.05, 11.95)], floor: 'deck', label: [1.8, 8.5], outdoor: true, tour: true },
    {
      id: 'terrasse-etage-nord-est',
      name: 'Terrasse de la chambre',
      rects: [rect(8.55, 11.95, 13.4, 13.5), rect(13.4, 8.15, 14.4, 13.5)],
      floor: 'deck',
      label: [11.0, 12.7],
      outdoor: true,
    },
  ],
  columns: GRID_COLUMNS,
  stairs: [centralStair('escalier-etage-grenier')],
  railings: [
    { path: [[7.55, 11.65], [7.55, 5.8], [4.35, 5.8]], style: 'glass' },
    { path: [[8.85, 5.32], [8.85, 6.75]], style: 'glass' },
    { path: [[-0.63, 4.15], [-0.63, 11.95], [4.05, 11.95]], style: 'glass' },
    { path: [[8.55, 11.95], [8.55, 13.5], [14.4, 13.5], [14.4, 8.15], [13.25, 8.15]], style: 'glass' },
  ],
  furniture: [
    { type: 'doubleBed', at: [2.0, 1.22], rot: 180 },
    { type: 'nightstand', at: [0.9, 0.4], rot: 180 },
    { type: 'nightstand', at: [3.1, 0.4], rot: 180 },
    { type: 'rug', at: [2.0, 1.6], size: [2.4, 1.7] },
    { type: 'shelving', at: [5.2, 0.4], size: [1.6, 0.45], rot: 180, variant: 'dressing' },
    { type: 'shelving', at: [5.2, 1.6], size: [1.2, 0.45], variant: 'dressing' },
    { type: 'washer', at: [7.35, 2.35] },
    { type: 'vanity', at: [7.45, 1.4], size: [0.6, 0.45], rot: 270 },
    { type: 'shower', at: [8.2, 0.6], size: [0.85, 0.85] },
    { type: 'toilet', at: [6.6, 0.45], rot: 180 },
    { type: 'doubleBed', at: [10.9, 1.22], rot: 180 },
    { type: 'nightstand', at: [9.8, 0.4], rot: 180 },
    { type: 'nightstand', at: [12.0, 0.4], rot: 180 },
    { type: 'rug', at: [10.9, 1.6], size: [2.4, 1.7] },
    { type: 'desk', at: [12.6, 3.1], rot: 270 },
    { type: 'shelving', at: [12.85, 7.65], size: [2.4, 0.45], variant: 'dressing' },
    { type: 'shelving', at: [12.85, 4.35], size: [2.4, 0.45], rot: 180, variant: 'dressing' },
    { type: 'doubleBed', at: [10.9, 9.2], rot: 180 },
    { type: 'nightstand', at: [9.8, 8.4], rot: 180 },
    { type: 'nightstand', at: [12.0, 8.4], rot: 180 },
    { type: 'rug', at: [10.9, 9.7], size: [2.4, 1.7] },
    { type: 'armchair', at: [12.4, 11.1], rot: 180 },
    { type: 'outdoorLounge', at: [1.8, 9.2] },
    { type: 'outdoorDining', at: [1.8, 5.8] },
    { type: 'outdoorDining', at: [11.0, 12.75] },
    { type: 'plant', at: [13.9, 13.0], variant: 'olive' },
    { type: 'plant', at: [-0.3, 11.5], variant: 'olive' },
  ],
};

/* ------------------------------------------------------------------ */
/*                               GRENIER                               */
/* ------------------------------------------------------------------ */
const attic: Level = {
  id: 'grenier',
  name: 'Grenier',
  shortName: 'R+2',
  elevation: FLOOR_TO_FLOOR * 3,
  height: CEILING,
  slab: atticFloorSlab,
  walls: [
    ext([4.05, 0], [13.25, 0], [
      { kind: 'window', from: 5.4, to: 7.4, sill: 0.9 },
      { kind: 'window', from: 9.6, to: 11.6, sill: 0.9 },
    ]),
    ext([4.2, 0.15], [4.2, 8.15], [{ kind: 'slidingDoor', from: 5.15, to: 6.9 }]),
    ext([4.05, 8.0], [14.4, 8.0], [{ kind: 'window', from: 5.0, to: 8.0, sill: 0.9 }]),
    ext([13.1, 0.15], [13.1, 3.85]),
    ext([13.25, 4.0], [14.4, 4.0]),
    ext([14.28, 4.15], [14.28, 7.85], [], 0.25),
    int([11.5, 4.1], [11.5, 7.9]),
    int([11.55, 4.0], [13.0, 4.0], [{ kind: 'door', from: 12.15, to: 12.9 }]),
  ],
  rooms: [
    { id: 'studio-grenier', name: 'Studio', rects: [rect(4.3, 0.15, 12.95, 3.95), rect(4.3, 3.95, 8.85, 7.9)], floor: 'parquet', label: [6.4, 2.6], tour: true },
    { id: 'cage-escalier-grenier', name: '', rects: [rect(8.85, 4.1, 11.45, 7.9)], floor: 'parquet' },
    { id: 'rangement-grenier', name: 'Rangement', rects: [rect(11.55, 4.1, 13.1, 7.9), rect(13.1, 4.12, 14.15, 7.88)], floor: 'tile', label: [12.8, 6.0] },
    { id: 'cuisine-ete', name: "Coin cuisine d'été", rects: [rect(-0.12, -0.12, 4.05, 2.2)], floor: 'terracotta', label: [1.9, 1.3], outdoor: true },
    {
      id: 'terrasse-grenier',
      name: 'Terrasse',
      rects: [rect(-0.12, 2.2, 4.05, 11.92), rect(4.05, 8.15, 13.22, 11.92)],
      floor: 'deck',
      label: [2.0, 6.5],
      outdoor: true,
      tour: true,
    },
  ],
  columns: ATTIC_COLUMNS,
  stairs: [],
  railings: [
    { path: [[11.45, 4.12], [8.85, 4.12], [8.85, 6.75]], style: 'glass' },
    { path: [[4.05, -0.12], [-0.12, -0.12], [-0.12, 11.92], [13.22, 11.92], [13.22, 8.15]], style: 'glass' },
  ],
  furniture: [
    { type: 'doubleBed', at: [11.0, 1.22], rot: 180 },
    { type: 'nightstand', at: [9.9, 0.4], rot: 180 },
    { type: 'nightstand', at: [12.1, 0.4], rot: 180 },
    { type: 'rug', at: [11.0, 1.7], size: [2.4, 1.7] },
    { type: 'sofa', at: [6.4, 4.6], size: [2.4, 0.95], rot: 180 },
    { type: 'coffeeTable', at: [6.4, 5.8] },
    { type: 'rug', at: [6.4, 5.7], size: [2.8, 2.0] },
    { type: 'tvUnit', at: [6.4, 7.6], size: [1.9, 0.42] },
    { type: 'kitchenRun', at: [6.0, 0.45], size: [2.6, 0.6], rot: 180 },
    { type: 'diningTable', at: [7.6, 2.0], size: [1.4, 0.8], variant: 'two' },
    { type: 'shelving', at: [12.85, 7.65], size: [2.4, 0.45] },
    { type: 'kitchenRun', at: [1.6, 0.25], size: [2.8, 0.62], rot: 180, variant: 'hob' },
    { type: 'outdoorDining', at: [1.8, 1.4] },
    { type: 'outdoorLounge', at: [1.9, 6.0] },
    { type: 'outdoorLounge', at: [9.5, 10.0] },
    { type: 'outdoorDining', at: [6.2, 10.0] },
    { type: 'plant', at: [3.7, 11.5], variant: 'olive' },
    { type: 'plant', at: [12.8, 11.5], variant: 'olive' },
  ],
};

export const building: Building = {
  levels: [basement, groundFloor, upperFloor, attic],
  roof: {
    elevation: FLOOR_TO_FLOOR * 4,
    slab: {
      outline: [[4.05, -0.15], [13.25, -0.15], [13.25, 3.85], [14.4, 3.85], [14.4, 8.15], [4.05, 8.15]],
    },
    parapetHeight: 0.6,
    parapetThickness: 0.15,
    pergola: rect(-0.15, -0.15, 4.2, 11.95),
  },
  slabThickness: FLOOR_TO_FLOOR - CEILING,
  columnSize: 0.3,
  footprint: [rect(-0.15, -0.15, 13.25, 4.15), rect(-0.65, 3.85, 13.25, 11.95)],
};
