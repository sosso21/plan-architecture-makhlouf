/**
 * Maison Youcef 002 — Oued Ksari (version 2 du projet).
 *
 * Données relevées sur les plans vectoriels « proposition 0022 » (sous-sol,
 * rez-de-chaussée, étage) puis recalées sur la trame des poteaux du RDC et
 * du plan de masse (cotes 4,30 / 4,50 / 4,20 m) :
 *   axes x : -0,50 (terrasse) · 0 · 4,30 · 8,80 · 13,00 m
 *   axes y : 0 · 3,80 · 7,50 · 11,30 m
 * Toutes les cotes sont en mètres, origine = poteau bas-gauche du plan.
 *
 * Nouveauté de cette version : la cage d'escalier principale en demi-lune
 * (escalier à deux volées et palier demi-circulaire) sur la façade jardin.
 */
import { rect, type Building, type CurvedWall, type Level, type Slab, type Vec2, type Wall } from '@/domain/building';
import { arcPoints } from '@/engine/geometry';

const EXT = 0.3;
const INT = 0.1;
const FLOOR_TO_FLOOR = 3.06;
const CEILING = 2.9;

const ext = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = EXT): Wall => ({ a, b, thickness, finish: 'exterior', openings });
const base = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = EXT): Wall => ({ a, b, thickness, finish: 'basement', openings });
const int = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = INT): Wall => ({ a, b, thickness, finish: 'interior', openings });

/** Trame complète des poteaux (les poteaux noyés dans un mur ne sont pas dessinés). */
const GRID_COLUMNS: Vec2[] = [
  [0, 0], [4.3, 0], [8.8, 0], [13, 0],
  [0, 3.8], [4.3, 3.8], [8.8, 3.8], [13, 3.8],
  [-0.5, 7.5], [4.3, 7.5], [8.8, 7.5], [13, 7.5],
  [-0.5, 11.3], [4.3, 11.3], [8.8, 11.3], [13, 11.3],
];

/* ------------------------------------------------------------------ */
/*                    Cage d'escalier en demi-lune                     */
/* ------------------------------------------------------------------ */
const BAY_CENTER: Vec2 = [7.44, 0.1];
const BAY_WALL_RADIUS = 1.365;
const BAY_WALL_THICKNESS = 0.28;
const BAY_INNER = BAY_WALL_RADIUS - BAY_WALL_THICKNESS / 2;
const BAY_OUTER = BAY_WALL_RADIUS + BAY_WALL_THICKNESS / 2;

const bayWall = (finish: CurvedWall['finish']): CurvedWall => ({
  center: BAY_CENTER,
  radius: BAY_WALL_RADIUS,
  fromDeg: 180,
  toDeg: 360,
  thickness: BAY_WALL_THICKNESS,
  finish,
});

/** Arc de la demi-lune au rayon `r`, limité à la partie située sous la ligne `y`. */
const bayArc = (r: number, y: number): Vec2[] => {
  const half = (Math.asin((BAY_CENTER[1] - y) / r) * 180) / Math.PI;
  return arcPoints(BAY_CENTER, r, 180 + half, 360 - half);
};

/** Palier demi-circulaire entre les deux volées. */
const BAY_LANDING: Vec2[] = [[6.22, 0.15], ...arcPoints(BAY_CENTER, BAY_INNER - 0.005, 180, 360), [8.665, 0.15]];

/** Trémie de l'escalier principal : les deux volées et le palier en demi-lune. */
const MAIN_STAIR_HOLE: Vec2[] = [[6.215, 2.6], ...arcPoints(BAY_CENTER, BAY_INNER, 180, 360), [8.665, 2.6]];

/* ------------------------------------------------------------------ */
/*                               Dalles                                */
/* ------------------------------------------------------------------ */

/** Partie commune des contours : façade jardin, avancée de cuisine, bow-window. */
const SOUTH_AND_EAST: Vec2[] = [
  [-0.15, -0.15], ...bayArc(BAY_OUTER, -0.15), [13.15, -0.15], [13.15, 3.65], [14.35, 3.65], [14.35, 7.65], [13.15, 7.65],
  [13.15, 13.0], [8.62, 13.0],
];

