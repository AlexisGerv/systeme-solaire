import * as THREE from 'three';
import Astre from './astre.js';

export default class Satellite extends Astre {
  constructor(scene, parent, texturePath, rayon, distanceOrbite, vitesseOrbite) {
    super({
      scene,
      parent,
      texturePath: texturePath || '/2k_moon.jpg',
      rayon,
      vitesseRotation: vitesseOrbite, // verrouillage gravitationnel
      distanceOrbite,
      vitesseOrbite,
      castShadow: true,
    });
  }
}
