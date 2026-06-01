import * as THREE from 'three';
import { ECHELLE } from './class/astre.js';

// Gère les déplacements de la caméra (rig), le suivi orbital des astres
// et le raycast de sélection (à la gâchette).
// Délégué pour les aspects matériels :
//  - VRInputManager : pour les contrôleurs WebXR, lasers, joysticks et boutons.
//  - RocketAudio : pour le retour sonore de propulsion (Web Audio).
const PORTEE_RAYCASTER = 30 * ECHELLE;

export default class CameraController {
  constructor(espace, astres, infoBubble, detailedView, hud, tutorial, hyperespace, messageBienvenue, vrInput, rocketAudio) {
    this.espace = espace;
    this.astres = astres;
    this.infoBubble = infoBubble;
    this.detailedView = detailedView;
    this.hud = hud;
    
    // Panneau d'aide au début de la session VR
    this.tutorial = tutorial;
    // Animation d'entrée VR (tunnel d'hyperespace)
    this.hyperespace = hyperespace;
    // Message de bienvenue
    this.messageBienvenue = messageBienvenue;

    // Nouvelles classes injectées pour la factorisation
    this.vrInput = vrInput;
    this.rocketAudio = rocketAudio;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = PORTEE_RAYCASTER;
    this.raycaster.layers.enableAll();

    this.trackedAstre = null;
    this._lastTrackedPos = null;
    this._angleOrbite = 0;
    this._distanceOrbite = 0;

    this.timeScale = 1;
    this.onTimeScaleChange = null;
    this._horloge = new THREE.Clock();

    // Liaison du callback de sélection
    if (this.vrInput) {
      this.vrInput.onSelect = (event) => this._onSelect(event);
    }

    this._initTutorialEvents();
  }

  // Affiche le tutoriel au début de chaque session VR et le cache à la fin.
  _initTutorialEvents() {
    if (!this.tutorial) return;
    const xr = this.espace.renderer.xr;
    xr.addEventListener('sessionstart', () => {
      // Téléporte le rig juste à l'extérieur de la ceinture de Kuiper
      this.espace.rig.position.set(0, 30 * ECHELLE, 120 * ECHELLE);
      this.espace.rig.rotation.set(0, 0, 0);
      
      this.trackedAstre = null;
      this._lastTrackedPos = null;
      this.tutorial.show();
      
      if (this.hyperespace) this.hyperespace.show();
      if (this.messageBienvenue) this.messageBienvenue.hide();
    });

    xr.addEventListener('sessionend', () => {
      this.tutorial.hide();
      if (this.hyperespace) {
        this.hyperespace.hide();
        this.hyperespace.arreterAudio();
      }
      if (this.messageBienvenue) this.messageBienvenue.hide();
    });
  }

