# CLAUDE.md

Guide pour Claude Code dans ce dépôt. Tout le code et les commentaires sont en français — garder cette convention.

## Projet

Système solaire interactif en 3D avec support VR (WebXR), construit avec **Three.js** et **Vite**. Toutes les planètes, leurs lunes principales, la ceinture d'astéroïdes et la ceinture de Kuiper, autour d'un Soleil émissif. Sélection d'astre au laser de manette pour afficher une fiche d'information et téléporter doucement la caméra.

## Lancer

```bash
npm install
npm run dev      # serveur Vite en développement
npm run build    # build de production -> dist/
npm run preview  # prévisualise le build
```

## Arborescence

```
src/
├── main.js                point d'entrée : instancie astres + boucle d'animation
├── espace.js              scène + caméra + rig + renderer + OrbitControls + VRButton
├── camera_controller.js   manettes XR + raycast/sélection + suivi rig + joystick→timeScale
├── controller.js          ⚠ scratch/legacy non importé (références non résolues)
├── style.css
└── class/
    ├── astre.js           classe parente : pivot/anchor/tilt + sphère texturée
    ├── sun.js             émissif + PointLight castShadow
    ├── mercury.js, venus.js, earth.js, mars.js, jupiter.js, saturn.js, uranus.js, neptune.js
    ├── moon.js            satellite par défaut (texture lune)
    ├── satellite.js       lune générique (Io/Europa/Ganymède/Callisto/Titan/...)
    ├── asteroid_belt.js, kuiper_belt.js
    ├── info_bubble.js     bulle d'info (Sprite + CanvasTexture, lisible en VR)
    ├── hud.js             HUD attaché à la caméra : astre suivi, vitesse, raccourcis A/B
    └── vr_tutorial.js     panneau d'accueil VR (Sprite + CanvasTexture) — gâchette pour valider

public/
├── 2k_*.jpg, 8k_stars_milky_way.jpg   textures (servies à la racine par Vite)
└── info_planete.json                   métadonnées des planètes/lunes
```

## Architecture clé

### Hiérarchie d'un astre — `class/astre.js`

```
parent → pivot (tourne pour produire l'orbite)
       → anchor (décalé à distanceOrbite, NE TOURNE PAS — point d'ancrage des satellites)
       → tilt (groupe figé à l'inclinaison de l'axe)
       → mesh (tourne sur son axe propre)
```

- `anchor` ne tourne pas : c'est lui qu'il faut passer en `parent` pour attacher une lune sans qu'elle hérite de la rotation propre de la planète.
- `tilt` permet à l'axe Nord-Sud de rester pointé dans la même direction pendant que `mesh.rotation.y` tourne.
- Un astre se déclare en héritant d'`Astre` et en appelant `super({...})` avec ses paramètres (voir `sun.js`, `earth.js`).
- `mesh.userData.astre = this` permet au raycaster de remonter à l'instance depuis la sélection.

### Rig caméra et VR — `espace.js`

```
scene → rig (Group, position initiale (0, 0, 0))
      → camera (position locale initiale (0, 30, 120), regarde le centre)
```

Vue d'arrivée : la caméra est positionnée juste à l'extérieur de la ceinture de Kuiper (rayon 80-100), légèrement au-dessus du plan orbital. L'utilisateur "arrive" et découvre le système solaire de loin.

En WebXR, la caméra est écrasée chaque frame par la pose du casque ; on **déplace donc le rig**, jamais la caméra elle-même. Les manettes XR sont aussi attachées au rig (cf. `camera_controller.js`) pour qu'elles suivent quand le rig se téléporte. À `sessionstart`, `camera_controller` téléporte le rig à `(0, 30, 120)` pour reproduire la même vue d'arrivée en VR (et réinitialise `trackedAstre` / approche initiale).

### Boucle d'animation — `main.js`

`renderer.setAnimationLoop(...)` (et **pas** `requestAnimationFrame`) — obligatoire pour WebXR. Elle se cale sur `XRFrame` et se coupe d'elle-même à la fin de la session.

