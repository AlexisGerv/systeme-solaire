# CLAUDE.md

> Document lu automatiquement par Claude Code au début de chaque conversation.
> **À mettre à jour à chaque nouvelle implémentation** pour éviter de re-scanner le projet.

## Vue d'ensemble

Système solaire 3D en WebGL via **Three.js r0.184**, bundlé par **Vite 8**.
Support **VR/WebXR** complet : manettes, lasers de sélection, HUD, tutoriel, audio.
Pas de framework UI, pas de TypeScript.

- Démarrage : `npm run dev`
- Build : `npm run build`
- Preview : `npm run preview`

## Architecture

```
src/
├── main.js                 point d'entrée : génère les astres depuis le JSON, câble tout, boucle d'animation
├── espace.js               scène + caméra (dans un rig) + renderer + OrbitControls + VRButton
├── camera_controller.js    déplacements du rig, suivi orbital, sélection laser/réticule, timeScale
├── style.css
└── class/
    ├── astre.js            classe unique pour TOUS les astres (pivot/anchor/tilt/mesh, lumière et anneaux en option)
    ├── asteroid_belt.js    InstancedMesh, n'hérite PAS d'Astre ; sert aussi pour Kuiper (via options)
    ├── vr_input_manager.js manettes WebXR : lasers, sticks, boutons → état structuré getState()
    ├── boucle_audio.js     utilitaire Web Audio partagé (chargement, boucle, one-shot, volume)
    ├── rocket_audio.js     son de propulsion : volume lissé vers une cible (utilise BoucleAudio)
    ├── musique_ambiance.js musique d'ambiance en boucle à faible volume (utilise BoucleAudio), `demarrer()` déclenché à la fin de l'animation d'hyperespace
    ├── hyperespace.js      tunnel "vitesse lumière" d'entrée VR + son (utilise BoucleAudio)
    ├── vr_tutorial.js      panneau d'aide affiché au début de session VR (Sprite + CanvasTexture)
    ├── message_bienvenue.js message d'accueil avec fade in/out automatique
    ├── hud.js              HUD attaché à la caméra : astre suivi, vitesse, aide A/B
    ├── detailed_view.js    vue détaillée d'un astre (bouton X) — seul affichage de texte sur un astre ; lit aussi le contenu à voix haute via speechSynthesis (Web Speech API, fr-FR) à show(), coupe à hide(). Audible sur PC seulement (le Meta Quest Browser ne fournit aucune voix → muet dans le casque)
    └── poussiere_spatiale.js nuage de points qui suit le joueur (sensation de vitesse)

public/
├── info_planete.json       SOURCE DE VÉRITÉ : toutes les planètes + lunes (données réelles ET visuelles)
├── 2k_*.jpg                textures planètes
├── 8k_stars_milky_way.jpg  fond étoilé equirectangulaire
├── 2k_saturn_ring_alpha.png texture des anneaux (canal alpha)
├── hyperspace.mp3          audio hyperespace (boucle 0:19-1:30, sortie à 1:36)
├── jci21-rocket-launch-sfx-253937.mp3 audio propulsion
├── musique ambiance.mp3    musique d'ambiance (boucle, faible volume)
├── LIGHTSPEED.glb          modèle des stries d'hyperespace
└── favicon.svg, icons.svg
```

## Concepts clé

### Tout est piloté par `public/info_planete.json`

Il n'y a plus de classe par planète : [main.js](src/main.js) itère sur `ordrePlanetes`
(sun → pluto) et instancie un `Astre` générique par entrée du JSON. Champs visuels :
`visual_radius`, `visual_distance`, `axial_tilt`, `emissive`, `lumiere`, `anneau`
(Saturne), `shadow_layer`, `moon_range`, `moons[]`. Les vitesses sont calculées
depuis les périodes réelles (`rotation_period`, `orbital_period`, en jours).
Champs réels affichés dans la vue détaillée (bouton X) : `radius` (km) et
`vitesse_orbitale_moyenne_km_s`, présents pour le Soleil, les planètes et
toutes les lunes.

### Hiérarchie d'un astre — [src/class/astre.js](src/class/astre.js)

```
parent → pivot → anchor → tilt → mesh
```

