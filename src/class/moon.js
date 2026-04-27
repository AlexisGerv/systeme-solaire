import * as THREE from 'three';
import Astre from './astre.js';

// La Lune n'hérite PAS d'Astre : elle est plus simple, pas besoin de pivot ni d'orbite.
export default class Lune extends Astre {
    constructor(scene) {
        super({
            scene,
            texturePath: '/2k_moon.jpg',
            rayon: 0.27,
            vitesseRotation: 0.01
        });
    }
}
