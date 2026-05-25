import * as THREE from 'three';
import { ECHELLE } from './astre.js';

export default class InfoBubble {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    // Vecteurs réutilisés chaque frame pour éviter d'allouer dans update().
    this._posAstre = new THREE.Vector3();
    this._posCam = new THREE.Vector3();
    this._dir = new THREE.Vector3();
    this._rightPerp = new THREE.Vector3();
    this._upMonde = new THREE.Vector3(0, 1, 0);
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.context = this.canvas.getContext('2d');
    
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    
    const material = new THREE.SpriteMaterial({ map: this.texture, depthTest: false });
    
    this.sprite = new THREE.Sprite(material);
    // Taille mise à l'échelle pour rester lisible à côté des astres agrandis.
    this.sprite.scale.set(10 * ECHELLE, 5 * ECHELLE, 1);
    this.sprite.visible = false;
    
    // On met un renderOrder grand pour qu'il s'affiche par-dessus
    this.sprite.renderOrder = 999;
    
    this.scene.add(this.sprite);
  }

  show(astre) {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    if (this.context.roundRect) {
      this.context.beginPath();
      this.context.roundRect(0, 0, this.canvas.width, this.canvas.height, 20);
      this.context.fill();
      this.context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      this.context.lineWidth = 4;
      this.context.stroke();
    } else {
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    this.context.fillStyle = 'white';
    this.context.font = 'bold 40px sans-serif';
    this.context.textAlign = 'center';
    this.context.fillText(astre.nom || 'Astre', this.canvas.width / 2, 60);
    
    this.context.font = '24px sans-serif';
    this.context.textAlign = 'left';
    
    const words = (astre.info || 'Aucune information.').split(' ');
    let line = '';
    let y = 110;
    for(let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = this.context.measureText(testLine);
      if (metrics.width > this.canvas.width - 40 && n > 0) {
        this.context.fillText(line, 20, y);
        line = words[n] + ' ';
        y += 30;
      } else {
        line = testLine;
      }
    }
    this.context.fillText(line, 20, y);
    
    this.texture.needsUpdate = true;
    this.sprite.visible = true;
    this.targetAstre = astre;
  }

  hide() {
    this.sprite.visible = false;
    this.targetAstre = null;
  }

  update() {
    if (!this.sprite.visible || !this.targetAstre) return;

    this.targetAstre.mesh.getWorldPosition(this._posAstre);

    // Sans caméra, fallback : offset purement en X monde.
    if (!this.camera) {
      const offsetX = Math.max(5 * ECHELLE, this.targetAstre.rayon * 1.5 + 2 * ECHELLE);
      this.sprite.position.copy(this._posAstre);
      this.sprite.position.x += offsetX;
      return;
    }

    // Direction caméra → astre : on s'en sert pour calculer un "droite écran"
    // local, et pour faire grandir l'offset avec la distance.
    this.camera.getWorldPosition(this._posCam);
    this._dir.subVectors(this._posAstre, this._posCam);
    const distCamAstre = this._dir.length();
    if (distCamAstre < 1e-4) {
      // Caméra collée à l'astre (cas dégénéré) : on garde juste la position
      // précédente du sprite, ça évite des NaN.
      return;
    }
    this._dir.divideScalar(distCamAstre);

    // rightPerp = produit vectoriel dir × upMonde → vecteur horizontal
    // perpendiculaire à la direction de vue, pointant vers la droite de
    // l'écran. Donne une impression d'écran de cockpit posé à droite de
    // l'astre observé.
    this._rightPerp.crossVectors(this._dir, this._upMonde);
    if (this._rightPerp.lengthSq() < 1e-6) {
      // dir presque vertical (caméra droit au-dessus/dessous) : on retombe
      // sur l'axe X de la caméra pour avoir un "droite" stable.
      this._rightPerp.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
      this._rightPerp.addScaledVector(this._dir, -this._dir.dot(this._rightPerp));
    }
    this._rightPerp.normalize();

    // Offset adaptatif :
    // - plancher = rayon * 1.5 + 2 pour ne jamais chevaucher l'astre ni les
    //   tout petits satellites quand on regarde de loin ;
    // - sinon ~25 % de la distance caméra↔astre pour garder un angle visuel
    //   constant (~14° à droite du centre) → la bulle reste dans le champ
    //   de vision quand on est collé à la planète en VR.
    const offset = Math.max(
      this.targetAstre.rayon * 1.5 + 2 * ECHELLE,
      distCamAstre * 0.25,
    );

    this.sprite.position.copy(this._posAstre).addScaledVector(this._rightPerp, offset);
  }
}
