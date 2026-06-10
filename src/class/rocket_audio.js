export default class RocketAudio {
  constructor(url = "/jci21-rocket-launch-sfx-253937.mp3") {
    this.url = url;
    this.context = null;
    this.gainNode = null;
    this.sourceNode = null;
    this.volumeCible = 0;

    this._charger(this.url);
  }

  async _charger(url) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const reponse = await fetch(url);
      const buffer = await reponse.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(buffer);

      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;

      const dur = audioBuffer.duration;
      source.loopStart = dur * 0.2;
      source.loopEnd = dur * 0.7;

      source.connect(gain);
      source.start(0, source.loopStart);

      this.context = ctx;
      this.gainNode = gain;
      this.sourceNode = source;
    } catch (e) {
      console.warn("Audio fusée indisponible :", e);
    }
  }

  setVolumeCible(volume) {
    this.volumeCible = volume;
  }

  update() {
    if (!this.gainNode || !this.context) return;

    if (this.context.state === "suspended") {
      this.context.resume().catch(() => {});
    }

    const v = this.gainNode.gain.value;
    const cible = this.volumeCible;
    const nouveau = v + (cible - v) * 0.15;
    this.gainNode.gain.value = Math.max(0, Math.min(1, nouveau));
  }
}
