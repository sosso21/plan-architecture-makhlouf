# Atelier Makhlouf — maquettes 3D & dossiers de projets

Site statique (Vite + React + TypeScript + three.js) qui présente les projets de l'atelier :
maquette 3D interactive générée à partir des plans, documents PDF et modèles 3D téléchargeables.

Projets :

- **Maison Youssef — Oued Ksari** (`/youssef-oued-ksari`) : version 1, sous-sol, RDC, étage, implantée sur la topographie du terrain.
- **Maison Youcef 002 — Oued Ksari** (`/youcef-oued-ksari-002`) : version 2 sur le même terrain, avec cage d'escalier en demi-lune.

## Routes

| URL | Accès | Contenu |
| --- | --- | --- |
| `/` | public | Saisie du code PIN (3 essais, compteur stocké dans `localStorage`) |
| `/projects` | PIN | Liste des projets |
| `/projects/<slug>` | PIN | Fiche projet : aperçu, plans de niveaux, hypothèses |
| `/projects/<slug>/documents` | PIN | PDF : aperçu, téléchargement, archive .zip |
| `/projects/<slug>/modeles-3d` | PIN | Export .glb (meublé / nu), fichiers 3D fournis, lien de partage |
| `/<slug>` | **public** | Maquette 3D interactive |

La maquette 3D enregistre ses réglages dans l'URL (`?niveau=rdc&facade=sable&heure=18.5&vue=piste…`) :
copier le lien partage exactement la vue configurée.

## Visionneuse 3D

- **Niveaux** : maison entière, étage, RDC ou sous-sol ; hauteur de coupe des murs (sections en poché) ; vue éclatée.
- **Vues** : 7 points de vue, liste des pièces (clic = cadrage), visite guidée automatique.
- **Soleil** : heure et saison, course solaire calculée pour la latitude du site ; la nuit, les vitrages et les pièces s'éclairent.
- **Couleurs** : 6 palettes de façade, enduit sur mesure, couleur des menuiseries, 4 ambiances intérieures, couleur des textiles.
- **Affichage** : mobilier, étiquettes, terrain, végétation, clôture, courbes de niveau, limites de parcelle ; qualité de rendu (occlusion ambiante, ombres 4K).
- Terrain reconstruit depuis les courbes du plan topographique, avec parvis décaissé devant les garages, piste, clôture et oliviers.
- Interface responsive : panneau latéral sur ordinateur, feuille basse à onglets sur mobile.

## Développement

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitaires (géométrie, PIN, zip, soleil, cohérence des données)
npm run build      # typecheck + build dans dist/
npm run preview    # sert dist/ en local
```

## Organisation

```
content/projects/<slug>/       un dossier = un projet
  project.ts                   fiche : titre, chiffres clés, documents, hypothèses, scène 3D
  building.ts                  bâtiment en données (murs, ouvertures, pièces, escaliers, mobilier)
  site.ts                      implantation : limites, courbes de niveau, piste, terrassements
  documents/*.pdf              plans d'origine (publiés tels quels)
  models/*.glb                 (optionnel) modèles 3D fournis
src/
  domain/                      types du modèle (bâtiment, site, projet)
  engine/                      moteur 3D sans React : géométrie, matériaux, mobilier, terrain, Viewer
  features/auth                code PIN
  features/projects            registre (découverte automatique), pages projet
  features/viewer              page 3D, panneau de réglages, synchronisation URL
tests/                         vitest
```

### Ajouter un projet

1. Créer `content/projects/<slug>/` (slug en minuscules avec tirets, différent de `projects`).
2. Y déposer les PDF dans `documents/` et écrire `project.ts` (voir le projet existant).
3. Pour la 3D, deux options :
   - **procédurale** : décrire le bâtiment dans `building.ts` / `site.ts` (`scene: { kind: 'procedural', load }`) ;
     murs droits orthogonaux, murs courbes (`curvedWalls`, arcs de cercle) et paliers de forme libre (`kind: 'landing'`) ;
   - **fichier existant** : déposer un `.glb` dans `models/` et déclarer `scene: { kind: 'gltf', file: 'maquette.glb' }`.

Aucun autre fichier à modifier : le registre découvre les dossiers à la compilation et vérifie
la cohérence (slug = dossier, documents présents, modèle présent).

## Déploiement Cloudflare

**Pages (recommandé)** — Workers & Pages → Create → Pages → Connect to Git → ce dépôt :

| Réglage | Valeur |
| --- | --- |
| Framework preset | Vite (ou None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Variable d'environnement | `NODE_VERSION=22` (le fichier `.node-version` le précise aussi) |

Sans `404.html`, Pages sert `index.html` pour toutes les routes (SPA). Les en-têtes de sécurité
et de cache sont dans `public/_headers`.

**Workers (assets statiques)** : `npm run build && npx wrangler deploy` (configuration dans `wrangler.jsonc`).

## Sécurité — à lire

Le code PIN (`123456`) est une **protection côté navigateur** : il masque la liste et les pages de
téléchargement, et seul son empreinte SHA-256 figure dans le code. Il ne protège pas réellement les
fichiers : les PDF restent accessibles à qui connaît leur URL, et le compteur d'essais peut être
remis à zéro en vidant le stockage du navigateur. Pour des documents confidentiels, placer le site
derrière **Cloudflare Access** (gratuit jusqu'à 50 utilisateurs).

Pour changer de code : `printf 'NOUVEAU' | sha256sum` puis remplacer `PIN_SHA256` dans `src/features/auth/pin.ts`.

## Hypothèses de modélisation (Maison Youssef)

- Échelles relevées sur les PDF vectoriels et recalées sur la trame des poteaux (3,90 / 4,40 / 4,10 m × 3,50 / 3,62 / 3,90 m).
- Courbes de niveau non cotées : équidistance de 1 m supposée, terrain montant depuis la piste.
- Haut du plan supposé au nord pour l'ensoleillement ; hauteur sous plafond 2,90 m, planchers 16 cm.
- Chambres est et nord de l'étage non nommées sur le plan ; baie coulissante ajoutée vers la terrasse d'étage.
- Mobilier, matériaux et couleurs indicatifs.

## Hypothèses de modélisation (Maison Youcef 002)

- Plans « proposition 0022 » recalés sur la trame du RDC et du plan de masse (4,30 / 4,50 / 4,20 m × 3,80 / 3,70 / 3,80 m) ;
  le sous-sol et l'étage, dessinés avec de légers écarts, y sont ramenés.
- Même terrain que la version 1 : courbes non cotées, équidistance de 1 m supposée, haut du plan au nord.
- Escalier principal à deux volées de 8 marches et palier demi-circulaire dans une cage en demi-lune pleine.
- Portes non dessinées du sous-sol (technique, WC, salle d'eau du studio) placées pour desservir les pièces.
- Baie coulissante salon d'étage → terrasse, porte-fenêtre chambre ouest → balcon, pergola sur la terrasse d'étage.
- Mobilier, matériaux et couleurs indicatifs.