const BASEMENT_STAIR_HOLE: Vec2[] = [[11.97, 0.15], [12.85, 0.15], [12.85, 3.62], [11.97, 3.62]];

/** Vide sur le hall (double hauteur), ouvert sur le salon d'étage. */
const HALL_VOID: Vec2[] = [[4.45, 4.5], [6.17, 4.5], [6.17, 3.92], [8.72, 3.92], [8.72, 7.45], [4.45, 7.45]];

/** Plancher du RDC : maison + terrasse sur les garages, en encorbellement au-dessus des portes. */
const groundFloorSlab: Slab = {
  outline: [...SOUTH_AND_EAST, [8.62, 13.5], [-0.65, 13.5], [-0.65, 3.65], [-0.15, 3.65]],
  holes: [BASEMENT_STAIR_HOLE],
};

/** Plancher de l'étage : maison + grande terrasse (bord ouest légèrement biais) + balcon. */
const upperFloorSlab: Slab = {
  outline: [...SOUTH_AND_EAST, [8.62, 13.92], [-0.97, 13.92], [-0.67, 3.95], [-1.37, 3.95], [-1.37, -0.15]],
  holes: [HALL_VOID, MAIN_STAIR_HOLE],
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
    base([-0.65, 11.3], [13.15, 11.3], [
      { kind: 'garageDoor', from: -0.3, to: 4.1 },
      { kind: 'garageDoor', from: 4.5, to: 8.6 },
      { kind: 'entryDoor', from: 9.1, to: 10.15 },
      { kind: 'window', from: 11.7, to: 12.85, sill: 1.0 },
    ]),
    base([-0.5, 3.95], [-0.5, 11.15]),
    base([-0.65, 3.8], [-0.15, 3.8]),
    base([0, 0.15], [0, 3.65]),
    base([-0.15, 0], [13.15, 0]),
    base([13, 0.15], [13, 11.15]),
    // Studio
    int([8.8, 3.95], [8.8, 11.15], [], 0.2),
    int([8.9, 3.8], [12.85, 3.8], [{ kind: 'door', from: 9.02, to: 9.88 }], 0.2),
    int([10.05, 3.9], [10.05, 7.2], [{ kind: 'door', from: 4.1, to: 4.85 }]),
    int([10.1, 5.05], [12.85, 5.05]),
    // Technique, WC et cage de l'escalier vers le RDC
    int([10.25, 1.1], [10.25, 3.7], [{ kind: 'door', from: 2.65, to: 3.4 }]),
    int([10.3, 2.35], [11.9, 2.35]),
    int([10.2, 1.1], [11.95, 1.1], [{ kind: 'door', from: 10.5, to: 11.2 }]),
    int([11.95, 1.15], [11.95, 3.7]),
  ],
  curvedWalls: [bayWall('basement')],
  rooms: [
    { id: 'garage-01', name: 'Garage 01', rects: [rect(-0.35, 3.95, 4.3, 11.15), rect(0.15, 0.15, 4.3, 3.95)], floor: 'concrete', label: [1.9, 6.0], tour: true },
    { id: 'garage-02', name: 'Garage 02', rects: [rect(4.3, 0.15, 8.7, 11.15), rect(8.7, 0.15, 10.2, 3.7)], floor: 'concrete', label: [6.5, 5.6] },
    { id: 'passage-ss', name: '', rects: [rect(10.3, 0.15, 11.42, 1.05)], floor: 'concrete' },
    { id: 'technique', name: 'Technique', rects: [rect(10.3, 2.4, 11.9, 3.7)], floor: 'concrete' },
    { id: 'wc-ss', name: 'WC', rects: [rect(10.3, 1.15, 11.9, 2.3)], floor: 'wet' },
    { id: 'studio-sejour', name: 'Studio · séjour', rects: [rect(8.9, 7.2, 12.85, 11.15), rect(8.9, 3.9, 10.0, 7.2)], floor: 'parquet', label: [10.9, 9.2], tour: true },
    { id: 'studio-cuisine', name: 'Cuisine', rects: [rect(10.1, 5.1, 12.85, 7.2)], floor: 'tile' },
    { id: 'studio-sde', name: "Salle d'eau", rects: [rect(10.1, 3.9, 12.85, 5.0)], floor: 'wet' },
  ],
  columns: GRID_COLUMNS,
  stairs: [
    {
      id: 'escalier-ss-rdc',
      rise: FLOOR_TO_FLOOR,
      style: 'solid',
      runs: [
        { kind: 'straight', rect: rect(11.42, 0.15, 12.0, 1.1), dir: 'E', count: 2 },
        { kind: 'winder', rect: rect(12.0, 0.15, 12.85, 1.1), pivot: [12.0, 1.1], fromDeg: -90, toDeg: 0, count: 4 },
        { kind: 'straight', rect: rect(12.0, 1.1, 12.85, 2.55), dir: 'N', count: 6 },
        { kind: 'winder', rect: rect(12.0, 2.55, 12.85, 3.62), pivot: [12.0, 2.55], fromDeg: 0, toDeg: 90, count: 4 },
      ],
    },
  ],
  railings: [{ path: [[12.0, 1.1], [12.0, 2.55]], base: [1.1, 2.1], style: 'metal' }],
  furniture: [
    { type: 'car', at: [1.95, 6.9], rot: 180, variant: 'graphite' },
    { type: 'car', at: [6.5, 6.9], rot: 180, variant: 'pearl' },
    { type: 'shelving', at: [2.2, 0.45], size: [3.0, 0.5], rot: 180 },
    { type: 'shelving', at: [6.5, 0.45], size: [3.0, 0.5], rot: 180 },
    { type: 'shelving', at: [10.9, 3.4], size: [1.6, 0.45] },
    { type: 'toilet', at: [11.6, 1.7], rot: 270 },
    { type: 'vanity', at: [10.6, 2.08], size: [0.5, 0.4] },
    { type: 'sofa', at: [11.2, 8.0], size: [2.2, 0.92], rot: 180 },
    { type: 'coffeeTable', at: [11.2, 9.2] },
    { type: 'rug', at: [11.2, 9.1], size: [2.4, 1.7] },
    { type: 'tvUnit', at: [11.2, 10.9] },
    { type: 'desk', at: [9.2, 9.8], rot: 90 },
    { type: 'plant', at: [12.5, 10.75] },
    { type: 'kitchenRun', at: [11.4, 5.42], size: [2.6, 0.6], rot: 180 },
    { type: 'kitchenRun', at: [12.55, 6.45], size: [1.3, 0.6], rot: 270, variant: 'plain' },
    { type: 'diningTable', at: [11.1, 6.55], size: [0.8, 0.8], variant: 'two' },
    { type: 'shower', at: [12.4, 4.45], size: [0.8, 0.8] },
    { type: 'toilet', at: [11.4, 4.2], rot: 180 },
    { type: 'vanity', at: [10.55, 4.2], rot: 180 },
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
    ext([-0.15, 0], [6.08, 0], [{ kind: 'highWindow', from: 5.15, to: 5.75 }]),
    ext([8.8, 0], [13.15, 0], [
      { kind: 'highWindow', from: 9.35, to: 9.8 },
      { kind: 'highWindow', from: 10.7, to: 11.1 },
      { kind: 'highWindow', from: 11.4, to: 12.6 },
    ]),
    ext([0, 0.15], [0, 3.65], [{ kind: 'window', from: 0.8, to: 3.0, sill: 0.9 }]),
    ext([-0.65, 3.8], [4.3, 3.8]),
    ext([4.3, 3.65], [4.3, 11.45], [
      { kind: 'entryDoor', from: 4.67, to: 5.87 },
      { kind: 'window', from: 6.17, to: 6.92, sill: 0.1, head: 2.25 },
      { kind: 'window', from: 8.3, to: 10.5, sill: 0.9 },
    ]),
    ext([4.15, 11.3], [8.95, 11.3], [{ kind: 'window', from: 5.3, to: 7.8, sill: 0.9 }]),
    // Bow-window vitré du coin repas
    ext([8.8, 11.45], [8.8, 13.0], [{ kind: 'window', from: 11.7, to: 12.7, sill: 0.45, head: 2.45 }], 0.25),
    ext([8.68, 12.88], [13.12, 12.88], [
      { kind: 'window', from: 9.1, to: 10.85, sill: 0.45, head: 2.45 },
      { kind: 'window', from: 10.95, to: 12.7, sill: 0.45, head: 2.45 },
    ], 0.25),
    ext([13, 11.45], [13, 13.0], [{ kind: 'window', from: 11.7, to: 12.7, sill: 0.45, head: 2.45 }], 0.25),
    ext([13, 7.65], [13, 11.45], [{ kind: 'window', from: 8.3, to: 10.5, sill: 0.9 }]),
    ext([13, 0.15], [13, 3.65]),
    // Avancée de la cuisine
    ext([13.15, 3.8], [14.35, 3.8]),
    ext([13.15, 7.5], [14.35, 7.5]),
    ext([14.22, 3.95], [14.22, 7.35], [], 0.25),
    // Cloisons : chambre, placard, salle d'eau
    int([3.8, 0.15], [3.8, 3.65], [{ kind: 'door', from: 2.7, to: 3.55 }]),
    int([4.4, 0.15], [4.4, 2.55]),
    int([3.85, 2.6], [6.12, 2.6], [
      { kind: 'door', from: 3.9, to: 4.35 },
      { kind: 'door', from: 4.55, to: 5.3 },
    ]),
    int([6.17, 0.15], [6.17, 3.75], [{ kind: 'door', from: 2.85, to: 3.7 }]),
    int([4.45, 3.8], [6.12, 3.8], [], 0.15),
    // Escalier en U : mur d'échiffre entre les volées
    int([7.47, 0.25], [7.47, 2.55], [], 0.12),
    // WC, cellier, porte de l'escalier du sous-sol
    int([8.72, 0.15], [8.72, 2.5]),
    int([8.77, 2.45], [9.95, 2.45], [{ kind: 'door', from: 8.86, to: 9.62 }]),
    int([9.95, 0.15], [9.95, 2.4]),
    int([10.0, 2.4], [11.9, 2.4], [{ kind: 'passage', from: 10.56, to: 11.26 }]),
    int([11.92, 0.15], [11.92, 3.65], [{ kind: 'door', from: 2.85, to: 3.6 }]),
    // Cuisine
    int([8.95, 3.8], [12.85, 3.8], [], 0.12),
    int([8.8, 3.9], [8.8, 7.4], [{ kind: 'passage', from: 5.4, to: 6.33 }], 0.15),
  ],
  curvedWalls: [bayWall('exterior')],
  rooms: [
    { id: 'chambre-rdc', name: 'Chambre', rects: [rect(0.15, 0.15, 3.75, 3.65)], floor: 'parquet', tour: true },
    { id: 'placard-rdc', name: '', rects: [rect(3.85, 0.15, 4.35, 2.55)], floor: 'parquet' },
    { id: 'sde-rdc', name: "Salle d'eau", rects: [rect(4.45, 0.15, 6.12, 2.55)], floor: 'wet' },
    {
      id: 'degagement-rdc',
      name: '',
      rects: [rect(3.85, 2.65, 6.12, 3.73), rect(6.22, 0.15, 8.67, 3.75), rect(8.77, 2.5, 11.87, 3.74)],
      floor: 'stone',
    },
    { id: 'wc-rdc', name: 'WC', rects: [rect(8.77, 0.15, 9.9, 2.4)], floor: 'wet' },
    { id: 'cellier', name: 'Cellier', rects: [rect(10.0, 0.15, 11.87, 2.35)], floor: 'tile' },
    { id: 'hall', name: 'Hall', rects: [rect(4.45, 3.9, 8.72, 7.5)], floor: 'stone', label: [6.6, 5.6], tour: true },
    { id: 'salon', name: 'Salon', rects: [rect(4.45, 7.5, 8.8, 11.15)], floor: 'stone', tour: true },
    { id: 'coin-repas', name: 'Coin repas', rects: [rect(8.8, 7.5, 12.85, 11.15), rect(8.93, 11.15, 12.87, 12.75)], floor: 'stone', label: [10.9, 10.0], tour: true },
    { id: 'cuisine', name: 'Cuisine', rects: [rect(8.88, 3.86, 12.85, 7.5), rect(12.85, 3.95, 14.1, 7.35)], floor: 'stone', label: [11.2, 5.6], tour: true },
    {
      id: 'terrasse-rdc',
      name: 'Terrasse couverte',
      rects: [rect(-0.63, 3.95, 4.15, 13.45), rect(4.15, 11.45, 8.67, 13.45)],
      floor: 'deck',
      label: [1.8, 8.4],
      outdoor: true,
      tour: true,
    },
  ],
  columns: GRID_COLUMNS,
  stairs: [
    {
      id: 'escalier-rdc-etage',
      rise: FLOOR_TO_FLOOR,
      style: 'solid',
      runs: [
        { kind: 'straight', rect: rect(6.22, 0.15, 7.41, 2.55), dir: 'S', count: 8 },
        { kind: 'landing', polygon: BAY_LANDING },
        { kind: 'straight', rect: rect(7.53, 0.15, 8.67, 2.55), dir: 'N', count: 8 },
      ],
    },
    {
      id: 'perron-terrasse',
      rise: 1.05,
      descending: true,
      style: 'solid',
      runs: [{ kind: 'straight', rect: rect(-2.45, 4.65, -0.65, 6.65), dir: 'W', count: 6 }],
    },
  ],
  railings: [
    { path: [[-0.63, 3.95], [-0.63, 4.65]], style: 'metal' },
    { path: [[-0.63, 6.65], [-0.63, 13.45], [8.67, 13.45], [8.67, 13.0]], style: 'metal' },
  ],
  furniture: [
    { type: 'doubleBed', at: [1.95, 1.22], rot: 180 },
    { type: 'nightstand', at: [0.85, 0.4], rot: 180 },
    { type: 'nightstand', at: [3.05, 0.4], rot: 180 },
    { type: 'rug', at: [1.95, 1.6], size: [2.4, 1.7] },
    { type: 'desk', at: [1.4, 3.3] },
    { type: 'plant', at: [3.45, 2.3] },
    { type: 'shelving', at: [4.1, 1.3], size: [2.2, 0.45], rot: 90, variant: 'dressing' },
    { type: 'shower', at: [5.65, 0.6], size: [0.85, 0.85] },
    { type: 'toilet', at: [4.8, 0.45], rot: 180 },
    { type: 'vanity', at: [5.85, 1.85], size: [0.8, 0.5], rot: 270 },
    { type: 'toilet', at: [9.3, 0.42], rot: 180 },
    { type: 'vanity', at: [9.65, 1.5], size: [0.5, 0.4], rot: 270 },
    { type: 'shelving', at: [10.28, 1.25], size: [2.1, 0.5], rot: 90 },
    { type: 'shelving', at: [11.6, 1.25], size: [2.1, 0.5], rot: 270 },
    { type: 'wardrobe', at: [5.3, 4.2], size: [1.65, 0.6], rot: 180 },
    { type: 'rug', at: [6.6, 5.6], size: [2.0, 1.4], variant: 'runner' },
    { type: 'plant', at: [8.35, 4.25] },
    { type: 'cornerSofa', at: [5.85, 8.3], size: [2.8, 1.9], rot: 180 },
    { type: 'coffeeTable', at: [6.25, 9.5] },
    { type: 'rug', at: [6.35, 9.25], size: [3.0, 2.2] },
    { type: 'armchair', at: [8.05, 9.6], rot: 270 },
    { type: 'tvUnit', at: [6.5, 10.94], size: [1.9, 0.42] },
    { type: 'floorLamp', at: [4.75, 10.8] },
    { type: 'plant', at: [8.4, 10.8] },
    { type: 'diningTable', at: [10.9, 9.4], size: [2.1, 1.0] },
    { type: 'rug', at: [10.9, 9.4], size: [3.0, 2.1], variant: 'flat' },
    { type: 'armchair', at: [10.0, 12.2], rot: 180 },
    { type: 'armchair', at: [11.8, 12.2], rot: 180 },
    { type: 'plant', at: [10.9, 12.45] },
    { type: 'kitchenRun', at: [11.35, 4.17], size: [2.9, 0.62], rot: 180 },
    { type: 'fridge', at: [9.3, 4.2], rot: 180 },
    { type: 'kitchenRun', at: [13.79, 5.65], size: [2.9, 0.62], rot: 270, variant: 'hob' },
    { type: 'kitchenIsland', at: [11.8, 7.2], size: [2.4, 0.75] },
    { type: 'outdoorLounge', at: [1.8, 10.0] },
    { type: 'outdoorDining', at: [1.8, 5.9] },
    { type: 'outdoorDining', at: [6.4, 12.45] },
    { type: 'plant', at: [-0.25, 13.05], variant: 'olive' },
    { type: 'plant', at: [3.75, 4.4], variant: 'olive' },
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
    ext([-0.15, 0], [6.08, 0], [{ kind: 'highWindow', from: 5.15, to: 5.7 }]),
    ext([8.8, 0], [13.15, 0], [
      { kind: 'highWindow', from: 9.3, to: 9.75 },
      { kind: 'highWindow', from: 10.45, to: 11.05 },
      { kind: 'window', from: 11.6, to: 12.6, sill: 1.1 },
    ]),
    ext([0, 0.15], [0, 3.65], [{ kind: 'slidingDoor', from: 0.85, to: 2.95 }]),
    ext([-0.65, 3.8], [4.45, 3.8]),
    ext([4.3, 3.95], [4.3, 11.45], [
      { kind: 'window', from: 4.6, to: 6.9, sill: 0.3, head: 2.6 },
      { kind: 'slidingDoor', from: 8.25, to: 10.65 },
    ]),
    ext([4.15, 11.3], [8.95, 11.3], [{ kind: 'window', from: 5.3, to: 7.8, sill: 0.9 }]),
    // Bow-window de la chambre nord-est
    ext([8.8, 11.45], [8.8, 13.0], [{ kind: 'window', from: 11.7, to: 12.7, sill: 0.9 }], 0.25),
    ext([8.68, 12.88], [13.12, 12.88], [
      { kind: 'window', from: 9.1, to: 10.85, sill: 0.9 },
      { kind: 'window', from: 10.95, to: 12.7, sill: 0.9 },
    ], 0.25),
    ext([13, 11.45], [13, 13.0], [{ kind: 'window', from: 11.7, to: 12.7, sill: 0.9 }], 0.25),
    ext([13, 7.65], [13, 11.45], [{ kind: 'window', from: 9.3, to: 10.7, sill: 0.9 }]),
    ext([13, 0.15], [13, 3.65]),
    ext([13.15, 3.8], [14.35, 3.8]),
    ext([13.15, 7.5], [14.35, 7.5]),
    ext([14.22, 3.95], [14.22, 7.35], [{ kind: 'window', from: 4.95, to: 6.35, sill: 0.9 }], 0.25),
    // Cloisons : chambre, placard, salle d'eau
    int([4.2, 0.15], [4.2, 3.65], [{ kind: 'door', from: 2.65, to: 3.5 }]),
    int([4.83, 0.15], [4.83, 2.5]),
    int([4.25, 2.55], [6.12, 2.55], [
      { kind: 'door', from: 4.3, to: 4.75 },
      { kind: 'door', from: 4.95, to: 5.7 },
    ]),
    int([6.17, 0.15], [6.17, 2.6]),
    // Mur d'échiffre arasé en garde-corps au-dessus de la trémie
    { ...int([7.47, 0.25], [7.47, 2.55], [], 0.12), height: 1.0 },
    // WC, salle de bain, buanderie
    int([8.72, 0.15], [8.72, 2.45]),
    int([8.77, 2.4], [9.95, 2.4], [{ kind: 'door', from: 8.82, to: 9.55 }]),
    int([9.97, 0.15], [9.97, 2.35]),
    int([10.02, 2.33], [12.85, 2.33], [{ kind: 'door', from: 10.1, to: 10.8 }]),
    int([10.95, 2.38], [10.95, 3.85], [{ kind: 'door', from: 2.9, to: 3.7 }]),
    // Chambres est
    int([10.2, 3.9], [12.85, 3.9]),
    int([10.2, 3.95], [10.2, 8.9], [{ kind: 'door', from: 4.1, to: 4.95 }]),
    int([10.25, 8.12], [12.85, 8.12], [], 0.08),
    int([8.8, 8.9], [10.25, 8.9], [{ kind: 'door', from: 9.1, to: 10.0 }]),
  ],
  curvedWalls: [bayWall('exterior')],
  rooms: [
    { id: 'chambre-etage-ouest', name: 'Chambre', rects: [rect(0.15, 0.15, 4.15, 3.65)], floor: 'parquet', tour: true },
    { id: 'placard-etage', name: '', rects: [rect(4.25, 0.15, 4.78, 2.5)], floor: 'parquet' },
    { id: 'sde-etage', name: "Salle d'eau", rects: [rect(4.88, 0.15, 6.12, 2.5)], floor: 'wet' },
    {
      id: 'palier-etage',
      name: '',
      rects: [rect(4.25, 2.6, 6.17, 3.73), rect(4.45, 3.73, 6.17, 4.5), rect(6.17, 2.6, 8.77, 3.92), rect(8.77, 2.45, 10.9, 3.85), rect(8.77, 3.85, 10.15, 8.85)],
      floor: 'parquet',
    },
    { id: 'wc-etage', name: 'WC', rects: [rect(8.77, 0.15, 9.92, 2.35)], floor: 'wet' },
    { id: 'sdb', name: 'Salle de bain', rects: [rect(10.02, 0.15, 12.85, 2.28)], floor: 'wet', tour: true },
    { id: 'buanderie', name: 'Buanderie', rects: [rect(11.0, 2.38, 12.85, 3.85)], floor: 'tile' },
    { id: 'salon-etage', name: "Salon d'étage", rects: [rect(4.45, 7.45, 8.8, 11.15)], floor: 'parquet', label: [6.6, 9.4], tour: true },
    { id: 'chambre-etage-est', name: 'Chambre', rects: [rect(10.25, 3.95, 12.85, 7.34), rect(12.85, 3.95, 14.1, 7.35)], floor: 'parquet', label: [11.6, 5.8], tour: true },
    { id: 'placards-etage', name: '', rects: [rect(10.25, 7.34, 12.85, 8.85)], floor: 'parquet' },
    { id: 'chambre-etage-nord', name: 'Chambre', rects: [rect(8.88, 8.95, 12.85, 11.15), rect(8.93, 11.15, 12.87, 12.75)], floor: 'parquet', label: [10.9, 10.4], tour: true },
    {
      id: 'terrasse-etage',
      name: 'Terrasse · pergola',
      rects: [rect(-0.67, 3.95, 4.15, 13.85), rect(4.15, 11.45, 8.67, 13.85)],
      floor: 'deck',
      label: [1.8, 8.4],
      outdoor: true,
      tour: true,
    },
    { id: 'balcon', name: 'Balcon', rects: [rect(-1.32, -0.12, -0.15, 3.9)], floor: 'deck', outdoor: true },
  ],
  columns: GRID_COLUMNS,
  stairs: [],
  railings: [
    { path: [...HALL_VOID, HALL_VOID[0]!], style: 'glass' },
    { path: [[6.22, 2.6], [7.41, 2.6]], style: 'glass' },
    { path: [[-0.67, 3.95], [-0.97, 13.88], [8.67, 13.88], [8.67, 13.0]], style: 'glass' },
    { path: [[-0.15, -0.12], [-1.32, -0.12], [-1.32, 3.92], [-0.7, 3.92]], style: 'glass' },
  ],
  furniture: [
    { type: 'doubleBed', at: [2.0, 1.22], rot: 180 },
    { type: 'nightstand', at: [0.9, 0.4], rot: 180 },
    { type: 'nightstand', at: [3.1, 0.4], rot: 180 },
    { type: 'rug', at: [2.0, 1.6], size: [2.4, 1.7] },
    { type: 'wardrobe', at: [1.9, 3.33], size: [2.4, 0.6] },
    { type: 'shelving', at: [4.5, 1.3], size: [2.1, 0.45], rot: 90, variant: 'dressing' },
    { type: 'shower', at: [5.7, 0.55], size: [0.75, 0.75] },
    { type: 'toilet', at: [5.15, 0.45], rot: 180 },
    { type: 'vanity', at: [5.85, 1.9], size: [0.6, 0.45], rot: 270 },
    { type: 'toilet', at: [9.27, 0.42], rot: 180 },
    { type: 'vanity', at: [9.65, 1.35], size: [0.5, 0.4], rot: 270 },
    { type: 'bathtub', at: [11.95, 0.55], size: [1.7, 0.75] },
    { type: 'vanity', at: [10.6, 0.4], size: [1.0, 0.5], rot: 180, variant: 'double' },
    { type: 'toilet', at: [12.55, 1.75], rot: 270 },
    { type: 'washer', at: [12.55, 3.45], rot: 270 },
    { type: 'washer', at: [12.55, 2.8], rot: 270, variant: 'dryer' },
    { type: 'sofa', at: [6.6, 8.1], size: [2.4, 0.95], rot: 180 },
    { type: 'coffeeTable', at: [6.6, 9.3] },
    { type: 'rug', at: [6.6, 9.2], size: [2.8, 2.0] },
    { type: 'armchair', at: [5.0, 9.6], rot: 90 },
    { type: 'tvUnit', at: [6.6, 10.94], size: [1.9, 0.42] },
    { type: 'bookshelf', at: [8.6, 9.6], size: [1.6, 0.36], rot: 270 },
    { type: 'plant', at: [4.75, 10.8] },
    { type: 'doubleBed', at: [11.75, 5.02], rot: 180 },
    { type: 'nightstand', at: [12.65, 4.25], rot: 180 },
    { type: 'rug', at: [11.75, 5.6], size: [2.4, 1.7] },
    { type: 'wardrobe', at: [11.55, 7.68], size: [2.6, 0.62] },
    { type: 'desk', at: [13.8, 5.65], rot: 270 },
    { type: 'doubleBed', at: [10.9, 10.0], rot: 180 },
    { type: 'nightstand', at: [9.8, 9.2], rot: 180 },
    { type: 'nightstand', at: [12.0, 9.2], rot: 180 },
    { type: 'rug', at: [10.9, 10.4], size: [2.4, 1.7] },
    { type: 'wardrobe', at: [11.55, 8.5], size: [2.6, 0.62], rot: 180 },
    { type: 'armchair', at: [11.9, 12.2], rot: 180 },
    { type: 'plant', at: [9.35, 12.4] },
    { type: 'outdoorLounge', at: [1.8, 9.8] },
    { type: 'outdoorDining', at: [1.8, 5.8] },
    { type: 'outdoorLounge', at: [6.4, 12.65] },
    { type: 'plant', at: [-0.45, 13.5], variant: 'olive' },
    { type: 'plant', at: [3.75, 4.4], variant: 'olive' },
    { type: 'plant', at: [-0.75, 0.4] },
  ],
};

export const building: Building = {
  levels: [basement, groundFloor, upperFloor],
  roof: {
    elevation: FLOOR_TO_FLOOR * 3,
    slab: {
      outline: [...SOUTH_AND_EAST, [8.62, 11.45], [4.15, 11.45], [4.15, 3.95], [-0.15, 3.95]],
    },
    parapetHeight: 0.6,
    parapetThickness: 0.15,
    pergola: rect(-0.65, 3.95, 4.3, 11.45),
  },
  slabThickness: FLOOR_TO_FLOOR - CEILING,
  columnSize: 0.3,
  footprint: [rect(-0.15, -0.15, 13.15, 3.95), rect(-0.65, 3.65, 13.15, 11.45)],
};
