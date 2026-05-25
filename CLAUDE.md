# CLAUDE.md

> Document lu automatiquement par Claude Code au début de chaque conversation.
> **À mettre à jour à chaque nouvelle implémentation** pour éviter de re-scanner le projet.

## Vue d'ensemble

Système solaire 3D en WebGL via **Three.js r0.184**, bundlé par **Vite 8**.
Support **VR/WebXR** activé. Pas de framework UI, pas de TypeScript.

- Démarrage : `npm run dev`
- Build : `npm run build`
- Preview : `npm run preview`

## Architecture

```
src/
├── main.js              point d'entrée : instancie tout, boucle d'animation
├── espace.js            scène + caméra + renderer + OrbitControls + VR
├── style.css
└── class/
    ├── astre.js         classe parente (pivot/anchor/tilt/mesh + update())
    ├── sun.js           hérite Astre, ajoute la PointLight
    ├── mercury.js       hérite Astre, paramètres en dur
    ├── venus.js         hérite Astre
    ├── earth.js         hérite Astre
    ├── moon.js          hérite Astre, paramètres en options (réutilisée pour les lunes JSON)
    ├── mars.js          hérite Astre
    ├── jupiter.js       hérite Astre
    ├── saturn.js        hérite Astre, surcharge init() pour les anneaux
    ├── uranus.js        hérite Astre
    ├── neptune.js       hérite Astre
    ├── asteroid_belt.js InstancedMesh, n'hérite PAS d'Astre
    └── kuiper_belt.js   hérite de CeintureAsteroides

public/
├── info_planete.json    données réelles (km, jours) pour les lunes de Jupiter/Saturne
├── 2k_*.jpg             textures planètes
├── 8k_stars_milky_way.jpg  fond étoilé equirectangulaire
├── 2k_saturn_ring_alpha.png  texture des anneaux (canal alpha)
└── favicon.svg, icons.svg
```

## Concepts clé

### Hiérarchie d'un astre — [src/class/astre.js](src/class/astre.js)

```
parent → pivot → anchor → tilt → mesh
```

- **pivot** (`THREE.Group`, centré sur le parent) : sa rotation Y crée l'**orbite**
- **anchor** (décalé de `distanceOrbite` sur X, **non incliné**) : position réelle de l'astre. Sert d'**accroche pour les satellites** (ex : `lune = new Lune(scene, terre.anchor)`)
- **tilt** : applique l'inclinaison axiale (figée)
- **mesh** : tourne sur lui-même via `vitesseRotation`

`update()` ne fait que deux additions : `mesh.rotation.y += vitesseRotation` et `pivot.rotation.y += vitesseOrbite`.

### Échelle / unités

**Pas de réalisme en distance** — tout est compressé pour rester lisible.
- `rayon` Terre = 1 (référence). Jupiter à 2.2 (vrai ratio ~11).
- `distanceOrbite` : Mercure 3.5 → Neptune 50 (unités de scène, pas UA).
- Marges réservées entre planètes pour les ceintures et lunes.

### Vitesses — formules utilisées

Convention dans les classes planètes :
- `vitesseOrbite = 0.005 * 365.25 / période_orbitale_en_jours` (Terre = 0.005 par convention)
- `vitesseRotation = 0.01 / période_de_rotation_en_jours` (Terre = 0.01)
- Signe positif/négatif = sens direct/rétrograde (Vénus a un signe positif mais une inclinaison de 177.4° → rétrograde visuellement)

