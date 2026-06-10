import * as THREE from 'three';

export default class DetailedView {
  constructor(scene, camera, astres, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.astres = astres;
    this.renderer = renderer;

    this.visible = false;
    this.currentAstre = null;

    // Panneau texte à gauche
    this.canvasTexte = document.createElement('canvas');
    this.canvasTexte.width = 1024;
    this.canvasTexte.height = 768;
    this.contextTexte = this.canvasTexte.getContext('2d');

    this.textureTexte = new THREE.CanvasTexture(this.canvasTexte);
    this.textureTexte.colorSpace = THREE.SRGBColorSpace;

    const materialTexte = new THREE.SpriteMaterial({
      map: this.textureTexte,
      depthTest: false
    });

    this.spriteTexte = new THREE.Sprite(materialTexte);
    this.spriteTexte.scale.set(15, 11.25, 1);
    this.spriteTexte.renderOrder = 999;
    this.spriteTexte.visible = false;
    this.scene.add(this.spriteTexte);

    // Panneau modèle 3D à droite : rendu de la planète via WebGLRenderTarget
    this.renderTarget = new THREE.WebGLRenderTarget(512, 512, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      antialias: true
    });

    this.textureModele = this.renderTarget.texture;
    this.textureModele.colorSpace = THREE.SRGBColorSpace;

    const materialModele = new THREE.SpriteMaterial({
      map: this.textureModele,
      depthTest: false
    });

    this.spriteModele = new THREE.Sprite(materialModele);
    this.spriteModele.scale.set(9, 9, 1);
    this.spriteModele.renderOrder = 999;
    this.spriteModele.visible = false;
    this.scene.add(this.spriteModele);

    // Scène de rendu interne pour le modèle 3D
    this.sceneModele = new THREE.Scene();
    this.sceneModele.background = new THREE.Color(0x000000);
    this.cameraModele = new THREE.PerspectiveCamera(
      50,
      1,
      0.1,
      1000
    );
    this.cameraModele.position.z = 5;

    // Lumière pour éclairer le modèle 3D
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(3, 3, 3);
    this.sceneModele.add(light);

