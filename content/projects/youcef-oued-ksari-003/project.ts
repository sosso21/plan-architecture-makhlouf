import type { ProjectManifest } from '@/domain/project';

const project: ProjectManifest = {
  slug: 'youcef-oued-ksari-003',
  title: 'Maison Youcef 003',
  location: 'Oued Ksari',
  status: 'Esquisse — proposition 003 (version 3)',
  summary:
    "Troisième version de la villa : garages et studio au sous-sol sous un porche, salon en double hauteur et cuisine en bow-window au RDC, suite parentale, escalier central en U, trois chambres à l'étage et un grenier aménagé en studio ouvert sur une grande terrasse avec coin cuisine d'été.",
  updatedAt: '2026-11-25',
  accent: '#8a7fb0',
  facts: [
    { label: 'Niveaux', value: 'Sous-sol · RDC · Étage · Grenier' },
    { label: 'Emprise', value: '≈ 14,6 × 15,2 m' },
    { label: 'Salon', value: 'Double hauteur' },
    { label: 'Chambres', value: '4 + 2 studios' },
    { label: 'Garages', value: '2 places sous porche' },
    { label: 'Terrain', value: '≈ 1 025 m², en pente' },
  ],
  documents: [
    { id: 'sous-sol', title: 'Plan du sous-sol', kind: 'plan', file: 'plan-sous-sol.pdf', description: "Garages 01 et 02 sous porche, studio (séjour, cuisine, salle d'eau), local technique, WC et escalier vers le RDC." },
    { id: 'rdc', title: 'Plan du rez-de-chaussée', kind: 'plan', file: 'plan-rez-de-chaussee.pdf', description: 'Salon, cuisine en bow-window, escalier central, cellier, suite parentale (chambre, dressing, salle d\'eau), WC, rangement, terrasse.' },
    { id: 'etage', title: "Plan de l'étage", kind: 'plan', file: 'plan-etage.pdf', description: "Vide sur salon, trois chambres dont une avec terrasse, dressings, salle d'eau, terrasse ouest." },
    { id: 'grenier', title: 'Plan du grenier', kind: 'plan', file: 'plan-grenier.pdf', description: "Studio, rangement, grande terrasse et coin cuisine d'été." },
  ],
  scene: {
    kind: 'procedural',
    load: async () => {
      const [{ building }, { site }] = await Promise.all([import('./building'), import('./site')]);
      return { building, site };
    },
  },
  assumptions: [
    'Pas de plan de masse dans cette proposition : implantation et terrain repris de la version 2.',
    'Échelle déduite des cotes de pièces (4,15 / 8,65 / 4,20 m) ; trame recalée à 4,20 / 4,50 / 4,40 m × 4,00 / 4,00 / 3,80 m, plus le porche de 3,00 m. Le sous-sol, repris de la version 2, y est ramené.',
    "Courbes de niveau non cotées : équidistance de 1 m supposée, haut du plan au nord.",
    "Hauteur sous plafond 2,90 m, planchers de 16 cm, acrotère de 60 cm.",
    "Escalier central en U identique du RDC à l'étage et de l'étage au grenier (marches suspendues, balancements aux angles).",
    "Portes non dessinées placées pour desservir les pièces (chambre du RDC, chambre nord-est, dressings, rangements).",
    'Fenêtres du studio du grenier non dessinées : ajoutées au sud et au nord.',
    "Pergola sur la terrasse ouest du grenier, portée par la file de poteaux ; poteaux du porche arrêtés sous la terrasse du RDC.",
    'Mobilier, matériaux et couleurs indicatifs.',
  ],
};

export default project;
