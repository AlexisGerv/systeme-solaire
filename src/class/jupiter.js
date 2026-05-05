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
<<<<<<< HEAD
      distanceOrbite: 22,
=======
      distanceOrbite: 26,
>>>>>>> a458c6cf3c58e8565c6530246af2ea3e9b86aef4
      vitesseOrbite: 0.000422,  // 0.005 × 365.25 / 4331.6 jours
      inclinaison: 3.13,
    });
  }
}
