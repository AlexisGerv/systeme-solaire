import Espace from './espace.js';
import Soleil from './class/sun.js';
import Mercure from './class/mercury.js';
import Venus from './class/venus.js';
import Terre from './class/earth.js';
import Lune from './class/moon.js';
import Mars from './class/mars.js';
import Jupiter from './class/jupiter.js';
import Saturne from './class/saturn.js';
import Uranus from './class/uranus.js';
import Neptune from './class/neptune.js';
import CeintureAsteroides from './class/asteroid_belt.js';
import CeintureKuiper from './class/kuiper_belt.js';
import InfoBubble from './class/info_bubble.js';
import HUD from './class/hud.js';
import VRTutorial from './class/vr_tutorial.js';
import HyperEspace from './class/hyperespace.js';
import MessageBienvenue from './class/message_bienvenue.js';
import PoussiereSpatiale from './class/poussiere_spatiale.js';
import DetailedView from './class/detailed_view.js';
import CameraController from './camera_controller.js';
import * as THREE from 'three';
import './style.css';

// 1. On crée l'espace : il possède la scène, la caméra et le renderer
const espace = new Espace();

// 2. Le Soleil au centre
const soleil = new Soleil(espace.scene);
soleil.init();

// 3. Les planètes, du plus proche au plus lointain.
//    Chacune reçoit la scène et s'attache directement au Soleil (= centre).
const mercure = new Mercure(espace.scene);
mercure.init();

const venus = new Venus(espace.scene);
venus.init();

const terre = new Terre(espace.scene);
terre.init();

// La Lune s'attache à l'anchor de la Terre : même position que la Terre,
// mais sans hériter de sa rotation propre. Du coup la Lune suit la Terre
// dans son orbite autour du Soleil, et orbite proprement autour d'elle.
const lune = new Lune(espace.scene, terre.anchor);
lune.init();

const mars = new Mars(espace.scene);
mars.init();

// Ceinture d'astéroïdes entre Mars et Jupiter.
const ceinture = new CeintureAsteroides(espace.scene);
ceinture.init();

const jupiter = new Jupiter(espace.scene);
jupiter.init();

const saturne = new Saturne(espace.scene);
saturne.init();

const uranus = new Uranus(espace.scene);
uranus.init();

const neptune = new Neptune(espace.scene);
neptune.init();

// Ceinture de Kuiper : au-delà de Neptune.
const kuiper = new CeintureKuiper(espace.scene);
kuiper.init();

// Lunes de Jupiter et Saturne, pilotées par info_planete.json.
// Le fichier JSON est servi par Vite depuis /public.
const infoPlanetes = await fetch('/info_planete.json').then((r) => r.json());

// Tailles visibles connues pour les lunes notables (en unités de scène).
// Les autres reçoivent TAILLE_DEFAUT : volontairement minuscule, beaucoup
// de ces lunes sont des cailloux de quelques dizaines de km.
const TAILLE_LUNE = {
  Io: 0.16, Europa: 0.14, Ganymede: 0.21, Callisto: 0.20,
  Amalthea: 0.06, Himalia: 0.05,
  Titan: 0.20, Rhea: 0.10, Iapetus: 0.10, Dione: 0.09,
  Tethys: 0.09, Enceladus: 0.06, Mimas: 0.05, Hyperion: 0.05, Phoebe: 0.05,
};
const TAILLE_DEFAUT = 0.035;

// Vitesse angulaire à l'écran : K / |période en jours|, bornée pour rester
// lisible. Sans VITESSE_MIN, les lunes externes (Sinopé 759j, Phoebe 550j...)
// tournent à ~7e-5 rad/frame et paraissent figées à l'œil.
// Le signe négatif d'orbital_period encode l'orbite rétrograde.
const K_LUNE = 0.05;
const VITESSE_MIN = 0.003;
const VITESSE_MAX = 0.08;

function vitesseAngulaire(periode) {
  if (!periode) return 0;
  const v = K_LUNE / Math.abs(periode);
  return Math.sign(periode) * Math.min(VITESSE_MAX, Math.max(VITESSE_MIN, v));
}

// Mappage logarithmique des distances réelles (km) vers la plage visible
// [rmin, rmax]. Compresse l'énorme dynamique (Métis 1.3e5 km, Sinopé 2.4e7 km)
// dans l'espace disponible entre la planète et sa voisine.
function ajouterLunes(planeteData, planeteAstre, rmin, rmax) {
  const distances = planeteData.moons.map((m) => m.distance);
  const logMin = Math.log10(Math.min(...distances));
  const logMax = Math.log10(Math.max(...distances));

  return planeteData.moons.map((m) => {
    const t = logMax === logMin ? 0.5 : (Math.log10(m.distance) - logMin) / (logMax - logMin);
    const lune = new Lune(espace.scene, planeteAstre.anchor, {
      rayon: TAILLE_LUNE[m.name] ?? TAILLE_DEFAUT,
      distanceOrbite: rmin + t * (rmax - rmin),
      vitesseOrbite: vitesseAngulaire(m.orbital_period),
      vitesseRotation: vitesseAngulaire(m.rotation_period ?? m.orbital_period),
      ombre: false,
    });
    lune.init();
    return lune;
  });
}

// Bornes visuelles : Jupiter (rayon 2.2) à 20, Saturne (rayon 1.9, anneaux jusqu'à 4.18) à 25,
// Uranus à 33. On garde une marge pour ne pas chevaucher la planète voisine.
const lunesJupiter = ajouterLunes(infoPlanetes.jupiter, jupiter, 2.6, 4.5);
const lunesSaturne = ajouterLunes(infoPlanetes.saturn, saturne, 4.5, 6.5);

