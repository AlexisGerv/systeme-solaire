import CeintureAsteroides from './asteroid_belt.js';

// Ceinture de Kuiper : au-delà de Neptune (~30-50 UA).
// Objets glacés plus grands et plus espacés que la ceinture principale.
export default class CeintureKuiper extends CeintureAsteroides {
  constructor(scene) {
    super(scene, {
      nombre: 2000,
<<<<<<< HEAD
      rayonMin: 55,
      rayonMax: 80,
=======
      rayonMin: 80,
      rayonMax: 100,
>>>>>>> a458c6cf3c58e8565c6530246af2ea3e9b86aef4
      epaisseur: 2.0,
      tailleMin: 0.03,
      tailleMax: 0.2,
      vitesseOrbite: 0.0004,
      couleur: 0xc8dde8,
    });
  }
}
