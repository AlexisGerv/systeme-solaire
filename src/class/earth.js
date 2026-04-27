import * as THREE from 'three';
import Astre from './astre.js';

// La Terre hérite d'Astre : elle n'a presque plus rien à coder elle-même.
export default class Terre extends Astre {
    constructor(scene) {
        super({
            scene,
            texturePath: '/2k_earth_daymap.jpg',
            rayon: 1,
            vitesseRotation: 0.01,
            distanceOrbite: 5,
            vitesseOrbite: 0.005
        });
    }
    
}