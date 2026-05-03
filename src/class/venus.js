import Astre from './astre.js';

export default class Venus extends Astre {
  constructor(scene) {
    super({
      scene,
      // On utilise l'atmosphère (les nuages) car c'est ce que l'on voit
      // réellement depuis l'espace : la surface est invisible sous les nuages.
      texturePath: '/2k_venus_atmosphere.jpg',
      rayon: 0.95,
      vitesseRotation: -0.001,  // rotation rétrograde (Vénus tourne à l'envers)
      distanceOrbite: 5.5,
      vitesseOrbite: 0.008,
      inclinaison: 177.4,       // axe quasi inversé -> rotation rétrograde
    });
  }
}
