// bullet-hell.jsx
// In-page boss fight triggered by the Konami code.
// Smooth cinematic intro: page darkens → boss descends → page words rip off to
// orbit the boss as shields → the "." in the title grows into the player ship.
// Boss fires real words from the page. No boxes — just glowing text bullets.

const { useEffect: bhE, useRef: bhR, useState: bhS, useCallback: bhC } = React;

// ─── constants ────────────────────────────────────────────────────────────────
const BOSS_NAME    = 'Sword Saint MV';
const SHIELD_WORDS = ['Miguel', 'Vasco', 'About', 'News', 'Publications', 'Contact'];
const FALLBACK_WORDS = [
  'reward','agent','policy','value','state','action','episode','return',
  'gradient','epsilon','multimodal','vision','racing','GMC','MUSE','SEED',
  'learn','replay','optimal','sample','observation','training','Lisbon',
  'Stockholm','arXiv','ICML','NeurIPS','RLC','PhD','KTH',
];
const INTRO_DURATION = 4.4;   // seconds before gameplay

// ─── helpers ─────────────────────────────────────────────────────────────────
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const lerp  = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function readBossImage() {
  const slot = document.getElementById('miguel-face') || document.querySelector('image-slot');
  if (!slot?.shadowRoot) return null;
  const img = slot.shadowRoot.querySelector('img');
  return (img?.src && img.style.display !== 'none') ? img.src : null;
}

