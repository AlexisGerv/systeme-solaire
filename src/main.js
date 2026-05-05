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
const astres = [soleil, mercure, venus, terre, lune, mars, ceinture, jupiter, saturne, uranus, neptune, kuiper, ...lunesJupiter, ...lunesSaturne];

// 4. Boucle d'animation : setAnimationLoop est requis pour WebXR/VR.
//    Il remplace requestAnimationFrame et s'arrête automatiquement quand
//    la session XR se termine.
espace.renderer.setAnimationLoop(() => {
  for (const astre of astres) astre.update();
  espace.render();
});
