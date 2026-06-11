import * as THREE from 'three';

// Message d'accueil "Bienvenue dans le système solaire" affiché à la
// sortie d'hyperespace (après validation du tutoriel à la gâchette).
//
// Implémenté comme un Sprite + CanvasTexture, même pattern que VRTutorial,
// donc lisible en VR depuis n'importe quel angle.
//
// Cycle de vie :
//   show() -> apparaît, fade in rapide (~0.4s)
//          -> reste affiché 3s
//          -> fade out (~1s)
//          -> se cache automatiquement
// Si show() est rappelé pendant l'animation, on repart de zéro.
export default class MessageBienvenue {
  constructor(scene) {
    this.scene = scene;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 256;
    this.context = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      // Au-dessus de tout : on doit voir le message même si une planète passe.
      depthTest: false,
      opacity: 0,
    });

    this.sprite = new THREE.Sprite(this.material);
    // Ratio 4:1 cohérent avec le canvas 1024x256.
    this.sprite.scale.set(4, 1, 1);
    this.sprite.visible = false;
    this.sprite.renderOrder = 1001;

    scene.add(this.sprite);

    this._dessinerContenu();

    // Phases d'animation :
    //   'fadeIn'  -> opacité 0->1 sur _dureeFadeIn secondes
    //   'visible' -> opacité 1 pendant _dureeAffichage secondes
    //   'fadeOut' -> opacité 1->0 sur _dureeFadeOut secondes
    //   null      -> caché
    this._phase = null;
    this._t = 0;

    this._dureeFadeIn = 0.4;
    this._dureeAffichage = 3.0;
    this._dureeFadeOut = 1.0;
  }

  _dessinerContenu() {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Fond sombre semi-transparent + bordure pour bien détacher du ciel.
    ctx.fillStyle = 'rgba(0, 10, 30, 0.85)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, 30);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120, 200, 255, 0.9)';
      ctx.lineWidth = 6;
      ctx.stroke();
    } else {
      ctx.fillRect(0, 0, w, h);
    }

    // Texte centré, deux lignes pour aérer.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('Bienvenue', w / 2, h / 2 - 40);

    ctx.fillStyle = '#a0d8ff';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText('dans le système solaire', w / 2, h / 2 + 40);

    this.texture.needsUpdate = true;
  }

  show() {
    this.sprite.visible = true;
    this._phase = 'fadeIn';
    this._t = 0;
    this.material.opacity = 0;
  }

  hide() {
    this.sprite.visible = false;
    this._phase = null;
    this._t = 0;
    this.material.opacity = 0;
  }

  get visible() {
    return this.sprite.visible;
  }

  // À appeler chaque frame.
  // - dt : delta time (secondes)
  // - camera : repositionnement face à l'utilisateur (le Sprite est déjà
  //   un billboard, donc orienté automatiquement vers la caméra).
  update(dt, camera) {
    if (!this.sprite.visible) return;

    // Replacement à 4 unités devant la caméra, légèrement au-dessus du
    // centre du regard pour ne pas masquer le système solaire.
    const posCam = new THREE.Vector3();
    camera.getWorldPosition(posCam);
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    this.sprite.position.copy(posCam).addScaledVector(fwd, 4);
    this.sprite.position.y += 0.5;

    // Machine à états du fade.
    this._t += dt;
    if (this._phase === 'fadeIn') {
      const k = Math.min(1, this._t / this._dureeFadeIn);
      this.material.opacity = k;
      if (k >= 1) {
        this._phase = 'visible';
        this._t = 0;
      }
    } else if (this._phase === 'visible') {
      this.material.opacity = 1;
      if (this._t >= this._dureeAffichage) {
        this._phase = 'fadeOut';
        this._t = 0;
      }
    } else if (this._phase === 'fadeOut') {
      const k = Math.min(1, this._t / this._dureeFadeOut);
      this.material.opacity = 1 - k;
      if (k >= 1) {
        this.hide();
      }
    }
  }
}
