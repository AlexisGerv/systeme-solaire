import Espace from './espace.js';
import Astre from './class/astre.js';
import CeintureAsteroides from './class/asteroid_belt.js';
import HUD from './class/hud.js';
import VRTutorial from './class/vr_tutorial.js';
import HyperEspace from './class/hyperespace.js';
import MessageBienvenue from './class/message_bienvenue.js';
import PoussiereSpatiale from './class/poussiere_spatiale.js';
import DetailedView from './class/detailed_view.js';
import CameraController from './camera_controller.js';
import RocketAudio from './class/rocket_audio.js';
import VRInputManager from './class/vr_input_manager.js';
import ManettePC from '../manette-pc/manette_pc.js';
import * as THREE from 'three';
import './style.css';

// 1. On crée l'espace : il possède la scène, la caméra et le renderer
const espace = new Espace();

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
  Charon: 0.07, Nix: 0.035, Hydra: 0.035
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
    const lune = new Astre({
      scene: espace.scene,
      parent: planeteAstre.anchor,
      texturePath: '/2k_moon.jpg',
      rayon: m.visual_radius ?? TAILLE_LUNE[m.name] ?? TAILLE_DEFAUT,
      distanceOrbite: rmin + t * (rmax - rmin),
      vitesseOrbite: m.visual_orbital_speed ?? vitesseAngulaire(m.orbital_period),
      vitesseRotation: m.visual_rotation_speed ?? vitesseAngulaire(m.rotation_period ?? m.orbital_period),
      ombre: false,
      nom: m.nom ?? m.name,
      info: m.info ?? "Pas d'information disponible.",
      rayonReel: m.radius ?? 0,
      vitesseOrbitaleReelle: m.vitesse_orbitale_moyenne_km_s ?? 0,
    });
    lune.init();
    return lune;
  });
}

// Génération dynamique des planètes et des lunes depuis le JSON
const planeteAstres = {};
const astres = [];

// Ordre spécifique de génération des corps célestes
const ordrePlanetes = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

for (const key of ordrePlanetes) {
  const data = infoPlanetes[key];
  if (!data) continue;

  const rotationPeriod = data.rotation_period ?? 0;
  const orbitalPeriod = data.orbital_period ?? 0;
  
  // La vitesse de rotation dépend du sens de rotation (période négative = rétrograde)
  const vitesseRotation = rotationPeriod ? (0.01 / rotationPeriod) : 0;
  const vitesseOrbite = orbitalPeriod ? (0.005 * 365.25 / orbitalPeriod) : 0;

  const astre = new Astre({
    scene: espace.scene,
    texturePath: '/' + data.texture,
    rayon: data.visual_radius,
    vitesseRotation: vitesseRotation,
    distanceOrbite: data.visual_distance,
    vitesseOrbite: vitesseOrbite,
    inclinaison: data.axial_tilt ?? 0,
    emissif: data.emissive ?? false,
    nom: data.nom,
    info: data.info,
    lumiere: data.lumiere ?? false,
    anneau: data.anneau ?? null,
    rayonReel: data.radius ?? 0,
    vitesseOrbitaleReelle: data.vitesse_orbitale_moyenne_km_s ?? 0,
  });

  astre.init();
  planeteAstres[key] = astre;
  astres.push(astre);

  // Génération dynamique des lunes
  if (data.moons && data.moons.length > 0 && data.moon_range) {
    const lunes = ajouterLunes(data, astre, data.moon_range[0], data.moon_range[1]);
    astres.push(...lunes);
  }

  // Ceinture d'astéroïdes entre Mars et Jupiter
  if (key === 'mars') {
    const ceinture = new CeintureAsteroides(espace.scene);
    ceinture.init();
    astres.push(ceinture);
  }

  // Ceinture de Kuiper au-delà de Neptune (incluant Pluton)
  if (key === 'neptune') {
    const kuiper = new CeintureAsteroides(espace.scene, {
      nombre: 2000,
      rayonMin: 55,
      rayonMax: 80,
      epaisseur: 2.0,
      tailleMin: 0.03,
      tailleMax: 0.2,
      vitesseOrbite: 0.0004,
      couleur: 0xc8dde8,
    });
    kuiper.init();
    astres.push(kuiper);
  }
}

// === Ombres isolées par système planétaire ===
function isolerSystemeOmbre(planete, couche, soleilAstre) {
  planete.pivot.traverse((obj) => obj.layers.set(couche));

  const lumiere = new THREE.PointLight(0xffffff, 10, 0, 1);
  lumiere.layers.set(couche);
  lumiere.castShadow = true;
  lumiere.shadow.mapSize.width = 1024;
  lumiere.shadow.mapSize.height = 1024;
  soleilAstre.pivot.add(lumiere);
}

// Appliquer les ombres isolées pour les systèmes spécifiés dans le JSON
for (const [key, astre] of Object.entries(planeteAstres)) {
  const data = infoPlanetes[key];
  if (data && data.shadow_layer && planeteAstres['sun']) {
    isolerSystemeOmbre(astre, data.shadow_layer, planeteAstres['sun']);
  }
}

// Toute la logique manettes / sélection / suivi / input VR vit dans CameraController.
// Vue détaillée : seul affichage de texte sur un astre, à la demande (bouton X
// après sélection) pour ne pas gâcher la vue pendant l'orbite.
const detailedView = new DetailedView(espace.scene, espace.camera);
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

// Gestion des périphériques (manettes VR, manette PC) et du son de propulsion
const vrInput = new VRInputManager(espace);
const manettePC = new ManettePC();
const rocketAudio = new RocketAudio();

const cameraController = new CameraController({
  espace,
  astres,
  detailedView,
  hud,
  tutorial: vrTutorial,
  hyperespace,
  messageBienvenue,
  vrInput,
  manetteInput: manettePC,
  rocketAudio,
});

// UI 2D : slider HTML <-> timeScale du contrôleur, dans les deux sens.
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');

// Reflète une valeur de timeScale dans le slider HTML, son libellé et le HUD VR.
function afficherTimeScale(v) {
  if (speedSlider) speedSlider.value = v;
  if (speedValue) speedValue.textContent = v.toFixed(2) + 'x';
  hud.setSpeed(v);
}

if (speedSlider) {
  speedSlider.addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    cameraController.setTimeScale(v);
    afficherTimeScale(v);
  });
}

// Le joystick VR (boutons A/B) appelle ce callback : même synchro.
cameraController.onTimeScaleChange = afficherTimeScale;

// 4. Boucle d'animation : setAnimationLoop est requis pour WebXR/VR.
//    Il remplace requestAnimationFrame et s'arrête automatiquement quand
//    la session XR se termine.
// Position monde de la caméra réutilisée chaque frame pour la poussière
// (évite d'allouer un Vector3 dans la boucle).
const _posCameraMonde = new THREE.Vector3();
espace.renderer.setAnimationLoop(() => {
  cameraController.update();
  for (const astre of astres) astre.update(cameraController.timeScale);
  espace.camera.getWorldPosition(_posCameraMonde);
  poussiere.update(_posCameraMonde);
  espace.render();
});