- **pivot** (`THREE.Group`, centré sur le parent) : sa rotation Y crée l'**orbite**
- **anchor** (décalé de `distanceOrbite` sur X, **non incliné**) : position réelle de l'astre. Sert d'**accroche pour les satellites** (les lunes reçoivent `parent: planete.anchor`)
- **tilt** : applique l'inclinaison axiale (figée)
- **mesh** : tourne sur lui-même via `vitesseRotation`

`update(timeScale)` ne fait que deux additions : `mesh.rotation.y += vitesseRotation * timeScale` et `pivot.rotation.y += vitesseOrbite * timeScale`.
Options d'`init()` : `lumiere: true` ajoute une PointLight (Soleil), `anneau: {...}` génère les anneaux (Saturne, UVs radiaux).

### Échelle / unités

**Pas de réalisme en distance** — tout est compressé pour rester lisible.
- `visual_radius` : Terre = 1 (référence). Jupiter à 2.2 (vrai ratio ~11).
- `visual_distance` : Mercure 3.5 → Neptune 50 (unités de scène, pas UA).
- Marges réservées entre planètes pour les ceintures et lunes.

### Vitesses — formules ([main.js](src/main.js))

- Planètes : `vitesseOrbite = 0.005 * 365.25 / orbital_period` (Terre = 0.005), `vitesseRotation = 0.01 / rotation_period` (Terre = 0.01). Période négative = rétrograde.
- Lunes : `v = sign(periode) * clamp(K_LUNE / |periode|, VITESSE_MIN, VITESSE_MAX)` avec `K_LUNE = 0.05`, `VITESSE_MIN = 0.003` (sinon les lunes externes paraissent figées), `VITESSE_MAX = 0.08`.
- Le tout est multiplié par `timeScale` (0 à 2), piloté par le slider HTML et les boutons A/B en VR.

### Distances des lunes

Mapping **logarithmique** km → plage `moon_range: [rmin, rmax]` du JSON :
```js
t = (log10(distance) - log10(min)) / (log10(max) - log10(min))
distanceOrbite = rmin + t * (rmax - rmin)
```
Tailles : `visual_radius` du JSON (présent sur **toutes** les lunes), sinon repli `TAILLE_DEFAUT = 0.035` de main.js.

### VR : rig, contrôleurs, pilotage

- La caméra vit dans un **rig** (`espace.rig`, THREE.Group) : en VR la pose du casque écrase la position caméra, donc on déplace le rig. **Ne jamais mettre `rig.scale ≠ 1`** (rendu flou en WebXR).
- [vr_input_manager.js](src/class/vr_input_manager.js) attache les 2 manettes au rig, leur ajoute un laser (matériau **par manette**, `flashLaser` rougit celui qui sélectionne), et expose `getState()` : `{ translation, rotation, vertical, boutons: {A, B, X} }` avec front montant pour X (pas de deadzone : valeurs brutes des sticks). Exporte `PORTEE_RAYCASTER` (= longueur du laser = portée du raycast, importé par CameraController).
- [camera_controller.js](src/camera_controller.js) consomme cet état via `_handleVRInput` → `_appliquerPilotage(state, dt)` : stick gauche = translation (vitesse ∝ distance au Soleil), stick droit = yaw + altitude, A/B = timeScale, X = vue détaillée, gâchette = sélection au laser. Constructeur = **objet d'options** `{ espace, astres, detailedView, hud, tutorial, hyperespace, messageBienvenue, vrInput, rocketAudio }`.
- Sélection d'un astre → suivi orbital : le rig suit le déplacement de la planète + orbite automatique lente autour d'elle (reprise du contrôle au stick à tout moment). **Aucun texte ne s'affiche à la sélection** (vue dégagée) : le bouton X bascule la vue détaillée à la demande.
- Cycle de session VR (`sessionstart`/`sessionend`) : téléportation du rig en bord de Kuiper, tutoriel + hyperespace affichés ; la première gâchette ferme le tutoriel et déclenche la sortie d'hyperespace + message de bienvenue.

### Overlays — contrat commun

