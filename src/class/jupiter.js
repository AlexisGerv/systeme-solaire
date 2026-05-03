import Astre from './astre.js';

export default class Jupiter extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_jupiter.jpg',
      // Échelle compressée : Jupiter fait en réalité ~11x la Terre, on garde
      // un ratio visible mais qui n'écrase pas les autres planètes.
      rayon: 2.2,
      vitesseRotation: 0.025,   // rotation très rapide (~10h dans la réalité)
      distanceOrbite: 20,
      vitesseOrbite: 0.0022,
      inclinaison: 3.1,
    });
  }
}