function gatherBulletWords() {
  try {
    const nodes = document.querySelectorAll('#about p, #news li, #publications li, .hero-lede, h2');
    const words = new Set();
    nodes.forEach((el) => {
      el.textContent.replace(/[—·,()*★↗↓]/g,' ').split(/\s+/).forEach((w) => {
        const c = w.replace(/[^\w\-']/g,'');
        if (c.length >= 3 && c.length <= 14 && !/^\d+$/.test(c)) words.add(c);
      });
    });
    const list = [...words];
    return list.length > 20 ? list : list.concat(FALLBACK_WORDS);
  } catch { return FALLBACK_WORDS; }
}

function capturePagePositions(W, H) {
  // "." in hero title → where the player ship hatches from.
  const h1 = document.querySelector('.hero-title');
  let dotPos = { x: W * 0.38, y: H * 0.38 };
  if (h1) {
    const r = h1.getBoundingClientRect();
    dotPos = { x: clamp(r.right - 22, 40, W - 40), y: r.top + r.height * 0.46 };
  }
  // Origins for each shield word (section labels & hero elements).
  const selectors = [
    '.hero-title', '.hero-eyebrow',
    '[data-screen-label="about"] h2',
    '[data-screen-label="news"] h2',
    '[data-screen-label="publications"] h2',
    '[data-screen-label="contact"] h2',
  ];
  const shieldFrom = selectors.map((sel, i) => {
    try {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        return { x: clamp(r.left + r.width * 0.25, 10, W - 10), y: clamp(r.top + r.height * 0.5, 0, H) };
      }
    } catch {}
    return { x: W * 0.15 + (i / 6) * W * 0.7, y: H * 0.3 + i * 40 };
  });
  return { dotPos, shieldFrom };
}

// ─── component ───────────────────────────────────────────────────────────────
function BulletHell({ active, onExit, accent = '#c96442' }) {
  const canvasRef = bhR(null);
  const stateRef  = bhR(null);
  const phaseRef  = bhR('intro');
  const [, force] = bhS(0);
  const tickHUD   = bhC(() => force(x => x + 1), []);

  // Initialize game state on activation.
  bhE(() => {
    if (!active) return;
    const W = window.innerWidth, H = window.innerHeight;

    const bossSrc = readBossImage();
    const bossImg = new Image();
    bossImg.crossOrigin = 'anonymous';
    if (bossSrc) bossImg.src = bossSrc;
    bossImg.onload = () => { const s = stateRef.current; if (s) s.boss.imgReady = true; };

    const { dotPos, shieldFrom } = capturePagePositions(W, H);
    const words = gatherBulletWords();

    const shieldData = SHIELD_WORDS.map((word, i) => ({
      word, hp: 3, maxHp: 3,
      angle: (i / SHIELD_WORDS.length) * Math.PI * 2,
      radius: 230 + (i % 2) * 24,
    }));

    stateRef.current = {
      W, H, accent,
      t: 0, phaseT: 0,
      // Intro-specific
      intro: { dotPos, shieldFrom },
      // Entities
      player: { x: W * 0.5, y: H * 0.8, vx: 0, vy: 0, lives: 3, invuln: 0, trail: [], score: 0, _fireT: 0 },
      boss:   { x: W * 0.5, y: 130, w: 200, h: 200, hp: 100, maxHp: 100, img: bossImg, imgReady: !!bossSrc && false, bob: 0, shake: 0, particles: [] },
      shields: shieldData,
      bossBullets: [], playerBullets: [],
      patternT: { radial: 1.8, aim: 0.9, wall: 4.0 },
      mouseX: W * 0.5, mouseY: H * 0.8,
      words,
    };
    phaseRef.current = 'intro';
    tickHUD();
  }, [active]); // eslint-disable-line

  // Input.
  bhE(() => {
    if (!active) return;
    const onMove = (e) => { const s = stateRef.current; if (s) { s.mouseX = e.clientX; s.mouseY = e.clientY; } };
    const onTouch = (e) => { const s = stateRef.current; if (s && e.touches[0]) { s.mouseX = e.touches[0].clientX; s.mouseY = e.touches[0].clientY; } };
    const startGame = () => {
      if (phaseRef.current === 'ready') {
        phaseRef.current = 'dialogue';
        const s = stateRef.current;
        if (s) s.phaseT = 0;
        tickHUD();
      } else if (phaseRef.current === 'dialogue') {
        const s = stateRef.current;
        if (s && s.phaseT < 1.0) return; // minimum read time
        phaseRef.current = 'playing';
        if (s) { s.player.invuln = 1.2; s.phaseT = 0; }
        tickHUD();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { onExit(); return; }
      if (phaseRef.current === 'ready' || phaseRef.current === 'dialogue') { startGame(); return; }
      if ((e.key === 'r' || e.key === 'R') && (phaseRef.current === 'gameover' || phaseRef.current === 'victory')) {
        restartGame(stateRef.current);
        phaseRef.current = 'intro';
        tickHUD();
      }
    };
    const onClick = () => startGame();
    const onResize = () => { const s = stateRef.current; if (s) { s.W = window.innerWidth; s.H = window.innerHeight; s.boss.x = s.W * 0.5; } };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
    };
  }, [active, onExit, tickHUD]);

  // Game loop.
  bhE(() => {
    if (!active) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function sizeCanvas() {
      const s = stateRef.current; if (!s) return;
      canvas.width  = s.W * dpr; canvas.height = s.H * dpr;
      canvas.style.width = s.W + 'px'; canvas.style.height = s.H + 'px';
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    const ctx = canvas.getContext('2d');
    let raf = 0, last = performance.now(), hudCtr = 0;

    function loop(now) {
      raf = requestAnimationFrame(loop);
      const s = stateRef.current; if (!s) return;
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      s.t += dt; s.phaseT += dt;

      const phase = phaseRef.current;

      if (phase === 'intro') {
        if (s.phaseT >= INTRO_DURATION) {
          phaseRef.current = 'ready';
          s.phaseT = 0;
          tickHUD();
        }
      } else if (phase === 'ready' || phase === 'dialogue') {
        // waits for keypress — handled in input effect
      } else if (phase === 'playing') {
        updateGame(s, dt,
          () => { phaseRef.current = 'gameover'; tickHUD(); },
          () => {
            spawnDeathParticles(s);
            s.bossBullets = []; s.playerBullets = [];
            phaseRef.current = 'dying';
            s.phaseT = 0;
            tickHUD();
          }
        );
      } else if (phase === 'dying') {
        updateDying(s, dt);
        if (s.phaseT >= 3.2) {
          phaseRef.current = 'enemyfelled';
          s.phaseT = 0;
          tickHUD();
        }
      } else if (phase === 'enemyfelled') {
        if (s.phaseT >= 5.8) {
          phaseRef.current = 'victory';
          tickHUD();
        }
      }

      draw(ctx, s, phaseRef.current);
      if (++hudCtr % 8 === 0) tickHUD();
    }
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', sizeCanvas); };
  }, [active, tickHUD]);

  if (!active) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483646, cursor: 'none' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, display: 'block' }} />
      <GameOverlay accent={accent} phase={phaseRef.current} state={stateRef.current} onExit={onExit} />
    </div>
  );
}

