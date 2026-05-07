import * as THREE from 'three';

// Gère tout ce qui concerne la caméra et les manettes VR :
//  - création des contrôleurs WebXR (avec rayon laser visible, portée courte)
//  - sélection d'un astre par raycast au trigger (portée 30 unités)
//  - pilotage 6DoF "vaisseau spatial" aux deux joysticks
//  - boutons A / B pour accélérer / ralentir le temps
//  - suivi (orbital) du rig caméra autour de l'astre sélectionné
//
// Le rig appartient à Espace ; on s'y attache pour que les manettes
// suivent la caméra lors d'un déplacement.
//
// Mapping des contrôles VR (en session XR uniquement) :
//   Stick gauche X  -> translation latérale (gauche/droite)
//   Stick gauche Y  -> avancer / reculer (selon la direction du regard)
//   Stick droit  X  -> rotation yaw (faire pivoter le rig autour de l'axe Y)
//   Stick droit  Y  -> monter / descendre
//   Bouton A (droit) -> timeScale +
//   Bouton B (droit) -> timeScale -
//   Gâchette        -> sélection au laser (raycast 30u)
const PORTEE_RAYCASTER = 30;
const DEADZONE_STICK = 0.15;

export default class CameraController {
  constructor(espace, astres, infoBubble, hud, tutorial) {
    this.espace = espace;
    this.astres = astres;
    this.infoBubble = infoBubble;
    this.hud = hud;
    // Panneau d'aide affiché au début de chaque session VR. Tant qu'il
    // est visible, _handleVRInput et _onSelect court-circuitent : pas
    // de mouvement ni de sélection avant que l'utilisateur ait validé
    // d'un coup de gâchette.
    this.tutorial = tutorial;
    this.raycaster = new THREE.Raycaster();
    // Portée du raycaster : le but est de forcer l'utilisateur à
    // s'approcher d'une planète pour pouvoir la sélectionner.
    this.raycaster.far = PORTEE_RAYCASTER;

    this.trackedAstre = null;
    // Position monde de l'astre suivi à la frame précédente :
    // sert à appliquer le déplacement orbital de la planète au rig
    // (on reste "en orbite" même quand la planète bouge autour du Soleil).
    this._lastTrackedPos = null;
    // Phase d'approche initiale après un clic : on lerp vers l'astre.
    // Désactivée dès qu'on est suffisamment proche, ou si l'utilisateur
    // commence à piloter au stick (priorité au pilotage manuel).
    this._approcheInitiale = false;
    // Direction du regard (XZ, normalisée) capturée à l'instant du clic.
    // La cible d'approche est alignée sur cet axe pour qu'à l'arrivée
    // la planète soit pile devant le casque, sans rotation de tête.
    this._dirApproche = null;

    this.timeScale = 1;
    // Callback optionnel pour synchroniser une UI externe (slider HTML)
    // quand le joystick modifie timeScale.
    this.onTimeScaleChange = null;

    // Horloge pour avoir un dt réel (mouvement frame-rate independent).
    this._horloge = new THREE.Clock();

    // Audio "fusée" via Web Audio API : on charge le clip dans un buffer
    // puis on joue UNIQUEMENT la portion sustain en boucle (loopStart
    // /loopEnd), sinon on entendrait l'attaque et la décroissance du
    // décollage à chaque rebouclage. Un GainNode contrôle le volume
    // (0 quand l'utilisateur n'appuie sur aucun stick).
    this._audioContext = null;
    this._audioGain = null;
    this._audioSource = null;
    this._volumeFuseeCible = 0;
    this._chargerAudioFusee('/jci21-rocket-launch-sfx-253937.mp3');

    this._initControllers();
    this._initTutorialEvents();
  }

