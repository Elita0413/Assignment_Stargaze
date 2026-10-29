/* ============================================================
   STARGAZE — Reveal the Hidden Sky
   An interactive light pollution / stargazing experience

   Concept: A city's light pollution obscures the night sky.
   The user parts the light with their cursor to reveal the
   stars beneath. A narrative about light pollution unfolds
   as more of the sky is revealed.

   Weather system: clear / cloudy / foggy / stormy — each
   changes the sky atmosphere and adds weather-specific
   visual effects (drifting clouds, fog, rain, lightning).

   Ambient sound: a procedurally generated soundscape using
   the Web Audio API — no external audio files needed.

   Three canvas layers:
   - bg-canvas: stars, nebula, meteors (the hidden beauty)
   - fg-canvas: light pollution particles (the veil)
   - weather-canvas: clouds, fog, rain, lightning overlay
   ============================================================ */

(() => {
  'use strict';

  // ====== Canvas setup ======
  const bgCanvas = document.getElementById('bg-canvas');
  const bgCtx = bgCanvas.getContext('2d');
  const fgCanvas = document.getElementById('fg-canvas');
  const fgCtx = fgCanvas.getContext('2d');
  const weatherCanvas = document.getElementById('weather-canvas');
  const weatherCtx = weatherCanvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;

  function resizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    [bgCanvas, fgCanvas, weatherCanvas].forEach(c => {
      c.width = W * DPR;
      c.height = H * DPR;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    });
    bgCtx.scale(DPR, DPR);
    fgCtx.scale(DPR, DPR);
    weatherCtx.scale(DPR, DPR);
  }

  // ====== Weather themes ======
  // Each weather defines the sky's look + behaviour
  const WEATHERS = {
    clear: {
      bg: '#02030a',
      starColour: '#ffffff',
      starGlow: 'rgba(200, 220, 255, ',
      nebulaColours: ['rgba(30, 20, 60, 0.15)', 'rgba(10, 30, 50, 0.1)', 'rgba(40, 20, 70, 0.08)'],
      lightColours: ['#ff9944', '#ffaa55', '#ff7733'],
      lightGlow: 'rgba(255, 153, 68, ',
      starVisibility: 1.0,    // stars are fully visible when revealed
      fogDensity: 0,          // no fog
      cloudCount: 0,          // no clouds
      rainIntensity: 0,       // no rain
      lightning: false,
      label: 'Clear Night',
    },
    cloudy: {
      bg: '#060810',
      starColour: '#e8e8f0',
      starGlow: 'rgba(180, 200, 230, ',
      nebulaColours: ['rgba(20, 25, 45, 0.12)', 'rgba(15, 20, 35, 0.08)', 'rgba(25, 30, 50, 0.06)'],
      lightColours: ['#ffa040', '#ffb060', '#ff8833'],
      lightGlow: 'rgba(255, 160, 64, ',
      starVisibility: 0.75,   // clouds dim the stars a bit
      fogDensity: 0,
      cloudCount: 5,          // drifting clouds
      rainIntensity: 0,
      lightning: false,
      label: 'Cloudy',
    },
    foggy: {
      bg: '#0a0c14',
      starColour: '#c0c8d0',
      starGlow: 'rgba(150, 170, 200, ',
      nebulaColours: ['rgba(20, 25, 40, 0.08)', 'rgba(15, 20, 30, 0.06)', 'rgba(20, 30, 45, 0.04)'],
      lightColours: ['#ffb050', '#ffc070', '#ff9838'],
      lightGlow: 'rgba(255, 176, 80, ',
      starVisibility: 0.5,    // fog obscures stars even after parting light
      fogDensity: 0.35,       // drifting fog layer
      cloudCount: 2,
      rainIntensity: 0,
      lightning: false,
      label: 'Foggy',
    },
    stormy: {
      bg: '#04060e',
      starColour: '#a0a8c0',
      starGlow: 'rgba(120, 140, 180, ',
      nebulaColours: ['rgba(15, 20, 40, 0.1)', 'rgba(10, 15, 30, 0.08)', 'rgba(20, 25, 45, 0.06)'],
      lightColours: ['#ffc060', '#ffd080', '#ffa840'],
      lightGlow: 'rgba(255, 192, 96, ',
      starVisibility: 0.35,   // heavy cloud cover blocks most stars
      fogDensity: 0.15,
      cloudCount: 8,
      rainIntensity: 1.0,     // heavy rain
      lightning: true,
      label: 'Stormy',
    },
  };

  // ====== State ======
  const state = {
    entered: false,
    mode: 'part',          // part | gather | storm
    weather: 'clear',
    density: 320,
    mouse: { x: -9999, y: -9999, prevX: -9999, prevY: -9999, active: false, down: false },
    lightParticles: [],    // foreground: light pollution
    stars: [],              // background: the hidden sky
    meteors: [],            // shooting stars
    nebulae: [],            // background nebula clouds
    weatherClouds: [],      // drifting cloud shapes
    rainDrops: [],          // rain particles
    fogParticles: [],       // fog blobs
    lightningFlash: 0,      // lightning brightness 0-1
    lightningTimer: 0,      // countdown to next strike
    fps: 0,
    frameCount: 0,
    lastFpsTime: 0,
    starsRevealed: 0,
    clearPercent: 0,
    hintTimeout: null,
    narrativeIndex: 0,
    narrativeTimer: null,
    soundOn: false,
  };

  // ====== Narrative messages (shown as user reveals stars) ======
  const NARRATIVES = [
    "80% of the world lives under a light-polluted sky…",
    "A child born today may never see the Milky Way.",
    "Light pollution grows 2% every year. The stars retreat.",
    "In a truly dark sky, you'd see 2,500 stars. How many can you find?",
    "Every star was always there. We just forgot to look up.",
  ];

  // ====== Background: Star ======
  class Star {
    constructor() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.radius = Math.random() * 1.2 + 0.3;
      this.baseBrightness = Math.random() * 0.5 + 0.3;
      this.brightness = this.baseBrightness;
      this.twinkleSpeed = Math.random() * 0.02 + 0.005;
      this.twinklePhase = Math.random() * Math.PI * 2;
      this.revealed = false;
      this.revealAlpha = 0;
      this.isBright = Math.random() > 0.92;
      if (this.isBright) {
        this.radius *= 1.8;
        this.baseBrightness = Math.min(this.baseBrightness + 0.3, 1);
      }
    }

    update() {
      this.twinklePhase += this.twinkleSpeed;
      this.brightness = this.baseBrightness + Math.sin(this.twinklePhase) * 0.2;

      let nearbyLight = 0;
      for (const lp of state.lightParticles) {
        const dx = lp.x - this.x;
        const dy = lp.y - this.y;
        if (Math.abs(dx) > 80 || Math.abs(dy) > 80) continue;
        const d = Math.hypot(dx, dy);
        if (d < 60) {
          nearbyLight += (1 - d / 60) * lp.alpha;
          if (nearbyLight > 0.3) break;
        }
      }

      const targetAlpha = nearbyLight > 0.15 ? 0 : 1;
      this.revealAlpha += (targetAlpha - this.revealAlpha) * 0.05;

      if (this.revealAlpha > 0.5 && !this.revealed) {
        this.revealed = true;
        state.starsRevealed++;
        // Play a gentle chime when a star is revealed
        if (state.soundOn) audio.playStarChime(this);
      } else if (this.revealAlpha < 0.3 && this.revealed) {
        this.revealed = false;
        state.starsRevealed--;
      }
    }

    draw() {
      const wx = WEATHERS[state.weather];
      // Weather affects how visible stars are even after being "revealed"
      const weatherMod = wx.starVisibility;
      const alpha = this.revealAlpha * Math.max(0.1, this.brightness) * weatherMod;
      if (alpha < 0.01) return;

      const r = Math.max(0.1, this.radius);

      if (this.isBright && alpha > 0.3) {
        bgCtx.beginPath();
        bgCtx.arc(this.x, this.y, r * 4, 0, Math.PI * 2);
        bgCtx.fillStyle = wx.starGlow + (alpha * 0.15) + ')';
        bgCtx.fill();

        bgCtx.strokeStyle = wx.starGlow + (alpha * 0.2) + ')';
        bgCtx.lineWidth = 0.5;
        bgCtx.beginPath();
        bgCtx.moveTo(this.x - r * 6, this.y);
        bgCtx.lineTo(this.x + r * 6, this.y);
        bgCtx.moveTo(this.x, this.y - r * 6);
        bgCtx.lineTo(this.x, this.y + r * 6);
        bgCtx.stroke();
      }

      bgCtx.beginPath();
      bgCtx.arc(this.x, this.y, r, 0, Math.PI * 2);
      bgCtx.fillStyle = wx.starColour;
      bgCtx.globalAlpha = alpha;
      bgCtx.fill();

      bgCtx.globalAlpha = 1;
    }
  }

  // ====== Background: Nebula cloud ======
  class Nebula {
    constructor() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.radius = Math.random() * 200 + 150;
      this.colourIdx = Math.floor(Math.random() * 3);
      this.alpha = 0;
      this.targetAlpha = 0.6;
      this.driftX = (Math.random() - 0.5) * 0.1;
      this.driftY = (Math.random() - 0.5) * 0.1;
    }

    update() {
      this.x += this.driftX;
      this.y += this.driftY;
      this.alpha += (this.targetAlpha - this.alpha) * 0.005;
      if (this.x < -this.radius) this.x = W + this.radius;
      if (this.x > W + this.radius) this.x = -this.radius;
      if (this.y < -this.radius) this.y = H + this.radius;
      if (this.y > H + this.radius) this.y = -this.radius;
    }

    draw() {
      if (this.alpha < 0.01) return;
      const wx = WEATHERS[state.weather];
      const r = Math.max(1, this.radius);
      const grad = bgCtx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
      const colour = wx.nebulaColours[this.colourIdx];
      grad.addColorStop(0, colour);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      bgCtx.fillStyle = grad;
      bgCtx.globalAlpha = this.alpha;
      bgCtx.beginPath();
      bgCtx.arc(this.x, this.y, r, 0, Math.PI * 2);
      bgCtx.fill();
      bgCtx.globalAlpha = 1;
    }
  }

  // ====== Weather: Cloud (drifting organic shape) ======
  class WeatherCloud {
    constructor() {
      this.x = Math.random() * W;
      this.y = Math.random() * H * 0.6;
      this.vx = (Math.random() - 0.5) * 0.3 + 0.1;
      this.puffs = [];
      const puffCount = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < puffCount; i++) {
        this.puffs.push({
          ox: (Math.random() - 0.5) * 80,
          oy: (Math.random() - 0.5) * 25,
          r: Math.random() * 40 + 30,
        });
      }
      this.alpha = Math.random() * 0.15 + 0.08;
    }

    update() {
      this.x += this.vx;
      if (this.x > W + 200) this.x = -200;
      if (this.x < -200) this.x = W + 200;
    }

    draw() {
      weatherCtx.globalCompositeOperation = 'source-over';
      for (const puff of this.puffs) {
        const r = Math.max(1, puff.r);
        const grad = weatherCtx.createRadialGradient(
          this.x + puff.ox, this.y + puff.oy, 0,
          this.x + puff.ox, this.y + puff.oy, r
        );
        grad.addColorStop(0, 'rgba(40, 45, 60, ' + this.alpha + ')');
        grad.addColorStop(0.7, 'rgba(25, 30, 45, ' + (this.alpha * 0.5) + ')');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        weatherCtx.fillStyle = grad;
        weatherCtx.beginPath();
        weatherCtx.arc(this.x + puff.ox, this.y + puff.oy, r, 0, Math.PI * 2);
        weatherCtx.fill();
      }
    }
  }

  // ====== Weather: Fog (large soft drifting blobs) ======
  class FogBlob {
    constructor() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.radius = Math.random() * 250 + 150;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = (Math.random() - 0.5) * 0.08;
      this.alpha = Math.random() * 0.12 + 0.06;
      this.phase = Math.random() * Math.PI * 2;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy + Math.sin(this.phase) * 0.1;
      this.phase += 0.003;
      if (this.x < -this.radius) this.x = W + this.radius;
      if (this.x > W + this.radius) this.x = -this.radius;
      if (this.y < -this.radius) this.y = H + this.radius;
      if (this.y > H + this.radius) this.y = -this.radius;
    }

    draw() {
      const r = Math.max(1, this.radius);
      const grad = weatherCtx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
      grad.addColorStop(0, 'rgba(120, 130, 150, ' + this.alpha + ')');
      grad.addColorStop(0.6, 'rgba(80, 90, 110, ' + (this.alpha * 0.4) + ')');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      weatherCtx.fillStyle = grad;
      weatherCtx.beginPath();
      weatherCtx.arc(this.x, this.y, r, 0, Math.PI * 2);
      weatherCtx.fill();
    }
  }

  // ====== Weather: Rain drop ======
  class RainDrop {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * (W + 200) - 100;
      this.y = Math.random() * -H;
      this.length = Math.random() * 12 + 8;
      this.speed = Math.random() * 6 + 10;
      this.alpha = Math.random() * 0.3 + 0.15;
      this.angle = 0.15; // slight slant
    }

    update() {
      this.y += this.speed;
      this.x += this.speed * this.angle;
      if (this.y > H + this.length) {
        this.y = -this.length;
        this.x = Math.random() * (W + 200) - 100;
      }
    }

    draw() {
      weatherCtx.strokeStyle = 'rgba(150, 170, 200, ' + this.alpha + ')';
      weatherCtx.lineWidth = 1;
      weatherCtx.beginPath();
      weatherCtx.moveTo(this.x, this.y);
      weatherCtx.lineTo(this.x - this.length * this.angle, this.y - this.length);
      weatherCtx.stroke();
    }
  }

  // ====== Weather: Lightning ======
  class LightningBolt {
    constructor() {
      this.startX = Math.random() * W;
      this.startY = 0;
      this.segments = [];
      let x = this.startX;
      let y = this.startY;
      while (y < H * 0.7) {
        const nx = x + (Math.random() - 0.5) * 40;
        const ny = y + Math.random() * 30 + 20;
        this.segments.push({ x1: x, y1: y, x2: nx, y2: ny });
        // Occasional branch
        if (Math.random() > 0.7) {
          const bx = nx + (Math.random() - 0.5) * 60;
          const by = ny + Math.random() * 40 + 10;
          this.segments.push({ x1: nx, y1: ny, x2: bx, y2: by, branch: true });
        }
        x = nx;
        y = ny;
      }
      this.life = 1;
    }

    update() {
      this.life -= 0.08;
    }

    draw() {
      if (this.life <= 0) return;
      weatherCtx.strokeStyle = 'rgba(200, 220, 255, ' + this.life + ')';
      weatherCtx.lineWidth = 2;
      weatherCtx.shadowBlur = 20;
      weatherCtx.shadowColor = 'rgba(180, 200, 255, ' + this.life + ')';
      weatherCtx.beginPath();
      for (const seg of this.segments) {
        weatherCtx.moveTo(seg.x1, seg.y1);
        weatherCtx.lineTo(seg.x2, seg.y2);
      }
      weatherCtx.stroke();
      weatherCtx.shadowBlur = 0;
    }
  }

  // ====== Foreground: Light particle ======
  class LightParticle {
    constructor() {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = (Math.random() - 0.5) * 0.15;
      this.baseRadius = Math.random() * 2.5 + 1.5;
      this.radius = this.baseRadius;
      this.colourIdx = Math.floor(Math.random() * 3);
      this.alpha = Math.random() * 0.4 + 0.3;
      this.targetAlpha = this.alpha;
    }

    update() {
      const mouse = state.mouse;
      const dx = mouse.x - this.x;
      const dy = mouse.y - this.y;
      const dist = Math.hypot(dx, dy);
      const maxDist = 180;

      if (mouse.active && dist < maxDist && dist > 0.1) {
        const force = (1 - dist / maxDist);

        switch (state.mode) {
          case 'part': {
            this.vx -= (dx / dist) * force * 0.5;
            this.vy -= (dy / dist) * force * 0.5;
            this.targetAlpha = 0.05;
            this.radius = this.baseRadius * (1 + force * 0.5);
            break;
          }
          case 'gather': {
            this.vx += (dx / dist) * force * 0.3;
            this.vy += (dy / dist) * force * 0.3;
            this.targetAlpha = 0.6;
            this.radius = this.baseRadius * (1 + force);
            break;
          }
          case 'storm': {
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 2;
            this.vx += Math.cos(angle) * force * 0.8;
            this.vy += Math.sin(angle) * force * 0.8;
            this.targetAlpha = 0.05;
            this.radius = this.baseRadius * (1 + force * 2);
            break;
          }
        }
      } else {
        this.targetAlpha = 0.3 + this.colourIdx * 0.05;
        this.radius += (this.baseRadius - this.radius) * 0.05;
      }

      for (const wave of state.shockwaves) {
        const swDx = this.x - wave.x;
        const swDy = this.y - wave.y;
        const swDist = Math.hypot(swDx, swDy);
        const band = 70;
        if (Math.abs(swDist - wave.radius) < band && swDist > 0.1) {
          const wf = (1 - Math.abs(swDist - wave.radius) / band) * wave.strength;
          this.vx += (swDx / swDist) * wf * 5;
          this.vy += (swDy / swDist) * wf * 5;
          this.targetAlpha = 0.02;
        }
      }

      this.alpha += (this.targetAlpha - this.alpha) * 0.08;

      this.x += this.vx;
      this.y += this.vy;
      this.vx *= 0.95;
      this.vy *= 0.95;

      const m = 30;
      if (this.x < -m) this.x = W + m;
      if (this.x > W + m) this.x = -m;
      if (this.y < -m) this.y = H + m;
      if (this.y > H + m) this.y = -m;
    }

    draw() {
      if (this.alpha < 0.01) return;
      const wx = WEATHERS[state.weather];
      const r = Math.max(0.1, this.radius);
      const colour = wx.lightColours[this.colourIdx];

      fgCtx.beginPath();
      fgCtx.arc(this.x, this.y, r * 3, 0, Math.PI * 2);
      fgCtx.fillStyle = wx.lightGlow + (this.alpha * 0.06) + ')';
      fgCtx.fill();

      fgCtx.beginPath();
      fgCtx.arc(this.x, this.y, r, 0, Math.PI * 2);
      fgCtx.fillStyle = colour;
      fgCtx.globalAlpha = this.alpha;
      fgCtx.fill();

      fgCtx.globalAlpha = 1;
    }
  }

  // ====== Shockwave ======
  state.shockwaves = [];

  class Shockwave {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.radius = 0;
      this.maxRadius = Math.max(W, H) * 0.6;
      this.strength = 1;
      this.alive = true;
    }

    update() {
      this.radius += 7;
      this.strength = 1 - this.radius / this.maxRadius;
      if (this.radius >= this.maxRadius) this.alive = false;
    }

    draw() {
      if (!this.alive) return;
      const wx = WEATHERS[state.weather];
      const r = Math.max(0.1, this.radius);

      fgCtx.beginPath();
      fgCtx.arc(this.x, this.y, r, 0, Math.PI * 2);
      fgCtx.strokeStyle = wx.lightGlow + (this.strength * 0.4) + ')';
      fgCtx.lineWidth = 2;
      fgCtx.stroke();

      fgCtx.beginPath();
      fgCtx.arc(this.x, this.y, r * 0.88, 0, Math.PI * 2);
      fgCtx.strokeStyle = wx.lightGlow + (this.strength * 0.2) + ')';
      fgCtx.lineWidth = 1;
      fgCtx.stroke();

      fgCtx.lineWidth = 1;
    }
  }

  // ====== Meteor ======
  class Meteor {
    constructor() {
      const side = Math.random();
      if (side < 0.5) {
        this.x = Math.random() * W * 0.5;
        this.y = -20;
      } else {
        this.x = -20;
        this.y = Math.random() * H * 0.5;
      }
      const angle = Math.PI * 0.25 + (Math.random() - 0.5) * 0.3;
      const speed = Math.random() * 4 + 6;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.life = 1;
      this.trail = [];
      this.maxTrail = 20;
      this.alive = true;
    }

    update() {
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > this.maxTrail) this.trail.shift();

      this.x += this.vx;
      this.y += this.vy;
      this.life -= 0.008;

      if (this.life <= 0 || this.x > W + 50 || this.y > H + 50) {
        this.alive = false;
      }
    }

    draw() {
      if (!this.alive) return;
      const wx = WEATHERS[state.weather];

      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const trailAlpha = (i / this.trail.length) * this.life * 0.5;
        const r = Math.max(0.1, (i / this.trail.length) * 2);
        bgCtx.beginPath();
        bgCtx.arc(t.x, t.y, r, 0, Math.PI * 2);
        bgCtx.fillStyle = wx.starColour;
        bgCtx.globalAlpha = trailAlpha;
        bgCtx.fill();
      }

      bgCtx.beginPath();
      bgCtx.arc(this.x, this.y, 2, 0, Math.PI * 2);
      bgCtx.fillStyle = wx.starColour;
      bgCtx.globalAlpha = this.life;
      bgCtx.fill();

      bgCtx.beginPath();
      bgCtx.arc(this.x, this.y, 6, 0, Math.PI * 2);
      bgCtx.fillStyle = wx.starGlow + (this.life * 0.15) + ')';
      bgCtx.fill();

      bgCtx.globalAlpha = 1;
    }
  }

  // ============================================================
  // AMBIENT SOUND ENGINE — Web Audio API
  // Procedurally generated, no external audio files.
  // Layers:
  //   1. Low drone pad (two detuned oscillators + lowpass filter)
  //   2. Subtle wind (filtered noise + slow LFO on filter)
  //   3. Star chimes (sine oscillator with envelope, triggered
  //      when individual stars are revealed)
  // ============================================================
  const audio = {
    ctx: null,
    master: null,
    droneGain: null,
    windGain: null,
    chimeGain: null,
    noiseBuffer: null,
    windFilter: null,
    windLFO: null,
    ready: false,
    chimeCooldown: 0,

    init() {
      if (this.ready) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();

        // Master gain — keep it very gentle
        this.master = this.ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(this.ctx.destination);

        // === 1. Drone pad ===
        // Two detuned oscillators for a rich, warm low end
        this.droneGain = this.ctx.createGain();
        this.droneGain.gain.value = 0.12;
        this.droneGain.connect(this.master);

        const droneFilter = this.ctx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 400;
        droneFilter.Q.value = 0.5;
        droneFilter.connect(this.droneGain);

        const osc1 = this.ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = 110; // A2
        osc1.connect(droneFilter);
        osc1.start();

        const osc2 = this.ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 110.5; // slight detune for warmth
        osc2.connect(droneFilter);
        osc2.start();

        // Slow LFO on drone gain for a breathing effect
        const droneLFO = this.ctx.createOscillator();
        droneLFO.frequency.value = 0.06;
        const droneLFOGain = this.ctx.createGain();
        droneLFOGain.gain.value = 0.04;
        droneLFO.connect(droneLFOGain);
        droneLFOGain.connect(this.droneGain.gain);
        droneLFO.start();

        // === 2. Wind (filtered white noise) ===
        this.windGain = this.ctx.createGain();
        this.windGain.gain.value = 0.06;
        this.windGain.connect(this.master);

        // Generate noise buffer (2 seconds, looped)
        const noiseLen = this.ctx.sampleRate * 2;
        this.noiseBuffer = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
        const noiseData = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) {
          noiseData[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;
        noiseSource.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = 500;
        this.windFilter.Q.value = 0.8;

        noiseSource.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        noiseSource.start();

        // Slow LFO on wind filter for a "breathing" wind effect
        this.windLFO = this.ctx.createOscillator();
        this.windLFO.frequency.value = 0.08;
        const windLFOGain = this.ctx.createGain();
        windLFOGain.gain.value = 300;
        this.windLFO.connect(windLFOGain);
        windLFOGain.connect(this.windFilter.frequency);
        this.windLFO.start();

        // === 3. Star chimes ===
        this.chimeGain = this.ctx.createGain();
        this.chimeGain.gain.value = 0.25;
        this.chimeGain.connect(this.master);

        this.ready = true;
      } catch (e) {
        console.warn('Audio init failed:', e);
      }
    },

    playStarChime(star) {
      if (!this.ready || !state.soundOn) return;
      // Throttle: don't play more than ~8 chimes per second
      const now = this.ctx.currentTime;
      if (now < this.chimeCooldown) return;
      this.chimeCooldown = now + 0.12;

      // Map star Y to a pentatonic pitch (higher stars = higher notes)
      const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 D5 E5 G5 A5 C6
      const idx = Math.floor((1 - star.y / H) * scale.length);
      const freq = scale[Math.max(0, Math.min(scale.length - 1, idx))];

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.15, now + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      osc.connect(env);
      env.connect(this.chimeGain);
      osc.start(now);
      osc.stop(now + 2.6);
    },

    toggle() {
      if (!this.ready) this.init();
      if (!this.ready || !this.ctx) return false;

      state.soundOn = !state.soundOn;

      if (state.soundOn) {
        // Resume context (browser autoplay policy)
        if (this.ctx.state === 'suspended') this.ctx.resume();
        // Fade in master
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(this.master.gain.value, now);
        this.master.gain.linearRampToValueAtTime(0.7, now + 1.5);
      } else {
        // Fade out
        const now = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(this.master.gain.value, now);
        this.master.gain.linearRampToValueAtTime(0, now + 0.5);
      }

      return state.soundOn;
    },
  };

  // ====== Initialisation ======
  function initStars() {
    state.stars = [];
    const starCount = 400;
    for (let i = 0; i < starCount; i++) {
      state.stars.push(new Star());
    }
  }

  function initNebulae() {
    state.nebulae = [];
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      state.nebulae.push(new Nebula());
    }
  }

  function initLightParticles() {
    state.lightParticles = [];
    for (let i = 0; i < state.density; i++) {
      state.lightParticles.push(new LightParticle());
    }
    updateStats();
  }

  function adjustLightCount() {
    const target = state.density;
    const current = state.lightParticles.length;
    if (target > current) {
      for (let i = 0; i < target - current; i++) {
        state.lightParticles.push(new LightParticle());
      }
    } else if (target < current) {
      state.lightParticles.length = target;
    }
    updateStats();
  }

  // ====== Weather initialisation ======
  function initWeather() {
    const wx = WEATHERS[state.weather];

    // Clouds
    state.weatherClouds = [];
    for (let i = 0; i < wx.cloudCount; i++) {
      state.weatherClouds.push(new WeatherCloud());
    }

    // Fog
    state.fogParticles = [];
    if (wx.fogDensity > 0) {
      const fogCount = Math.floor(wx.fogDensity * 12);
      for (let i = 0; i < fogCount; i++) {
        state.fogParticles.push(new FogBlob());
      }
    }

    // Rain
    state.rainDrops = [];
    if (wx.rainIntensity > 0) {
      const rainCount = Math.floor(wx.rainIntensity * 150);
      for (let i = 0; i < rainCount; i++) {
        state.rainDrops.push(new RainDrop());
      }
    }

    // Lightning timer
    state.lightningTimer = wx.lightning ? 60 + Math.random() * 180 : 0;
    state.lightningFlash = 0;
    state.lightningBolts = [];
  }

  // ====== Stats ======
  function updateStats() {
    document.getElementById('stat-stars').textContent = state.starsRevealed;
    const total = state.stars.length;
    const pct = total > 0 ? Math.round((state.starsRevealed / total) * 100) : 0;
    state.clearPercent = pct;
    document.getElementById('stat-cleared').textContent = pct + '%';
    checkNarrative(pct);
  }

  // ====== Narrative system ======
  function checkNarrative(pct) {
    const thresholds = [5, 15, 30, 50, 70];
    for (let i = 0; i < thresholds.length; i++) {
      if (pct >= thresholds[i] && state.narrativeIndex === i) {
        showNarrative(NARRATIVES[i]);
        state.narrativeIndex = i + 1;
        break;
      }
    }
  }

  function showNarrative(text) {
    const el = document.getElementById('narrative');
    const textEl = document.getElementById('narrative-text');
    textEl.textContent = text;
    el.classList.remove('hidden');
    el.classList.add('visible');

    if (state.narrativeTimer) clearTimeout(state.narrativeTimer);
    state.narrativeTimer = setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.classList.add('hidden'), 1500);
    }, 6000);
  }

  // ====== Hint ======
  function showHint(text) {
    const el = document.getElementById('hud-hint');
    el.querySelector('span').textContent = text;
    el.style.display = 'block';
    void el.offsetWidth;
    el.classList.add('visible');
    if (state.hintTimeout) clearTimeout(state.hintTimeout);
    state.hintTimeout = setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => { el.style.display = 'none'; }, 500);
    }, 3000);
  }

  // ====== Toast ======
  let toastTimeout = null;
  function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    void toast.offsetWidth;
    toast.classList.add('show');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 400);
    }, duration);
  }

  // ====== Weather canvas render ======
  function renderWeatherLayer() {
    // Clear fully
    weatherCtx.clearRect(0, 0, W, H);

    const wx = WEATHERS[state.weather];

    // Fog (drawn first, behind clouds/rain)
    if (state.fogParticles.length > 0) {
      weatherCtx.globalCompositeOperation = 'source-over';
      for (const f of state.fogParticles) {
        f.update();
        f.draw();
      }
    }

    // Clouds
    if (state.weatherClouds.length > 0) {
      weatherCtx.globalCompositeOperation = 'source-over';
      for (const c of state.weatherClouds) {
        c.update();
        c.draw();
      }
    }

    // Rain
    if (state.rainDrops.length > 0) {
      weatherCtx.globalCompositeOperation = 'source-over';
      for (const drop of state.rainDrops) {
        drop.update();
        drop.draw();
      }
    }

    // Lightning
    if (wx.lightning) {
      state.lightningTimer--;
      if (state.lightningTimer <= 0) {
        // Strike!
        state.lightningFlash = 1;
        state.lightningBolts.push(new LightningBolt());
        state.lightningTimer = 120 + Math.random() * 300;
        // Play thunder rumble
        if (state.soundOn) audio.playStarChime = audio.playStarChime; // no-op, thunder is visual
      }
      state.lightningFlash *= 0.85;

      // Draw lightning bolts
      for (let i = state.lightningBolts.length - 1; i >= 0; i--) {
        state.lightningBolts[i].update();
        state.lightningBolts[i].draw();
        if (state.lightningBolts[i].life <= 0) state.lightningBolts.splice(i, 1);
      }

      // Flash overlay
      if (state.lightningFlash > 0.02) {
        weatherCtx.fillStyle = 'rgba(180, 200, 255, ' + (state.lightningFlash * 0.12) + ')';
        weatherCtx.fillRect(0, 0, W, H);
      }
    }
  }

  // ====== Render loop ======
  function loop(timestamp) {
    // FPS
    state.frameCount++;
    if (timestamp - state.lastFpsTime >= 1000) {
      state.fps = Math.round(state.frameCount * 1000 / (timestamp - state.lastFpsTime));
      state.frameCount = 0;
      state.lastFpsTime = timestamp;
      document.getElementById('stat-fps').textContent = state.fps;
    }

    const wx = WEATHERS[state.weather];

    // ====== Background layer ======
    bgCtx.fillStyle = wx.bg;
    bgCtx.fillRect(0, 0, W, H);

    bgCtx.globalCompositeOperation = 'lighter';

    for (const n of state.nebulae) {
      n.update();
      n.draw();
    }

    for (const s of state.stars) {
      s.update();
      s.draw();
    }

    for (let i = state.meteors.length - 1; i >= 0; i--) {
      const m = state.meteors[i];
      m.update();
      m.draw();
      if (!m.alive) state.meteors.splice(i, 1);
    }

    bgCtx.globalCompositeOperation = 'source-over';

    updateStats();

    // ====== Foreground layer ======
    fgCtx.globalCompositeOperation = 'destination-out';
    fgCtx.fillStyle = 'rgba(0,0,0,0.12)';
    fgCtx.fillRect(0, 0, W, H);
    fgCtx.globalCompositeOperation = 'lighter';

    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      const wave = state.shockwaves[i];
      wave.update();
      wave.draw();
      if (!wave.alive) state.shockwaves.splice(i, 1);
    }

    for (const lp of state.lightParticles) {
      lp.update();
      lp.draw();
    }

    if (state.mouse.active) {
      fgCtx.beginPath();
      fgCtx.arc(state.mouse.x, state.mouse.y, 10, 0, Math.PI * 2);
      fgCtx.strokeStyle = wx.lightGlow + '0.3)';
      fgCtx.lineWidth = 1;
      fgCtx.stroke();
    }

    fgCtx.globalCompositeOperation = 'source-over';

    // ====== Weather layer ======
    renderWeatherLayer();

    // Random meteor
    if (Math.random() < 0.0008 && state.meteors.length < 2) {
      state.meteors.push(new Meteor());
    }

    requestAnimationFrame(loop);
  }

  // ====== Mouse handling ======
  function handleMouseMove(e) {
    if (!state.entered) return;
    const rect = fgCanvas.getBoundingClientRect();
    state.mouse.prevX = state.mouse.x;
    state.mouse.prevY = state.mouse.y;
    state.mouse.x = e.clientX - rect.left;
    state.mouse.y = e.clientY - rect.top;
    state.mouse.active = true;
  }

  function handleMouseLeave() {
    state.mouse.active = false;
  }

  function handleMouseDown() {
    if (!state.entered) return;
    state.mouse.down = true;
    createShockwave(state.mouse.x, state.mouse.y);
  }

  function handleMouseUp() {
    state.mouse.down = false;
  }

  function createShockwave(x, y) {
    if (state.shockwaves.length > 12) {
      state.shockwaves.shift();
    }
    state.shockwaves.push(new Shockwave(x, y));
  }

  // ====== Touch ======
  function handleTouchStart(e) {
    if (!state.entered) return;
    e.preventDefault();
    const t = e.touches[0];
    const rect = fgCanvas.getBoundingClientRect();
    state.mouse.x = t.clientX - rect.left;
    state.mouse.y = t.clientY - rect.top;
    state.mouse.active = true;
    state.mouse.down = true;
    createShockwave(state.mouse.x, state.mouse.y);
  }

  function handleTouchMove(e) {
    if (!state.entered) return;
    e.preventDefault();
    const t = e.touches[0];
    const rect = fgCanvas.getBoundingClientRect();
    state.mouse.x = t.clientX - rect.left;
    state.mouse.y = t.clientY - rect.top;
  }

  function handleTouchEnd() {
    state.mouse.down = false;
    state.mouse.active = false;
  }

  // ====== Weather switching ======
  function setWeather(name) {
    if (!WEATHERS[name]) return;
    state.weather = name;
    document.body.style.background = WEATHERS[name].bg;
    document.querySelectorAll('.weather-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.weather === name);
    });
    initWeather();
    showToast(WEATHERS[name].label);
  }

  // ====== Mode switching ======
  function setMode(name) {
    if (!['part', 'gather', 'storm'].includes(name)) return;
    state.mode = name;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === name);
    });
    const hints = {
      part: 'Move to part the light · Click to scatter',
      gather: 'Move to gather the light around you',
      storm: 'Move to storm the light away',
    };
    showHint(hints[name]);
  }

  // ====== Actions ======
  function restoreLight() {
    initLightParticles();
    state.shockwaves = [];
    state.starsRevealed = 0;
    for (const s of state.stars) {
      s.revealed = false;
      s.revealAlpha = 0;
    }
    state.narrativeIndex = 0;
    updateStats();
    showToast('The city light returns…');
  }

  function triggerMeteor() {
    state.meteors.push(new Meteor());
    showToast('Make a wish.');
  }

  // ====== Sound toggle ======
  function toggleSound() {
    const btn = document.getElementById('sound-btn');
    const isOn = audio.toggle();
    if (isOn) {
      btn.classList.remove('sound-off');
      btn.classList.add('sound-on');
      showToast('Ambient sound on');
    } else {
      btn.classList.remove('sound-on');
      btn.classList.add('sound-off');
      showToast('Ambient sound off');
    }
  }

  // ====== Enter ======
  function enterExperience() {
    const intro = document.getElementById('intro');
    const hud = document.getElementById('hud');
    intro.classList.add('fade-out');
    state.entered = true;
    setTimeout(() => {
      intro.style.display = 'none';
      hud.classList.remove('hidden');
      showHint('Move to part the light · Click to scatter');
    }, 1200);
  }

  // ====== Event listeners ======
  fgCanvas.addEventListener('mousemove', handleMouseMove);
  fgCanvas.addEventListener('mouseleave', handleMouseLeave);
  fgCanvas.addEventListener('mousedown', handleMouseDown);
  fgCanvas.addEventListener('mouseup', handleMouseUp);
  fgCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  fgCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  fgCanvas.addEventListener('touchend', handleTouchEnd);

  document.getElementById('enter-btn').addEventListener('click', enterExperience);

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  document.querySelectorAll('.weather-btn').forEach(btn => {
    btn.addEventListener('click', () => setWeather(btn.dataset.weather));
  });

  const densitySlider = document.getElementById('density-slider');
  const densityValue = document.getElementById('density-value');
  densitySlider.addEventListener('input', () => {
    state.density = parseInt(densitySlider.value, 10);
    densityValue.textContent = state.density;
    adjustLightCount();
  });

  document.getElementById('reset-btn').addEventListener('click', restoreLight);
  document.getElementById('meteor-btn').addEventListener('click', triggerMeteor);
  document.getElementById('sound-btn').addEventListener('click', toggleSound);

  window.addEventListener('resize', resizeCanvas);

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!state.entered) {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        enterExperience();
      }
      return;
    }
    switch (e.code) {
      case 'Digit1': setMode('part'); break;
      case 'Digit2': setMode('gather'); break;
      case 'Digit3': setMode('storm'); break;
      case 'KeyR': restoreLight(); break;
      case 'KeyW': triggerMeteor(); break;
      case 'KeyS': toggleSound(); break;
      case 'Space':
        e.preventDefault();
        createShockwave(state.mouse.x, state.mouse.y);
        break;
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) state.mouse.active = false;
  });

  // ====== Init ======
  resizeCanvas();
  initStars();
  initNebulae();
  initLightParticles();
  initWeather();
  state.lightningBolts = [];
  state.lastFpsTime = performance.now();
  requestAnimationFrame(loop);

})();