// ─── game update ─────────────────────────────────────────────────────────────
function updateGame(s, dt, onDie, onWin) {
  const pl = s.player;
  // Player tracks mouse — lerp avoids overshoot/oscillation.
  const f = Math.min(1, dt * 14);
  pl.x = lerp(pl.x, clamp(s.mouseX, 20, s.W - 20), f);
  pl.y = lerp(pl.y, clamp(s.mouseY, 20, s.H - 20), f);
  if (pl.invuln > 0) pl.invuln -= dt;
  pl.trail.push({ x: pl.x, y: pl.y });
  if (pl.trail.length > 12) pl.trail.shift();

  // Auto-fire. Phase 2 = spread shot.
  pl._fireT -= dt;
  if (pl._fireT <= 0) {
    pl._fireT = 0.18;
    s.playerBullets.push({ x: pl.x, y: pl.y - 12, vx: 0, vy: -720 });
    if (s.boss.hp < s.boss.maxHp * 0.5) {
      s.playerBullets.push({ x: pl.x - 7, y: pl.y - 6, vx: -110, vy: -690 });
      s.playerBullets.push({ x: pl.x + 7, y: pl.y - 6, vx:  110, vy: -690 });
    }
  }

  s.boss.bob += dt;
  s.boss.shake = Math.max(0, s.boss.shake - dt * 5);

  // Patterns.
  const p2 = s.boss.hp < s.boss.maxHp * 0.5;
  const r  = p2 ? 0.62 : 1.0;
  s.patternT.radial -= dt; s.patternT.aim -= dt; s.patternT.wall -= dt;
  if (s.patternT.radial <= 0) { s.patternT.radial = 2.6 * r; fireRadial(s); }
  if (s.patternT.aim    <= 0) { s.patternT.aim    = 0.9 * r; fireAim(s); }
  if (s.patternT.wall   <= 0) { s.patternT.wall   = 4.5 * r; fireWall(s); }

  // Move boss bullets, check player collision.
  for (let i = s.bossBullets.length - 1; i >= 0; i--) {
    const b = s.bossBullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (pl.invuln <= 0) {
      const dx = b.x - pl.x, dy = b.y - pl.y;
      if (Math.abs(dx) < b.hw + 7 && Math.abs(dy) < 10) {
        pl.lives--; pl.invuln = 1.5;
        s.boss.shake = 0.3;
        s.bossBullets.splice(i, 1);
        if (pl.lives <= 0) onDie();
        continue;
      }
    }
    if (b.life <= 0 || b.y > s.H + 60 || b.y < -80 || b.x < -120 || b.x > s.W + 120) {
      s.bossBullets.splice(i, 1);
    }
  }

  // Move player bullets, collide with shields and boss.
  for (let i = s.playerBullets.length - 1; i >= 0; i--) {
    const b = s.playerBullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -20 || b.x < -20 || b.x > s.W + 20) { s.playerBullets.splice(i, 1); continue; }
    let hit = false;
    for (const sh of s.shields) {
      if (sh.hp <= 0) continue;
      const sx = s.boss.x + Math.cos(sh.angle) * sh.radius;
      const sy = s.boss.y + Math.sin(sh.angle) * sh.radius * 0.52;
      const hw = sh.word.length * 4.5 + 8;
      if (b.x > sx - hw && b.x < sx + hw && b.y > sy - 14 && b.y < sy + 14) {
        sh.hp--; s.playerBullets.splice(i, 1); hit = true; break;
      }
    }
    if (hit) continue;
    const dx = b.x - s.boss.x, dy = b.y - s.boss.y;
    if (Math.abs(dx) < s.boss.w * 0.44 && Math.abs(dy) < s.boss.h * 0.44) {
      s.boss.hp -= 0.9; s.boss.shake = 0.18; pl.score += 10;
      s.playerBullets.splice(i, 1);
      if (s.boss.hp <= 0) { s.boss.hp = 0; onWin(); }
    }
  }

  // Shields rotate.
  const rotSpeed = p2 ? 0.34 : 0.22;
  for (const sh of s.shields) sh.angle += dt * rotSpeed;
}

function fireRadial(s) {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
    spawnWord(s, s.boss.x, s.boss.y + 50, Math.cos(a) * 95, Math.sin(a) * 95 + 25);
  }
}
function fireAim(s) {
  const a = Math.atan2(s.player.y - s.boss.y, s.player.x - s.boss.x);
  spawnWord(s, s.boss.x, s.boss.y + 50, Math.cos(a) * 210, Math.sin(a) * 210);
}
function fireWall(s) {
  const n = 8, gap = 1 + Math.floor(Math.random() * (n - 2));
  for (let i = 0; i < n; i++) {
    if (i === gap) continue;
    spawnWord(s, (i + 1) * s.W / (n + 1), 220, 0, 165);
  }
}
function spawnWord(s, x, y, vx, vy) {
  const text = s.words[(Math.random() * s.words.length) | 0] || 'reward';
  s.bossBullets.push({ x, y, vx, vy, text, hw: text.length * 4.2, life: 9 });
}

