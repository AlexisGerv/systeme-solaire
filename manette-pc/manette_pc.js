// Lecture d'une manette de jeu (Xbox One et compatibles "standard gamepad")
// via la Gamepad API du navigateur, pour piloter la caméra en mode PC
// (hors session WebXR).
//
// getState() renvoie la même forme que VRInputManager.getState()
// (translation, rotation, vertical, boutons.A/B/X), plus un champ "select"
// (front montant) pour interagir au réticule (centre de l'écran).
// CameraController réutilise ainsi la même logique de pilotage que pour
// la VR (cf. _appliquerPilotage).

// Zone morte des sticks : contrairement aux manettes WebXR, les manettes
// filaires/Bluetooth bon marché renvoient souvent une petite valeur non
// nulle au repos (drift).
const ZONE_MORTE = 0.12;

function appliquerZoneMorte(valeur) {
  return Math.abs(valeur) < ZONE_MORTE ? 0 : valeur;
}

export default class ManettePC {
  constructor() {
    this._index = null;
    this._xPrecedent = false;
    this._selectPrecedent = false;

    window.addEventListener('gamepadconnected', (e) => {
      if (this._index === null) this._index = e.gamepad.index;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      if (this._index === e.gamepad.index) this._index = null;
    });
  }

  // Renvoie la manette suivie, ou en cherche une nouvelle si aucune n'est
  // (encore) connectée.
  _trouverManette() {
    const manettes = navigator.getGamepads ? navigator.getGamepads() : [];

    if (this._index !== null && manettes[this._index]?.connected) {
      return manettes[this._index];
    }

    const trouvee = [...manettes].find((m) => m && m.connected);
    this._index = trouvee ? trouvee.index : null;
    return trouvee ?? null;
  }

  // Renvoie un état structuré et simplifié de la manette pour cette frame.
  getState() {
    const state = {
      connected: false,
      translation: { x: 0, y: 0 },
      rotation: { x: 0, y: 0 },
      vertical: 0,
      boutons: { A: false, B: false, X: false },
      select: false,
    };

    const gp = this._trouverManette();
    if (!gp) {
      this._xPrecedent = false;
      this._selectPrecedent = false;
      return state;
    }

    state.connected = true;

    // Stick gauche : translation (x = latéral, y = avant/arrière), même
    // convention de signe que les sticks WebXR de VRInputManager.
    state.translation.x = appliquerZoneMorte(gp.axes[0] ?? 0);
    state.translation.y = appliquerZoneMorte(gp.axes[1] ?? 0);

    // Stick droit : X = rotation (lacet du rig), Y = altitude
    state.rotation.x = appliquerZoneMorte(gp.axes[2] ?? 0);
    state.vertical = appliquerZoneMorte(gp.axes[3] ?? 0);

    // Gâchettes RT/LT : accélérer / ralentir le temps (comme A/B en VR)
    state.boutons.A = gp.buttons[7]?.pressed || false;
    state.boutons.B = gp.buttons[6]?.pressed || false;

    // Bouton X : bascule la vue détaillée de l'astre suivi (front montant)
    const boutonX = gp.buttons[2];
    state.boutons.X = Boolean(boutonX?.pressed && !this._xPrecedent);
    this._xPrecedent = boutonX?.pressed || false;

    // Bouton A : sélectionne l'astre visé par le réticule (front montant)
    const boutonA = gp.buttons[0];
    state.select = Boolean(boutonA?.pressed && !this._selectPrecedent);
    this._selectPrecedent = boutonA?.pressed || false;

    return state;
  }
}
