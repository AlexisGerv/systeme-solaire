import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Animation d'entrée VR : effet "vitesse lumière" autour du casque pendant
// que le tutoriel est ouvert. À la validation (gâchette), startSortie()
// déclenche un fade out et tout disparaît.
//
// Architecture :
//  - La géométrie de LIGHTSPEED.glb est rendue via THREE.InstancedMesh :
//    UN seul draw call pour les NB_STREAKS instances, au lieu d'un par
//    clone Object3D (en VR stéréo, chaque draw call compte double).
//  - Géométrie normalisée à ~1 unité de long et recentrée à l'origine
//    pour que la position d'instance soit le centre de la strie. Sans ça,
//    si le GLB exporté de Blender utilise une échelle exotique, les stries
//    sont soit gigantesques (camera dans le mesh) soit invisibles.
//  - Matériau remplacé par un MeshBasicMaterial blanc additif : on force
//    un rendu lumineux indépendant de l'éclairage (le PointLight du Soleil
//    ne touche pas forcément les stries).
//  - Pas de fond / sphère sombre : on laisse voir le système solaire
//    "à travers" les stries — c'est la sensation d'arriver en hyperespace.
//
// Le groupe est attaché à la scène (pas au rig) : on copie chaque frame
// la position du casque pour rester centré, et la rotation du rig (yaw
// seul) pour que le tunnel ne tangue pas avec la tête (confort VR).
const NB_STREAKS = 300;
const LONGUEUR_TUNNEL = 60;
const RAYON_MIN = 1.5;
const RAYON_MAX = 8;
const VITESSE = 100; // unités/sec
const DUREE_FADE = 1.5;

// Audio (hyperspace.mp3) : la portion DEBUT_BOUCLE..FIN_BOUCLE est jouée en
// loop pendant que le tutoriel est ouvert (l'ambiance utile est entre 0:19
// et 1:30) ; à la validation, on saute à TEMPS_SORTIE pour déclencher le
// bruit caractéristique de sortie d'hyperespace.
const DEBUT_BOUCLE = 19;     // 0:19
const FIN_BOUCLE = 90;       // 1:30
const TEMPS_SORTIE = 96;     // 1:36
const VOLUME_AUDIO = 0.6;

export default class HyperEspace {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    // InstancedMesh(es) — un par mesh source du GLB. En général un seul.
    this._instancedMeshes = [];
    this._materiauxStreaks = [];

    // État par instance, stocké en TypedArray (zéro alloc en boucle).
    //   _positions : x, y, z (3 floats par instance)
    //   _scales    : épaisseur (X et Y), longueur (Z) -- 2 floats par instance
    this._positions = new Float32Array(NB_STREAKS * 3);
    this._scales = new Float32Array(NB_STREAKS * 2);

    // Tampons réutilisés à chaque frame.
    this._tmpPos = new THREE.Vector3();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
    this._tmpMatrix = new THREE.Matrix4();

    this._fadeOut = false;
    this._fadeProgress = 0;
    this._modeleCharge = false;

    // Audio (Web Audio API) : un seul AudioBuffer décodé pour les deux
    // phases. Source recréée à chaque transition (les BufferSourceNode
    // ne peuvent être start() qu'une fois). _modeAudio sert à savoir si
    // hide() doit couper le son ou laisser jouer le bruit de sortie.
    this._audioContext = null;
    this._audioBuffer = null;
    this._audioGain = null;
    this._audioSource = null;
    this._modeAudio = null;       // 'boucle' | 'sortie' | null
    this._audioDemandePending = false; // show() appelé avant fin du chargement
    this._chargerAudio('/hyperspace.mp3');

