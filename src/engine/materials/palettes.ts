/** Palettes proposées dans le configurateur. Données pures, partagées UI / moteur. */

export interface FacadePalette {
  readonly id: string;
  readonly name: string;
  readonly wall: string;
  readonly accent: string;
  readonly stone: string;
  readonly frame: string;
  readonly door: string;
  readonly garage: string;
}

export interface InteriorStyle {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly walls: string;
  readonly ceiling: string;
  readonly parquet: string;
  readonly stone: string;
  readonly tile: string;
  readonly fabric: string;
  readonly fabricAccent: string;
  readonly wood: string;
  readonly woodDark: string;
  readonly cabinet: string;
  readonly counter: string;
  readonly rug: string;
  readonly metal: string;
}

export const FACADE_PALETTES: readonly FacadePalette[] = [
  { id: 'chaux', name: 'Blanc chaux', wall: '#efebe3', accent: '#d8cfbf', stone: '#b9a487', frame: '#2c3034', door: '#6d4a31', garage: '#646a70' },
  { id: 'sable', name: 'Sable du Djurdjura', wall: '#e3cfad', accent: '#f4eee3', stone: '#9b8466', frame: '#f3f0ea', door: '#7a5234', garage: '#ece6dc' },
  { id: 'ocre', name: 'Ocre kabyle', wall: '#d39b66', accent: '#f1e5d3', stone: '#8d7a63', frame: '#34332f', door: '#34332f', garage: '#4a4741' },
  { id: 'terre', name: 'Terre cuite', wall: '#b9704f', accent: '#efe4d4', stone: '#7b6956', frame: '#f1ece3', door: '#4c3426', garage: '#efe9df' },
  { id: 'beton', name: 'Béton & bois', wall: '#bdbab4', accent: '#8e8b85', stone: '#6c6863', frame: '#1e2124', door: '#a06e45', garage: '#a06e45' },
  { id: 'olivier', name: 'Vert olivier', wall: '#a9ad8f', accent: '#efebe1', stone: '#a08f74', frame: '#4b4a3e', door: '#5b4632', garage: '#4b4a3e' },
];

export const FRAME_COLORS: readonly { id: string; name: string; value: string }[] = [
  { id: 'anthracite', name: 'Anthracite', value: '#2c3034' },
  { id: 'blanc', name: 'Blanc', value: '#f3f0ea' },
  { id: 'bois', name: 'Chêne', value: '#9a6a40' },
  { id: 'bronze', name: 'Bronze', value: '#5a4a3a' },
  { id: 'bleu', name: 'Bleu Majorelle', value: '#2f5f8f' },
  { id: 'vert', name: 'Vert sauge', value: '#6f826a' },
];

export const INTERIOR_STYLES: readonly InteriorStyle[] = [
  {
    id: 'scandinave',
    name: 'Scandinave',
    description: 'Chêne clair, lin, blancs chauds',
    walls: '#f3f1ec', ceiling: '#fbfaf7', parquet: '#d2b38c', stone: '#dedad2', tile: '#e6e3dd',
    fabric: '#cfcbc3', fabricAccent: '#6f8aa6', wood: '#c9a47c', woodDark: '#3b3a38',
    cabinet: '#f4f2ed', counter: '#e8e5de', rug: '#d9d0c1', metal: '#2a2a2a',
  },
  {
    id: 'mediterraneen',
    name: 'Méditerranéen',
    description: 'Tomettes, bleu profond, bois miel',
    walls: '#f5ede0', ceiling: '#fbf6ee', parquet: '#b98a5a', stone: '#e0c9a8', tile: '#c87b55',
    fabric: '#ebe0cc', fabricAccent: '#2f6d8f', wood: '#9a6a40', woodDark: '#4a3424',
    cabinet: '#2f6d8f', counter: '#efe7da', rug: '#b5563a', metal: '#3b3a36',
  },
  {
    id: 'contemporain',
    name: 'Contemporain',
    description: 'Grands formats gris, noyer, cognac',
    walls: '#e8e6e2', ceiling: '#f6f5f2', parquet: '#87634a', stone: '#9a9894', tile: '#c9c7c2',
    fabric: '#6c6965', fabricAccent: '#c5873d', wood: '#5d4030', woodDark: '#1f2022',
    cabinet: '#2a2b2d', counter: '#dcdad5', rug: '#3e3d3b', metal: '#141414',
  },
  {
    id: 'riad',
    name: 'Riad',
    description: 'Tadelakt, zellige vert, laiton',
    walls: '#efe2cf', ceiling: '#f8f0e4', parquet: '#a87b52', stone: '#e8d6bb', tile: '#2f7a64',
    fabric: '#e9d9c0', fabricAccent: '#b4462f', wood: '#7a4f2e', woodDark: '#3a2618',
    cabinet: '#2f7a64', counter: '#f1e8d8', rug: '#8f2f2a', metal: '#a8853f',
  },
];

export const DEFAULT_FACADE = 'chaux';
export const DEFAULT_INTERIOR = 'scandinave';

export const findFacade = (id: string | null | undefined): FacadePalette =>
  FACADE_PALETTES.find((p) => p.id === id) ?? FACADE_PALETTES[0]!;

export const findInterior = (id: string | null | undefined): InteriorStyle =>
  INTERIOR_STYLES.find((p) => p.id === id) ?? INTERIOR_STYLES[0]!;

const HEX = /^#[0-9a-f]{6}$/i;
export const isHexColor = (v: unknown): v is string => typeof v === 'string' && HEX.test(v);
