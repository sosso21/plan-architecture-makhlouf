/**
 * Maison Youssef — Oued Ksari.
 *
 * Données relevées sur les plans vectoriels « proposition 002 » (sous-sol,
 * rez-de-chaussée, étage) puis recalées sur la trame des poteaux :
 *   axes x : 0 · 3,90 · 8,30 · 12,40 m
 *   axes y : 0 · 3,50 · 7,12 · 11,02 m
 * Toutes les cotes sont en mètres, origine = poteau bas-gauche du plan.
 */
import { rect, type Building, type Level, type Slab, type Vec2, type Wall } from '@/domain/building';

const EXT = 0.3;
const INT = 0.1;
const FLOOR_TO_FLOOR = 3.06;
const CEILING = 2.9;

const ext = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = EXT): Wall => ({ a, b, thickness, finish: 'exterior', openings });
const base = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = EXT): Wall => ({ a, b, thickness, finish: 'basement', openings });
const int = (a: Vec2, b: Vec2, openings: Wall['openings'] = [], thickness = INT): Wall => ({ a, b, thickness, finish: 'interior', openings });

/** Trame complète des poteaux (les poteaux noyés dans un mur ne sont pas dessinés). */
const GRID_COLUMNS: Vec2[] = [
  [0, 0], [3.9, 0], [8.3, 0], [12.4, 0],
  [0, 3.5], [3.9, 3.5], [8.3, 3.5], [12.4, 3.5],
  [-0.5, 7.12], [3.9, 7.12], [8.3, 7.12], [12.4, 7.12],
  [-0.5, 11.02], [3.9, 11.02], [8.3, 11.02], [12.4, 11.02],
];

/** Contour commun des planchers haut du sous-sol et de l'étage. */
const FLOOR_OUTLINE: Vec2[] = [
  [-0.15, -0.15], [12.55, -0.15], [12.55, 3.35], [13.72, 3.35], [13.72, 7.27], [12.55, 7.27],
  [12.55, 12.5], [8.15, 12.5], [8.15, 11.17], [-0.65, 11.17], [-0.65, 3.35], [-0.15, 3.35],
];

const BASEMENT_STAIR_HOLE: Vec2[] = [[11.38, 0.15], [12.25, 0.15], [12.25, 3.36], [11.38, 3.36]];

/** Trémie de l'escalier principal + vide sur hall. */
const UPPER_VOID: Vec2[] = [[4.04, 3.63], [8.01, 3.63], [8.01, 4.71], [8.21, 4.71], [8.21, 6.99], [5.07, 6.99], [5.07, 5.6], [4.04, 5.6]];

