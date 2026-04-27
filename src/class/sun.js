import * as THREE from 'three';
import Astre from './astre.js';

// Le Soleil hérite d'Astre : il n'a presque plus rien à coder lui-même.
export default class Soleil extends Astre {
  constructor(scene) {
    // super() appelle le constructeur de la classe parente (Astre)
    // en lui passant les paramètres spécifiques au Soleil.
    super({
      scene,
      texturePath: '/2k_sun.jpg',
      rayon: 2,
      vitesseRotation: 0.002,
      emissif: true, // le Soleil brille tout seul
      // pas de distanceOrbite ni vitesseOrbite : le Soleil est au centre
    });
  }

  init() {
    // On commence par appeler init() de la classe parente :
    // il crée le pivot, la sphère, applique la texture, etc.
    super.init();

    // Puis on ajoute ce qui est SPÉCIFIQUE au Soleil :
    // la source de lumière qui éclairera la Terre et la Lune.
    const lumiere = new THREE.PointLight(0xffffff, 2, 100);
    this.pivot.add(lumiere);
  }

  // Pas besoin de redéfinir update() : celui d'Astre suffit (rotation propre).
}