    const loader = new GLTFLoader();
    loader.load(
      '/LIGHTSPEED.glb',
      (gltf) => this._initStreaks(gltf.scene),
      undefined,
      (err) => {
        console.warn('Hyperespace : échec du chargement de LIGHTSPEED.glb', err);
      },
    );
  }

  _initStreaks(baseModel) {
    // 1. Bake les transforms de la hiérarchie GLB dans les world matrix
    //    des meshes pour pouvoir les appliquer aux géométries clonées.
    baseModel.updateMatrixWorld(true);

    // 2. Collecte tous les meshes + bounding box globale (pour orientation
    //    + normalisation de l'échelle).
    const meshes = [];
    const globalBox = new THREE.Box3();
    baseModel.traverse((obj) => {
      if (obj.isMesh) {
        meshes.push(obj);
        if (!obj.geometry.boundingBox) obj.geometry.computeBoundingBox();
        const bb = obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld);
        globalBox.union(bb);
      }
    });

    if (meshes.length === 0) {
      console.warn('Hyperespace : aucun mesh dans LIGHTSPEED.glb');
      return;
    }

    const size = globalBox.getSize(new THREE.Vector3());
    const center = globalBox.getCenter(new THREE.Vector3());

    // Détection axe long (à aligner avec Z, axe du tunnel).
    let appliquerOrientation = null;
    if (size.x > size.y && size.x > size.z) {
      appliquerOrientation = (geo) => geo.rotateY(Math.PI / 2);
    } else if (size.y > size.x && size.y > size.z) {
      appliquerOrientation = (geo) => geo.rotateX(Math.PI / 2);
    }

    // Normalisation : fait tenir la strie dans un cube de 1 unité de côté.
    // Sans ça, un export Blender à l'échelle 100 ferait des stries énormes.
    const dimMax = Math.max(size.x, size.y, size.z) || 1;
    const facteurNormalisation = 1.0 / dimMax;

    // 3. Crée un InstancedMesh par mesh source. Chaque InstancedMesh = 1
    //    seul draw call quel que soit NB_STREAKS, c'est ce qui rend la
    //    boucle tenable en VR stéréo.
    for (const mesh of meshes) {
      const geo = mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      // Recentre puis normalise l'échelle. Doit se faire AVANT l'orientation
      // pour que rotateX/rotateY restent cohérents avec l'axe détecté.
      geo.translate(-center.x, -center.y, -center.z);
      geo.scale(facteurNormalisation, facteurNormalisation, facteurNormalisation);
      if (appliquerOrientation) appliquerOrientation(geo);

      // Matériau forcé : MeshBasicMaterial blanc, additif, transparent.
      // - blanc : couleur visible peu importe l'éclairage (additif noir = invisible)
      // - additif : effet "lumière qui s'additionne" caractéristique
      // - depthWrite false : les stries ne s'occultent pas entre elles
      // On récupère seulement la map texture du GLB si elle existe, pour
      // garder un éventuel motif lumineux dessiné dans Blender.
      const map = mesh.material && mesh.material.map ? mesh.material.map : null;
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 1,
        toneMapped: false, // évite l'écrasement de la luminosité dans le pipeline
      });

      const im = new THREE.InstancedMesh(geo, mat, NB_STREAKS);
      // frustumCulled=false : la bounding box d'un InstancedMesh ne couvre
      // que la géométrie source, pas les positions par instance. Sans ça,
      // tout serait culled dès qu'on s'éloignerait de l'origine du groupe.
      im.frustumCulled = false;
      this.group.add(im);
      this._instancedMeshes.push(im);
      this._materiauxStreaks.push(mat);
    }

    // 4. Initialisation aléatoire + premier upload des matrices.
    for (let i = 0; i < NB_STREAKS; i++) {
      this._respawn(i, true);
    }
    this._appliquerMatrices();
    this._modeleCharge = true;
  }

  // Place (ou replace) la strie i dans le tunnel.
  //   initial=true  -> n'importe où le long de Z (placement de départ)
  //   initial=false -> à l'avant (-LONGUEUR/2), pour le respawn
  _respawn(i, initial = false) {
    const angle = Math.random() * Math.PI * 2;
    const r = THREE.MathUtils.lerp(RAYON_MIN, RAYON_MAX, Math.random());
    this._positions[i * 3]     = Math.cos(angle) * r;
    this._positions[i * 3 + 1] = Math.sin(angle) * r;
    this._positions[i * 3 + 2] = initial
      ? THREE.MathUtils.lerp(-LONGUEUR_TUNNEL / 2, LONGUEUR_TUNNEL / 2, Math.random())
      : -LONGUEUR_TUNNEL / 2;
    // Variation d'épaisseur (X/Y) et de longueur (Z) : Z fortement étiré
    // pour que les stries aient bien l'air de filer plutôt que d'être
    // des cubes/balles.
    this._scales[i * 2]     = THREE.MathUtils.lerp(0.2, 0.5, Math.random());
    this._scales[i * 2 + 1] = THREE.MathUtils.lerp(3, 8, Math.random());
  }

  // Pousse l'état CPU (_positions, _scales) vers les attributs d'instance
  // GPU des InstancedMesh. À appeler après tout déplacement / respawn.
  _appliquerMatrices() {
    if (this._instancedMeshes.length === 0) return;
    for (let i = 0; i < NB_STREAKS; i++) {
      this._tmpPos.set(
        this._positions[i * 3],
        this._positions[i * 3 + 1],
        this._positions[i * 3 + 2],
      );
      this._tmpScale.set(
        this._scales[i * 2],
        this._scales[i * 2],
        this._scales[i * 2 + 1],
      );
      this._tmpMatrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      for (const im of this._instancedMeshes) {
        im.setMatrixAt(i, this._tmpMatrix);
      }
    }
    for (const im of this._instancedMeshes) {
      im.instanceMatrix.needsUpdate = true;
    }
  }

  show() {
    this.group.visible = true;
    this._fadeOut = false;
    this._fadeProgress = 0;
    for (const mat of this._materiauxStreaks) mat.opacity = 1;
    this._modeAudio = 'boucle';
    this._demarrerAudioBoucle();
  }

  startSortie() {
    if (!this.group.visible) return;
    this._fadeOut = true;
    this._fadeProgress = 0;
    this._modeAudio = 'sortie';
    this._demarrerAudioSortie();
  }

  hide() {
    this.group.visible = false;
    this._fadeOut = false;
    this._fadeProgress = 0;
    // Si on est en sortie, on laisse le one-shot finir naturellement
    // (le bruit de sortie dure plus longtemps que le fade visuel).
    // Sinon (boucle interrompue : utilisateur quitte la VR sans valider),
    // on coupe pour ne pas laisser une boucle tourner en arrière-plan.
    if (this._modeAudio === 'boucle') {
      this._stopAudio();
      this._modeAudio = null;
    }
  }

  // Stop forcé de l'audio, peu importe le mode. Appelé par CameraController
  // sur sessionend pour garantir qu'aucun son ne reste actif après la VR.
  arreterAudio() {
    this._stopAudio();
    this._modeAudio = null;
    this._audioDemandePending = false;
  }

  get visible() {
    return this.group.visible;
  }

  update(dt, camera, rig) {
    if (!this.group.visible) return;

    // Centre le tunnel sur le casque (monde) et l'aligne sur le yaw du rig.
    camera.getWorldPosition(this._tmpPos);
    this.group.position.copy(this._tmpPos);
    this.group.quaternion.copy(rig.quaternion);

    if (this._modeleCharge) {
      for (let i = 0; i < NB_STREAKS; i++) {
        this._positions[i * 3 + 2] += VITESSE * dt;
        if (this._positions[i * 3 + 2] > LONGUEUR_TUNNEL / 2) {
          this._respawn(i, false);
        }
      }
      this._appliquerMatrices();
    }

    if (this._fadeOut) {
      this._fadeProgress += dt / DUREE_FADE;
      const opacite = Math.max(0, 1 - this._fadeProgress);
      for (const mat of this._materiauxStreaks) mat.opacity = opacite;
      if (this._fadeProgress >= 1) {
        this.hide();
      }
    }
  }

  // Charge le MP3, décode en AudioBuffer. Si show() a déjà été appelé
  // avant la fin du chargement, on enchaîne directement la lecture.
  async _chargerAudio(url) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const reponse = await fetch(url);
      const buffer = await reponse.arrayBuffer();
      this._audioBuffer = await ctx.decodeAudioData(buffer);

      const gain = ctx.createGain();
      gain.gain.value = VOLUME_AUDIO;
      gain.connect(ctx.destination);

      this._audioContext = ctx;
      this._audioGain = gain;

      // show() a pu être appelé avant la fin du chargement : on rattrape.
      if (this._audioDemandePending && this._modeAudio === 'boucle') {
        this._audioDemandePending = false;
        this._demarrerAudioBoucle();
      }
    } catch (e) {
      console.warn('Hyperespace : audio indisponible', e);
    }
  }

  // Coupe la source en cours (boucle ou one-shot) et la déconnecte.
  // Robuste : un BufferSourceNode déjà arrêté lance une exception sur stop().
  _stopAudio() {
    if (this._audioSource) {
      try { this._audioSource.stop(); } catch (e) { /* déjà arrêté */ }
      try { this._audioSource.disconnect(); } catch (e) { /* déjà déconnecté */ }
      this._audioSource = null;
    }
  }

  // Lance la boucle d'ambiance hyperespace (DEBUT_BOUCLE → FIN_BOUCLE en loop).
  _demarrerAudioBoucle() {
    if (!this._audioContext || !this._audioBuffer) {
      // Pas encore prêt : on rejouera dès que _chargerAudio aura fini.
      this._audioDemandePending = true;
      return;
    }
    this._stopAudio();
    if (this._audioContext.state === 'suspended') {
      this._audioContext.resume().catch(() => {});
    }
    const dur = this._audioBuffer.duration;
    const debut = Math.min(DEBUT_BOUCLE, Math.max(0, dur - 0.1));
    const fin = Math.min(FIN_BOUCLE, dur);
    const src = this._audioContext.createBufferSource();
    src.buffer = this._audioBuffer;
    src.loop = true;
    src.loopStart = debut;
    src.loopEnd = fin;
    src.connect(this._audioGain);
    // Démarre directement à DEBUT_BOUCLE pour éviter les ~19s de silence/intro.
    src.start(0, debut);
    this._audioSource = src;
  }

  // Joue le bruit de sortie d'hyperespace (one-shot à partir de TEMPS_SORTIE).
  _demarrerAudioSortie() {
    if (!this._audioContext || !this._audioBuffer) return;
    this._stopAudio();
    if (this._audioContext.state === 'suspended') {
      this._audioContext.resume().catch(() => {});
    }
    const src = this._audioContext.createBufferSource();
    src.buffer = this._audioBuffer;
    src.loop = false;
    src.connect(this._audioGain);
    // Cap au cas où le fichier serait plus court que prévu.
    const offset = Math.min(TEMPS_SORTIE, Math.max(0, this._audioBuffer.duration - 0.1));
    src.start(0, offset);
    this._audioSource = src;
  }
}