// On regroupe tous les astres pour pouvoir les mettre à jour en une seule boucle.
const astres = [soleil, mercure, venus, terre, lune, mars, ceinture, jupiter, saturne, uranus, neptune, kuiper, ...lunesJupiter, ...lunesSaturne];

// === Ombres isolées par système planétaire ===
// Avec une seule PointLight au Soleil, l'ombre d'une lune se projette le long
// de la ligne Soleil → lune et peut atteindre n'importe quelle planète plus
// loin sur cette ligne (ex: la Lune projetait son ombre sur Jupiter ou Saturne).
// Pour empêcher ça : chaque système planète+lunes est placé sur une COUCHE
// dédiée, et reçoit sa propre PointLight (co-localisée avec le Soleil) qui ne
// "voit" que cette couche. La shadow map de cette lumière ne contient donc
// que la planète et ses lunes — l'ombre ne peut tomber que sur la planète.
//
// ⚠ NE PAS utiliser les couches 1 et 2 : Three.js les réserve au rendu
// stéréo WebXR (cf. WebXRManager.js : `cameraL.layers.mask &= ~0b100` et
// `cameraR.layers.mask &= ~0b010`). Concrètement, un objet placé seul sur
// la couche 1 n'est visible que par l'œil gauche, et un objet sur la couche
// 2 n'est visible que par l'œil droit. On démarre donc à 3.
function isolerSystemeOmbre(planete, couche) {
  // 1. Bascule planète + ses lunes (sous le pivot) sur la couche dédiée.
  //    set() (et non enable()) retire la couche 0, sinon la lumière globale
  //    du Soleil les éclairerait DEUX fois (une via couche 0, une via couche N).
  planete.pivot.traverse((obj) => obj.layers.set(couche));

  // 2. Lumière dédiée au Soleil pour ce système : seule à projeter des ombres
  //    sur cette couche. Mêmes paramètres que la lumière globale du Soleil
  //    pour conserver l'éclairage existant.
  const lumiere = new THREE.PointLight(0xffffff, 10, 0, 1);
  lumiere.layers.set(couche);
  lumiere.castShadow = true;
  lumiere.shadow.mapSize.width = 1024;
  lumiere.shadow.mapSize.height = 1024;
  soleil.pivot.add(lumiere);
}

isolerSystemeOmbre(terre, 3);
isolerSystemeOmbre(jupiter, 4);
isolerSystemeOmbre(saturne, 5);

// Toute la logique manettes / sélection / suivi / input VR vit dans CameraController.
const infoBubble = new InfoBubble(espace.scene, espace.camera);
// Vue détaillée : affichée quand on appuie sur X après avoir sélectionné une planète.
const detailedView = new DetailedView(espace.scene, espace.camera, astres, espace.renderer);
// HUD attaché à la caméra (visible uniquement en VR/à travers la caméra) :
// affiche l'astre suivi, la vitesse, et l'aide-mémoire des boutons A/B.
const hud = new HUD(espace.camera);
// Panneau d'aide VR : affiché à l'entrée en session, fermé à la gâchette.
const vrTutorial = new VRTutorial(espace.scene);
// Tunnel d'hyperespace : animation d'entrée VR. Affiché tant que le
// tutoriel est ouvert, fade out à la validation du tutoriel.
const hyperespace = new HyperEspace(espace.scene);
// Message "Bienvenue dans le système solaire" qui apparaît à la sortie
// d'hyperespace puis se cache tout seul après quelques secondes.
const messageBienvenue = new MessageBienvenue(espace.scene);
// Poussière spatiale : nuage de points qui suit le joueur, donne une
// sensation de vitesse et d'échelle quand on se déplace au stick.
const poussiere = new PoussiereSpatiale(espace.scene);
const cameraController = new CameraController(espace, astres, infoBubble, detailedView, hud, vrTutorial, hyperespace, messageBienvenue);

// UI 2D : slider HTML <-> timeScale du contrôleur, dans les deux sens.
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');

if (speedSlider && speedValue) {
  speedSlider.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    cameraController.setTimeScale(v);
    speedValue.textContent = v.toFixed(2) + 'x';
  });
}

// Le joystick VR appelle ce callback : on synchronise l'UI HTML + le HUD VR.
cameraController.onTimeScaleChange = (v) => {
  if (speedSlider) speedSlider.value = v;
  if (speedValue) speedValue.textContent = v.toFixed(2) + 'x';
  hud.setSpeed(v);
};

// Le slider HTML doit aussi mettre à jour le HUD VR.
if (speedSlider) {
  speedSlider.addEventListener('input', (e) => {
    hud.setSpeed(parseFloat(e.target.value));
  });
}

// 4. Boucle d'animation : setAnimationLoop est requis pour WebXR/VR.
//    Il remplace requestAnimationFrame et s'arrête automatiquement quand
//    la session XR se termine.
// Position monde de la caméra réutilisée chaque frame pour la poussière
// (évite d'allouer un Vector3 dans la boucle).
const _posCameraMonde = new THREE.Vector3();
espace.renderer.setAnimationLoop(() => {
  cameraController.update();
  for (const astre of astres) astre.update(cameraController.timeScale);
  infoBubble.update();
  espace.camera.getWorldPosition(_posCameraMonde);
  poussiere.update(_posCameraMonde);
  espace.render();
});
