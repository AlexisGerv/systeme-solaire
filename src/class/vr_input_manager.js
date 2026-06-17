import * as THREE from 'three';

// Exportée : CameraController doit utiliser la même portée pour son
// raycaster que la longueur visuelle du laser, sinon le rayon "ment".
export const PORTEE_RAYCASTER = 30;

export default class VRInputManager {
  constructor(espace) {
    this.espace = espace;

    // Callback déclenché à la gâchette (assigné par CameraController)
    this.onSelect = null;

    this._xPrecedent = false;
    this.controllers = [];
    this._initControllers();
  }

  _initControllers() {
    const c1 = this.espace.renderer.xr.getController(0);
    const c2 = this.espace.renderer.xr.getController(1);

    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -PORTEE_RAYCASTER),
    ]);
    for (const controller of [c1, c2]) {
      if (!controller) continue;
      // Matériau propre à chaque manette : flashLaser ne doit colorer que
      // le laser de la manette qui a sélectionné, pas les deux.
      const rayMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
      const line = new THREE.Line(rayGeometry, rayMaterial);
      line.name = 'line';
      controller.add(line);
      
      // Attaché au rig pour que les manettes suivent les déplacements
      this.espace.rig.add(controller);

      controller.addEventListener('select', (e) => {
        if (this.onSelect) this.onSelect(e);
      });

      // Étiquettes des boutons collées sur la manette : X à gauche, A/B à
      // droite. La handedness n'est connue qu'au branchement de la manette
      // (évènement 'connected'), pas à l'init — on attache les pastilles ici.
      controller.addEventListener('connected', (e) => {
        this._ajouterLabels(controller, e.data?.handedness);
      });
      controller.addEventListener('disconnected', () => {
        this._retirerLabels(controller);
      });

      this.controllers.push(controller);
    }
  }

  // Pose les pastilles de boutons sur une manette selon sa main.
  // Repères VR-débutants : ils voient « X », « A », « B » au-dessus des
  // vraies touches sans avoir à les chercher.
  _ajouterLabels(controller, hand) {
    this._retirerLabels(controller); // évite les doublons si re-connexion

    const labels = [];
    if (hand === 'left') {
      // Bouton X (bleu) : seul bouton utilisé sur la manette gauche.
      labels.push(this._creerLabelBouton('X', 0x4fa8ff, { x: 0, y: 0.02, z: 0.035 }));
    } else if (hand === 'right') {
      // A (vert) plus proche de la main, B (rouge) un cran au-dessus,
      // comme sur une manette Touch.
      labels.push(this._creerLabelBouton('A', 0x5fd97a, { x: 0.005, y: 0.02, z: 0.04 }));
      labels.push(this._creerLabelBouton('B', 0xff7a7a, { x: 0.005, y: 0.028, z: 0.022 }));
    }

    for (const l of labels) controller.add(l);
    controller._labelsBoutons = labels;
  }

  _retirerLabels(controller) {
    if (!controller._labelsBoutons) return;
    for (const l of controller._labelsBoutons) {
      controller.remove(l);
      l.material.map?.dispose();
      l.material.dispose();
    }
    controller._labelsBoutons = null;
  }

  // Pastille ronde (lettre blanche sur disque coloré, cerclée de blanc),
  // rendue en Sprite billboard pour rester lisible sous tous les angles.
  _creerLabelBouton(lettre, couleurHex, offset) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fillStyle = '#' + couleurHex.toString(16).padStart(6, '0');
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lettre, 64, 70);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    // depthTest false : la pastille reste visible même quand le modèle de
    // la manette passe devant. renderOrder élevé pour le même motif.
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.022, 0.022, 1); // ~2 cm, taille d'un vrai bouton
    sprite.position.set(offset.x, offset.y, offset.z);
    sprite.renderOrder = 999;
    sprite.name = 'labelBouton';
    return sprite;
  }

  // Permet de flasher le laser en rouge à la sélection
  flashLaser(controller) {
    if (!controller) return;
    const line = controller.getObjectByName('line');
    if (line) {
      line.material.color.set(0xff0000);
      setTimeout(() => {
        line.material.color.set(0x00ff00);
      }, 300);
    }
  }

  // Renvoie un état structuré et simplifié des contrôles VR pour cette frame
  getState() {
    const state = {
      translation: { x: 0, y: 0 },
      rotation: { x: 0, y: 0 },
      vertical: 0,
      boutons: { A: false, B: false, X: false }
    };

    const session = this.espace.renderer.xr.getSession();
    if (!session) return state;

    for (const source of session.inputSources) {
      if (!source.gamepad) continue;
      const gp = source.gamepad;
      const hand = source.handedness;

      //joystick
      const xAxis = gp.axes.length >= 4 ? gp.axes[2] : 0;
      const yAxis = gp.axes.length >= 4 ? gp.axes[3] : 0;

      if (hand === 'left') {
        state.translation.x = xAxis;
        state.translation.y = yAxis;

        // Bouton X : sur la manette GAUCHE, index 4 du mapping xr-standard
        // (la droite porte A/B aux mêmes index). Front montant (appui unique).
        const boutonX = gp.buttons[4];
        state.boutons.X = Boolean(boutonX?.pressed && !this._xPrecedent);
        this._xPrecedent = boutonX?.pressed || false;
      } else if (hand === 'right') {
        state.rotation.x = xAxis;
        state.vertical = yAxis;

        // Boutons A / B progressifs (timeScale)
        state.boutons.A = gp.buttons[4]?.pressed || false;
        state.boutons.B = gp.buttons[5]?.pressed || false;
      }
    }

    return state;
  }
}
