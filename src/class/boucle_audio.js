// Utilitaire Web Audio partagé (RocketAudio, HyperEspace) : charge un MP3,
// le décode, et expose lecture en boucle / one-shot + contrôle de volume.
// Toutes les instances partagent un seul AudioContext (un par page suffit,
// et les navigateurs en limitent le nombre).
let contextePartage = null;

function obtenirContexte() {
  if (!contextePartage) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    contextePartage = new AudioCtx();
  }
  return contextePartage;
}

export default class BoucleAudio {
  // onPret est appelé une fois le buffer décodé : utile pour calculer des
  // points de boucle dépendant de la durée du fichier.
  constructor(url, { volume = 1, onPret = null } = {}) {
    this.buffer = null;
    this.gain = null;
    this.source = null;
    this._volume = volume;
    this._onPret = onPret;
    // jouerBoucle() appelé avant la fin du chargement : on mémorise la
    // demande et on la rejoue dès que le buffer est prêt.
    this._bouclePendante = null;

    this._charger(url);
  }

  async _charger(url) {
    const ctx = obtenirContexte();
    if (!ctx) return;

    const reponse = await fetch(url);
    const donnees = await reponse.arrayBuffer();
    this.buffer = await ctx.decodeAudioData(donnees);

    this.gain = ctx.createGain();
    this.gain.gain.value = this._volume;
    this.gain.connect(ctx.destination);

    if (this._onPret) this._onPret(this);
    if (this._bouclePendante) {
      const [debut, fin] = this._bouclePendante;
      this._bouclePendante = null;
      this.jouerBoucle(debut, fin);
    }
  }

  get prete() {
    return this.buffer !== null && this.gain !== null;
  }

  get volume() {
    return this.gain ? this.gain.gain.value : this._volume;
  }

  setVolume(v) {
    this._volume = v;
    if (this.gain) this.gain.gain.value = v;
  }

  // Les navigateurs démarrent l'AudioContext en "suspended" tant qu'il n'y a
  // pas eu de geste utilisateur : à rappeler avant/pendant la lecture.
  reprendre() {
    const ctx = obtenirContexte();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // Joue la portion debut..fin (secondes) en boucle, en démarrant à debut.
  jouerBoucle(debut = 0, fin = null) {
    if (!this.prete) {
      this._bouclePendante = [debut, fin];
      return;
    }
    const dur = this.buffer.duration;
    // Cap au cas où le fichier serait plus court que les points demandés.
    const debutCape = Math.min(debut, Math.max(0, dur - 0.1));
    const src = this._creerSource();
    src.loop = true;
    src.loopStart = debutCape;
    src.loopEnd = Math.min(fin ?? dur, dur);
    src.start(0, debutCape);
  }

  // Joue une seule fois à partir d'offset (secondes), sans boucler.
  jouerUneFois(offset = 0) {
    if (!this.prete) return;
    const depart = Math.min(offset, Math.max(0, this.buffer.duration - 0.1));
    const src = this._creerSource();
    src.start(0, depart);
  }

  // Coupe la source en cours et annule une éventuelle boucle en attente.
  stop() {
    this._bouclePendante = null;
    if (this.source) {
      this.source.stop();
      this.source.disconnect();
      this.source = null;
    }
  }

  // Les BufferSourceNode sont à usage unique : on en recrée un à chaque lecture.
  _creerSource() {
    this.stop();
    this.reprendre();
    const src = obtenirContexte().createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.gain);
    this.source = src;
    return src;
  }
}
