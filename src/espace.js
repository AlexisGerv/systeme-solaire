import * as THREE from 'three';

// La classe Espace possède l'unique scène, caméra et renderer.
// Tous les astres (Soleil, Terre, Lune) viendront s'ajouter à cette scène.
export default class Espace {
  constructor() {
    // 1. La scène : conteneur 3D commun à tous les astres
    this.scene = new THREE.Scene();

    // 2. La caméra : point de vue unique sur le système solaire
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 15;

    // 3. Le renderer : un seul <canvas> pour tout le monde
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    // 4. Garder un rendu correct si la fenêtre est redimensionnée
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Une seule méthode de rendu, appelée une fois par frame depuis main.js
  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
