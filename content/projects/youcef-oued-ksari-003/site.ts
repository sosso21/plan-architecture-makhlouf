/**
 * Implantation et topographie — la proposition 003 ne comprend pas de plan
 * de masse : la maison est implantée comme la version 2 (même origine, même
 * terrain relevé sur « terrain emplacement de la maison 0022 »).
 *
 * Les courbes de niveau ne sont pas cotées : équidistance de 1 m supposée,
 * terrain montant depuis la piste (côté garages) vers le fond de parcelle.
 * Le parvis est prolongé jusqu'au-delà du porche (file de poteaux à 14,80 m).
 */
import { rect } from '@/domain/building';
import type { Site } from '@/domain/site';

export const site: Site = {
  buildingBase: 0.3,
  contourInterval: 1,
  boundary: [
    [-9.39, 26.18], [3.4, 25.1], [12.35, 24.17], [17.74, 23.55], [18.81, 1.62], [18.24, -10.24],
    [17.74, -18.58], [10.15, -15.42], [-8.11, -7.61], [-8.44, -1.72], [-8.71, 6.45], [-8.78, 16.1],
  ],
  contours: [
    { height: 0, points: [[-11.8, 31.09], [-9.52, 31.95], [-0.46, 28.77], [1.69, 28.39], [2.33, 28.6], [5.26, 27.83], [13.81, 25.99], [16.96, 25.0], [17.6, 26.32]] },
    { height: 1, points: [[-16.25, 23.94], [-9.4, 26.55], [-8.81, 26.34], [0.55, 24.66], [3.25, 25.58], [6.27, 24.8], [10.09, 22.44], [12.55, 20.9], [16.32, 18.45], [18.09, 16.32]] },
    { height: 2, points: [[18.51, -4.84], [14.56, -0.32], [12.2, 2.52], [8.93, 4.49], [5.61, 6.42], [0.83, 7.97], [-0.99, 8.53], [-2.88, 8.86], [-8.74, 10.07], [-10.14, 9.65], [-15.1, 9.54]] },
    { height: 3, points: [[-14.44, 2.34], [-10.27, 2.44], [-8.56, 1.91], [-7.04, 1.93], [-6.69, 1.87], [-3.93, 1.03], [0.41, -0.37], [1.41, -0.57], [2.49, -1.02], [10.95, -5.47], [16.22, -11.54], [18.09, -12.82]] },
    { height: 4, points: [[-13.79, -4.86], [-13.09, -4.84], [-12.29, -5.1], [-8.22, -5.64], [-6.03, -6.06], [8.44, -12.19], [10.34, -13.19], [11.52, -14.56], [16.82, -18.19]] },
  ],
  road: [
    [[-20, 37.7], [-1.58, 35.71], [1.78, 34.0], [17.28, 32.17], [32, 30.8]],
    [[-20, 39.1], [-9.58, 34.65], [2.05, 29.5], [15.39, 27.95], [32, 26.0]],
  ],
  pads: [
    { id: 'parvis-garages', rect: rect(-1.0, 11.95, 13.6, 18.0), axis: 'y', heightStart: 0.29, heightEnd: 0.24, feather: 2.6, surface: 'paving' },
    { id: 'rampe-acces', rect: rect(3.0, 18.0, 13.4, 30.0), axis: 'y', heightStart: 0.24, heightEnd: 0.02, feather: 2.4, surface: 'gravel' },
    { id: 'pied-perron', rect: rect(-4.0, 4.3, -2.45, 7.7), axis: 'x', heightStart: 2.31, heightEnd: 2.31, feather: 1.6, surface: 'paving' },
  ],
  poles: [
    { at: [-0.61, 20.94], height: 8, line: [[-0.61, 20.94], [-8.91, 18.24], [-30, 12.4]] },
  ],
  extent: 70,
  treeExclusions: [rect(-4.2, -3.0, 16.5, 16.0), rect(-1.5, 11, 14.0, 40), rect(-30, 26.5, 40, 45)],
};