`tutorial`, `hyperespace`, `messageBienvenue`, `detailedView` partagent `show()` / `hide()` / `get visible` / `update(dt, camera, rig)` (les arguments inutiles sont ignorés). `CameraController.update()` les itère via `this._overlays` — un nouvel overlay doit suivre ce contrat et être ajouté à la liste.

### Audio — [boucle_audio.js](src/class/boucle_audio.js)

Toute lecture audio passe par `BoucleAudio` (un seul `AudioContext` partagé au niveau module) :
`jouerBoucle(debut, fin)` (mémorisée si appelée avant la fin du chargement), `jouerUneFois(offset)`, `stop()`, `setVolume(v)`, `reprendre()` (autoplay policy), callback `onPret`.
- `RocketAudio` : boucle 20%-70% du sample à volume 0, `update()` lisse le volume vers la cible poussée par CameraController (∝ intensité des sticks).
- `HyperEspace` : boucle d'ambiance 0:19-1:30 pendant le tutoriel, one-shot à 1:36 à la sortie. `arreterAudio()` = coupure forcée sur `sessionend`.

### Synthèse vocale (vue détaillée)

`DetailedView.show()` lit le contenu à voix haute via `window.speechSynthesis` (Web Speech API, `fr-FR`), coupé à `hide()`. **Audible sur PC uniquement** : `speechSynthesis` sort sur le périphérique système et le Meta Quest Browser ne fournit aucune voix → muet dans le casque. (Une voix VR via TTS cloud + AudioContext a été tentée puis abandonnée.)

### Ombres

- `renderer.shadowMap.enabled = true`, `PCFSoftShadowMap`
- **Ombres isolées par système planétaire** : les systèmes avec `shadow_layer` dans le JSON (Terre 3, Jupiter 4, Saturne 5) sont déplacés sur une couche dédiée avec leur propre PointLight castShadow ([main.js](src/main.js), `isolerSystemeOmbre`). Les couches **1 et 2 sont réservées au stéréo WebXR** — commencer à 3.
- Désactivées explicitement pour les ceintures et les lunes (`ombre: false`) — sinon les FPS s'effondrent.
- La caméra et le raycaster font `layers.enableAll()`.

### Boucle d'animation

`renderer.setAnimationLoop()` (requis pour WebXR/VR). Ordre : `cameraController.update()` → `astre.update(timeScale)` pour chaque astre → `poussiere.update(posCamera)` → `espace.render()`.

## Conventions de code

- **Français** : noms de variables (`pivot`, `anchor`, `vitesseOrbite`), commentaires explicatifs.
- **Pas de TypeScript**, ESM (`"type": "module"`).
- Nouvelles données d'astre → dans `info_planete.json`, pas de nouvelle classe.
- Les ceintures **n'héritent pas** d'Astre (collection ≠ corps unique) ; Kuiper = `CeintureAsteroides` avec options (nombre, rayons, couleur).
- Classes à responsabilité unique injectées dans `CameraController` ; ne pas lui rajouter de logique matérielle (manettes VR → VRInputManager, son → BoucleAudio/RocketAudio).

## Workflow / commits

- Branche principale : `main` (branche de travail actuelle : `Test`)
- Commits récents en français descriptif court (« correction des ombres des astéroïdes », « VR + correction »).
- Pas de tests automatisés, pas de lint configuré. Vérification : `npm run build`.

---

## Comment maintenir ce document

À chaque modification du projet, mettre à jour les sections concernées :
- **Nouveau fichier** → l'ajouter à l'arborescence (`Architecture`).
- **Nouvelle planète / lune / astre** → modifier `info_planete.json` (les concepts ci-dessus suffisent).
- **Nouveau concept transversal** (shaders, post-processing, audio…) → nouvelle section dans `Concepts clé`.
- **Changement de formule de vitesse / distance** → mettre à jour `Vitesses — formules` ou `Distances des lunes`.
- **Nouvelle dépendance / commande npm** → mettre à jour `Vue d'ensemble`.

Garder le document **factuel et concis** : si une info est dérivable du code (noms de fonctions, paramètres exacts), un pointeur `[fichier.js:ligne](chemin)` suffit. Le but est d'éviter de rescanner, pas de dupliquer le code.
