import Astre from './astre.js';

export default class Neptune extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_neptune.jpg',
      rayon: 1.35,
      vitesseRotation: 0.01493,  // 0.01 / 0.6713 jours
      distanceOrbite: 50,
      vitesseOrbite: 0.0000304, // 0.005 × 365.25 / 60190 jours
      inclinaison: 28.32,
      nom: "Neptune",
      info: "La planète la plus éloignée du Soleil, une géante gazeuse avec des vents violents et une grande tache sombre, une tempête similaire à la Grande Tache Rouge de Jupiter."
    });
  }
}
