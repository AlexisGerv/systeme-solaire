import Astre from './astre.js';

export default class Uranus extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_uranus.jpg',
      rayon: 1.4,
      vitesseRotation: 0.014,
      distanceOrbite: 33,
      vitesseOrbite: 0.0012,
      inclinaison: 97.8,        // axe quasi couché -> Uranus "roule" sur son orbite
    });
  }
}
