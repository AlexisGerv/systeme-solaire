import * as THREE from 'three';
import Astre from './astre.js';

// Le Soleil hérite d'Astre : il n'a presque plus rien à coder lui-même.
export default class Soleil extends Astre {
  constructor(scene) {
    // super() appelle le constructeur de la classe parente (Astre)
    // en lui passant les paramètres spécifiques au Soleil.
    super({
      scene,
      texturePath: '/2k_sun.jpg',
      rayon: 2,
      vitesseRotation: 0.000394, // 0.01 / 25.38 jours
      emissif: true, // le Soleil brille tout seul
      nom: "Soleil",
      info: "Étoile centrale du système solaire."
    });
  }

  init() {
    // On commence par appeler init() de la classe parente :
    // il crée le pivot, la sphère, applique la texture, etc.
    super.init();

    // Puis on ajoute ce qui est SPÉCIFIQUE au Soleil :
    // la source de lumière qui éclairera la Terre et la Lune.
    // PointLight(couleur, intensité, distance, decay)
    //  - intensité : depuis three.js r155 les lumières sont "physiquement
    //    correctes" -> il faut des valeurs bien plus élevées qu'avant.
    //  - distance = 0 : pas de portée maximale (la lumière atteint tout).
    //  - decay = 1 : atténuation plus douce que le réalisme (qui serait 2).
    // Cette lumière "globale" éclaire tout ce qui est sur la couche par défaut
    // (couche 0) : Mercure, Vénus, Mars, Uranus, Neptune, ceintures, etc.
    // Elle ne projette PAS d'ombres : les ombres sont gérées par des
    // PointLight dédiées par "système planétaire" (cf. main.js), chacune sur
    // sa propre couche, pour que les lunes n'éclipsent QUE leur planète et
    // pas un astre situé plus loin sur la même ligne Soleil → lune.
    const lumiere = new THREE.PointLight(0xffffff, 10, 0, 1);
    this.pivot.add(lumiere);
  }

  // Pas besoin de redéfinir update() : celui d'Astre suffit (rotation propre).
}
