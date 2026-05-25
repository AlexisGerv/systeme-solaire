import * as THREE from 'three';

// Panneau d'aide affiché en début de session VR : liste les contrôles
// (sticks, boutons A/B, gâchette). L'utilisateur appuie sur n'importe
// quelle gâchette pour le faire disparaître et entrer dans le système.
//
// Implémenté comme un Sprite + CanvasTexture (même pattern qu'InfoBubble),
// donc lisible en VR depuis n'importe quel angle.
//
// Positionnement : repositionné chaque frame à une distance fixe devant
// la caméra. Le Sprite étant déjà un billboard, il reste toujours face
// à l'utilisateur, qui peut bouger la tête sans perdre la lisibilité.
export default class VRTutorial {
  constructor(scene) {
    this.scene = scene;

    // Canvas haute définition : on écrit beaucoup de texte, il faut
    // assez de pixels pour que ça reste net même à 5 unités de distance.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 768;
    this.context = this.canvas.getContext('2d');

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: this.texture,
      // depthTest false : le panneau s'affiche par-dessus tout, même si
      // une planète passe devant pendant que l'utilisateur lit.
      depthTest: false,
    });

    this.sprite = new THREE.Sprite(material);
    // Ratio 4:3 cohérent avec le canvas (1024x768).
    this.sprite.scale.set(4, 3, 1);
    this.sprite.visible = false;
    this.sprite.renderOrder = 1000;

    this.scene.add(this.sprite);

    this._dessinerContenu();
  }

  // Dessine la fiche de contrôles une seule fois (le contenu ne change pas).
  _dessinerContenu() {
    const ctx = this.context;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Fond sombre semi-transparent + bordure pour bien détacher du ciel étoilé.
    ctx.clearRect(0, 0, w, h);
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

    // Titre
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Bienvenue en VR', w / 2, 90);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#a0d8ff';
    ctx.fillText('Voici les contrôles de votre vaisseau spatial', w / 2, 130);

    // Liste des contrôles : couple (libellé manette, action).
    const controles = [
      ['Stick gauche', 'Avancer / reculer / mouvements latéraux'],
      ['Stick droit (⬅⮕)', 'Tourner sur soi même'],
      ['Stick droit (⬆⬇)', 'Monter / descendre'],
      ['Bouton A', 'Accélérer le temps'],
      ['Bouton B', 'Ralentir le temps'],
      ['Gâchette', 'Sélectionner un astre au laser'],
    ];

    ctx.textAlign = 'left';
    let y = 200;
    const ligneHauteur = 60;
    for (const [touche, action] of controles) {
      // Colonne de gauche : nom de la touche en bleu clair, gras.
      ctx.fillStyle = '#7ec8ff';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText(touche, 60, y);
      // Colonne de droite : action en blanc, taille standard.
      ctx.fillStyle = '#ffffff';
      ctx.font = '30px sans-serif';
      ctx.fillText(action, 380, y);
      y += ligneHauteur;
    }

    // Bandeau de validation en bas : on insiste pour que ce soit clair.
    ctx.fillStyle = '#ffd54a';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Appuyez sur la gâchette pour commencer', w / 2, h - 60);

    this.texture.needsUpdate = true;
  }

  show() {
    this.sprite.visible = true;
  }

  hide() {
    this.sprite.visible = false;
  }

  get visible() {
    return this.sprite.visible;
  }

  // Replace le panneau à 5 unités devant la caméra, à hauteur des yeux.
  // Comme c'est un Sprite, il s'orientera automatiquement face à la caméra.
  update(camera) {
    if (!this.sprite.visible) return;

    const posCam = new THREE.Vector3();
    camera.getWorldPosition(posCam);

    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);

    this.sprite.position.copy(posCam).addScaledVector(fwd, 5);
  }
}
