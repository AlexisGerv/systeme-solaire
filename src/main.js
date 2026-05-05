import * as THREE from 'three';
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
import Satellite from './class/satellite.js';
import InfoBubble from './class/info_bubble.js';
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

const io = new Satellite(espace.scene, jupiter.anchor, '/2k_moon.jpg', 0.3, 1.64, 1.03);
io.init();
const europa = new Satellite(espace.scene, jupiter.anchor, '/2k_moon.jpg', 0.28, 2.62, 0.51);
europa.init();
const ganymede = new Satellite(espace.scene, jupiter.anchor, '/2k_moon.jpg', 0.4, 4.18, 0.255);
ganymede.init();
const callisto = new Satellite(espace.scene, jupiter.anchor, '/2k_moon.jpg', 0.38, 7.35, 0.109);
callisto.init();

const saturne = new Saturne(espace.scene);
saturne.init();

const titan = new Satellite(espace.scene, saturne.anchor, '/2k_moon.jpg', 0.4, 4.77, 0.114);
titan.init();
const enceladus = new Satellite(espace.scene, saturne.anchor, '/2k_moon.jpg', 0.1, 0.93, 1.33);
enceladus.init();
const mimas = new Satellite(espace.scene, saturne.anchor, '/2k_moon.jpg', 0.08, 0.72, 1.94);
mimas.init();
const rhea = new Satellite(espace.scene, saturne.anchor, '/2k_moon.jpg', 0.15, 2.06, 0.404);
rhea.init();

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

// Vitesse angulaire à l'écran : K / |période en jours|, plafonnée pour
// que les lunes les plus internes (période < 1j) restent lisibles.
// Le signe négatif d'orbital_period encode l'orbite rétrograde.
const K_LUNE = 0.05;
const VITESSE_MAX = 0.08;

function vitesseAngulaire(periode) {
  if (!periode) return 0;
  const v = K_LUNE / Math.abs(periode);
  return Math.sign(periode) * Math.min(v, VITESSE_MAX);
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
<<<<<<< HEAD
const astres = [soleil, mercure, venus, terre, lune, mars, ceinture, jupiter, saturne, uranus, neptune, kuiper, ...lunesJupiter, ...lunesSaturne];
=======
const astres = [soleil, mercure, venus, terre, lune, mars, ceinture, jupiter, io, europa, ganymede, callisto, saturne, titan, enceladus, mimas, rhea, uranus, neptune, kuiper];

// Configuration du raycaster et de l'interaction VR
const raycaster = new THREE.Raycaster();
const infoBubble = new InfoBubble(espace.scene);
let trackedAstre = null; // L'astre actuellement suivi en VR

const controller1 = espace.renderer.xr.getController(0);
const controller2 = espace.renderer.xr.getController(1);

// Géométrie pour le rayon du contrôleur
const rayGeometry = new THREE.BufferGeometry().setFromPoints([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -100)
]);
const rayMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });

if (controller1) {
  const line = new THREE.Line(rayGeometry, rayMaterial);
  line.name = 'line';
  controller1.add(line);
  espace.scene.add(controller1);
  controller1.addEventListener('select', onSelect);
}

if (controller2) {
  const line = new THREE.Line(rayGeometry, rayMaterial);
  line.name = 'line';
  controller2.add(line);
  espace.scene.add(controller2);
  controller2.addEventListener('select', onSelect);
}

function onSelect(event) {
  const controller = event.target;
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

  // Chercher les intersections avec les meshes de tous les astres
  const meshes = astres.map(a => a.mesh).filter(m => m !== undefined);
  const intersects = raycaster.intersectObjects(meshes, false);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    // Retrouver l'instance d'Astre via userData
    if (object.userData && object.userData.astre) {
      trackedAstre = object.userData.astre;
      infoBubble.show(trackedAstre);
      
      // Mettre la couleur de la ligne en rouge lors d'une sélection
      const line = controller.getObjectByName('line');
      if (line) line.material.color.set(0xff0000);
      
      setTimeout(() => {
        if (line) line.material.color.set(0x00ff00);
      }, 300);
    }
  } else {
    // Clic dans le vide = annuler le tracking
    trackedAstre = null;
    infoBubble.hide();
  }
}

// Gestion de la vitesse de simulation
let timeScale = 1;
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');

if (speedSlider && speedValue) {
  speedSlider.addEventListener('input', (e) => {
    timeScale = parseFloat(e.target.value);
    speedValue.textContent = timeScale.toFixed(2) + 'x';
  });
}

function handleVRInput() {
  const session = espace.renderer.xr.getSession();
  if (session) {
    for (const source of session.inputSources) {
      // Vérifier si la manette possède un joystick (axes)
      if (source.gamepad && source.gamepad.axes.length >= 4) {
        // L'axe 3 correspond généralement au Y du joystick principal (Oculus, etc.)
        const yAxis = source.gamepad.axes[3];
        // Zone morte (deadzone) pour éviter les modifications accidentelles
        if (Math.abs(yAxis) > 0.1) {
          // Pousser en avant donne une valeur négative -> on augmente la vitesse
          timeScale -= yAxis * 0.02;
          timeScale = Math.max(0, Math.min(2, timeScale));
          
          // Mettre à jour l'UI 2D en temps réel
          if (speedSlider) speedSlider.value = timeScale;
          if (speedValue) speedValue.textContent = timeScale.toFixed(2) + 'x';
        }
      }
    }
  }
}
>>>>>>> a458c6cf3c58e8565c6530246af2ea3e9b86aef4

// 4. Boucle d'animation : setAnimationLoop est requis pour WebXR/VR.
//    Il remplace requestAnimationFrame et s'arrête automatiquement quand
//    la session XR se termine.
espace.renderer.setAnimationLoop(() => {
  handleVRInput();
  
  for (const astre of astres) astre.update(timeScale);
  
  // Si on track un astre, déplacer le rig de la caméra
  if (trackedAstre) {
    const pos = new THREE.Vector3();
    trackedAstre.mesh.getWorldPosition(pos);
    
    // Décaler un peu le rig pour ne pas être DANS la planète
    const decalage = Math.max(10, trackedAstre.rayon * 3);
    pos.z += decalage; // Positionner devant
    
    // Lerp pour un déplacement fluide (anti motion-sickness)
    espace.rig.position.lerp(pos, 0.05);
  }
  
  infoBubble.update();
  espace.render();
});
