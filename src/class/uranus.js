import Astre from './astre.js';

export default class Uranus extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_uranus.jpg',
      rayon: 1.4,
      vitesseRotation: 0.01389,  // 0.01 / 0.72 jours
      distanceOrbite: 44,
      vitesseOrbite: 0.0000595, // 0.005 × 365.25 / 30687.15 jours
      inclinaison: 97.77,        // axe quasi couché -> Uranus "roule" sur son orbite
    });
  }
}
