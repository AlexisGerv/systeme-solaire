import * as THREE from 'three';
import Astre from './astre.js';

// Saturne hérite d'Astre comme les autres, mais surcharge init() pour
// ajouter ses anneaux (comme le Soleil surcharge init() pour sa lumière).
export default class Saturne extends Astre {
  constructor(scene) {
    super({
      scene,
      texturePath: '/2k_saturn.jpg',
      rayon: 1.9,
      vitesseRotation: 0.02222,  // 0.01 / 0.45 jours
<<<<<<< HEAD
      distanceOrbite: 34,
=======
      distanceOrbite: 45,
>>>>>>> a458c6cf3c58e8565c6530246af2ea3e9b86aef4
      vitesseOrbite: 0.00017,   // 0.005 × 365.25 / 10759.2 jours
      inclinaison: 26.73,
    });
  }

  init() {
    super.init();

    // Les anneaux : un disque (RingGeometry) à plat dans le plan équatorial.
    const rayonInterieur = this.rayon * 1.2;
    const rayonExterieur = this.rayon * 2.2;
    const geometrie = new THREE.RingGeometry(rayonInterieur, rayonExterieur, 128);

    const positions = geometrie.attributes.position;
    const uvs = geometrie.attributes.uv;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const u = (r - rayonInterieur) / (rayonExterieur - rayonInterieur);
      uvs.setXY(i, u, 1);
    }
    uvs.needsUpdate = true;

    const texture = new THREE.TextureLoader().load('/2k_saturn_ring_alpha.png');
    texture.colorSpace = THREE.SRGBColorSpace;

    const materiau = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,  // visible des deux côtés
      transparent: true,        // la texture a un canal alpha
    });

    const anneaux = new THREE.Mesh(geometrie, materiau);
    // RingGeometry est dans le plan XY ; on la couche dans le plan XZ
    // (le plan équatorial de la planète).
    anneaux.rotation.x = Math.PI / 2;
    anneaux.receiveShadow = true;
    // Ajouté au tilt : les anneaux suivent l'inclinaison de Saturne.
    this.tilt.add(anneaux);
  }
}
