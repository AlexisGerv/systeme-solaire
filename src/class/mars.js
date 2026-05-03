import Astre from './astre.js';

export default class Mars extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_mars.jpg',
      rayon: 0.53,
      vitesseRotation: 0.0097,  // jour martien ≈ jour terrestre
      distanceOrbite: 12,
      vitesseOrbite: 0.004,
      inclinaison: 25.2,
    });
  }
}
