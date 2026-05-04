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

// On regroupe tous les astres pour pouvoir les mettre à jour en une seule boucle.
const astres = [soleil, mercure, venus, terre, lune, mars, ceinture, jupiter, saturne, uranus, neptune, kuiper];

// 4. Boucle d'animation : on met à jour chaque astre, puis on rend la scène
function animate() {
  requestAnimationFrame(animate);
  for (const astre of astres) astre.update();
  espace.render();
}

animate();