  _onSelect(event) {
    // Si le tutoriel est visible, la première gâchette sert juste à le fermer
    if (this.tutorial && this.tutorial.visible) {
      this.tutorial.hide();
      if (this.hyperespace) this.hyperespace.startSortie();
      if (this.messageBienvenue) this.messageBienvenue.show();
      return;
    }

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
        this._lastTrackedPos = null; // recalculé à la prochaine frame

        const posAstre = new THREE.Vector3();
        this.trackedAstre.mesh.getWorldPosition(posAstre);
        const posRig = this.espace.rig.position;

        // Distance XZ réelle au moment du tir, au minimum 2× le rayon
        const dxz = Math.sqrt(
          (posRig.x - posAstre.x) ** 2 + (posRig.z - posAstre.z) ** 2
        );
        this._distanceOrbite = Math.max(dxz, this.trackedAstre.rayon * 2);

        // Angle depuis la planète vers le rig (convention cos→X, sin→Z)
        const dirVersRig = posRig.clone().sub(posAstre);
        this._angleOrbite = Math.atan2(dirVersRig.z, dirVersRig.x);

        this.infoBubble.show(this.trackedAstre);
        this.detailedView.hide();
        if (this.hud) this.hud.setOrbit(this.trackedAstre.nom);

        // Flash rouge de confirmation sur le laser
        if (this.vrInput) {
          this.vrInput.flashLaser(controller);
        }
      }
    } else {
      // Clic dans le vide = annuler le tracking
      this.trackedAstre = null;
      this._lastTrackedPos = null;
      this._angleOrbite = 0;
      this._distanceOrbite = 0;
      this.infoBubble.hide();
      this.detailedView.hide();
      if (this.hud) this.hud.setOrbit(null);
    }
  }

  // Calcule les vecteurs forward et right (droite) de la caméra en coordonnées monde
  _calculerVecteursCaméra() {
    const camera = this.espace.camera;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
    if (right.lengthSq() < 1e-6) {
      right.set(1, 0, 0);
    } else {
      right.normalize();
    }

    return { forward, right };
  }

  // Vitesse de translation adaptée à la distance au Soleil
  _calculerVitesseTranslation() {
    const distAuCentre = this.espace.rig.position.length();
    return Math.max(8 * ECHELLE, distAuCentre * 0.4);
  }

  // Pilotage VR : interprétation de l'état des entrées
  _handleVRInput(dt) {
    if (!this.vrInput) return false;

    const vrState = this.vrInput.getState();
    const session = this.espace.renderer.xr.getSession();

    // Si pas de session active ou tutoriel affiché -> no-op
    if (!session || (this.tutorial && this.tutorial.visible)) {
      if (this.rocketAudio) this.rocketAudio.setVolumeCible(0);
      return false;
    }

    const { forward: camForward, right: camRight } = this._calculerVecteursCaméra();
    const vitesseTrans = this._calculerVitesseTranslation();
    const rig = this.espace.rig;

    let bougeManuellement = false;

    // Translation horizontale (Stick gauche)
    if (vrState.translation.x !== 0) {
      rig.position.addScaledVector(camRight, vrState.translation.x * vitesseTrans * dt);
      bougeManuellement = true;
    }
    if (vrState.translation.y !== 0) {
      rig.position.addScaledVector(camForward, -vrState.translation.y * vitesseTrans * dt);
      bougeManuellement = true;
    }

    // Rotation Yaw (Stick droit X)
    if (vrState.rotation.x !== 0) {
      rig.rotation.y -= vrState.rotation.x * 1.5 * dt;
    }

    // Altitude (Stick droit Y)
    if (vrState.vertical !== 0) {
      rig.position.y -= vrState.vertical * vitesseTrans * dt;
      bougeManuellement = true;
    }

    // Boutons A/B (timeScale)
    if (vrState.boutons.A) {
      this.timeScale = Math.min(2, this.timeScale + 0.6 * dt);
      if (this.onTimeScaleChange) this.onTimeScaleChange(this.timeScale);
    }
    if (vrState.boutons.B) {
      this.timeScale = Math.max(0, this.timeScale - 0.6 * dt);
      if (this.onTimeScaleChange) this.onTimeScaleChange(this.timeScale);
    }

    // Bouton X (Vue Détaillée)
    if (vrState.boutons.X && this.trackedAstre) {
      if (this.detailedView.visible) {
        this.detailedView.hide();
      } else {
        this.detailedView.show(this.trackedAstre);
      }
    }

    // Intensité de poussée pour la fusée (joysticks de translation + vertical)
    const intensitePousseeGauche = Math.hypot(vrState.translation.x, vrState.translation.y);
    const intensitePousseeVerticale = Math.abs(vrState.vertical);
    const intensitePoussee = Math.min(1, intensitePousseeGauche + intensitePousseeVerticale);

    if (this.rocketAudio) {
      this.rocketAudio.setVolumeCible(intensitePoussee * 0.6);
    }

    return bougeManuellement;
  }

  // Applique au rig le déplacement orbital de la planète
  _mettreAJourSuiviOrbital(posAstreActuelle) {
    if (this._lastTrackedPos) {
      const delta = posAstreActuelle.clone().sub(this._lastTrackedPos);
      this.espace.rig.position.add(delta);
    }
    this._lastTrackedPos = posAstreActuelle.clone();
  }

  // Quand l'utilisateur ne pilote pas manuellement, la caméra orbite lentement autour de la planète
  _mettreAJourOrbiteAutomatique(posAstre, bougeManuellement, dt) {
    if (bougeManuellement || this._distanceOrbite <= 0) {
      return;
    }

    this._angleOrbite += 0.3 * dt;

    const posRig = this.espace.rig.position;
    const decalageX = Math.cos(this._angleOrbite) * this._distanceOrbite;
    const decalageZ = Math.sin(this._angleOrbite) * this._distanceOrbite;

    const cibleOrbite = new THREE.Vector3(
      posAstre.x + decalageX,
      posRig.y,
      posAstre.z + decalageZ
    );

    this.espace.rig.position.lerp(cibleOrbite, 0.05);
  }

  setTimeScale(v) {
    this.timeScale = v;
  }

  update() {
    const dt = Math.min(0.1, this._horloge.getDelta());

    const bougeManuellement = this._handleVRInput(dt);

    if (this.rocketAudio) {
      this.rocketAudio.update();
    }

    // Mise à jour des overlays
    if (this.tutorial) this.tutorial.update(this.espace.camera);
    if (this.hyperespace) {
      this.hyperespace.update(dt, this.espace.camera, this.espace.rig);
    }
    if (this.messageBienvenue) {
      this.messageBienvenue.update(dt, this.espace.camera);
    }
    if (this.detailedView) {
      this.detailedView.update();
    }

    // Suivi et orbite
    if (this.trackedAstre) {
      const posAstre = new THREE.Vector3();
      this.trackedAstre.mesh.getWorldPosition(posAstre);

      this._mettreAJourSuiviOrbital(posAstre);
      this._mettreAJourOrbiteAutomatique(posAstre, bougeManuellement, dt);
    }
  }
}
