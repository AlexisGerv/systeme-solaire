import * as THREE from 'three';
import Astre from './astre.js';

// La Lune hérite d'Astre, comme la Terre. La différence : son "parent"
// n'est pas la scène mais le pivot de la Terre, pour qu'elle suive la Terre
// dans son orbite autour du Soleil.
export default class Lune extends Astre {
    constructor(scene, parent) {
        super({
            scene,
            parent,                  // <- transmis à Astre : la Lune s'attache au pivot reçu
            texturePath: '/2k_moon.jpg',
            rayon: 0.27,
            vitesseRotation: 0.0669,  // = vitesseOrbite -> verrouillage gravitationnel
            distanceOrbite: 1.5,      // distance visuelle Lune-Terre
            vitesseOrbite: 0.0669,    // 0.005 × 365.25 / 27.32 jours
            castShadow: true,
        });
    }
}
