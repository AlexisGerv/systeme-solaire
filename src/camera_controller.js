import * as THREE from 'three';
import { PORTEE_RAYCASTER } from './class/vr_input_manager.js';

// Gère les déplacements de la caméra (rig), le suivi orbital des astres
// et le raycast de sélection (à la gâchette / au réticule).
// Délégué pour les aspects matériels :
//  - VRInputManager : pour les contrôleurs WebXR, lasers, joysticks et boutons.
//  - RocketAudio : pour le retour sonore de propulsion (Web Audio).
export default class CameraController {
  constructor({
    espace,
    astres,
    detailedView,         // vue détaillée (bouton X après sélection)
    hud,
    tutorial,             // panneau d'aide au début de la session VR
    hyperespace,          // animation d'entrée VR (tunnel d'hyperespace)
    messageBienvenue,     // message de bienvenue à la sortie d'hyperespace
    vrInput,              // VRInputManager
    rocketAudio,          // RocketAudio
  }) {
    this.espace = espace;
    this.astres = astres;
    this.detailedView = detailedView;
    this.hud = hud;
    this.tutorial = tutorial;
    this.hyperespace = hyperespace;
    this.messageBienvenue = messageBienvenue;
    this.vrInput = vrInput;
    this.rocketAudio = rocketAudio;

    // Tous les overlays partagent le contrat update(dt, camera, rig) :
    // update() les itère au lieu d'un bloc if par overlay.
    this._overlays = [tutorial, hyperespace, messageBienvenue, detailedView]
      .filter(Boolean);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = PORTEE_RAYCASTER;
    this.raycaster.layers.enableAll();

    this.trackedAstre = null;
    this._lastTrackedPos = null;
    this._angleOrbite = 0;
    this._distanceOrbite = 0;
    // Yaw de la tête (caméra locale au rig) capturé à la sélection : permet
    // d'orienter le rig pour que la planète reste devant le regard de
    // l'utilisateur, sans verrouiller sa tête ensuite.
    this._headYawOffset = 0;
    this._rotationManuelle = false;

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
      this.espace.rig.position.set(0, 30, 120);
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

    // Portée du raycast : longueur du laser en VR (PORTEE_RAYCASTER).
    this.raycaster.far = PORTEE_RAYCASTER;

    this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const meshes = this.astres.map((a) => a.mesh).filter((m) => m !== undefined);
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      if (object.userData && object.userData.astre) {
        this.trackedAstre = object.userData.astre;
        this._lastTrackedPos = null; // recalculé à la prochaine frame

        // Initialise l'orbite : distance d'observation proportionnelle au
        // rayon de l'astre (et non à la portée du laser, sinon on reste
        // toujours à ~30 unités, énorme pour les petites planètes).
        const rayon = this.trackedAstre.rayon || 1;
        this._distanceOrbite = Math.max(2, rayon * 4 + 1.5);

        // Angle d'orbite basé sur la position actuelle du rig autour de la
        // planète (même paramétrisation que _mettreAJourOrbiteAutomatique :
        // rig = astre + (cos, sin) * distance), pour démarrer l'orbite sur
        // place sans grand balayage autour de l'astre.
        const posAstre = new THREE.Vector3();
        this.trackedAstre.mesh.getWorldPosition(posAstre);
        const posRig = this.espace.rig.position;
        this._angleOrbite = Math.atan2(
          posRig.z - posAstre.z,
          posRig.x - posAstre.x,
        );

        // Capture le yaw actuel de la tête : si l'utilisateur a la tête
        // tournée par rapport au rig au moment de la sélection, on garde ce
        // décalage pour que la planète reste devant son regard.
        const forwardTete = new THREE.Vector3(0, 0, -1)
          .applyQuaternion(this.espace.camera.quaternion);
        this._headYawOffset =
          forwardTete.x * forwardTete.x + forwardTete.z * forwardTete.z > 1e-6
            ? Math.atan2(-forwardTete.x, -forwardTete.z)
            : 0;

        // Pas de texte à la sélection : la vue reste dégagée, le panneau
        // d'info ne s'affiche qu'à la demande (bouton X).
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
    return Math.max(8, distAuCentre * 0.4);
  }

  // Pilotage VR : interprétation de l'état des entrées
  _handleVRInput(dt) {
    this._rotationManuelle = false;
    if (!this.vrInput) return false;

    const vrState = this.vrInput.getState();
    const session = this.espace.renderer.xr.getSession();

    // Si pas de session active ou tutoriel affiché -> no-op
    if (!session || (this.tutorial && this.tutorial.visible)) {
      if (this.rocketAudio) this.rocketAudio.setVolumeCible(0);
      return false;
    }

    this._rotationManuelle = vrState.rotation.x !== 0;

    return this._appliquerPilotage(vrState, dt);
  }

  // Logique de pilotage à partir de l'état structuré des entrées VR
  // { translation: {x,y}, rotation: {x,y}, vertical, boutons: {A,B,X} }
  // (cf. VRInputManager.getState()) :
  // translation/rotation/altitude du rig, timeScale (A/B) et bascule de la
  // vue détaillée (X).
  _appliquerPilotage(state, dt) {
    const { forward: camForward, right: camRight } = this._calculerVecteursCaméra();
    const vitesseTrans = this._calculerVitesseTranslation();
    const rig = this.espace.rig;

    let bougeManuellement = false;

    // Translation horizontale (Stick gauche)
    if (state.translation.x !== 0) {
      rig.position.addScaledVector(camRight, state.translation.x * vitesseTrans * dt);
      bougeManuellement = true;
    }
    if (state.translation.y !== 0) {
      rig.position.addScaledVector(camForward, -state.translation.y * vitesseTrans * dt);
      bougeManuellement = true;
    }

    // Rotation Yaw (Stick droit X)
    if (state.rotation.x !== 0) {
      rig.rotation.y -= state.rotation.x * 1.5 * dt;
    }

    // Altitude (Stick droit Y)
    if (state.vertical !== 0) {
      rig.position.y -= state.vertical * vitesseTrans * dt;
      bougeManuellement = true;
    }

    // Boutons A/B (timeScale)
    if (state.boutons.A) {
      this.timeScale = Math.min(2, this.timeScale + 0.6 * dt);
      if (this.onTimeScaleChange) this.onTimeScaleChange(this.timeScale);
    }
    if (state.boutons.B) {
      this.timeScale = Math.max(0, this.timeScale - 0.6 * dt);
      if (this.onTimeScaleChange) this.onTimeScaleChange(this.timeScale);
    }

    // Bouton X (Vue Détaillée)
    if (state.boutons.X && this.trackedAstre) {
      if (this.detailedView.visible) {
        this.detailedView.hide();
      } else {
        this.detailedView.show(this.trackedAstre);
      }
    }

    // Intensité de poussée pour la fusée (joysticks de translation + vertical)
    const intensitePousseeGauche = Math.hypot(state.translation.x, state.translation.y);
    const intensitePousseeVerticale = Math.abs(state.vertical);
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

    // Le rig pivote en même temps qu'il orbite, sinon la planète défile
    // autour de l'utilisateur qui doit se retourner.
    // Le stick droit garde la priorité : pas de réorientation pendant une
    // rotation manuelle (elle reprend en douceur au relâchement).
    if (!this._rotationManuelle) {
      this._orienterRigVersAstre(posAstre);
    }
  }

  // Fait tourner le yaw du rig pour que la planète reste face à l'utilisateur
  // (en tenant compte du yaw de tête capturé à la sélection).
  _orienterRigVersAstre(posAstre) {
    const rig = this.espace.rig;
    const dirX = posAstre.x - rig.position.x;
    const dirZ = posAstre.z - rig.position.z;
    if (dirX * dirX + dirZ * dirZ < 1e-6) return;

    // Forward du rig = -Z tourné de rotation.y → yaw visé = atan2(-x, -z)
    const capVise = Math.atan2(-dirX, -dirZ) - this._headYawOffset;
    // Interpolation sur le plus court arc (gestion du passage ±180°)
    const delta =
      THREE.MathUtils.euclideanModulo(
        capVise - rig.rotation.y + Math.PI,
        2 * Math.PI,
      ) - Math.PI;
    rig.rotation.y += delta * 0.05;
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
    for (const overlay of this._overlays) {
      overlay.update(dt, this.espace.camera, this.espace.rig);
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
