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
            vitesseRotation: 0.01,
            distanceOrbite: 1.5,     // distance Lune-Terre
            vitesseOrbite: 0.03,     // la Lune orbite plus vite que la Terre
        });
    }
}