function spawnDeathParticles(s) {
  const { boss, accent } = s;

  // Rising smoke/ash particles
  boss.particles = [];
  for (let i = 0; i < 220; i++) {
    const maxLife = 0.9 + Math.random() * 1.6;
    const spawnDelay = Math.random() * 2.4;
    boss.particles.push({
      x0: boss.x + (Math.random() - 0.5) * boss.w * 0.92,
      y0: boss.y + (Math.random() - 0.5) * boss.h * 0.92,
      x: 0, y: 0, spawned: false,
      vx: (Math.random() - 0.5) * 14,
      vy: -(10 + Math.random() * 28),
      size: 1.5 + Math.random() * 4,
      life: maxLife, maxLife, spawnDelay,
      color: Math.random() < 0.35 ? accent : (Math.random() < 0.5 ? '#e8e5dd' : '#c8b898'),
    });
  }

  // Pixel-dissolve grid — shuffled so cells vanish in random order
  const COLS = 20, ROWS = 20;
  const order = Array.from({ length: COLS * ROWS }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const dyingDuration = 3.0;
  boss.dissolveGrid = order.map((idx, rank) => ({
    col: idx % COLS,
    row: Math.floor(idx / COLS),
    dissolveAt: (rank / order.length) * dyingDuration,
  }));
  boss.dissolveGridDims = { cols: COLS, rows: ROWS };
}

function updateDying(s, dt) {
  const elapsed = s.phaseT;
  for (const p of s.boss.particles) {
    if (!p.spawned) {
      if (elapsed >= p.spawnDelay) { p.spawned = true; p.x = p.x0; p.y = p.y0; }
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  s.boss.particles = s.boss.particles.filter(p => !p.spawned || p.life > 0);
}

function restartGame(s) {
  if (!s) return;
  s.player = { x: s.W * 0.5, y: s.H * 0.8, vx: 0, vy: 0, lives: 3, invuln: 1.2, trail: [], score: 0, _fireT: 0 };
  s.boss.hp = s.boss.maxHp; s.boss.shake = 0; s.boss.particles = []; s.boss.dissolveGrid = null;
  s.bossBullets = []; s.playerBullets = [];
  s.shields = SHIELD_WORDS.map((word, i) => ({
    word, hp: 3, maxHp: 3,
    angle: (i / SHIELD_WORDS.length) * Math.PI * 2,
    radius: 230 + (i % 2) * 24,
  }));
  s.patternT = { radial: 1.8, aim: 0.9, wall: 4.0 };
  s.t = 0; s.phaseT = 0;
}

// ─── draw ─────────────────────────────────────────────────────────────────────
function draw(ctx, s, phase) {
  const { W, H, accent } = s;
  ctx.clearRect(0, 0, W, H);

  if (phase === 'intro' || phase === 'ready') {
    drawIntro(ctx, s, phase);
    return;
  }
  if (phase === 'dialogue') {
    drawDialogue(ctx, s);
    return;
  }

  if (phase === 'enemyfelled') { drawEnemyFelled(ctx, s); return; }

  // Dark backdrop with subtle grid.
  ctx.fillStyle = 'rgba(10,7,4,0.92)';
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx, W, H);

  if (phase === 'dying') { drawDying(ctx, s); return; }
  if (phase === 'victory' || phase === 'gameover') return;

  // Shields + boss + bullets + player.
  drawBossEntity(ctx, s, 1);
  s.shields.forEach((sh) => {
    if (sh.hp <= 0) return;
    const x = s.boss.x + Math.cos(sh.angle) * sh.radius;
    const y = s.boss.y + Math.sin(sh.angle) * sh.radius * 0.52;
    drawShield(ctx, x, y, sh, accent);
  });
  drawWordBullets(ctx, s.bossBullets);
  drawPlayerBullets(ctx, s.playerBullets, accent);
  drawPlayer(ctx, s.player, accent);
  drawHUD(ctx, s);
}

function drawIntro(ctx, s, phase) {
  const { W, H, accent, boss, intro, shields } = s;
  const isReady = phase === 'ready';
  const t = isReady ? INTRO_DURATION : s.phaseT;

  // 1. Dark veil — rises over 1.6 s.
  const veilA = ease(t / 1.6) * 0.88;
  ctx.fillStyle = `rgba(10,7,4,${veilA})`;
  ctx.fillRect(0, 0, W, H);

  if (veilA > 0.05) drawGrid(ctx, W, H);

  // 2. Boss descends from off-screen — 0.3 → 1.8s.
  const bossProgress = ease((t - 0.3) / 1.5);
  const bossDrawY    = lerp(-280, boss.y, bossProgress);
  if (bossProgress > 0) {
    ctx.save();
    ctx.translate(boss.x, bossDrawY + Math.sin(s.t * 1.2) * 4);
    drawBossImage(ctx, boss, accent, bossProgress);
    ctx.restore();
  }

  // 3. Shield words fly from their DOM origins to orbit — staggered 0.9 → 3.2s.
  shields.forEach((sh, i) => {
    const startT = 0.9 + i * 0.32;
    const prog   = ease((t - startT) / 1.1);
    if (prog <= 0) return;
    const from = intro.shieldFrom[i] || { x: W * 0.5, y: H * 0.3 };
    const toX  = boss.x + Math.cos(sh.angle) * sh.radius;
    const toY  = bossDrawY + Math.sin(sh.angle) * sh.radius * 0.52;
    const wx   = lerp(from.x, toX, prog);
    const wy   = lerp(from.y, toY, prog);
    ctx.globalAlpha = Math.min(1, prog * 3);
    drawShield(ctx, wx, wy, sh, accent);
    ctx.globalAlpha = 1;
  });

  // 4. Player hatches from the "." in the title — 2.2 → 3.4s.
  const playerProg = ease((t - 2.2) / 1.2);
  if (playerProg > 0) {
    const from = intro.dotPos;
    const toX  = W * 0.5, toY = H * 0.8;
    const px   = lerp(from.x, toX, playerProg);
    const py   = lerp(from.y, toY, playerProg);
    // Grows from a dot to a ship.
    const scale = ease(playerProg);
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(scale, scale);
    if (playerProg < 0.35) {
      // Pulsing dot at "." position.
      ctx.beginPath();
      ctx.arc(0, 0, 5 + Math.sin(t * 8) * 2, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
    } else {
      drawPlayerShape(ctx, accent);
    }
    ctx.restore();
  }

  // 5. Stage card — 3.6s → holds until keypress.
  const cardT   = isReady ? 1 : t - 3.6;
  const readyA  = ease(cardT / 0.4);
  if (readyA > 0) {
    ctx.globalAlpha = readyA;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('STAGE 01 · BOSS APPEARS', W / 2, H / 2 - 42);
    ctx.font = '800 56px "Source Serif 4", Georgia, serif';
    ctx.fillStyle = accent;
    ctx.fillText(BOSS_NAME, W / 2, H / 2);
    ctx.font = '500 12px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('mouse to move  ·  auto-fire  ·  esc to exit', W / 2, H / 2 + 38);
    ctx.globalAlpha = 1;
  }
  // 6. "Press any key" — only shown once in ready phase.
  if (isReady) {
    const blinkA = 0.5 + 0.5 * Math.sin(s.t * 3.8);
    ctx.globalAlpha = blinkA;
    ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('— press any key to begin —', W / 2, H / 2 + 66);
    ctx.globalAlpha = 1;
  }
}

function drawDialogue(ctx, s) {
  const { W, H, accent, phaseT: t, boss, shields, player } = s;

  ctx.fillStyle = 'rgba(10,7,4,0.92)';
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx, W, H);

  // Boss (bobbing at final position)
  ctx.save();
  ctx.translate(boss.x, boss.y + Math.sin(s.t * 1.2) * 4);
  drawBossImage(ctx, boss, accent, 1);
  ctx.restore();

  // Boss name plate below portrait
  ctx.globalAlpha = ease(t / 0.4);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('BOSS', boss.x, boss.y + boss.h * 0.5 + 14);
  ctx.font = '700 20px "Source Serif 4", Georgia, serif';
  ctx.fillStyle = accent;
  ctx.fillText(BOSS_NAME, boss.x, boss.y + boss.h * 0.5 + 28);
  ctx.globalAlpha = 1;

  // Shields orbiting
  shields.forEach((sh) => {
    if (sh.hp <= 0) return;
    const x = boss.x + Math.cos(sh.angle) * sh.radius;
    const y = boss.y + Math.sin(sh.angle) * sh.radius * 0.52;
    drawShield(ctx, x, y, sh, accent);
  });

  // Player at bottom
  ctx.save();
  ctx.translate(player.x, player.y);
  drawPlayerShape(ctx, accent);
  ctx.restore();

  // Dialogue box with typewriter text
  const diagA = ease((t - 0.2) / 0.4);
  if (diagA > 0) {
    const bx = W * 0.5, by = boss.y + boss.h * 0.5 + 62;
    const boxW = Math.min(440, W - 80), boxH = 60;
    ctx.globalAlpha = diagA;
    ctx.fillStyle = 'rgba(10,7,4,0.92)';
    ctx.fillRect(bx - boxW * 0.5, by, boxW, boxH);
    ctx.strokeStyle = accent + '99';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - boxW * 0.5, by, boxW, boxH);

    const fullText = 'Muahahahaha... You are no match for me.';
    const shown = Math.floor(ease(Math.max(0, (t - 0.5) / 3.6)) * fullText.length);
    ctx.font = 'italic 600 15px "Source Serif 4", Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#e8e5dd';
    ctx.fillText(fullText.slice(0, shown), bx, by + boxH * 0.5);
    ctx.globalAlpha = 1;
  }

  // "Press any key" prompt once dialogue finishes
  if (t > 4.5) {
    const blinkA = (0.5 + 0.5 * Math.sin(s.t * 3.8)) * ease((t - 4.5) / 0.4);
    ctx.globalAlpha = blinkA;
    ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('— press any key to fight —', W * 0.5, H * 0.82);
    ctx.globalAlpha = 1;
  }
}

function drawDying(ctx, s) {
  // bg + grid already drawn before this call
  const { accent, boss, phaseT: t } = s;

  // Draw boss image at full opacity
  ctx.save();
  ctx.translate(boss.x, boss.y);
  drawBossImage(ctx, boss, accent, 1);
  ctx.restore();

  // Pixel dissolve — eat away at the image with background-colored squares
  if (boss.dissolveGrid && boss.dissolveGridDims) {
    const { cols, rows } = boss.dissolveGridDims;
    const cw = (boss.w + 10) / cols, ch = (boss.h + 10) / rows;
    const left = boss.x - boss.w * 0.5 - 5, top = boss.y - boss.h * 0.5 - 5;
    ctx.fillStyle = '#0a0704';
    for (const cell of boss.dissolveGrid) {
      if (t >= cell.dissolveAt) {
        ctx.fillRect(left + cell.col * cw, top + cell.row * ch, cw + 0.5, ch + 0.5);
      }
    }
  }

  // Rising ash/smoke particles
  for (const p of boss.particles) {
    if (!p.spawned) continue;
    const a = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = a * 0.88;
    ctx.fillStyle = p.color;
    const sz = Math.max(0.5, p.size * (0.3 + a * 0.7));
    ctx.fillRect(p.x - sz * 0.5, p.y - sz * 0.5, sz, sz);
  }
  ctx.globalAlpha = 1;
}

function drawEnemyFelled(ctx, s) {
  const { W, H, phaseT: t } = s;

  ctx.fillStyle = 'rgba(8,6,4,0.97)';
  ctx.fillRect(0, 0, W, H);

  // Dark pause 0→2s, fade in 2.0→3.0s, hold, fade out 5.0→5.8s
  const fadeIn  = ease((t - 2.0) / 1.0);
  const fadeOut = ease((t - 5.0) / 0.6);
  const textA   = Math.max(0, fadeIn - fadeOut);
  if (textA <= 0) return;

  ctx.globalAlpha = textA;
  const cx = W * 0.5, cy = H * 0.5;
  const gold = '#d4be8a';

  // Side rules (Elden Ring style)
  ctx.strokeStyle = gold + '55';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(cx - 220, cy); ctx.lineTo(cx - 30, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 30, cy);  ctx.lineTo(cx + 220, cy); ctx.stroke();

  // Main text
  ctx.font = '300 54px "Source Serif 4", Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = gold;
  ctx.fillText('ENEMY FELLED', cx, cy);

  // Boss name subtitle
  ctx.font = '400 12px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = gold + '88';
  ctx.fillText(BOSS_NAME, cx, cy + 44);

  ctx.globalAlpha = 1;
}

function drawGrid(ctx, W, H) {
  ctx.strokeStyle = 'rgba(255,255,255,0.028)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawBossEntity(ctx, s, alpha) {
  const b = s.boss;
  const sh = b.shake > 0 ? (Math.random() - 0.5) * 8 * b.shake : 0;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(b.x + sh, b.y + Math.sin(b.bob * 1.3) * 5);
  drawBossImage(ctx, b, s.accent, 1);
  ctx.restore();
}

function drawBossImage(ctx, b, accent, alpha) {
  const { w, h } = b;
  // Glow.
  const grd = ctx.createRadialGradient(0, 0, 20, 0, 0, w * 0.9);
  grd.addColorStop(0, accent + '44');
  grd.addColorStop(1, accent + '00');
  ctx.fillStyle = grd;
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillRect(-w * 0.9, -h * 0.9, w * 1.8, h * 1.8);
  ctx.globalAlpha = alpha;

  // Frame.
  ctx.fillStyle = '#100e0c';
  ctx.fillRect(-w * 0.5 - 5, -h * 0.5 - 5, w + 10, h + 10);
  ctx.fillStyle = '#221e1a';
  ctx.fillRect(-w * 0.5, -h * 0.5, w, h);

  // Photo or placeholder.
  if (b.imgReady && b.img.naturalWidth) {
    const iw = b.img.naturalWidth, ih = b.img.naturalHeight;
    const sc = Math.max(w / iw, h / ih);
    ctx.save();
    ctx.beginPath(); ctx.rect(-w * 0.5, -h * 0.5, w, h); ctx.clip();
    ctx.drawImage(b.img, -iw * sc * 0.5, -ih * sc * 0.5, iw * sc, ih * sc);
    // Scanlines.
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let y = -h * 0.5; y < h * 0.5; y += 4) ctx.fillRect(-w * 0.5, y, w, 1);
    ctx.restore();
  } else {
    // MV placeholder.
    ctx.save();
    ctx.beginPath(); ctx.rect(-w * 0.5, -h * 0.5, w, h); ctx.clip();
    ctx.fillStyle = '#3a342d';
    for (let i = -w; i < w * 2; i += 14) ctx.fillRect(i, -h, 7, h * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
    ctx.fillStyle = '#e8e5dd';
    ctx.font = '900 80px "Source Serif 4", Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MV', 0, 4);
    ctx.restore();
  }

  // Corner brackets.
  ctx.strokeStyle = accent; ctx.lineWidth = 2;
  const len = 13, ox = w * 0.5 + 5, oy = h * 0.5 + 5;
  [[-ox,-oy,1,1],[ox,-oy,-1,1],[-ox,oy,1,-1],[ox,oy,-1,-1]].forEach(([x,y,sx,sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + len * sy); ctx.lineTo(x, y); ctx.lineTo(x + len * sx, y);
    ctx.stroke();
  });
}

