import Astre from './astre.js';

export default class Venus extends Astre {
  constructor(scene) {
    super({
      scene,
      // On utilise l'atmosphère (les nuages) car c'est ce que l'on voit
      // réellement depuis l'espace : la surface est invisible sous les nuages.
      texturePath: '/2k_venus_atmosphere.jpg',
      rayon: 0.95,
      vitesseRotation: 0.0000412, // 0.01 / 243 jours ; positif = rétrograde car inclinaison > 90°
      distanceOrbite: 5.5,
      vitesseOrbite: 0.00813,   // 0.005 × 365.25 / 224.7 jours
      inclinaison: 177.4,        // axe quasi inversé -> rotation rétrograde
    });
  }
}
