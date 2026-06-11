import * as THREE from 'three';

// Poussière spatiale : nuage de points qui suit le joueur pour donner un
// repère visuel pendant les déplacements. Sans particules proches, on
// n'a aucune sensation de mouvement même à 20 u/s en plein espace
// (les astres sont trop loin pour bouger sensiblement frame à frame).
//
// Implémentation : THREE.Points dont les positions sont stockées en
// world space. À chaque frame, on respawn les particules sorties de la
// sphère autour du joueur, ce qui crée un flux infini : on traverse les
// particules existantes, et celles qui passent derrière nous réapparaissent
// devant. Coût négligeable (1500 points, 1 draw call, pas d'ombres).
export default class PoussiereSpatiale {
  constructor(scene, { nombre = 2000, rayon = 50 } = {}) {
    this.nombre = nombre;
    this.rayon = rayon;
    this.rayonCarre = rayon * rayon;

    // Buffer xyz : 3 floats par particule. Initialisation dans une sphère
    // centrée à l'origine ; le premier update() respawnera tout autour
    // du joueur si celui-ci est ailleurs (ex : dans la vue d'arrivée).
    const positions = new Float32Array(nombre * 3);
    for (let i = 0; i < nombre; i++) {
      const v = this._pointDansSphere();
      positions[i * 3]     = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      sizeAttenuation: true, // les particules proches paraissent plus grosses
      transparent: true,
      opacity: 0.55,
      depthWrite: false,     // évite de masquer les astres derrière
    });

    this.points = new THREE.Points(geometry, material);
    scene.add(this.points);
  }

  // Point uniformément distribué dans une sphère de rayon `this.rayon`.
  // Méthode du rejet : on tire dans le cube unité jusqu'à tomber dans la
  // sphère. Évite la concentration aux pôles d'un sampling sphérique naïf.
  _pointDansSphere() {
    const v = new THREE.Vector3();
    do {
      v.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      );
    } while (v.lengthSq() > 1);
    return v.multiplyScalar(this.rayon);
  }

  // À appeler chaque frame avec la position monde du joueur (caméra ou rig).
  // Toute particule sortie de la sphère est respawnée à l'intérieur, ce qui
  // entretient la "soupe" de poussière autour du joueur.
  update(positionJoueur) {
    const positions = this.points.geometry.attributes.position.array;
    const px = positionJoueur.x, py = positionJoueur.y, pz = positionJoueur.z;
    let dirty = false;

    for (let i = 0; i < this.nombre; i++) {
      const dx = positions[i * 3]     - px;
      const dy = positions[i * 3 + 1] - py;
      const dz = positions[i * 3 + 2] - pz;
      if (dx * dx + dy * dy + dz * dz > this.rayonCarre) {
        const v = this._pointDansSphere();
        positions[i * 3]     = px + v.x;
        positions[i * 3 + 1] = py + v.y;
        positions[i * 3 + 2] = pz + v.z;
        dirty = true;
      }
    }

    if (dirty) this.points.geometry.attributes.position.needsUpdate = true;
  }
}
