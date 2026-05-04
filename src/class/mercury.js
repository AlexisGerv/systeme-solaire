import Astre from './astre.js';

export default class Mercure extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_mercury.jpg',
      rayon: 0.383,              // 2439.7 / 6371 km
      vitesseRotation: 0.000171, // 0.01 / 58.6 jours
      distanceOrbite: 3.5,
      vitesseOrbite: 0.02074,   // 0.005 × 365.25 / 88 jours
      inclinaison: 0.034,
    });
  }
}
