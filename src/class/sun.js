import * as THREE from 'three';

export default class Soleil {
  // On reçoit la scène partagée depuis l'extérieur (créée dans Espace).
  // Le Soleil ne s'occupe plus que de SA propre géométrie, texture et lumière.
  constructor(scene) {
    this.scene = scene;
  }

  init() {
    // 1. La géométrie : la "forme" de l'objet (ici une sphère)
    //    SphereGeometry(rayon, segmentsHorizontaux, segmentsVerticaux)
    //    Les UV sont déjà prévues pour une image 360° (équirectangulaire).
    const geometry = new THREE.SphereGeometry(2, 64, 64);

    // 2. Chargement de la texture depuis le dossier public/
    const textureLoader = new THREE.TextureLoader();
    const textureSoleil = textureLoader.load('/2k_sun.jpg');
    // SRGBColorSpace : évite que les couleurs paraissent délavées.
    textureSoleil.colorSpace = THREE.SRGBColorSpace;

    // 3. Le matériau : MeshBasicMaterial n'est PAS affecté par les lumières
    //    -> parfait pour le Soleil qui doit briller par lui-même.
    const material = new THREE.MeshBasicMaterial({ map: textureSoleil });

    // 4. Le mesh : géométrie + matériau = un objet visible
    this.soleil = new THREE.Mesh(geometry, material);
    this.scene.add(this.soleil);

    // 5. Source de lumière : le Soleil émet de la lumière dans toutes les
    //    directions. Elle servira à éclairer la Terre et la Lune plus tard.
    const lumiere = new THREE.PointLight(0xffffff, 2, 100);
    lumiere.position.set(0, 0, 0); // au centre, comme le Soleil
    this.scene.add(lumiere);
  }

  // Appelée à chaque frame. Note : plus de renderer.render() ici,
  // c'est Espace qui s'en charge une seule fois pour toute la scène.
  update() {
    this.soleil.rotation.y += 0.002;
  }
}
