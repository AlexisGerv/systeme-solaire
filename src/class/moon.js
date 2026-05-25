import Astre from './astre.js';

// Lune générique : sert pour la Lune de la Terre comme pour les lunes
// de Jupiter, Saturne, etc. Les valeurs par défaut correspondent à la
// Lune terrestre, donc `new Lune(scene, terre.anchor)` reste valide
// sans devoir passer d'options.
export default class Lune extends Astre {
    constructor(scene, parent, options = {}) {
        super({
            scene,
            parent,
            texturePath: options.texturePath ?? '/2k_moon.jpg',
            rayon: options.rayon ?? 0.27,
            vitesseRotation: options.vitesseRotation ?? 0.0669,
            distanceOrbite: options.distanceOrbite ?? 1.5,
            vitesseOrbite: options.vitesseOrbite ?? 0.0669,
            ombre: options.ombre ?? true,
        });
    }
}