    const ambiant = new THREE.AmbientLight(0xffffff, 0.6);
    this.sceneModele.add(ambiant);
  }

  show(astre) {
    this.visible = true;
    this.currentAstre = astre;

    // Afficher le texte détaillé
    this._drawDetailedText(astre);

    // Ajouter une copie du mesh de l'astre à la scène de rendu
    this._setupModelRenderer(astre);

    this.spriteTexte.visible = true;
    this.spriteModele.visible = true;
  }

  hide() {
    this.visible = false;
    this.spriteTexte.visible = false;
    this.spriteModele.visible = false;
    this.currentAstre = null;

    // Nettoyer la scène de rendu
    while (this.sceneModele.children.length > 0) {
      const obj = this.sceneModele.children[0];
      if (obj.isMesh && obj.geometry) {
        obj.geometry.dispose();
      }
      this.sceneModele.remove(obj);
    }
    // Re-ajouter les lumières
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(3, 3, 3);
    this.sceneModele.add(light);

    const ambiant = new THREE.AmbientLight(0xffffff, 0.6);
    this.sceneModele.add(ambiant);
  }

  _drawDetailedText(astre) {
    this.contextTexte.clearRect(0, 0, this.canvasTexte.width, this.canvasTexte.height);

    // Fond semi-transparent
    this.contextTexte.fillStyle = 'rgba(0, 0, 0, 0.8)';
    if (this.contextTexte.roundRect) {
      this.contextTexte.beginPath();
      this.contextTexte.roundRect(0, 0, this.canvasTexte.width, this.canvasTexte.height, 30);
      this.contextTexte.fill();
      this.contextTexte.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      this.contextTexte.lineWidth = 6;
      this.contextTexte.stroke();
    } else {
      this.contextTexte.fillRect(0, 0, this.canvasTexte.width, this.canvasTexte.height);
    }

    // Titre (nom de l'astre)
    this.contextTexte.fillStyle = 'white';
    this.contextTexte.font = 'bold 60px sans-serif';
    this.contextTexte.textAlign = 'center';
    this.contextTexte.fillText(astre.nom || 'Astre', this.canvasTexte.width / 2, 80);

    // Infos détaillées
    this.contextTexte.font = '32px sans-serif';
    this.contextTexte.textAlign = 'left';
    this.contextTexte.fillStyle = 'rgba(255, 255, 255, 0.9)';

    const lines = [
      `Rayon: ${astre.rayon.toFixed(1)} km`,
      `Vitesse orbitale: ${(astre.vitesseOrbite * 365).toFixed(2)}°/an`,
      `Période de rotation: ${(astre.vitesseRotation * 24).toFixed(2)}°/jour`,
      '',
      'Description:',
      ...(astre.info || 'Pas d\'information').split(' ').reduce((acc, word) => {
        const lastLine = acc[acc.length - 1] || '';
        const testLine = lastLine + (lastLine ? ' ' : '') + word;
        const width = this.contextTexte.measureText(testLine).width;
        if (width > this.canvasTexte.width - 60) {
          acc.push(word);
        } else {
          acc[acc.length - 1] = testLine;
        }
        return acc;
      }, [])
    ];

    let y = 150;
    for (const line of lines) {
      if (line === '') {
        y += 20;
      } else {
        this.contextTexte.fillText(line, 40, y);
        y += 50;
      }
    }

    this.textureTexte.needsUpdate = true;
  }

  _setupModelRenderer(astre) {
    // Nettoyer les mailles précédentes (sauf les lumières)
    const toRemove = this.sceneModele.children.filter(obj => obj.isMesh);
    toRemove.forEach(obj => {
      if (obj.geometry) obj.geometry.dispose();
      this.sceneModele.remove(obj);
    });

    // Cloner le mesh de l'astre
    const meshClone = astre.mesh.clone();

    // Réinitialiser la transformation pour le centrer dans la scène de rendu
    meshClone.position.set(0, 0, 0);
    meshClone.rotation.set(0, 0, 0);
    meshClone.scale.set(1, 1, 1);

    this.sceneModele.add(meshClone);
  }

  update() {
    if (!this.visible || !this.currentAstre) return;

    const camera = this.camera;
    if (!camera) return;

    const posCam = new THREE.Vector3();
    const posAstre = new THREE.Vector3();
    camera.getWorldPosition(posCam);
    this.currentAstre.mesh.getWorldPosition(posAstre);

    const dir = posAstre.clone().sub(posCam);
    const distCamAstre = dir.length();
    if (distCamAstre < 1e-4) return;
    dir.divideScalar(distCamAstre);

    // Panneau texte : en haut à gauche (perpendiculaire left)
    const rightPerp = new THREE.Vector3();
    rightPerp.crossVectors(dir, new THREE.Vector3(0, 1, 0));
    if (rightPerp.lengthSq() < 1e-6) {
      rightPerp.set(1, 0, 0).applyQuaternion(camera.quaternion);
      rightPerp.addScaledVector(dir, -dir.dot(rightPerp));
    }
    rightPerp.normalize();

    const offset = Math.max(
      this.currentAstre.rayon * 1.5 + 2,
      distCamAstre * 0.25,
    );

    // Texte à gauche
    this.spriteTexte.position.copy(posAstre).addScaledVector(rightPerp, -offset);

    // Modèle 3D à droite
    this.spriteModele.position.copy(posAstre).addScaledVector(rightPerp, offset);

    // Rendre le modèle 3D via WebGLRenderTarget
    if (this.renderer) {
      const meshActuel = this.sceneModele.children.find(obj => obj.isMesh);
      if (meshActuel) {
        meshActuel.rotation.y += 0.01;
      }
      const oldRT = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.render(this.sceneModele, this.cameraModele);
      this.renderer.setRenderTarget(oldRT);
    }
  }
}