  // Affiche le tutoriel au début de chaque session VR et le cache à la fin.
  // Le `sessionend` est utile au cas où l'utilisateur quitterait la VR
  // sans avoir validé : la prochaine entrée doit repartir du tutoriel.
  _initTutorialEvents() {
    if (!this.tutorial) return;
    const xr = this.espace.renderer.xr;
    xr.addEventListener('sessionstart', () => {
      // Téléporte le rig juste à l'extérieur de la ceinture de Kuiper
      // (rayon 80-100) pour que l'utilisateur "arrive" dans le système
      // solaire et le découvre de loin. La caméra étant écrasée par la
      // pose du casque en XR, on doit déplacer le rig (pas la caméra).
      // L'orientation par défaut du casque est -Z, donc avec un rig à
      // z=+120 le regard pointe naturellement vers le Soleil au centre.
      this.espace.rig.position.set(0, 30, 120);
      this.espace.rig.rotation.set(0, 0, 0);
      // Réinitialise aussi l'état de suivi : pas d'astre tracké au
      // démarrage, sinon le rig serait happé vers la dernière sélection.
      this.trackedAstre = null;
      this._lastTrackedPos = null;
      this._approcheInitiale = false;
      this._dirApproche = null;
      this.tutorial.show();
    });
    xr.addEventListener('sessionend', () => this.tutorial.hide());
  }

