import * as THREE from 'three';

export default class Soleil {
  init() {
    // 1. La scène : conteneur 3D qui regroupe tous les objets, lumières, caméras
    this.scene = new THREE.Scene();

    // 2. La caméra : point de vue depuis lequel on regarde la scène
    //    PerspectiveCamera(fov, ratio, near, far)
    //    - fov   : champ de vision en degrés
    //    - ratio : largeur / hauteur du rendu
    //    - near  : distance minimale visible
    //    - far   : distance maximale visible
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 8; // on recule la caméra pour voir le Soleil

    // 3. Le renderer : moteur qui dessine la scène dans un <canvas>
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // 4. La géométrie : la "forme" de l'objet (ici une sphère)
    //    SphereGeometry(rayon, segmentsHorizontaux, segmentsVerticaux)
    //    Plus il y a de segments, plus la sphère est lisse (mais plus coûteuse).
    const geometry = new THREE.SphereGeometry(2, 64, 64);

    // 5. Le matériau : l'apparence de la surface
    //    MeshBasicMaterial n'est PAS affecté par les lumières -> parfait pour
    //    le Soleil qui doit briller par lui-même.
    const material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // 6. Le mesh : géométrie + matériau = un objet visible
    this.soleil = new THREE.Mesh(geometry, material);
    this.scene.add(this.soleil);

    // 7. Source de lumière : le Soleil émet de la lumière dans toutes les
    //    directions. Utile plus tard pour éclairer la Terre et la Lune.
    const lumiere = new THREE.PointLight(0xffffff, 2, 100);
    lumiere.position.set(0, 0, 0); // au centre, comme le Soleil
    this.scene.add(lumiere);

    // 8. Adapter le rendu si la fenêtre est redimensionnée
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Appelée à chaque frame depuis main.js (≈ 60 fois par seconde)
  update() {
    // Petite rotation pour donner vie au Soleil
    this.soleil.rotation.y += 0.002;

    // On demande au renderer de dessiner la scène vue par la caméra
    this.renderer.render(this.scene, this.camera);
  }
}
