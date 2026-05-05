import * as THREE from 'three';
import Astre from './astre.js';

export default class Terre extends Astre {
    constructor(scene) {
        super({
            scene,
            texturePath: '/2k_earth_daymap.jpg',
            rayon: 1,
            vitesseRotation: 0.01,
            distanceOrbite: 8.5,
            vitesseOrbite: 0.005,      // 365.25 jours
            inclinaison: 23.5,
            nom: "Terre",
            info: "Notre planète bleue."
        });
    }
    
}