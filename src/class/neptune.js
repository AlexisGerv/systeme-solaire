import Astre from './astre.js';

export default class Neptune extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_neptune.jpg',
      rayon: 1.35,
      vitesseRotation: 0.01493,  // 0.01 / 0.6713 jours
      distanceOrbite: 38,
      vitesseOrbite: 0.0000304, // 0.005 × 365.25 / 60190 jours
      inclinaison: 28.32,
    });
  }
}
