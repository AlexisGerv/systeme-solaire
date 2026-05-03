import Astre from './astre.js';

export default class Neptune extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_neptune.jpg',
      rayon: 1.35,
      vitesseRotation: 0.014,
      distanceOrbite: 38,
      vitesseOrbite: 0.001,
      inclinaison: 28.3,
    });
  }
}
