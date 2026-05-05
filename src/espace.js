import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// La classe Espace possède l'unique scène, caméra et renderer.
// Tous les astres (Soleil, Terre, Lune) viendront s'ajouter à cette scène.
export default class Espace {
  constructor() {
    // 1. La scène : conteneur 3D commun à tous les astres
    this.scene = new THREE.Scene();

    // Fond étoilé (Voie lactée) projeté sur une sphère équirectangulaire.
    const loader = new THREE.TextureLoader();
    const bgTexture = loader.load('/8k_stars_milky_way.jpg');
    bgTexture.mapping = THREE.EquirectangularReflectionMapping;
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bgTexture;

    // Lumière ambiante très faible : empêche les faces non éclairées par
    // le Soleil d'être totalement noires (un peu de lumière "rebondie").
    const ambiante = new THREE.AmbientLight(0xffffff, 0.08);
    this.scene.add(ambiante);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    // On met la caméra dans un "rig" pour pouvoir la déplacer en VR et PC.
    this.rig = new THREE.Group();
    this.rig.position.set(0, 0, 0); // Au centre du système par défaut
    this.scene.add(this.rig);
    this.rig.add(this.camera);
    
    // Vue depuis au-dessus du plan orbital (axe Y).
    this.camera.position.set(0, 150, 0); // La caméra est en hauteur par rapport au rig
    this.camera.lookAt(0, 0, 0); // Regarder vers le centre du rig

    // 3. Le renderer : un seul <canvas> pour tout le monde
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    // Activation globale des ombres. PCFSoftShadowMap = ombres adoucies
    // (un peu plus coûteux mais bien plus joli que les ombres "pixelisées").
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Activer le support WebXR (indispensable pour le mode VR).
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    // Bouton "Enter VR" ajouté automatiquement par Three.js.
    document.body.appendChild(VRButton.createButton(this.renderer));

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
    this.controls.maxDistance = 250;

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
