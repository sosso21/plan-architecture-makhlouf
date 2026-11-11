import type { ProjectManifest } from '@/domain/project';

const project: ProjectManifest = {
  slug: 'youcef-oued-ksari-002',
  title: 'Maison Youcef 002',
  location: 'Oued Ksari',
  status: 'Esquisse — proposition 0022 (version 2)',
  summary:
    "Seconde version de la villa R+1 sur sous-sol : deux garages et un studio ouverts sur la piste, séjour traversant avec hall en double hauteur, escalier dans une cage en demi-lune côté jardin, trois chambres, grande terrasse et balcon à l'étage.",
  updatedAt: '2026-11-11',
  accent: '#7d9a86',
  facts: [
    { label: 'Niveaux', value: 'Sous-sol · RDC · Étage' },
    { label: 'Emprise', value: '≈ 14,5 × 14,5 m' },
    { label: 'Surface habitable RDC', value: '≈ 120 m²' },
    { label: 'Chambres', value: '4 + studio' },
    { label: 'Garages', value: '2 places' },
    { label: 'Terrain', value: '≈ 1 025 m², en pente' },
  ],
  documents: [
    { id: 'implantation', title: 'Plan de masse & topographie', kind: 'topographie', file: 'plan-implantation-topographie.pdf', description: 'Implantation de la maison dans la parcelle, courbes de niveau et recul de 10,98 m.' },
    { id: 'sous-sol', title: 'Plan du sous-sol', kind: 'plan', file: 'plan-sous-sol.pdf', description: 'Garages 01 et 02, studio (séjour, cuisine, salle d\'eau), local technique, WC et escalier vers le RDC.' },
    { id: 'rdc', title: 'Plan du rez-de-chaussée', kind: 'plan', file: 'plan-rez-de-chaussee.pdf', description: 'Salon, coin repas en bow-window, cuisine, chambre, cellier, escalier en demi-lune, terrasse de 35 m².' },
    { id: 'etage', title: "Plan de l'étage", kind: 'plan', file: 'plan-etage.pdf', description: "Salon d'étage sur le vide du hall, trois chambres, salle de bain, buanderie, terrasse et balcon." },
  ],
  scene: {
    kind: 'procedural',
    load: async () => {
      const [{ building }, { site }] = await Promise.all([import('./building'), import('./site')]);
      return { building, site };
    },
  },
  assumptions: [
    'Plans recalés sur une trame unique relevée au RDC et sur le plan de masse (4,30 / 4,50 / 4,20 m × 3,80 / 3,70 / 3,80 m) ; le sous-sol et l\'étage, dessinés avec de légers écarts, y sont ramenés.',
    "Courbes de niveau non cotées : équidistance de 1 m supposée, terrain montant depuis la piste (même terrain que la version 1).",
    'Haut du plan supposé orienté au nord pour le calcul de l\'ensoleillement.',
    "Hauteur sous plafond 2,90 m, planchers de 16 cm, acrotère de 60 cm.",
    'Escalier principal à deux volées de 8 marches et palier demi-circulaire ; cage en demi-lune en maçonnerie pleine, aucun vitrage n\'étant dessiné.',
    'Portes non dessinées au sous-sol (technique, WC, salle d\'eau du studio) placées pour desservir les pièces.',
    "Baie coulissante entre le salon d'étage et la terrasse ; porte-fenêtre de la chambre ouest vers le balcon.",
    "Pergola sur la partie ouest de la terrasse d'étage, comme dans la version 1.",
    'Mobilier, matériaux et couleurs indicatifs.',
  ],
};

export default project;