function drawShield(ctx, x, y, sh, accent) {
  const a = 0.35 + (sh.hp / sh.maxHp) * 0.65;
  const tw = sh.word.length * 8.5 + 14, th = 22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(sh.angle * 0.7) * 0.05);
  // Subtle bg only (no harsh box).
  ctx.fillStyle = `rgba(232,229,221,${0.05 * a})`;
  ctx.fillRect(-tw * 0.5, -th * 0.5, tw, th);
  // HP dots.
  for (let i = 0; i < sh.maxHp; i++) {
    ctx.fillStyle = i < sh.hp ? accent : 'rgba(255,255,255,0.12)';
    ctx.fillRect(-tw * 0.5 + 4 + i * 6, th * 0.5 - 5, 4, 2);
  }
  // Glitch text.
  const gx = (Math.random() < 0.06) ? (Math.random() - 0.5) * 3 : 0;
  ctx.font = '600 13px "Source Serif 4", Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,80,80,${a * 0.55})`;
  ctx.fillText(sh.word, gx - 1, -0.5);
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fillText(sh.word, gx, 0);
  ctx.restore();
}

function drawWordBullets(ctx, bullets) {
  ctx.save();
  ctx.font = '600 12px "JetBrains Mono", ui-monospace, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const b of bullets) {
    ctx.shadowBlur  = 6;
    ctx.shadowColor = 'rgba(255,255,255,0.55)';
    ctx.fillStyle   = 'rgba(255,255,255,0.88)';
    ctx.fillText(b.text, b.x, b.y);
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPlayerBullets(ctx, bullets, accent) {
  ctx.fillStyle = accent;
  for (const b of bullets) ctx.fillRect(b.x - 1.5, b.y - 6, 3, 12);
}

function drawPlayerShape(ctx, accent) {
  // Ship body.
  ctx.fillStyle = accent;
  ctx.fillRect(-8, -8, 16, 16);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-4, -4, 8, 8);
  // Wings.
  ctx.fillStyle = accent;
  ctx.fillRect(-14, -2, 4, 4);
  ctx.fillRect(10, -2, 4, 4);
}

