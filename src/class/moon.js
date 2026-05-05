import Astre from './astre.js';

// Lune générique : sert pour la Lune de la Terre comme pour les lunes
// de Jupiter, Saturne, etc. Les valeurs par défaut correspondent à la
// Lune terrestre, donc `new Lune(scene, terre.anchor)` reste valide
// sans devoir passer d'options.
export default class Lune extends Astre {
    constructor(scene, parent, options = {}) {
        super({
            scene,
<<<<<<< HEAD
            parent,
            texturePath: options.texturePath ?? '/2k_moon.jpg',
            rayon: options.rayon ?? 0.27,
            vitesseRotation: options.vitesseRotation ?? 0.0669,
            distanceOrbite: options.distanceOrbite ?? 1.5,
            vitesseOrbite: options.vitesseOrbite ?? 0.0669,
            ombre: options.ombre ?? true,
=======
            parent,                  // <- transmis à Astre : la Lune s'attache au pivot reçu
            texturePath: '/2k_moon.jpg',
            rayon: 0.27,
            vitesseRotation: 0.0669,  // = vitesseOrbite -> verrouillage gravitationnel
            distanceOrbite: 1.5,      // distance visuelle Lune-Terre
            vitesseOrbite: 0.0669,    // 0.005 × 365.25 / 27.32 jours
            castShadow: true,
>>>>>>> a458c6cf3c58e8565c6530246af2ea3e9b86aef4
        });
    }
}
