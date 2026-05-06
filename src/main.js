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
import HUD from './class/hud.js';
import CameraController from './camera_controller.js';
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

// On regroupe tous les astres pour pouvoir les mettre à jour en une seule boucle.
const astres = [soleil, mercure, venus, terre, lune, mars, ceinture, jupiter, io, europa, ganymede, callisto, saturne, titan, enceladus, mimas, rhea, uranus, neptune, kuiper];

// Toute la logique manettes / sélection / suivi / input VR vit dans CameraController.
const infoBubble = new InfoBubble(espace.scene);
// HUD attaché à la caméra (visible uniquement en VR/à travers la caméra) :
// affiche l'astre suivi, la vitesse, et l'aide-mémoire des boutons A/B.
const hud = new HUD(espace.camera);
const cameraController = new CameraController(espace, astres, infoBubble, hud);

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
espace.renderer.setAnimationLoop(() => {
  cameraController.update();
  for (const astre of astres) astre.update(cameraController.timeScale);
  infoBubble.update();
  espace.render();
});