```js
cameraController.update();                      // input VR + suivi rig
for (const astre of astres) astre.update(timeScale);
infoBubble.update();
espace.render();
```

### Interaction VR — `camera_controller.js`

Pilotage 6DoF "vaisseau spatial" aux deux joysticks (deadzone 0.15, vitesse adaptative selon la distance au Soleil) :

- **Stick gauche X** → strafe latéral (selon `camRight`)
- **Stick gauche Y** → avancer / reculer (selon `camForward`)
- **Stick droit X** → yaw (rotation du rig autour de Y)
- **Stick droit Y** → monter / descendre (translation verticale monde)
- **Bouton A (droite, index 4)** → `timeScale +`
- **Bouton B (droite, index 5)** → `timeScale -`
- **Gâchette (`select`)** → raycast 30u → si un mesh d'astre est touché : `trackedAstre`, `infoBubble.show()`, `hud.setOrbit()`, flash rouge sur le laser.

`onTimeScaleChange` synchronise le slider HTML et le HUD VR. Le pilotage manuel coupe l'approche initiale (mais conserve le suivi orbital). Suivi : on applique au rig le déplacement frame à frame de l'astre suivi (suivi orbital), plus une approche en lerp `0.05` vers une cible à `max(10, rayon * 3)` devant le casque (cible figée à l'instant du clic via `_dirApproche`).

Audio fusée (Web Audio API) : `_chargerAudioFusee` charge le clip et joue uniquement la portion sustain en boucle (`loopStart`/`loopEnd`) pour éviter d'entendre l'attaque/décroissance à chaque rebouclage. Le gain est piloté par l'intensité combinée des sticks de translation, lissé par lerp (~150ms à 60fps).

### Tutoriel VR — `class/vr_tutorial.js`

Panneau d'aide affiché à `sessionstart` listant les contrôles. Sprite + CanvasTexture, repositionné chaque frame à 5 unités devant la caméra. Tant que `tutorial.visible` est vrai :

- `_handleVRInput` retourne `false` immédiatement (mouvement/timeScale/audio bloqués)
- `_onSelect` se contente de fermer le tutoriel — pas de raycast ni de sélection d'astre

Premier appui sur la gâchette → `tutorial.hide()` → contrôles débloqués. À `sessionend` le tutoriel est aussi caché (re-affiché à la prochaine entrée VR).

## Conventions

- **Langue** : tout en français (noms de classes, commentaires, variables UI). Continuer ainsi.
- **Commentaires** : déjà denses et pédagogiques (le projet est éducatif). Ne pas les supprimer en refactor sauf demande explicite.
- **Pas de TypeScript**, JS pur en modules ES (`"type": "module"`).
- **Textures** dans `public/` → accessibles via chemin absolu (`/2k_earth_daymap.jpg`).
- **Échelles** non réalistes : distances et tailles compressées pour rester visibles. Voir le mapping log des distances de lunes dans `main.js` quand pertinent.
- **Périodes orbitales rétrogrades** : encodées par un `vitesseOrbite` négatif.

## Pièges courants

- Bouger la `camera` directement en VR : sans effet (écrasée par la pose XR). Utiliser le `rig`.
- Ajouter un objet d'UI à `scene` au lieu du `rig` quand il doit suivre la caméra (ex : manettes — bug corrigé récemment). Exception assumée : `vr_tutorial` est dans `scene` mais repositionné chaque frame devant la caméra, donc l'effet est équivalent.
- Oublier `mesh.userData.astre = this` dans une nouvelle classe d'astre : la sélection au laser ne retrouvera pas l'instance.
- Utiliser `requestAnimationFrame` à la place de `setAnimationLoop` casse le rendu stéréo.
- Oublier de tester `this.tutorial.visible` avant d'ajouter une nouvelle action liée à la gâchette / aux sticks : tant que le tutoriel est ouvert, l'input doit être ignoré sinon l'utilisateur peut bouger pendant la lecture.
