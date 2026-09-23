'use strict';
// som: efeitos sintetizados, falas gravadas e ambiente (Web Audio)

let voiceFiles = new Map();
// baixa as falas já no carregamento; decodifica quando o áudio for liberado pelo toque
function loadVoices(names, dir = 'voz/') {
  voiceFiles = new Map(names.map(n => [n, fetch(`${dir}${n}.mp3`).then(r => {
    if (!r.ok) throw new Error(n);
    return r.arrayBuffer();
  })]));
  voiceFiles.forEach(p => p.catch(() => {}));
}

const sfx = (() => {
  let ac, out, noise, voiceOut, ambientOut, voiceSrc = null, voiceEnd = 0, voiceTurn = 0;
  const decoded = new Map();
  function env(node, t, peak, dur, attack = .005) {
    const g = ac.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    node.connect(g).connect(out);
  }
  function osc(type, f0, f1, t, dur, peak) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * .6);
    env(o, t, peak, dur);
    o.start(t); o.stop(t + dur + .02);
  }
  // iPhone com a chave do silencioso ligada corta o Web Audio. Um <audio> de mídia tocando
  // silêncio em loop muda a sessão para "reprodução", e aí o Web Audio passa a sair também.
  let keepAlive = null;
  function silentLoop() {
    const rate = 8000, n = rate / 2, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
    const str = (o, txt) => [...txt].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    str(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    const a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    a.loop = true;
    a.setAttribute('playsinline', '');
    a.setAttribute('x-webkit-airplay', 'deny');
    return a;
  }
  const s = {
    init() {
      keepAlive = silentLoop();
      keepAlive.play().catch(() => {});
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* iOS antigo */ }
      ac = new (window.AudioContext || window.webkitAudioContext)();
      ac.resume();
      const comp = ac.createDynamicsCompressor();
      out = ac.createGain(); out.gain.value = .9;
      out.connect(comp).connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * .1, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      voiceOut = ac.createGain(); voiceOut.gain.value = 1.1; voiceOut.connect(comp);
      ambientOut = ac.createGain(); ambientOut.gain.value = .0001; ambientOut.connect(out);
    },
    // fala gravada; queue = espera a fala atual terminar em vez de cortar
    speak(line, queue) {
      if (!ac || !voiceFiles.has(line)) return Promise.reject(new Error('sem áudio'));
      if (!decoded.has(line)) decoded.set(line, voiceFiles.get(line).then(b => ac.decodeAudioData(b)));
      const turn = queue ? voiceTurn : ++voiceTurn;
      return decoded.get(line).then(buf => {
        if (turn !== voiceTurn) return;   // outra fala mais nova já pediu a vez
        const t = ac.currentTime;
        if (!queue) { try { voiceSrc?.stop(); } catch { /* já tinha parado */ } }
        const at = queue ? Math.max(t, voiceEnd) : t;
        voiceSrc = ac.createBufferSource();
        voiceSrc.buffer = buf; voiceSrc.connect(voiceOut); voiceSrc.start(at);
        voiceEnd = at + buf.duration;
      });
    },
    // brisa: ruído bem grave e baixinho que respira devagar
    startAmbient() {
      const wind = ac.createBufferSource(), lp = ac.createBiquadFilter(), g = ac.createGain();
      const len = ac.sampleRate * 6, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
      const fade = ac.sampleRate * .3;   // pontas suaves: sem "tec" quando o loop recomeça
      for (let i = 0; i < fade; i++) { d[i] *= i / fade; d[len - 1 - i] *= i / fade; }
      wind.buffer = buf; wind.loop = true;
      lp.type = 'lowpass'; lp.frequency.value = 420;
      g.gain.value = .05;
      const lfo = ac.createOscillator(), depth = ac.createGain();
      lfo.frequency.value = .07; depth.gain.value = .035;
      lfo.connect(depth).connect(g.gain);
      wind.connect(lp).connect(g).connect(ambientOut);
      wind.start(); lfo.start();
      ambientOut.gain.setTargetAtTime(1, ac.currentTime, 1.5);   // entra devagar
    },
    // passarinho: 2 a 4 piados curtos, do lado da tela onde ele está
    chirp(pan = rand(-.8, .8)) {
      if (!ac) return;
      const p = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain();
      if (p.pan) p.pan.value = pan;
      p.connect(ambientOut);
      const base = rand(2600, 3800), n = 2 + (Math.random() * 3 | 0);
      let t = ac.currentTime + .05;
      for (let i = 0; i < n; i++) {
        const o = ac.createOscillator(), g = ac.createGain(), up = Math.random() < .5;
        o.frequency.setValueAtTime(base * (up ? .8 : 1.15), t);
        o.frequency.exponentialRampToValueAtTime(base * (up ? 1.2 : .85), t + .07);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.05, t + .012);
        g.gain.exponentialRampToValueAtTime(.0001, t + .09);
        o.connect(g).connect(p);
        o.start(t); o.stop(t + .1);
        t += rand(.11, .17);
      }
    },
    // sininho de vento: 2 ou 3 notas agudas e bem baixinhas
    chime() {
      if (!ac) return;
      const t = ac.currentTime;
      for (let i = 0, n = 2 + (Math.random() * 2 | 0); i < n; i++) {
        const o = ac.createOscillator(), g = ac.createGain(), at = t + i * rand(.25, .45);
        o.frequency.value = pick(PENTATONIC) * 2;
        g.gain.setValueAtTime(.0001, at);
        g.gain.exponentialRampToValueAtTime(.018, at + .01);
        g.gain.exponentialRampToValueAtTime(.0001, at + 2.2);
        o.connect(g).connect(ambientOut);
        o.start(at); o.stop(at + 2.3);
      }
    },
    resume() {
      if (keepAlive?.paused) keepAlive.play().catch(() => {});
      if (ac && ac.state !== 'running') ac.resume();
    },
    suspend() { keepAlive?.pause(); ac?.suspend(); },
    pop() {
      if (!ac) return;
      const t = ac.currentTime, f = rand(330, 480);
      osc('sine', f, f * 3.2, t, .14, .5);
      const n = ac.createBufferSource(), bp = ac.createBiquadFilter();
      n.buffer = noise; bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = .8;
      n.connect(bp); env(bp, t, .3, .05, .001);
      n.start(t); n.stop(t + .08);
    },
    bell(f = pick(PENTATONIC)) {
      if (!ac) return;
      const t = ac.currentTime;
      osc('sine', f, 0, t, .9, .2);
      osc('sine', f * 2, 0, t, .45, .06);
      osc('triangle', f * 3, 0, t, .15, .03);
    },
    fanfare() {
      [0, 4, 7, 12, 16].forEach((semi, i) => setTimeout(() => s.bell(523.25 * 2 ** (semi / 12)), i * 110));
    },
    // mola: "boing" que desce e balança
    boing() {
      if (!ac) return;
      const t = ac.currentTime, o = ac.createOscillator(), vib = ac.createOscillator(), vg = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(180, t + .35);
      vib.frequency.value = 18; vg.gain.value = 40;
      vib.connect(vg).connect(o.frequency);
      env(o, t, .35, .45);
      o.start(t); vib.start(t); o.stop(t + .5); vib.stop(t + .5);
    },
    // vento rápido de algo sendo jogado pro lado
    whoosh() {
      if (!ac) return;
      const t = ac.currentTime, n = ac.createBufferSource(), bp = ac.createBiquadFilter();
      n.buffer = noise; n.loop = true;
      bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(2400, t + .25);
      n.connect(bp); env(bp, t, .35, .3, .08);
      n.start(t); n.stop(t + .35);
    },
    // risadinha "hi hi hi" bem aguda, vinda de onde o ursinho está
    giggle(pan = 0) {
      if (!ac) return;
      const p = ac.createStereoPanner ? ac.createStereoPanner() : ac.createGain();
      if (p.pan) p.pan.value = pan;
      p.connect(out);
      let t = ac.currentTime;
      for (let i = 0; i < 3; i++) {
        const o = ac.createOscillator(), g = ac.createGain(), f = 900 - i * 60;
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t);
        o.frequency.exponentialRampToValueAtTime(f * 1.35, t + .05);
        o.frequency.exponentialRampToValueAtTime(f * .9, t + .1);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.12, t + .015);
        g.gain.exponentialRampToValueAtTime(.0001, t + .12);
        o.connect(g).connect(p);
        o.start(t); o.stop(t + .13);
        t += .16;
      }
    },
  };
  return s;
})();

function say(line, text, queue = false) {
  sfx.speak(line, queue).catch(() => sayRobot(text, queue));
}

// plano B: voz do sistema, se o áudio gravado não carregar
let robotVoice = null;
function pickVoice() {
  const vs = speechSynthesis.getVoices();
  robotVoice = vs.find(v => v.lang === 'pt-BR') || vs.find(v => v.lang.startsWith('pt')) || null;
}
function sayRobot(text, queue) {
  if (!('speechSynthesis' in window)) return;
  if (!queue) speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'pt-BR'; u.rate = .9; u.pitch = 1.3;
  if (robotVoice) u.voice = robotVoice;
  speechSynthesis.speak(u);
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

// de tempos em tempos: um passarinho (se o jogo tiver céu), um piado ou um sininho
function scheduleAmbient(onBird) {
  setTimeout(() => {
    if (!document.hidden) {
      const r = Math.random();
      if (r < .45 && onBird) onBird();
      else if (r < .8) sfx.chirp();
      else sfx.chime();
    }
    scheduleAmbient(onBird);
  }, rand(4000, 9000));
}