  _initControllers() {
    const c1 = this.espace.renderer.xr.getController(0);
    const c2 = this.espace.renderer.xr.getController(1);

    // Laser raccourci à la portée du raycaster pour que l'utilisateur
    // voie immédiatement jusqu'où il peut sélectionner.
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
      // Attaché au rig (et non à la scène) pour que les manettes suivent
      // la caméra quand on téléporte le rig vers une planète.
      this.espace.rig.add(controller);
      controller.addEventListener('select', (e) => this._onSelect(e));
    }
  }

  _onSelect(event) {
    // Si le tutoriel est visible, la première gâchette sert juste à le
    // fermer : on ne fait pas de raycast, et on ne change pas trackedAstre.
    if (this.tutorial && this.tutorial.visible) {
      this.tutorial.hide();
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
        this._approcheInitiale = true;

        // Snapshot de la direction du regard (XZ uniquement) : sert à
        // calculer la cible d'approche pour que la planète atterrisse
        // pile dans l'axe du casque. On gèle la valeur ici pour que
        // l'animation reste stable même si l'utilisateur bouge la tête
        // ou tourne au stick pendant le déplacement.
        const dir = new THREE.Vector3();
        this.espace.camera.getWorldDirection(dir);
        dir.y = 0;
        if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
        else dir.normalize();
        this._dirApproche = dir;

        this.infoBubble.show(this.trackedAstre);
        if (this.hud) this.hud.setOrbit(this.trackedAstre.nom);

        // Flash rouge sur la ligne pour confirmer la sélection.
        const line = controller.getObjectByName('line');
        if (line) line.material.color.set(0xff0000);
        setTimeout(() => {
          if (line) line.material.color.set(0x00ff00);
        }, 300);
      }
    } else {
      // Clic dans le vide (ou hors portée du raycaster) = annuler le tracking.
      this.trackedAstre = null;
      this._lastTrackedPos = null;
      this._approcheInitiale = false;
      this._dirApproche = null;
      this.infoBubble.hide();
      if (this.hud) this.hud.setOrbit(null);
    }
  }

  // Pilotage VR aux deux joysticks + boutons A/B.
  // Hors session XR : no-op (le slider HTML reste la seule entrée).
  // Retourne true si l'utilisateur a donné une input de mouvement
  // (translation ou altitude), pour que update() puisse savoir si
  // le pilotage manuel doit primer sur l'approche automatique.
  _handleVRInput(dt) {
    // Volume fusée remis à zéro à chaque frame ; on l'accumule selon
    // l'intensité des sticks de translation plus bas.
    this._volumeFuseeCible = 0;

    const session = this.espace.renderer.xr.getSession();
    if (!session) return false;

    // Tutoriel d'accueil affiché : on bloque tout pilotage et timeScale
    // tant que l'utilisateur n'a pas validé à la gâchette.
    if (this.tutorial && this.tutorial.visible) return false;

    const camera = this.espace.camera;
    const rig = this.espace.rig;

    // Vecteurs "où regarde le casque" en coordonnées monde.
    const camForward = new THREE.Vector3();
    camera.getWorldDirection(camForward);

    // Right = forward × up. On garde un horizon pour que l'effet de strafe
    // reste lisible quand on regarde vers le haut/bas.
    const camRight = new THREE.Vector3();
    camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0));
    if (camRight.lengthSq() < 1e-6) {
      // Cas limite : le casque regarde quasi droit vers le haut/bas.
      camRight.set(1, 0, 0);
    } else {
      camRight.normalize();
    }

    // Vitesse de translation : adaptative selon la distance au Soleil
    // pour ne pas mettre une éternité à atteindre Neptune (~150u).
    const distAuCentre = rig.position.length();
    const vitesseTrans = Math.max(8, distAuCentre * 0.4); // unités/sec
    const vitesseRot = 1.5; // rad/sec

    let bougeManuellement = false;
    // Accumulé sur les axes de translation des deux sticks (XY gauche + Y droit).
    let intensitePoussee = 0;

    for (const source of session.inputSources) {
      if (!source.gamepad) continue;
      const gp = source.gamepad;
      const hand = source.handedness; // 'left', 'right', 'none'

      // Sticks : axes 2 (X) et 3 (Y) sur le thumbstick principal.
      const xRaw = gp.axes.length >= 4 ? gp.axes[2] : 0;
      const yRaw = gp.axes.length >= 4 ? gp.axes[3] : 0;
      const xAxis = Math.abs(xRaw) > DEADZONE_STICK ? xRaw : 0;
      const yAxis = Math.abs(yRaw) > DEADZONE_STICK ? yRaw : 0;

      if (hand === 'left') {
        // Translation latérale + avant/arrière dans le plan du regard.
        if (xAxis !== 0) {
          rig.position.addScaledVector(camRight, xAxis * vitesseTrans * dt);
          bougeManuellement = true;
        }
        if (yAxis !== 0) {
          // Stick poussé en avant => yAxis négatif => on avance.
          rig.position.addScaledVector(camForward, -yAxis * vitesseTrans * dt);
          bougeManuellement = true;
        }
        // Magnitude vectorielle du stick gauche (pour le volume fusée).
        intensitePoussee += Math.hypot(xAxis, yAxis);
      } else if (hand === 'right') {
        // Yaw : on tourne le rig (et donc tout le repère utilisateur).
        if (xAxis !== 0) {
          rig.rotation.y -= xAxis * vitesseRot * dt;
        }
        // Altitude : translation verticale dans le repère monde.
        if (yAxis !== 0) {
          rig.position.y -= yAxis * vitesseTrans * dt;
          bougeManuellement = true;
        }
        // Seul l'axe vertical compte comme poussée (le yaw ne fait pas avancer).
        intensitePoussee += Math.abs(yAxis);

        // Boutons A (index 4) et B (index 5) : timeScale ± progressif.
        // Tenir le bouton fait varier en continu (~0.6 unité par seconde).
        const boutonA = gp.buttons[4]?.pressed;
        const boutonB = gp.buttons[5]?.pressed;
        if (boutonA) {
          this.timeScale = Math.min(2, this.timeScale + 0.6 * dt);
          if (this.onTimeScaleChange) this.onTimeScaleChange(this.timeScale);
        }
        if (boutonB) {
          this.timeScale = Math.max(0, this.timeScale - 0.6 * dt);
          if (this.onTimeScaleChange) this.onTimeScaleChange(this.timeScale);
        }
      }
    }

    // Plafonné à 1 : pousser deux sticks à fond ne dépasse pas 60% du volume.
    this._volumeFuseeCible = Math.min(1, intensitePoussee) * 0.6;

    return bougeManuellement;
  }

  // Charge le MP3, décode en AudioBuffer, et démarre une source en boucle
  // sur la portion sustain. Le gain reste à 0 jusqu'à ce que l'utilisateur
  // pousse un stick. Tout est asynchrone : si la décode échoue ou prend
  // du temps, l'audio sera simplement silencieux jusqu'à ce que ce soit prêt.
  async _chargerAudioFusee(url) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const reponse = await fetch(url);
      const buffer = await reponse.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(buffer);

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      // Boucle sur la zone "sustain" : on évite le whoosh d'attaque
      // (premiers 20% du clip) et la queue qui s'éteint (derniers 30%).
      // Tu peux ajuster ces ratios si la portion choisie sonne mal.
      const dur = audioBuffer.duration;
      source.loopStart = dur * 0.2;
      source.loopEnd = dur * 0.7;
      // On démarre la lecture directement dans la zone de loop : pas
      // d'attaque audible au premier coup de stick.
      source.connect(gain);
      source.start(0, source.loopStart);

      this._audioContext = ctx;
      this._audioGain = gain;
      this._audioSource = source;
    } catch (e) {
      console.warn('Audio fusée indisponible :', e);
    }
  }

  // Lerp doux du volume vers la cible. Reprend l'AudioContext si le
  // navigateur l'a suspendu (politique d'autoplay) — ça finit par marcher
  // dès qu'un geste utilisateur a eu lieu (clic VR, trigger, etc.).
  _updateAudioFusee() {
    if (!this._audioGain || !this._audioContext) return;

    if (this._audioContext.state === 'suspended') {
      this._audioContext.resume().catch(() => {});
    }

    const v = this._audioGain.gain.value;
    const cible = this._volumeFuseeCible;
    // Lissage exponentiel (~150ms à 60fps) : pas de pop quand on lâche le stick.
    const nouveau = v + (cible - v) * 0.15;
    this._audioGain.gain.value = Math.max(0, Math.min(1, nouveau));
  }

  setTimeScale(v) {
    this.timeScale = v;
  }

  // À appeler une fois par frame depuis la boucle d'animation.
  update() {
    const dt = Math.min(0.1, this._horloge.getDelta()); // clamp anti-pic

    const bougeManuellement = this._handleVRInput(dt);
    this._updateAudioFusee();

    // Tutoriel : repositionné chaque frame devant la caméra. Le Sprite
    // étant déjà un billboard, il reste face à l'utilisateur.
    if (this.tutorial) this.tutorial.update(this.espace.camera);

    if (this.trackedAstre) {
      const posAstre = new THREE.Vector3();
      this.trackedAstre.mesh.getWorldPosition(posAstre);

      // 1) Suivi orbital : on applique au rig le déplacement de l'astre
      //    entre la frame précédente et cette frame. Le rig reste donc
      //    à sa position relative par rapport à la planète, même quand
      //    elle continue son orbite autour du Soleil.
      if (this._lastTrackedPos) {
        const delta = posAstre.clone().sub(this._lastTrackedPos);
        this.espace.rig.position.add(delta);
      }
      this._lastTrackedPos = posAstre.clone();

      // 2) Approche initiale : juste après un clic, on glisse en lerp
      //    vers une position d'observation décalée. La cible est calculée
      //    le long de la direction du regard au moment du clic
      //    (cf. _dirApproche) : à l'arrivée, la planète est pile devant
      //    le casque sans avoir à tourner la tête.
      //    L'effet se coupe dès qu'on est arrivé OU dès que l'utilisateur
      //    prend la main au stick gauche.
      if (this._approcheInitiale && !bougeManuellement && this._dirApproche) {
        const decalage = Math.max(10, this.trackedAstre.rayon * 3);
        // cible = planet - decalage * dirApproche
        // À cible, en regardant dans dirApproche, la planète est à 'decalage' devant.
        const cible = posAstre.clone().addScaledVector(this._dirApproche, -decalage);
        this.espace.rig.position.lerp(cible, 0.05);
        if (this.espace.rig.position.distanceTo(cible) < 1) {
          this._approcheInitiale = false;
        }
      } else if (bougeManuellement) {
        // L'utilisateur pilote : on coupe l'approche, mais on garde
        // l'astre en suivi orbital (statut "En orbite autour de X" maintenu).
        this._approcheInitiale = false;
      }
    }
  }
}
