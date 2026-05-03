import Astre from './astre.js';

export default class Mercure extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_mercury.jpg',
      rayon: 0.38,
      vitesseRotation: 0.002,   // Mercure tourne très lentement sur elle-même
      distanceOrbite: 3.5,
      vitesseOrbite: 0.012,     // mais c'est la plus rapide en orbite
      inclinaison: 0.03,
    });
  }
}
