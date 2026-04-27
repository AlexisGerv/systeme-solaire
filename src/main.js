import Espace from './espace.js';
import Terre from './class/earth.js';
import Soleil from './class/sun.js';
import Lune from './class/moon.js';
import './style.css';

// 1. On crée l'espace : il possède la scène, la caméra et le renderer
const espace = new Espace();

// 2. Chaque astre reçoit la scène pour pouvoir y ajouter son mesh
const soleil = new Soleil(espace.scene);
soleil.init();

// const terre = new Terre(espace.scene);
// terre.init();

// const lune = new Lune(espace.scene);
// lune.init();

// 3. Boucle d'animation : on met à jour chaque astre, puis on rend la scène
function animate() {
  requestAnimationFrame(animate);
  soleil.update();
  // terre.update();
  // lune.update();
  espace.render();
}

animate();
