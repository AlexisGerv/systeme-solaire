import * as THREE from 'three';
// OrbitControls est un "addon" de three.js : un module à part qui ajoute
// le contrôle de caméra à la souris (rotation, zoom, translation).
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
    // Activation globale des ombres. PCFSoftShadowMap = ombres adoucies
    // (un peu plus coûteux mais bien plus joli que les ombres "pixelisées").
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // 4. OrbitControls : permet de déplacer la caméra à la souris.
    //    - clic gauche + glisser : rotation autour du centre
    //    - clic droit + glisser  : translation (pan)
    //    - molette               : zoom
    //    Le 2e argument est l'élément DOM qui écoute les événements souris.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // Damping = inertie : la caméra "glisse" un peu après qu'on lâche la souris.
    // Si activé, il faut appeler controls.update() à chaque frame (voir render()).
    this.controls.enableDamping = true;
    // Bornes de zoom pour éviter de partir trop loin ou de rentrer dans le Soleil.
    this.controls.minDistance = 3;
    this.controls.maxDistance = 80;

    // 5. Garder un rendu correct si la fenêtre est redimensionnée
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  // Une seule méthode de rendu, appelée une fois par frame depuis main.js
  render() {
    // Indispensable quand enableDamping = true : applique l'inertie.
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
