import BoucleAudio from './boucle_audio.js';

// Retour sonore de propulsion : une boucle de bruit de fusée tourne en
// permanence à volume 0, et CameraController pousse un volume cible
// proportionnel à l'intensité des joysticks. update() lisse la transition.
export default class RocketAudio {
  constructor(url = "/jci21-rocket-launch-sfx-253937.mp3") {
    this.volumeCible = 0;
    this.audio = new BoucleAudio(url, {
      volume: 0,
      // La portion 20%..70% du fichier évite l'attaque et la fin du sample.
      onPret: (a) => a.jouerBoucle(a.buffer.duration * 0.2, a.buffer.duration * 0.7),
    });
  }

  setVolumeCible(volume) {
    this.volumeCible = volume;
  }

  update() {
    if (!this.audio.prete) return;
    this.audio.reprendre();

    const v = this.audio.volume;
    const nouveau = v + (this.volumeCible - v) * 0.15;
    this.audio.setVolume(Math.max(0, Math.min(1, nouveau)));
  }
}
