import * as THREE from 'three';

// HUD permanent attaché à la caméra (visible en bas du champ de vision en VR).
// Affiche :
//   - L'astre actuellement suivi ("En orbite autour de X")
//   - La vitesse temporelle courante (timeScale)
//   - L'aide-mémoire des boutons (A / B → vitesse)
//
// Pattern Canvas 2D -> CanvasTexture -> Sprite.
// Les Sprites font toujours face à la caméra, donc lisible quel que soit
// l'angle de tête. depthTest=false pour rester par-dessus la scène 3D.
export default class HUD {
  constructor(camera) {
    this.camera = camera;
    this.orbitText = '';
    this.speedText = 'Vitesse : 1.00x';

    this.canvas = document.createElement('canvas');
    // Format paysage : on a deux/trois lignes courtes à afficher.
    this.canvas.width = 1024;
    this.canvas.height = 256;
    this.context = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.sprite = new THREE.Sprite(material);
    this.sprite.renderOrder = 999;

    // Position locale dans la caméra : 1 unité devant, légèrement en bas.
    // Échelle adaptée pour rester lisible sans masquer la scène.
    this.sprite.position.set(0, -0.45, -1.2);
    this.sprite.scale.set(1.2, 0.3, 1);

    camera.add(this.sprite);

    this._draw();
  }

  // Met à jour le nom de l'astre en orbite (null/undefined => texte vide).
  setOrbit(astreNom) {
    const t = astreNom ? `En orbite autour de ${astreNom}` : '';
    if (t === this.orbitText) return;
    this.orbitText = t;
    this._draw();
  }

  // Met à jour la valeur de timeScale affichée.
  setSpeed(value) {
    const t = `Vitesse : ${value.toFixed(2)}x`;
    if (t === this.speedText) return;
    this.speedText = t;
    this._draw();
  }

  _draw() {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fond noir semi-transparent à coins arrondis.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(4, 4, w - 8, h - 8, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.fillRect(4, 4, w - 8, h - 8);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Ligne 1 : astre suivi (si applicable).
    if (this.orbitText) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText(this.orbitText, w / 2, 60);
    }

    // Ligne 2 : vitesse temporelle.
    ctx.fillStyle = '#aaffaa';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(this.speedText, w / 2, this.orbitText ? 130 : 100);

    // Ligne 3 : aide-mémoire des boutons.
    ctx.fillStyle = '#cccccc';
    ctx.font = '28px sans-serif';
    ctx.fillText('A : accélérer le temps   B : ralentir le temps', w / 2, this.orbitText ? 195 : 175);

    this.texture.needsUpdate = true;
  }
}
