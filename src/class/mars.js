import Astre from './astre.js';

export default class Mars extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_mars.jpg',
      rayon: 0.532,              // 3389.5 / 6371 km
      vitesseRotation: 0.00971,  // 0.01 / 1.03 jours
      distanceOrbite: 12,
      vitesseOrbite: 0.00266,   // 0.005 × 365.25 / 687 jours
      inclinaison: 25.19,
    });
  }
}
