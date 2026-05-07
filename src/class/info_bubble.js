import * as THREE from 'three';
import { ECHELLE } from './astre.js';

export default class InfoBubble {
  constructor(scene) {
    this.scene = scene;
    
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
    if (this.sprite.visible && this.targetAstre) {
      const pos = new THREE.Vector3();
      this.targetAstre.mesh.getWorldPosition(pos);
      this.sprite.position.copy(pos);
      
      // Ajuster la position selon la taille de l'astre. Le terme rayon * 1.5
      // se met déjà à l'échelle tout seul (rayon est mis à l'échelle dans Astre) ;
      // on ne met à l'échelle que le plancher et l'offset constant pour les
      // tout petits satellites.
      const offset = Math.max(5 * ECHELLE, this.targetAstre.rayon * 1.5 + 2 * ECHELLE);
      this.sprite.position.y += offset;
    }
  }
}
