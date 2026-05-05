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
    const lumiere = new THREE.PointLight(0xffffff, 100, 0, 1);
    // On dit à la lumière de générer des ombres.
    // Une PointLight rend en réalité 6 "shadow maps" (une par direction du cube)
    // -> c'est la lumière la plus coûteuse en ombres, mais c'est ce qu'il faut
    // ici car le Soleil éclaire dans toutes les directions.
    lumiere.castShadow = true;
    // Résolution de la shadow map : plus c'est haut, plus l'ombre est nette.
    lumiere.shadow.mapSize.width = 1024;
    lumiere.shadow.mapSize.height = 1024;
    this.pivot.add(lumiere);
  }

  // Pas besoin de redéfinir update() : celui d'Astre suffit (rotation propre).
}
