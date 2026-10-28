import type { ProjectManifest } from '@/domain/project';

const project: ProjectManifest = {
  slug: 'youssef-oued-ksari',
  title: 'Maison Youssef',
  location: 'Oued Ksari',
  status: 'Esquisse — proposition 002',
  summary:
    "Villa familiale R+1 sur sous-sol, implantée dans la pente : garages et studio ouverts sur la piste, pièces de vie de plain-pied sur le jardin, quatre chambres et une terrasse-pergola à l'étage.",
  updatedAt: '2026-10-28',
  accent: '#c98b5e',
  facts: [
    { label: 'Niveaux', value: 'Sous-sol · RDC · Étage' },
    { label: 'Emprise', value: '≈ 13,9 × 12,7 m' },
    { label: 'Surface habitable RDC', value: '≈ 120 m²' },
    { label: 'Chambres', value: '4 + studio' },
    { label: 'Garages', value: '2 places' },
    { label: 'Terrain', value: '≈ 1 010 m², en pente' },
  ],
  documents: [
    { id: 'implantation', title: 'Plan de masse & topographie', kind: 'topographie', file: 'plan-implantation-topographie.pdf', description: 'Implantation de la maison dans la parcelle, courbes de niveau et reculs.' },
    { id: 'sous-sol', title: 'Plan du sous-sol', kind: 'plan', file: 'plan-sous-sol.pdf', description: 'Garages 01 et 02, studio indépendant, cave et escalier vers le RDC.' },
    { id: 'rdc', title: 'Plan du rez-de-chaussée', kind: 'plan', file: 'plan-rez-de-chaussee.pdf', description: 'Hall, salon, coin repas, cuisine, chambre, terrasse couverte.' },
    { id: 'etage', title: "Plan de l'étage", kind: 'plan', file: 'plan-etage.pdf', description: "Salon d'étage sur vide, trois chambres, salle de bain, buanderie, terrasse." },
  ],
  scene: {
    kind: 'procedural',
    load: async () => {
      const [{ building }, { site }] = await Promise.all([import('./building'), import('./site')]);
      return { building, site };
    },
  },
  assumptions: [
    "Courbes de niveau non cotées : équidistance de 1 m supposée, terrain montant depuis la piste.",
    'Haut du plan supposé orienté au nord pour le calcul de l\'ensoleillement.',
    "Hauteur sous plafond 2,90 m, planchers de 16 cm, acrotère de 60 cm.",
    "Chambres est et nord de l'étage non nommées sur le plan : affectées en chambres.",
    "Baie coulissante entre le salon d'étage et la terrasse pour en permettre l'accès.",
    'Mobilier, matériaux et couleurs indicatifs.',
  ],
};

export default project;
