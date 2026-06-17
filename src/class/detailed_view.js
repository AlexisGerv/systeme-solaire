import * as THREE from 'three';

export default class DetailedView {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.visible = false;
    this.currentAstre = null;

    // Panneau texte, positionné à distance fixe devant la caméra (cf. VRTutorial)
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
    this.spriteTexte.scale.set(4, 3, 1);
    this.spriteTexte.renderOrder = 999;
    this.spriteTexte.visible = false;
    this.scene.add(this.spriteTexte);
  }

  show(astre) {
    this.visible = true;
    this.currentAstre = astre;

    // Afficher le texte détaillé
    this._drawDetailedText(astre);

    this.spriteTexte.visible = true;

    // Lecture vocale du contenu (Web Speech API). Audible sur PC ; muet dans le
    // casque (le Meta Quest Browser ne fournit aucune voix speechSynthesis).
    this._lireTexte(this._texteParole(astre));
  }

  hide() {
    this.visible = false;
    this.spriteTexte.visible = false;
    this.currentAstre = null;

    // Couper la lecture en cours en quittant la vue
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  // Construit le texte lu à voix haute (sans mise en forme visuelle)
  _texteParole(astre) {
    return [
      astre.nom || 'Astre',
      `Rayon : ${astre.rayonReel.toLocaleString('fr-FR')} kilomètres.`,
      `Vitesse orbitale : ${astre.vitesseOrbitaleReelle.toFixed(2)} kilomètres par seconde.`,
      astre.info || ''
    ].join(' ');
  }

  // Synthèse vocale française ; ignore silencieusement si non supportée
  _lireTexte(texte) {
    if (!('speechSynthesis' in window)) {
      console.error("La synthèse vocale n'est pas supportée par ce navigateur.");
      return;
    }

    // Stoppe une lecture en cours pour éviter la superposition
    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance(texte);
    message.lang = 'fr-FR';
    message.pitch = 1;
    message.rate = 1;
    window.speechSynthesis.speak(message);
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
      `Rayon: ${astre.rayonReel.toLocaleString('fr-FR')} km`,
      `Vitesse orbitale: ${astre.vitesseOrbitaleReelle.toFixed(2)} km/s`,
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
      }, ['']) // graine [''] : sur [] vide, acc[acc.length - 1] écrirait à l'index -1 et perdrait la 1re ligne
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

  // Replace le panneau à distance fixe devant la caméra, à l'image de
  // VRTutorial : comme c'est un Sprite, il reste face à l'utilisateur.
  // Signature update(dt, camera, rig) commune aux overlays (dt et rig inutilisés ici).
  update(dt, camera) {
    if (!this.visible) return;

    const cam = camera || this.camera;
    if (!cam) return;

    const posCam = new THREE.Vector3();
    cam.getWorldPosition(posCam);

    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);

    this.spriteTexte.position.copy(posCam).addScaledVector(fwd, 5);
  }
}
