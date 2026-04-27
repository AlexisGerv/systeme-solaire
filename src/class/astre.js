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
  }

  init() {
    // 1. Le pivot : un Group placé au centre du parent.
    //    On le fera tourner pour produire l'effet d'orbite.
    this.pivot = new THREE.Group();
    this.parent.add(this.pivot);

    // 2. Géométrie + texture
    const geometry = new THREE.SphereGeometry(this.rayon, 64, 64);
    const texture = new THREE.TextureLoader().load(this.texturePath);
    texture.colorSpace = THREE.SRGBColorSpace;

    // 3. Matériau : Basic = brille seul, Standard = réagit aux lumières
    const material = this.emissif
      ? new THREE.MeshBasicMaterial({ map: texture })
      : new THREE.MeshStandardMaterial({ map: texture });

    // 4. Le mesh, décalé du pivot par la distance d'orbite.
    //    Le mesh est exposé en `this.mesh` pour que les sous-classes puissent
    //    l'utiliser (par ex. attacher la Lune au pivot de la Terre).
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.x = this.distanceOrbite;
    this.pivot.add(this.mesh);
  }

  update() {
    this.mesh.rotation.y += this.vitesseRotation; // rotation sur soi
    this.pivot.rotation.y += this.vitesseOrbite;  // orbite (sans effet si vitesseOrbite = 0)
  }
}
