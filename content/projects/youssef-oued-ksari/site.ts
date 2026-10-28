/**
 * Implantation et topographie — relevées sur « emplacement de la maison
 * (terrain topographie) », recalées dans le repère du plan de la maison
 * (échelle déduite des cotes 12,63 / 10,98 / 8,38 / 4,17 m).
 *
 * Les courbes de niveau ne sont pas cotées sur le document source :
 * on retient une équidistance de 1 m, le terrain montant depuis la piste
 * (côté garages) vers le fond de parcelle. C'est cohérent avec un sous-sol
 * ouvert sur la piste et un rez-de-chaussée de plain-pied côté jardin.
 */
import { rect } from '@/domain/building';
import type { Site } from '@/domain/site';

export const site: Site = {
  buildingBase: 0.3,
  contourInterval: 1,
  boundary: [
    [-9.57, 25.95], [3.12, 24.89], [11.99, 23.97], [17.34, 23.35], [18.4, 1.6], [17.84, -10.16],
    [17.34, -18.42], [9.82, -15.3], [-8.29, -7.54], [-8.62, -1.71], [-8.89, 6.39], [-8.96, 15.96],
  ],
  contours: [
    { height: 0, points: [[-11.95, 30.82], [-9.69, 31.69], [-0.71, 28.53], [1.43, 28.14], [2.05, 28.36], [4.97, 27.6], [13.44, 25.77], [16.57, 24.79], [17.19, 26.1]] },
    { height: 1, points: [[-12.11, 25.37], [-9.57, 26.33], [-8.99, 26.13], [0.29, 24.45], [2.97, 25.37], [5.96, 24.59], [9.75, 22.25], [12.19, 20.72], [15.94, 18.29], [17.69, 16.17]] },
    { height: 2, points: [[18.1, -4.8], [14.18, -0.32], [11.84, 2.5], [8.6, 4.46], [5.31, 6.37], [0.56, 7.9], [-1.23, 8.46], [-3.11, 8.79], [-8.92, 9.98], [-10.31, 9.57], [-12.11, 9.53]] },
    { height: 3, points: [[-12.11, 2.38], [-10.43, 2.41], [-8.74, 1.89], [-7.23, 1.92], [-6.88, 1.86], [-4.16, 1.02], [0.15, -0.37], [1.15, -0.56], [2.21, -1.01], [10.61, -5.42], [15.83, -11.44], [17.68, -12.71]] },
    { height: 4, points: [[-12.11, -5.1], [-8.4, -5.59], [-6.23, -6.01], [8.11, -12.09], [9.99, -13.08], [11.17, -14.43], [16.43, -18.05]] },
  ],
  road: [
    [[-20, 37.5], [-2.76, 35.89], [1.52, 33.72], [16.88, 31.91], [32, 30.6]],
    [[-20, 38.9], [-9.75, 34.36], [1.78, 29.25], [15.0, 27.71], [32, 25.8]],
  ],
  pads: [
    { id: 'parvis-garages', rect: rect(-0.8, 11.0, 12.9, 16.0), axis: 'y', heightStart: 0.29, heightEnd: 0.24, feather: 2.6, surface: 'paving' },
    { id: 'rampe-acces', rect: rect(3.7, 16.0, 12.9, 30.0), axis: 'y', heightStart: 0.24, heightEnd: 0.02, feather: 2.4, surface: 'gravel' },
    { id: 'pied-perron', rect: rect(-3.9, 3.9, -2.42, 6.7), axis: 'x', heightStart: 2.31, heightEnd: 2.31, feather: 1.6, surface: 'paving' },
  ],
  poles: [
    { at: [-0.86, 20.76], height: 8, line: [[-0.86, 20.76], [-9.09, 18.08], [-30, 12.4]] },
  ],
  extent: 70,
  treeExclusions: [rect(-4.2, -2.4, 15.2, 13.8), rect(2.8, 11, 13.8, 40), rect(-30, 26.5, 40, 45)],
};
