// music.js - Nhạc nền Phật giáo + tiếng chuông mõ, TỰ SINH bằng code (WebAudio).
// Không dùng file mp3 nào nên KHÔNG dính bản quyền, live bao lâu cũng không bị gỡ nhạc.
// Gồm: tiếng ngân trầm, hợp âm nền chậm, giai điệu ngũ cung thưa (như sáo/đàn), chuông xoay (singing bowl),
//      chuông chùa thỉnh thoảng một hồi, và tiếng chuông/mõ khi có người lên thắp nhang.
// Phím M: tắt/bật nhạc. Link: ?music=0 tắt hẳn, ?vol=0.5 chỉnh to nhỏ (0..1).
// Chỉnh nhanh: sửa khối CONFIG bên dưới.

/* ============================== CONFIG ============================== */
const CFG = {
  VOLUME: 0.55,           // âm lượng tổng (0..1); ?vol= ghi đè
  ROOT: 146.83,           // nốt gốc D3 (Hz). Thang ngũ cung Rê: D E F# A B
  MELODY_GAP: [2.2, 5.5], // khoảng nghỉ giữa các nốt giai điệu (giây), chọn ngẫu nhiên trong khoảng
  MELODY_REST: 0.18,      // xác suất nghỉ thêm 1 nhịp (giai điệu thưa, thanh tịnh)
  BOWL_EVERY: [22, 38],   // chuông xoay: cách bao nhiêu giây
  BELL_EVERY: [70, 110],  // chuông chùa: cách bao nhiêu giây
  CHORD_SEC: 18,          // mỗi hợp âm nền kéo dài bao lâu
  SFX: true,              // tiếng chuông/mõ khi có người lễ
};
/* ==================================================================== */

const SCALE = [0, 2, 4, 7, 9];                       // ngũ cung trưởng: Rê Mi Fa# La Si
const hz = (deg, oct = 0) => {                       // deg: bậc (có thể âm hoặc >4), oct: thêm quãng tám
  const n = SCALE.length, o = Math.floor(deg / n), d = ((deg % n) + n) % n;
  return CFG.ROOT * Math.pow(2, (SCALE[d] + 12 * (o + oct)) / 12);
};
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
// các hợp âm nền (bậc thang ngũ cung): Rê-La-Mi / Si-Fa#-Rê / La-Mi-Si / Rê-Fa#-La
const CHORDS = [[0, 3, 5], [-1, 1, 3], [-2, 1, 2], [0, 2, 3]];

