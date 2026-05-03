import * as THREE from 'three';

// Ceinture d'astéroïdes entre Mars et Jupiter.
//
// On n'hérite PAS d'Astre : ce n'est pas un seul corps mais une collection.
// Pour afficher des milliers de cailloux sans massacrer les FPS, on utilise
// THREE.InstancedMesh : une seule géométrie + un seul matériau, et on stocke
// la matrice (position/rotation/taille) de chaque instance dans un tampon.
// -> 1 draw call pour toute la ceinture, au lieu de 1500.
export default class CeintureAsteroides {
  constructor(scene, {
    nombre = 1500,
    rayonMin = 13.5,
    rayonMax = 16,
    epaisseur = 0.3,        // dispersion verticale (±)
    tailleMin = 0.02,
    tailleMax = 0.1,
    vitesseOrbite = 0.0032, // entre celle de Mars (0.004) et Jupiter (0.0022)
  } = {}) {
    this.scene = scene;
    this.nombre = nombre;
    this.rayonMin = rayonMin;
    this.rayonMax = rayonMax;
    this.epaisseur = epaisseur;
    this.tailleMin = tailleMin;
    this.tailleMax = tailleMax;
    this.vitesseOrbite = vitesseOrbite;
  }

  init() {
    // Pivot autour du Soleil : faire tourner ce groupe = faire orbiter
    // toute la ceinture en bloc (comme pour les planètes).
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    // Géométrie volontairement low-poly : à cette taille on ne voit pas
    // la différence, et 1500 sphères haute résolution coûteraient cher.
    const geometry = new THREE.SphereGeometry(1, 6, 6);
    const material = new THREE.MeshStandardMaterial({
      color: 0x8a7560, // gris-brun rocheux
      roughness: 1,
      flatShading: true, // facettes visibles -> aspect "caillou"
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, this.nombre);
    this.mesh.castShadow = false;     // 1500 ombres tueraient les FPS
    this.mesh.receiveShadow = true;

    // Objet temporaire pour composer chaque matrice d'instance.
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.nombre; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rayon = THREE.MathUtils.lerp(this.rayonMin, this.rayonMax, Math.random());
      // Hauteur biaisée vers 0 (somme de deux randoms = quasi-gaussien)
      // -> ceinture plus dense au plan de l'écliptique, qui s'étire un peu.
      const hauteur = (Math.random() + Math.random() - 1) * this.epaisseur;
      const taille = THREE.MathUtils.lerp(this.tailleMin, this.tailleMax, Math.random());

      dummy.position.set(
        Math.cos(angle) * rayon,
        hauteur,
        Math.sin(angle) * rayon,
      );
      dummy.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      dummy.scale.setScalar(taille);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }

    this.pivot.add(this.mesh);
  }

  update() {
    this.pivot.rotation.y += this.vitesseOrbite;
  }
}