function drawPlayer(ctx, p, accent) {
  // Trail.
  for (let i = 0; i < p.trail.length; i++) {
    ctx.globalAlpha = (i / p.trail.length) * 0.3;
    ctx.fillStyle = accent;
    ctx.fillRect(p.trail[i].x - 1.5, p.trail[i].y - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;

  const visible = p.invuln <= 0 || Math.floor(p.invuln * 10) % 2 === 0;
  if (visible) {
    ctx.save();
    ctx.translate(p.x, p.y);
    drawPlayerShape(ctx, accent);
    ctx.restore();
  }

  // Crosshair cursor.
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(p.x - 18, p.y); ctx.lineTo(p.x - 11, p.y);
  ctx.moveTo(p.x + 11, p.y); ctx.lineTo(p.x + 18, p.y);
  ctx.moveTo(p.x, p.y - 18); ctx.lineTo(p.x, p.y - 11);
  ctx.moveTo(p.x, p.y + 11); ctx.lineTo(p.x, p.y + 18);
  ctx.stroke();
}

function drawHUD(ctx, s) {
  const { W, H, accent } = s;
  ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'top';

  // Boss health bar.
  const hpW = Math.min(500, W - 80), hpX = (W - hpW) / 2, hpY = 22;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';  ctx.fillRect(hpX, hpY, hpW, 6);
  ctx.fillStyle = s.boss.hp < s.boss.maxHp * 0.5 ? '#ff5555' : accent;
  ctx.fillRect(hpX, hpY, hpW * (s.boss.hp / s.boss.maxHp), 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
  ctx.strokeRect(hpX + 0.5, hpY + 0.5, hpW - 1, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.textAlign = 'left';  ctx.fillText(BOSS_NAME, hpX, hpY - 13);
  ctx.textAlign = 'right'; ctx.fillText(`${Math.ceil(s.boss.hp)} / ${s.boss.maxHp}`, hpX + hpW, hpY - 13);

  // Lives.
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('LIVES', 26, H - 34);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < s.player.lives ? accent : 'rgba(255,255,255,0.12)';
    ctx.fillRect(26 + i * 22, H - 28, 14, 14);
  }

  // Score.
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('SCORE', W - 26, H - 34);
  ctx.font = '700 18px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'bottom';
  ctx.fillText(String(s.player.score).padStart(5,'0'), W - 26, H - 18);
}

// ─── overlay (non-canvas) ────────────────────────────────────────────────────
function GameOverlay({ accent, phase, state, onExit }) {
  if (phase === 'gameover') {
    return <EndCard accent={accent} win={false}
                    score={state?.player.score ?? 0} onExit={onExit} />;
  }
  if (phase === 'victory') {
    return <EndCard accent={accent} win={true}
                    score={state?.player.score ?? 0} onExit={onExit} />;
  }
  if (phase === 'playing') {
    return (
      <button onClick={onExit} style={{
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(255,255,255,0.06)', color: '#fff',
        border: '1px solid rgba(255,255,255,0.18)',
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
        letterSpacing: '0.12em', padding: '6px 10px', cursor: 'pointer',
        zIndex: 1,
      }}>ESC · EXIT</button>
    );
  }
  return null;
}

function EndCard({ accent, win, score, onExit }) {
  const color = win ? accent : '#ff5555';
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'rgba(10,8,6,0.88)',
        border: `1px solid ${color}`,
        boxShadow: `0 0 60px ${color}33`,
        padding: '32px 52px', minWidth: 360, textAlign: 'center',
        fontFamily: '"JetBrains Mono", monospace', color: '#fff',
      }}>
        <div style={{ color, fontSize: 11, letterSpacing: '0.24em',
                      fontWeight: 700, marginBottom: 18, textTransform: 'uppercase' }}>
          {win ? 'Victory' : 'Defeated'}
        </div>
        <div style={{ fontFamily: '"Source Serif 4", Georgia, serif',
                      fontSize: 44, lineHeight: 1.05, marginBottom: 10 }}>
          {win ? 'well done.' : 'try again?'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11,
                      letterSpacing: '0.1em', marginBottom: 28 }}>
          score · {String(score).padStart(5, '0')}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={() => { restartGame(null); window.dispatchEvent(new KeyboardEvent('keydown',{key:'r'})); }}
                  style={{ background: accent, color: '#0a0a0c', border: 'none',
                           fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.14em',
                           fontWeight: 700, padding: '11px 18px', cursor: 'pointer', textTransform: 'uppercase' }}>
            R · Retry
          </button>
          <button onClick={onExit}
                  style={{ background: 'transparent', color: '#fff',
                           border: '1px solid rgba(255,255,255,0.22)',
                           fontFamily: 'inherit', fontSize: 11,
                           letterSpacing: '0.14em', padding: '11px 18px', cursor: 'pointer', textTransform: 'uppercase' }}>
            Esc · Exit
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { BulletHell });
