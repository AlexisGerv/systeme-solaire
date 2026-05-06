import Astre from './astre.js';

export default class Jupiter extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_jupiter.jpg',
      // Échelle compressée : Jupiter fait en réalité ~11x la Terre, on garde
      // un ratio visible mais qui n'écrase pas les autres planètes.
      rayon: 2.2,
      vitesseRotation: 0.02439,  // 0.01 / 0.41 jours
      distanceOrbite: 22,
      vitesseOrbite: 0.000422,  // 0.005 × 365.25 / 4331.6 jours
      inclinaison: 3.13,
    });
  }
}
