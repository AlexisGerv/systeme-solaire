import BoucleAudio from './boucle_audio.js';

// Musique d'ambiance jouée en boucle à faible volume. Ne démarre pas seule :
// demarrer() est appelé à la fin de l'animation d'hyperespace (cf. main.js).
// À ce moment l'utilisateur a déjà interagi (gâchette de fin de tutoriel) et
// l'AudioContext tourne déjà (son d'hyperespace), donc la lecture est autorisée.
const VOLUME = 0.12;

export default class MusiqueAmbiance {
  constructor(url = '/musique ambiance.mp3') {
    this.audio = new BoucleAudio(url, { volume: VOLUME });
    this._demarree = false;
  }

  // Lance la boucle du fichier entier (mémorisée si le buffer n'est pas encore
  // décodé) et reprend l'AudioContext au cas où il serait suspendu. Idempotent.
  demarrer() {
    if (this._demarree) return;
    this._demarree = true;
    this.audio.reprendre();
    this.audio.jouerBoucle();
  }

  setVolume(v) {
    this.audio.setVolume(v);
  }
}
