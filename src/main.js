import Terre from './class/earth.js';
import Soleil from './class/sun.js';
import Lune from './class/moon.js';
import * as THREE from 'three';
import './style.css';

const terre = new Terre();
terre.init();
const soleil = new Soleil();
soleil.init();
const lune = new Lune();
lune.init();


function animate() {
  requestAnimationFrame(animate);
  terre.update();
  soleil.update();
  lune.update();
}

animate();