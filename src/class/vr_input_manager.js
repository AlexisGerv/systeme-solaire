import * as THREE from 'three';

const PORTEE_RAYCASTER = 30;
const DEADZONE_STICK = 0.15;

export default class VRInputManager {
  constructor(espace) {
    this.espace = espace;
    this.deadzone = DEADZONE_STICK;
    
    // Callbacks d'événements
    this.onSelect = null;
    this.onToggleDetail = null;

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
    const rayMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });

    for (const controller of [c1, c2]) {
      if (!controller) continue;
      const line = new THREE.Line(rayGeometry, rayMaterial);
      line.name = 'line';
      controller.add(line);
      
      // Attaché au rig pour que les manettes suivent les déplacements
      this.espace.rig.add(controller);

      controller.addEventListener('select', (e) => {
        if (this.onSelect) this.onSelect(e);
      });

      this.controllers.push(controller);
    }
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

      // Axes de thumbstick
      const xRaw = gp.axes.length >= 4 ? gp.axes[2] : 0;
      const yRaw = gp.axes.length >= 4 ? gp.axes[3] : 0;
      const xAxis = Math.abs(xRaw) > this.deadzone ? xRaw : 0;
      const yAxis = Math.abs(yRaw) > this.deadzone ? yRaw : 0;

      if (hand === 'left') {
        state.translation.x = xAxis;
        state.translation.y = yAxis;
      } else if (hand === 'right') {
        state.rotation.x = xAxis;
        state.vertical = yAxis;

        // Boutons A / B progressifs (timeScale)
        state.boutons.A = gp.buttons[4]?.pressed || false;
        state.boutons.B = gp.buttons[5]?.pressed || false;

        // Bouton X avec détection de front montant (appui unique)
        const boutonX = gp.buttons[2];
        if (boutonX && boutonX.pressed && !this._xPrecedent) {
          state.boutons.X = true;
          if (this.onToggleDetail) this.onToggleDetail();
        }
        this._xPrecedent = boutonX?.pressed || false;
      }
    }

    return state;
  }
}