Pour les lunes JSON ([main.js:84-88](src/main.js#L84-L88)) :
```js
v = sign(periode) * min(K_LUNE / |periode|, VITESSE_MAX)
// K_LUNE = 0.05, VITESSE_MAX = 0.08
```

### Distances des lunes JSON ([main.js:93-110](src/main.js#L93-L110))

Mapping **logarithmique** km → plage `[rmin, rmax]` :
```js
t = (log10(distance) - log10(min)) / (log10(max) - log10(min))
distanceOrbite = rmin + t * (rmax - rmin)
```
Bornes actuelles : Jupiter `[2.6, 4.5]`, Saturne `[4.5, 6.5]`.

### Ombres

- `renderer.shadowMap.enabled = true`, `PCFSoftShadowMap`
- Soleil = `PointLight` avec `castShadow = true` (6 shadow maps internes, coûteux)
- Astres non-émissifs : `cast` + `receiveShadow` activés par défaut
- **Désactivés explicitement** pour les ceintures et les lunes JSON (`ombre: false`) — sinon les FPS s'effondrent

### Boucle d'animation

`renderer.setAnimationLoop()` (au lieu de `requestAnimationFrame`) — **requis pour WebXR/VR**. Itère sur le tableau `astres` et appelle `astre.update()` puis `espace.render()`.

## Détail des paramètres planètes (état actuel)

| Astre | rayon | distance | vitesseOrbite | vitesseRotation | inclinaison | particularité |
|---|---|---|---|---|---|---|
| Soleil | 2 | 0 | — | 0.000394 | — | `emissif: true`, PointLight |
| Mercure | 0.383 | 3.5 | 0.02074 | 0.000171 | 0.034 | |
| Vénus | 0.95 | 5.5 | 0.00813 | 0.0000412 | 177.4 | rétrograde via tilt |
| Terre | 1 | 8.5 | 0.005 | 0.01 | 23.44 | parent de la Lune |
| Lune | 0.27 | 1.5 (de Terre) | 0.0669 | 0.0669 | — | accrochée à `terre.anchor` |
| Mars | 0.532 | 12 | 0.00266 | 0.00971 | 25.19 | |
| Ceinture astéroïdes | — | 13.5–16 | 0.0032 | — | — | InstancedMesh ×1500 |
| Jupiter | 2.2 | 22 | 0.000422 | 0.02439 | 3.13 | lunes via JSON |
| Saturne | 1.9 | 34 | 0.00017 | 0.02222 | 26.73 | + anneaux, lunes via JSON |
| Uranus | 1.4 | 44 | 0.0000595 | 0.01389 | 97.77 | axe quasi couché |
| Neptune | 1.35 | 50 | 0.0000304 | 0.01493 | 28.32 | |
| Ceinture Kuiper | — | 55–80 | 0.0004 | — | — | hérite de Ceinture astéroïdes |

## Conventions de code

- **Français** : noms de variables (`pivot`, `anchor`, `vitesseOrbite`), commentaires explicatifs.
- **Pas de TypeScript**, ESM (`"type": "module"`).
- Constructeurs des planètes = simple appel `super({ ... })` avec valeurs en dur.
- Surcharger `init()` (et appeler `super.init()`) pour tout ajout spécifique : lumière du Soleil, anneaux de Saturne. **Ne pas** surcharger `update()` sauf cas vraiment nécessaire.
- Les ceintures **n'héritent pas** d'Astre (collection ≠ corps unique).

## Ce qui pilote quoi

- **Planètes & inner moons (Lune)** : valeurs codées en dur dans chaque classe.
- **Lunes de Jupiter/Saturne** : `public/info_planete.json` chargé en `await fetch()` dans `main.js`, puis `ajouterLunes()` instancie des `Lune` configurées.
- **Tailles des lunes JSON** : table `TAILLE_LUNE` dans `main.js` pour les lunes notables, sinon `TAILLE_DEFAUT = 0.035`.

## Workflow / commits

- Branche principale : `main`
- Commits récents en français descriptif court (« correction des ombres des astéroïdes », « VR + correction »).
- Pas de tests automatisés, pas de lint configuré.

---

## Comment maintenir ce document

À chaque modification du projet, mettre à jour les sections concernées :
- **Nouveau fichier** → l'ajouter à l'arborescence (`Architecture`).
- **Nouvelle planète / lune / astre** → l'ajouter au tableau `Détail des paramètres`.
- **Nouveau concept transversal** (shaders, post-processing, audio…) → nouvelle section dans `Concepts clé`.
- **Changement de formule de vitesse / distance** → mettre à jour `Vitesses — formules` ou `Distances des lunes JSON`.
- **Nouvelle dépendance / commande npm** → mettre à jour `Vue d'ensemble`.

Garder le document **factuel et concis** : si une info est dérivable du code (noms de fonctions, paramètres exacts), un pointeur `[fichier.js:ligne](chemin)` suffit. Le but est d'éviter de rescanner, pas de dupliquer le code.
