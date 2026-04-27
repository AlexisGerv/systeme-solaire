import * as THREE from 'three';

// Classe parente commune à tous les astres (Soleil, Terre, Lune...).
// Elle factorise : création de la sphère, chargement de la texture,
// rotation propre, et système d'orbite via un "pivot".
//
// Idée du pivot pour les orbites :
//  - On crée un THREE.Group centré sur le parent (le Soleil pour la Terre,
//    la Terre pour la Lune).
//  - On décale l'astre de `distanceOrbite` à l'intérieur de ce groupe.
//  - Faire tourner le groupe sur lui-même = faire orbiter l'astre.
//  - Bonus : si on attache la Lune au pivot de la Terre, elle suit la Terre
//    automatiquement quand elle orbite autour du Soleil.
export default class Astre {
  constructor({
    scene,
    parent = scene,            // à quoi attacher le pivot. Par défaut la scène.
    texturePath,               // ex: '/2k_earth_daymap.jpg'
    rayon = 1,
    vitesseRotation = 0.005,   // rotation sur son propre axe
    distanceOrbite = 0,        // 0 = pas d'orbite (cas du Soleil au centre)
    vitesseOrbite = 0,
    emissif = false,           // true = brille seul (Soleil) ; false = éclairé (Terre, Lune)
    inclinaison = 0,           // inclinaison de l'axe en degrés (Terre : 23.5°)
  }) {
    // On garde les paramètres pour les utiliser dans init() et update()
    this.scene = scene;
    this.parent = parent;
    this.texturePath = texturePath;
    this.rayon = rayon;
    this.vitesseRotation = vitesseRotation;
    this.distanceOrbite = distanceOrbite;
    this.vitesseOrbite = vitesseOrbite;
    this.emissif = emissif;
    this.inclinaison = inclinaison;
  }

  init() {
    // Hiérarchie : parent -> pivot (tourne pour l'orbite)
    //                      -> anchor (décalé à distanceOrbite, NE TOURNE PAS)
    //                                 -> mesh (tourne sur son axe propre)
    //
    // Pourquoi cet "anchor" ? Pour pouvoir y accrocher des satellites
    // (ex: la Lune sur la Terre) à la BONNE position, sans qu'ils héritent
    // de la rotation propre du mesh.

    // 1. Le pivot : Group au centre du parent, tourne pour produire l'orbite.
    this.pivot = new THREE.Group();
    this.parent.add(this.pivot);

    // 2. L'anchor : positionné là où se trouve l'astre.
    //    Sert de point d'ancrage pour les satellites (lunes, anneaux, etc.).
    //    Volontairement PAS incliné pour que les satellites orbitent dans le
    //    plan de l'écliptique, pas dans le plan équatorial de l'astre.
    this.anchor = new THREE.Group();
    this.anchor.position.x = this.distanceOrbite;
    this.pivot.add(this.anchor);

    // 3. Le tilt : groupe figé à l'angle d'inclinaison.
    //    Le mesh tourne sur SON axe Y local, qui est désormais incliné en
    //    monde -> l'axe Nord-Sud reste pointé dans la même direction.
    this.tilt = new THREE.Group();
    this.tilt.rotation.z = THREE.MathUtils.degToRad(this.inclinaison);
    this.anchor.add(this.tilt);

    // 4. Géométrie + texture
    const geometry = new THREE.SphereGeometry(this.rayon, 64, 64);
    const texture = new THREE.TextureLoader().load(this.texturePath);
    texture.colorSpace = THREE.SRGBColorSpace;

    // 5. Matériau : Basic = brille seul, Standard = réagit aux lumières
    const material = this.emissif
      ? new THREE.MeshBasicMaterial({ map: texture })
      : new THREE.MeshStandardMaterial({ map: texture });

    // 6. Le mesh : ajouté au tilt (à la bonne position et incliné).
    //    Sa rotation propre se fait autour de son axe Y local incliné.
    this.mesh = new THREE.Mesh(geometry, material);

    // Ombres : seuls les astres NON émissifs participent.
    //  - castShadow    : l'astre projette une ombre sur les autres
    //  - receiveShadow : la surface peut être assombrie par d'autres astres
    if (!this.emissif) {
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = true;
    }

    this.tilt.add(this.mesh);
  }

  update() {
    this.mesh.rotation.y += this.vitesseRotation; // rotation sur soi
    this.pivot.rotation.y += this.vitesseOrbite;  // orbite (sans effet si vitesseOrbite = 0)
  }
}
