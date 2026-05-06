import * as THREE from 'three';

// Gère tout ce qui concerne la caméra et les manettes VR :
//  - création des contrôleurs WebXR (avec rayon laser visible)
//  - sélection d'un astre par raycast au trigger
//  - suivi (lerp) du rig caméra vers l'astre sélectionné
//  - lecture du joystick pour piloter timeScale
//
// Le rig appartient à Espace ; on s'y attache pour que les manettes
// suivent la caméra lors d'un déplacement.
export default class CameraController {
  constructor(espace, astres, infoBubble) {
    this.espace = espace;
    this.astres = astres;
    this.infoBubble = infoBubble;
    this.raycaster = new THREE.Raycaster();
    this.trackedAstre = null;
    this.timeScale = 1;
    // Callback optionnel pour synchroniser une UI externe (slider HTML)
    // quand le joystick modifie timeScale.
    this.onTimeScaleChange = null;

    this._initControllers();
  }

  _initControllers() {
    const c1 = this.espace.renderer.xr.getController(0);
    const c2 = this.espace.renderer.xr.getController(1);

    const rayGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -100),
    ]);
    const rayMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });

    for (const controller of [c1, c2]) {
      if (!controller) continue;
      const line = new THREE.Line(rayGeometry, rayMaterial);
      line.name = 'line';
      controller.add(line);
      // Attaché au rig (et non à la scène) pour que les manettes suivent
      // la caméra quand on téléporte le rig vers une planète.
      this.espace.rig.add(controller);
      controller.addEventListener('select', (e) => this._onSelect(e));
    }
  }

  _onSelect(event) {
    const controller = event.target;
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);

    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const meshes = this.astres.map((a) => a.mesh).filter((m) => m !== undefined);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.userData && object.userData.astre) {
        this.trackedAstre = object.userData.astre;
        this.infoBubble.show(this.trackedAstre);

        // Flash rouge sur la ligne pour confirmer la sélection.
        const line = controller.getObjectByName('line');
        if (line) line.material.color.set(0xff0000);
        setTimeout(() => {
          if (line) line.material.color.set(0x00ff00);
        }, 300);
      }
    } else {
      // Clic dans le vide = annuler le tracking
      this.trackedAstre = null;
      this.infoBubble.hide();
    }
  }

  // Lit le joystick principal (axe Y) de chaque manette et ajuste timeScale.
  // Hors session XR : no-op.
  _handleVRInput() {
    const session = this.espace.renderer.xr.getSession();
    if (!session) return;
    for (const source of session.inputSources) {
      if (source.gamepad && source.gamepad.axes.length >= 4) {
        const yAxis = source.gamepad.axes[3];
        // Deadzone : évite les dérives sur un stick au repos.
        if (Math.abs(yAxis) > 0.1) {
          // Stick poussé en avant => valeur négative => vitesse augmente.
          this.timeScale -= yAxis * 0.02;
          this.timeScale = Math.max(0, Math.min(2, this.timeScale));
          if (this.onTimeScaleChange) this.onTimeScaleChange(this.timeScale);
        }
      }
    }
  }

  setTimeScale(v) {
    this.timeScale = v;
  }

  // À appeler une fois par frame depuis la boucle d'animation.
  update() {
    this._handleVRInput();

    if (this.trackedAstre) {
      const pos = new THREE.Vector3();
      this.trackedAstre.mesh.getWorldPosition(pos);
      // Décalage en Z pour ne pas se retrouver à l'intérieur de l'astre.
      const decalage = Math.max(10, this.trackedAstre.rayon * 3);
      pos.z += decalage;
      // Lerp doux : anti motion-sickness en VR.
      this.espace.rig.position.lerp(pos, 0.05);
    }
  }
}