export function createMusic(TEMPLE) {
  const Q = new URLSearchParams(location.search);
  if (Q.get('music') === '0') return { enabled: false };
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return { enabled: false };

  let vol = Q.has('vol') ? Math.min(Math.max(parseFloat(Q.get('vol')) || 0, 0), 1) : CFG.VOLUME;
  let muted = false, started = false;
  const ctx = new AC();

  /* ---------- chuỗi âm thanh: master -> nén nhẹ -> loa; có vang (reverb) cho không khí chánh điện ---------- */
  const master = ctx.createGain(); master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.ratio.value = 3; comp.attack.value = 0.02; comp.release.value = 0.4;
  master.connect(comp); comp.connect(ctx.destination);

  function makeReverb(sec = 4.2, decay = 2.6) {          // tiếng vang: nhiễu tắt dần
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    const cv = ctx.createConvolver(); cv.buffer = buf; return cv;
  }
  const dry = ctx.createGain(); dry.gain.value = 0.75; dry.connect(master);
  const wet = ctx.createGain(); wet.gain.value = 0.55;
  const rev = makeReverb(); rev.connect(wet); wet.connect(master);
  const bus = ctx.createGain(); bus.connect(dry); bus.connect(rev);      // mọi nhạc cụ đi qua đây

  /* ---------- nhạc cụ ---------- */
  // Một nốt có ADSR đơn giản: type (sin/tri), tắt dần theo hàm mũ
  function tone({ f, t = ctx.currentTime, atk = 0.01, dur = 2, gain = 0.1, type = 'sine', detune = 0, out = bus, lp }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f; o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dur);
    let node = o;
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); node = fl; }
    node.connect(g); g.connect(out);
    o.start(t); o.stop(t + atk + dur + 0.1);
  }

  // Tiếng ngân trầm liên tục (như hơi thở của chánh điện)
  function startDrone() {
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(bus);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.connect(g);
    [[0.5, 0], [0.5, 6], [0.75, -4], [1, 3]].forEach(([m, d]) => {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = CFG.ROOT * m; o.detune.value = d;
      o.connect(lp); o.start();
    });
    const lfo = ctx.createOscillator(), lg = ctx.createGain();       // nhịp thở chậm
    lfo.frequency.value = 0.07; lg.gain.value = 0.012; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    g.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 6);
  }

  // Hợp âm nền chậm (vào từ từ, ra từ từ)
  let chordIdx = 0;
  function playChord() {
    const t = ctx.currentTime, ch = CHORDS[chordIdx++ % CHORDS.length], dur = CFG.CHORD_SEC;
    ch.forEach((deg, i) => {
      [0, 1].forEach(k => {
        const o = ctx.createOscillator(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
        o.type = 'triangle'; o.frequency.value = hz(deg, 0) * (k ? 2 : 1); o.detune.value = (k ? 5 : -5) + i * 2;
        fl.type = 'lowpass'; fl.frequency.value = 900;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.028 / (1 + k), t + dur * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.15);
        o.connect(fl); fl.connect(g); g.connect(bus); o.start(t); o.stop(t + dur * 1.2);
      });
    });
    setTimeout(playChord, (dur - 1) * 1000);
  }

  // Giai điệu ngũ cung thưa: đi bước nhỏ, hay quay về nốt gốc; âm sắc mềm như sáo trúc/đàn tranh
  let deg = 4;
  function melodyNote() {
    if (Math.random() > CFG.MELODY_REST) {
      const step = pick([-2, -1, -1, 0, 1, 1, 2]);
      deg = Math.min(Math.max(deg + step, 1), 9);
      if (Math.random() < 0.12) deg = pick([0, 2, 5]) + 2;       // thỉnh thoảng về lại nốt chủ
      const f = hz(deg - 5, 1), t = ctx.currentTime + 0.05;
      tone({ f, t, atk: 0.04, dur: 3.2, gain: 0.07, type: 'sine', out: bus });             // thân nốt
      tone({ f: f * 2, t, atk: 0.02, dur: 1.4, gain: 0.018, type: 'sine', out: bus });     // họa âm sáng
      tone({ f, t, atk: 0.005, dur: 0.5, gain: 0.03, type: 'triangle', detune: 3, out: bus, lp: 2400 });  // tiếng gảy
      if (Math.random() < 0.25) tone({ f: hz(deg - 5 - 2, 1), t: t + 0.9, atk: 0.04, dur: 2.6, gain: 0.05, type: 'sine', out: bus });  // nốt đuôi
    }
    setTimeout(melodyNote, rnd(...CFG.MELODY_GAP) * 1000);
  }

  // Chuông xoay (singing bowl): các họa âm không nguyên, ngân dài, có độ "lượn"
  function bowl(f = hz(2, 1), g = 0.09) {
    const t = ctx.currentTime + 0.02;
    [[1, 1, 7], [2.76, 0.42, 5], [5.4, 0.16, 4], [8.9, 0.05, 3]].forEach(([m, a, d], i) => {
      tone({ f: f * m, t, atk: 0.012, dur: d, gain: g * a, type: 'sine', detune: i ? 0 : -2, out: bus });
      tone({ f: f * m * 1.004, t, atk: 0.012, dur: d, gain: g * a * 0.7, type: 'sine', out: bus });   // lệch nhẹ tạo tiếng "ù ù"
    });
  }
  function bowlLoop() { bowl(hz(pick([0, 2, 3]), pick([1, 1, 2]))); setTimeout(bowlLoop, rnd(...CFG.BOWL_EVERY) * 1000); }

  // Chuông chùa (đại hồng chung): trầm, vang dài
  function bell(g = 0.16) {
    const t = ctx.currentTime + 0.02, f = CFG.ROOT * 0.75;
    [[1, 1, 9], [1.5, 0.35, 7], [2.0, 0.5, 6], [2.51, 0.25, 4.5], [3.2, 0.15, 3.5], [4.16, 0.08, 2.5]].forEach(([m, a, d], i) => {
      tone({ f: f * m, t, atk: 0.006, dur: d, gain: g * a, type: 'sine', out: bus });
      tone({ f: f * m * 1.003, t, atk: 0.006, dur: d, gain: g * a * 0.6, type: 'sine', out: bus });
    });
  }
  function bellLoop() { bell(); setTimeout(bellLoop, rnd(...CFG.BELL_EVERY) * 1000); }

  // Mõ gỗ: tiếng "cộc" ngắn, mềm
  function moc(g = 0.12, t = ctx.currentTime) {
    tone({ f: 620, t, atk: 0.002, dur: 0.11, gain: g, type: 'triangle', out: bus, lp: 1800 });
    tone({ f: 410, t, atk: 0.002, dur: 0.16, gain: g * 0.8, type: 'sine', out: bus });
  }
  // Chuông nhỏ "ting" (chuông tay)
  function ting(f = hz(4, 2), g = 0.05) {
    const t = ctx.currentTime + 0.01;
    [[1, 1, 3.2], [2.7, 0.3, 1.6]].forEach(([m, a, d]) => tone({ f: f * m, t, atk: 0.004, dur: d, gain: g * a, type: 'sine', out: bus }));
  }

  /* ---------- khởi động (trình duyệt chỉ cho phát tiếng sau khi người dùng bấm/gõ vào trang) ---------- */
  let hint = null;
  function showHint() {
    if (hint || Q.get('hint') === '0') return;
    hint = document.createElement('div');
    hint.textContent = 'Bấm vào trang để bật nhạc';
    hint.style.cssText = 'position:fixed;right:10px;top:8px;z-index:7;font:12px system-ui;color:#e8c98a;background:rgba(0,0,0,.6);padding:4px 10px;border-radius:10px;pointer-events:none';
    document.body.appendChild(hint);
  }
  function begin() {
    if (started) return;
    started = true;
    startDrone(); playChord();
    setTimeout(melodyNote, 3500);
    setTimeout(bowlLoop, 9000);
    setTimeout(bellLoop, 14000);
    setTimeout(() => bell(0.14), 1200);                          // một hồi chuông mở đầu
  }
  function applyVol() { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, 0.6); }
  async function tryStart() {
    try { await ctx.resume(); } catch (e) { /* bỏ qua */ }
    if (ctx.state === 'running') { begin(); applyVol(); if (hint) { hint.remove(); hint = null; } return true; }
    showHint(); return false;
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (!started || ctx.state !== 'running') tryStart(); }, { passive: true }));
  tryStart();                                                    // OBS / LIVE Studio thường cho phát luôn, không cần bấm

  addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'm') { muted = !muted; applyVol(); console.log('[nhạc]', muted ? 'tắt' : 'bật'); }
  });

  /* ---------- tiếng chuông/mõ theo hoạt cảnh lễ ---------- */
  if (CFG.SFX && TEMPLE.bus) {
    TEMPLE.bus.addEventListener('worship:start', () => { if (started) ting(); });
    TEMPLE.bus.addEventListener('worship:incense', e => {
      if (!started) return;
      const v = e.detail?.value || 1;
      bowl(hz(0, 1), v >= 1000 ? 0.14 : 0.1);
      if (v >= 1000) setTimeout(() => bell(0.1), 500);          // quà lớn: thêm một hồi chuông
    });
    TEMPLE.bus.addEventListener('worship:end', () => { if (started) { const t = ctx.currentTime; moc(0.1, t); moc(0.08, t + 0.28); } });
  }

  return {
    enabled: true,
    get muted() { return muted; },
    setVolume(v) { vol = Math.min(Math.max(v, 0), 1); applyVol(); },
    mute(on) { muted = !!on; applyVol(); },
    bell, bowl, moc,
  };
}