const groundFloorSlab: Slab = { outline: FLOOR_OUTLINE, holes: [BASEMENT_STAIR_HOLE] };
const upperFloorSlab: Slab = { outline: FLOOR_OUTLINE, holes: [UPPER_VOID] };

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
    base([-0.15, 0], [12.55, 0]),
    base([0, 0.15], [0, 3.35]),
    base([-0.65, 3.5], [-0.15, 3.5]),
    base([-0.55, 3.65], [-0.55, 10.87], [], 0.2),
    base([-0.65, 11.02], [12.55, 11.02], [
      { kind: 'window', from: -0.16, to: 1.01, sill: 1.0 },
      { kind: 'entryDoor', from: 2.6, to: 3.55 },
      { kind: 'garageDoor', from: 4.27, to: 8.18 },
      { kind: 'garageDoor', from: 8.42, to: 12.25 },
    ]),
    base([12.4, 0.15], [12.4, 10.87]),
    // Studio
    int([0.15, 3.5], [3.73, 3.5], [{ kind: 'door', from: 2.75, to: 3.6 }], 0.2),
    int([3.78, 3.6], [3.78, 10.87]),
    int([-0.45, 4.77], [2.57, 4.77]),
    int([2.52, 3.6], [2.52, 6.78], [{ kind: 'door', from: 3.8, to: 4.55 }]),
    // Cave et salle d'eau 2
    int([2.32, 0.15], [2.32, 3.4], [{ kind: 'door', from: 2.5, to: 3.25 }]),
    int([2.37, 2.185], [3.73, 2.185], [{ kind: 'door', from: 2.6, to: 3.35 }]),
    int([3.78, 0.15], [3.78, 2.23]),
    // Cage de l'escalier vers le RDC
    int([11.36, 3.4], [12.25, 3.4]),
  ],
  rooms: [
    { id: 'studio-sejour', name: 'Studio · séjour', rects: [rect(-0.45, 6.78, 3.73, 10.87), rect(2.57, 3.6, 3.73, 6.78)], floor: 'parquet', label: [1.2, 8.9], tour: true },
    { id: 'studio-cuisine', name: 'Cuisine', rects: [rect(-0.45, 4.82, 2.47, 6.78)], floor: 'tile' },
    { id: 'studio-sde', name: "Salle d'eau", rects: [rect(-0.45, 3.6, 2.47, 4.72)], floor: 'wet' },
    { id: 'cave', name: 'Cave', rects: [rect(0.15, 0.15, 2.27, 3.35)], floor: 'concrete' },
    { id: 'sde-ss', name: "Salle d'eau", rects: [rect(2.37, 0.15, 3.73, 2.135)], floor: 'wet' },
    { id: 'degagement-ss', name: '', rects: [rect(2.37, 2.235, 3.73, 3.4)], floor: 'concrete' },
    { id: 'garage-02', name: 'Garage 02', rects: [rect(3.83, 0.15, 8.3, 10.87)], floor: 'concrete', label: [6.0, 4.5], tour: true },
    { id: 'garage-01', name: 'Garage 01', rects: [rect(8.3, 0.15, 12.25, 10.87)], floor: 'concrete', label: [10.0, 5.5] },
  ],
  columns: GRID_COLUMNS,
  stairs: [
    {
      id: 'escalier-ss-rdc',
      rise: FLOOR_TO_FLOOR,
      style: 'solid',
      runs: [
        { kind: 'straight', rect: rect(10.88, 0.15, 11.36, 1.02), dir: 'E', count: 2 },
        { kind: 'winder', rect: rect(11.36, 0.15, 12.25, 1.02), pivot: [11.36, 1.02], fromDeg: -90, toDeg: 0, count: 4 },
        { kind: 'straight', rect: rect(11.36, 1.02, 12.25, 2.47), dir: 'N', count: 6 },
        { kind: 'winder', rect: rect(11.36, 2.47, 12.25, 3.36), pivot: [11.36, 2.47], fromDeg: 0, toDeg: 90, count: 4 },
      ],
    },
  ],
  railings: [{ path: [[11.36, 1.02], [11.36, 2.47]], base: [1.1, 2.1], style: 'metal' }],
  furniture: [
    { type: 'sofa', at: [0.95, 7.35], size: [2.1, 0.92], rot: 180 },
    { type: 'coffeeTable', at: [0.95, 8.55] },
    { type: 'rug', at: [0.95, 8.4], size: [2.4, 1.7] },
    { type: 'tvUnit', at: [0.95, 10.62] },
    { type: 'desk', at: [-0.12, 9.6], rot: 90 },
    { type: 'plant', at: [3.3, 10.45] },
    { type: 'kitchenRun', at: [1.05, 5.13], size: [2.85, 0.6], rot: 180 },
    { type: 'kitchenRun', at: [-0.14, 6.15], size: [1.25, 0.6], rot: 90, variant: 'plain' },
    { type: 'diningTable', at: [1.55, 6.25], size: [0.8, 0.8], variant: 'two' },
    { type: 'shower', at: [2.05, 4.17], size: [0.8, 0.8] },
    { type: 'toilet', at: [-0.2, 4.2], rot: 90 },
    { type: 'vanity', at: [0.9, 3.92], rot: 180 },
    { type: 'shower', at: [3.3, 0.6], size: [0.75, 0.8] },
    { type: 'toilet', at: [2.75, 0.45], rot: 180 },
    { type: 'vanity', at: [3.35, 1.85], size: [0.6, 0.45], rot: 0 },
    { type: 'shelving', at: [1.2, 0.45], size: [1.8, 0.5], rot: 180 },
    { type: 'shelving', at: [0.45, 2.2], size: [1.6, 0.5], rot: 90 },
    { type: 'car', at: [6.05, 6.9], rot: 180, variant: 'graphite' },
    { type: 'car', at: [10.3, 6.9], rot: 180, variant: 'pearl' },
    { type: 'shelving', at: [5.9, 0.45], size: [3.0, 0.5], rot: 180 },
    { type: 'shelving', at: [9.6, 0.45], size: [2.2, 0.5], rot: 180 },
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
    ext([-0.15, 0], [12.55, 0], [
      { kind: 'highWindow', from: 4.71, to: 5.29 },
      { kind: 'highWindow', from: 6.81, to: 7.4 },
      { kind: 'highWindow', from: 8.78, to: 9.36 },
      { kind: 'highWindow', from: 10.07, to: 10.66 },
    ]),
    ext([0, 0.15], [0, 3.35], [{ kind: 'window', from: 0.78, to: 2.72 }]),
    ext([-0.65, 3.5], [3.75, 3.5]),
    ext([3.9, 3.35], [3.9, 11.17], [
      { kind: 'highWindow', from: 4.13, to: 4.52, sill: 1.35 },
      { kind: 'highWindow', from: 4.75, to: 5.14, sill: 1.7 },
      { kind: 'entryDoor', from: 5.7, to: 6.87 },
      { kind: 'window', from: 7.9, to: 10.24, sill: 0.6 },
    ]),
    ext([4.05, 11.02], [8.45, 11.02], [{ kind: 'window', from: 4.93, to: 7.28, sill: 0.9 }]),
    // Bow-window vitré du coin repas
    ext([8.3, 11.17], [8.3, 12.5], [{ kind: 'window', from: 11.3, to: 12.32, sill: 0.45, head: 2.45 }], 0.2),
    ext([8.2, 12.42], [12.5, 12.42], [
      { kind: 'window', from: 8.45, to: 10.3, sill: 0.45, head: 2.45 },
      { kind: 'window', from: 10.4, to: 12.25, sill: 0.45, head: 2.45 },
    ], 0.16),
    ext([12.4, 11.17], [12.4, 12.5], [{ kind: 'window', from: 11.3, to: 12.32, sill: 0.45, head: 2.45 }], 0.2),
    ext([12.4, 0.15], [12.4, 3.35]),
    ext([12.4, 7.27], [12.4, 11.17], [{ kind: 'window', from: 7.9, to: 10.24, sill: 0.9 }]),
    // Avancée de la cuisine
    ext([12.55, 3.5], [13.72, 3.5]),
    ext([12.55, 7.12], [13.72, 7.12]),
    ext([13.6, 3.65], [13.6, 6.97], [], 0.25),
    // Cloisons
    int([4.0, 0.15], [4.0, 3.35], [{ kind: 'door', from: 2.35, to: 3.2 }]),
    int([4.05, 2.14], [11.33, 2.14], [
      { kind: 'passage', from: 4.66, to: 5.34 },
      { kind: 'door', from: 6.11, to: 6.93 },
      { kind: 'door', from: 8.25, to: 9.07 },
      { kind: 'door', from: 10.01, to: 10.69 },
    ]),
    int([6.0, 0.15], [6.0, 2.09]),
    int([8.2, 0.15], [8.2, 2.09]),
    int([9.375, 0.15], [9.375, 2.09]),
    int([11.33, 0.15], [11.33, 2.48]),
    int([4.05, 3.6], [8.15, 3.6], [{ kind: 'passage', from: 7.03, to: 8.15 }]),
    int([9.36, 3.405], [12.25, 3.405]),
    int([8.4, 3.65], [8.4, 5.21]),
  ],
  rooms: [
    { id: 'chambre-1', name: 'Chambre', rects: [rect(0.15, 0.15, 3.95, 3.35)], floor: 'parquet', tour: true },
    { id: 'dressing-rdc', name: 'Dressing', rects: [rect(4.05, 0.15, 5.95, 2.09)], floor: 'parquet' },
    { id: 'sde-rdc', name: "Salle d'eau", rects: [rect(6.05, 0.15, 8.15, 2.09)], floor: 'wet' },
    { id: 'wc-rdc', name: 'WC', rects: [rect(8.25, 0.15, 9.325, 2.09)], floor: 'wet' },
    { id: 'cellier', name: 'Cellier', rects: [rect(9.425, 0.15, 11.28, 2.09)], floor: 'tile' },
    { id: 'degagement-rdc', name: '', rects: [rect(4.05, 2.19, 11.33, 3.35)], floor: 'stone' },
    { id: 'hall', name: 'Hall', rects: [rect(4.05, 3.65, 8.35, 7.12)], floor: 'stone', label: [5.4, 6.2], tour: true },
    { id: 'salon', name: 'Salon', rects: [rect(4.05, 7.12, 8.3, 10.87)], floor: 'stone', tour: true },
    { id: 'coin-repas', name: 'Coin repas', rects: [rect(8.3, 7.12, 12.25, 10.87), rect(8.4, 10.87, 12.3, 12.34)], floor: 'stone', label: [10.3, 10.2], tour: true },
    { id: 'cuisine', name: 'Cuisine', rects: [rect(8.45, 3.455, 12.4, 7.12), rect(12.4, 3.65, 13.47, 6.97)], floor: 'stone', label: [10.6, 5.2], tour: true },
    { id: 'terrasse-rdc', name: 'Terrasse couverte', rects: [rect(-0.63, 3.65, 3.75, 11.17)], floor: 'deck', label: [1.6, 7.6], outdoor: true, tour: true },
  ],
  columns: GRID_COLUMNS,
  stairs: [
    {
      id: 'escalier-rdc-etage',
      rise: FLOOR_TO_FLOOR,
      style: 'floating',
      runs: [
        { kind: 'straight', rect: rect(5.08, 3.65, 8.01, 4.72), dir: 'W', count: 10 },
        { kind: 'winder', rect: rect(4.05, 3.65, 5.08, 4.72), pivot: [5.08, 4.72], fromDeg: -90, toDeg: -180, count: 3 },
        { kind: 'straight', rect: rect(4.05, 4.72, 5.08, 5.6), dir: 'N', count: 3 },
      ],
    },
    {
      id: 'perron-terrasse',
      rise: 1.05,
      descending: true,
      style: 'solid',
      runs: [{ kind: 'straight', rect: rect(-2.42, 4.33, -0.65, 6.29), dir: 'W', count: 6 }],
    },
  ],
  railings: [
    { path: [[8.01, 4.72], [5.08, 4.72]], base: [0.05, 1.75], style: 'glass' },
    { path: [[5.08, 4.72], [5.08, 5.6]], base: [2.3, 3.02], style: 'glass' },
    { path: [[-0.63, 4.33], [-0.63, 3.65]], style: 'metal' },
    { path: [[-0.63, 6.29], [-0.63, 11.17], [3.75, 11.17]], style: 'metal' },
  ],
  furniture: [
    { type: 'doubleBed', at: [1.95, 1.22], rot: 180 },
    { type: 'nightstand', at: [0.82, 0.4], rot: 180 },
    { type: 'nightstand', at: [3.08, 0.4], rot: 180 },
    { type: 'rug', at: [1.95, 1.6], size: [2.4, 1.7] },
    { type: 'wardrobe', at: [1.75, 3.04], size: [2.4, 0.6] },
    { type: 'plant', at: [3.55, 2.0] },
    { type: 'shelving', at: [5.0, 0.42], size: [1.8, 0.5], rot: 180, variant: 'dressing' },
    { type: 'shelving', at: [4.35, 1.3], size: [1.2, 0.5], rot: 90, variant: 'dressing' },
    { type: 'shower', at: [7.6, 0.62], size: [1.0, 0.9] },
    { type: 'vanity', at: [6.55, 0.4], size: [0.9, 0.5], rot: 180 },
    { type: 'toilet', at: [8.8, 0.45], rot: 180 },
    { type: 'shelving', at: [10.35, 0.42], size: [1.7, 0.45], rot: 180 },
    { type: 'washer', at: [11.0, 1.7], rot: 270 },
    { type: 'plant', at: [4.45, 6.75] },
    { type: 'rug', at: [6.3, 5.9], size: [2.0, 1.4], variant: 'runner' },
    { type: 'cornerSofa', at: [5.55, 8.05], size: [2.8, 1.9], rot: 180 },
    { type: 'coffeeTable', at: [5.9, 9.25] },
    { type: 'rug', at: [6.0, 9.0], size: [3.0, 2.2] },
    { type: 'armchair', at: [7.65, 9.4], rot: 270 },
    { type: 'tvUnit', at: [6.1, 10.66], size: [1.9, 0.42] },
    { type: 'floorLamp', at: [4.4, 10.45] },
    { type: 'plant', at: [7.95, 10.55] },
    { type: 'diningTable', at: [10.3, 9.35], size: [2.1, 1.0] },
    { type: 'rug', at: [10.3, 9.35], size: [3.0, 2.1], variant: 'flat' },
    { type: 'armchair', at: [9.45, 11.75], rot: 180 },
    { type: 'armchair', at: [11.25, 11.75], rot: 180 },
    { type: 'plant', at: [10.35, 12.0] },
    { type: 'kitchenRun', at: [11.0, 3.77], size: [2.5, 0.62], rot: 180 },
    { type: 'fridge', at: [9.72, 3.8], rot: 180 },
    { type: 'kitchenRun', at: [13.16, 5.3], size: [3.2, 0.62], rot: 270, variant: 'hob' },
    { type: 'kitchenIsland', at: [11.25, 7.05], size: [2.2, 0.8] },
    { type: 'outdoorLounge', at: [1.55, 9.4] },
    { type: 'outdoorDining', at: [1.6, 5.7] },
    { type: 'plant', at: [-0.3, 10.8], variant: 'olive' },
    { type: 'plant', at: [3.4, 4.0], variant: 'olive' },
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
    ext([-0.15, 0], [12.55, 0], [
      { kind: 'highWindow', from: 4.7, to: 5.29 },
      { kind: 'highWindow', from: 6.81, to: 7.4 },
      { kind: 'highWindow', from: 8.78, to: 9.37 },
      { kind: 'highWindow', from: 10.07, to: 10.66 },
    ]),
    ext([0, 0.15], [0, 3.35], [{ kind: 'window', from: 0.76, to: 2.7 }]),
    ext([-0.65, 3.5], [3.75, 3.5]),
    ext([3.9, 3.35], [3.9, 11.17], [
      { kind: 'highWindow', from: 4.11, to: 4.51, sill: 1.35 },
      { kind: 'highWindow', from: 4.74, to: 5.14, sill: 1.35 },
      { kind: 'slidingDoor', from: 7.92, to: 10.24 },
    ]),
    ext([4.05, 11.02], [8.45, 11.02], [{ kind: 'window', from: 4.93, to: 7.28, sill: 0.9 }]),
    ext([8.3, 11.17], [8.3, 12.5], [{ kind: 'window', from: 11.3, to: 12.32, sill: 0.45, head: 2.45 }], 0.2),
    ext([8.2, 12.42], [12.5, 12.42], [
      { kind: 'window', from: 8.45, to: 10.3, sill: 0.45, head: 2.45 },
      { kind: 'window', from: 10.4, to: 12.25, sill: 0.45, head: 2.45 },
    ], 0.16),
    ext([12.4, 11.17], [12.4, 12.5], [{ kind: 'window', from: 11.3, to: 12.32, sill: 0.45, head: 2.45 }], 0.2),
    ext([12.4, 0.15], [12.4, 3.35]),
    ext([12.4, 7.27], [12.4, 11.17], [{ kind: 'window', from: 7.92, to: 10.24, sill: 0.9 }]),
    ext([12.55, 3.5], [13.72, 3.5]),
    ext([12.55, 7.12], [13.72, 7.12]),
    ext([13.6, 3.65], [13.6, 6.97], [{ kind: 'window', from: 4.5, to: 6.1, sill: 0.9 }], 0.25),
    // Cloisons
    int([4.0, 0.15], [4.0, 3.35], [{ kind: 'door', from: 2.35, to: 3.2 }]),
    int([4.04, 2.12], [12.25, 2.12], [
      { kind: 'passage', from: 4.66, to: 5.34 },
      { kind: 'door', from: 6.11, to: 6.93 },
      { kind: 'door', from: 8.26, to: 9.07 },
      { kind: 'door', from: 9.45, to: 10.24 },
    ]),
    int([6.0, 0.15], [6.0, 2.07]),
    int([8.21, 0.15], [8.21, 2.07]),
    int([9.375, 0.15], [9.375, 2.07]),
    int([10.4, 2.17], [10.4, 3.53], [{ kind: 'door', from: 2.6, to: 3.35 }]),
    int([4.04, 3.58], [8.15, 3.58]),
    int([9.62, 3.58], [12.25, 3.58]),
    int([9.67, 3.63], [9.67, 8.55], [{ kind: 'door', from: 5.95, to: 6.8 }]),
    int([9.72, 7.77], [12.25, 7.77]),
    int([8.45, 8.5], [9.62, 8.5], [{ kind: 'door', from: 8.62, to: 9.42 }]),
    int([8.4, 8.45], [8.4, 10.87]),
  ],
  rooms: [
    { id: 'chambre-2', name: 'Chambre', rects: [rect(0.15, 0.15, 3.95, 3.35)], floor: 'parquet', tour: true },
    { id: 'dressing-etage', name: 'Dressing', rects: [rect(4.04, 0.15, 5.95, 2.07)], floor: 'parquet' },
    { id: 'sde-etage', name: "Salle d'eau", rects: [rect(6.05, 0.15, 8.16, 2.07)], floor: 'wet' },
    { id: 'wc-etage', name: 'WC', rects: [rect(8.26, 0.15, 9.325, 2.07)], floor: 'wet' },
    { id: 'sdb', name: 'Salle de bain', rects: [rect(9.425, 0.15, 12.25, 2.07)], floor: 'wet', tour: true },
    { id: 'buanderie', name: 'Buanderie', rects: [rect(10.45, 2.17, 12.25, 3.53)], floor: 'tile' },
    { id: 'degagement-etage', name: '', rects: [rect(4.04, 2.17, 10.35, 3.53), rect(8.01, 3.53, 9.62, 4.71), rect(8.21, 4.71, 9.62, 8.45)], floor: 'parquet' },
    { id: 'salon-etage', name: "Salon d'étage", rects: [rect(4.04, 6.99, 8.35, 10.87), rect(4.04, 5.6, 5.07, 6.99)], floor: 'parquet', label: [6.2, 9.3], tour: true },
    { id: 'chambre-3', name: 'Chambre', rects: [rect(9.72, 3.63, 12.25, 7.72), rect(12.25, 3.65, 13.47, 6.97)], floor: 'parquet', label: [11.0, 5.0], tour: true },
    { id: 'chambre-4', name: 'Chambre', rects: [rect(8.45, 8.55, 12.25, 10.87), rect(9.72, 7.82, 12.25, 8.55), rect(8.4, 10.87, 12.3, 12.34)], floor: 'parquet', label: [10.6, 10.0], tour: true },
    { id: 'terrasse-etage', name: 'Terrasse · pergola', rects: [rect(-0.63, 3.65, 3.75, 11.17)], floor: 'deck', label: [1.6, 7.6], outdoor: true, tour: true },
  ],
  columns: GRID_COLUMNS,
  stairs: [],
  railings: [
    { path: [[8.01, 3.63], [8.01, 4.71], [8.21, 4.71], [8.21, 6.99], [5.07, 6.99], [5.07, 5.6]], style: 'glass' },
    { path: [[-0.63, 3.65], [-0.63, 11.17], [3.75, 11.17]], style: 'glass' },
  ],
  furniture: [
    { type: 'doubleBed', at: [1.95, 1.22], rot: 180 },
    { type: 'nightstand', at: [0.82, 0.4], rot: 180 },
    { type: 'nightstand', at: [3.08, 0.4], rot: 180 },
    { type: 'rug', at: [1.95, 1.6], size: [2.4, 1.7] },
    { type: 'wardrobe', at: [1.75, 3.04], size: [2.4, 0.6] },
    { type: 'shelving', at: [5.0, 0.42], size: [1.8, 0.5], rot: 180, variant: 'dressing' },
    { type: 'shower', at: [7.6, 0.62], size: [1.0, 0.9] },
    { type: 'vanity', at: [6.55, 0.4], size: [0.9, 0.5], rot: 180 },
    { type: 'toilet', at: [8.8, 0.45], rot: 180 },
    { type: 'bathtub', at: [11.35, 0.55], size: [1.75, 0.78] },
    { type: 'vanity', at: [10.3, 0.4], size: [1.0, 0.5], rot: 180, variant: 'double' },
    { type: 'toilet', at: [11.95, 1.65], rot: 270 },
    { type: 'washer', at: [11.95, 2.55], rot: 270 },
    { type: 'washer', at: [11.95, 3.18], rot: 270, variant: 'dryer' },
    { type: 'sofa', at: [6.1, 7.55], size: [2.4, 0.95], rot: 180 },
    { type: 'coffeeTable', at: [6.1, 8.7] },
    { type: 'rug', at: [6.1, 8.6], size: [2.8, 2.0] },
    { type: 'armchair', at: [4.75, 9.3], rot: 90 },
    { type: 'tvUnit', at: [6.1, 10.66], size: [1.9, 0.42] },
    { type: 'bookshelf', at: [8.15, 9.6], size: [1.6, 0.36], rot: 270 },
    { type: 'plant', at: [4.4, 10.5] },
    { type: 'doubleBed', at: [11.0, 6.65] },
    { type: 'nightstand', at: [9.95, 7.45] },
    { type: 'nightstand', at: [12.05, 7.45] },
    { type: 'rug', at: [11.0, 6.1], size: [2.4, 1.7] },
    { type: 'wardrobe', at: [10.95, 3.95], size: [2.2, 0.6], rot: 180 },
    { type: 'desk', at: [13.15, 5.3], rot: 270 },
    { type: 'doubleBed', at: [9.53, 9.7], rot: 90 },
    { type: 'nightstand', at: [8.68, 8.75], rot: 90 },
    { type: 'nightstand', at: [8.68, 10.65], rot: 90 },
    { type: 'rug', at: [10.1, 9.7], size: [1.8, 2.4] },
    { type: 'wardrobe', at: [11.0, 8.19], size: [2.4, 0.6], rot: 180 },
    { type: 'armchair', at: [11.3, 11.75], rot: 180 },
    { type: 'plant', at: [8.9, 11.95] },
    { type: 'outdoorLounge', at: [1.55, 9.2] },
    { type: 'outdoorDining', at: [1.6, 5.6] },
    { type: 'plant', at: [-0.3, 10.8], variant: 'olive' },
    { type: 'plant', at: [3.4, 4.0], variant: 'olive' },
  ],
};

export const building: Building = {
  levels: [basement, groundFloor, upperFloor],
  roof: {
    elevation: FLOOR_TO_FLOOR * 3,
    slab: {
      outline: [
        [-0.15, -0.15], [12.55, -0.15], [12.55, 3.35], [13.72, 3.35], [13.72, 7.27], [12.55, 7.27],
        [12.55, 12.5], [8.15, 12.5], [8.15, 11.17], [3.75, 11.17], [3.75, 3.65], [-0.15, 3.65],
      ],
    },
    parapetHeight: 0.6,
    parapetThickness: 0.15,
    pergola: rect(-0.65, 3.35, 3.9, 11.17),
  },
  slabThickness: FLOOR_TO_FLOOR - CEILING,
  columnSize: 0.3,
  footprint: [rect(-0.15, -0.15, 12.55, 3.65), rect(-0.65, 3.35, 12.55, 11.17)],
};
