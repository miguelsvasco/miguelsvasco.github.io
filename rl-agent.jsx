// rl-agent.jsx
// A small Q-learning agent that actually learns to chase the cursor (or the
// last tap location on mobile). 25-state x 8-action Q-table, ε-greedy with
// decay. Renders inside whatever container ref you give it; visuals are
// fully theme-driven via the `theme` prop.

const { useRef, useEffect, useState, useCallback } = React;

// 8 movement actions (dx, dy) in pixels per step.
const ACTIONS = [
  [ 0, -1], [ 1, -1], [ 1, 0], [ 1, 1],
  [ 0,  1], [-1,  1], [-1, 0], [-1, -1],
];

// Discretize relative position into a 5-bin axis so we get 25 states.
function bin(d, scale) {
  const x = d / scale;
  if (x < -0.6) return 0;
  if (x < -0.15) return 1;
  if (x <  0.15) return 2;
  if (x <  0.6) return 3;
  return 4;
}
function stateIdx(dx, dy, scale) {
  return bin(dx, scale) * 5 + bin(dy, scale);
}

function newQ() {
  // Tiny random init so the agent looks confused at start.
  const q = new Float32Array(25 * 8);
  for (let i = 0; i < q.length; i++) q[i] = (Math.random() - 0.5) * 0.05;
  return q;
}

// useRLAgent — returns { agentRef, statsRef, reset, snapshot } and runs a
// rAF loop that mutates agent + stats refs in place. Re-renders the host
// only at ~10Hz for the HUD via `tick`.
function useRLAgent(containerRef, opts = {}) {
  const cfg = {
    speed:        2.4,     // pixels per simulation step
    stepsPerFrame: 3,      // simulation steps per rAF tick
    initialEps:   1.0,
    epsDecay:     0.9985,  // ~16s to drop to 0.05 from 1.0 at 60fps
    minEps:       0.05,
    lr:           0.18,
    gamma:        0.93,
    closeRadius:  16,      // px — counted as "reached target"
    scale:        160,     // px scale for state binning
    trailLen:     14,
    ...opts,
  };

  const Q = useRef(newQ());
  const agentRef = useRef({ x: 0, y: 0, ax: 0, ay: 0, trail: [] });
  const targetRef = useRef({ x: 0, y: 0, has: false });
  const statsRef = useRef({
    eps: cfg.initialEps,
    steps: 0,
    episodes: 0,
    reward: 0,
    avgReward: 0,
    captures: 0,
    lastDist: 0,
  });
  const [, setTick] = useState(0);
  const rafRef = useRef(0);
  const lastHudRef = useRef(0);

  const reset = useCallback(() => {
    Q.current = newQ();
    statsRef.current = {
      eps: cfg.initialEps, steps: 0, episodes: 0,
      reward: 0, avgReward: 0, captures: 0, lastDist: 0,
    };
    const c = containerRef.current;
    if (c) {
      const r = c.getBoundingClientRect();
      agentRef.current.x = r.width * 0.5;
      agentRef.current.y = r.height * 0.5;
      agentRef.current.trail = [];
    }
    setTick((t) => t + 1);
  }, []); // eslint-disable-line

  // Listen for cursor / taps inside the container.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    function rel(e) {
      const r = c.getBoundingClientRect();
      // Account for CSS transform scale (canvas may zoom artboards).
      const sx = r.width  / c.offsetWidth  || 1;
      const sy = r.height / c.offsetHeight || 1;
      const cx = (e.clientX - r.left) / sx;
      const cy = (e.clientY - r.top)  / sy;
      return { x: cx, y: cy };
    }
    function onMove(e) {
      const p = rel(e);
      const c2 = containerRef.current;
      if (!c2) return;
      if (p.x < 0 || p.y < 0 || p.x > c2.offsetWidth || p.y > c2.offsetHeight) {
        // outside — keep last target
        return;
      }
      targetRef.current = { x: p.x, y: p.y, has: true };
    }
    function onTap(e) {
      const p = rel(e.touches ? e.touches[0] : e);
      targetRef.current = { x: p.x, y: p.y, has: true };
    }
    window.addEventListener('mousemove', onMove);
    c.addEventListener('touchstart', onTap, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      c.removeEventListener('touchstart', onTap);
    };
  }, []); // eslint-disable-line

  // Initialize agent position on first layout.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    agentRef.current.x = c.offsetWidth * 0.5;
    agentRef.current.y = c.offsetHeight * 0.7;
  }, []); // eslint-disable-line

  // Simulation loop.
  useEffect(() => {
    let alive = true;
    function frame(t) {
      if (!alive) return;
      const c = containerRef.current;
      if (!c) { rafRef.current = requestAnimationFrame(frame); return; }
      const W = c.offsetWidth, H = c.offsetHeight;
      const stats = statsRef.current;
      const agent = agentRef.current;
      const tgt = targetRef.current;

      if (tgt.has) {
        for (let s = 0; s < cfg.stepsPerFrame; s++) {
          const dx = tgt.x - agent.x;
          const dy = tgt.y - agent.y;
          const dist = Math.hypot(dx, dy);
          const st = stateIdx(dx, dy, cfg.scale);
          // ε-greedy action selection.
          let a;
          if (Math.random() < stats.eps) {
            a = (Math.random() * 8) | 0;
          } else {
            let best = -Infinity, bi = 0;
            for (let i = 0; i < 8; i++) {
              const v = Q.current[st * 8 + i];
              if (v > best) { best = v; bi = i; }
            }
            a = bi;
          }
          // Step.
          const [dxA, dyA] = ACTIONS[a];
          const nx = Math.max(8, Math.min(W - 8, agent.x + dxA * cfg.speed));
          const ny = Math.max(8, Math.min(H - 8, agent.y + dyA * cfg.speed));
          agent.x = nx; agent.y = ny;

          const ndx = tgt.x - nx, ndy = tgt.y - ny;
          const ndist = Math.hypot(ndx, ndy);
          // Reward: shaped progress toward target + bonus for capture.
          const captured = ndist < cfg.closeRadius;
          let r = (dist - ndist) * 0.1;
          if (captured) { r += 5; stats.captures++; }

          const nst = stateIdx(ndx, ndy, cfg.scale);
          // Q-learning update.
          let maxQ = -Infinity;
          for (let i = 0; i < 8; i++) {
            const v = Q.current[nst * 8 + i];
            if (v > maxQ) maxQ = v;
          }
          const idx = st * 8 + a;
          const target = r + cfg.gamma * maxQ;
          Q.current[idx] += cfg.lr * (target - Q.current[idx]);

          // Stats / decay.
          stats.steps++;
          stats.reward += r;
          stats.avgReward = stats.avgReward * 0.995 + r * 0.005;
          stats.lastDist = ndist;
          if (stats.eps > cfg.minEps) stats.eps *= cfg.epsDecay;

          // Track the trail every few steps.
          if (stats.steps % 2 === 0) {
            agent.trail.push({ x: agent.x, y: agent.y });
            if (agent.trail.length > cfg.trailLen) agent.trail.shift();
          }
        }
      }

      // Render the visual via a custom draw fn the variant supplies.
      if (renderHandleRef.current) renderHandleRef.current(agent, stats, tgt);

      // Throttle HUD updates.
      if (t - lastHudRef.current > 100) {
        lastHudRef.current = t;
        setTick((x) => x + 1);
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, []); // eslint-disable-line

  const renderHandleRef = useRef(null);
  const onFrame = useCallback((fn) => { renderHandleRef.current = fn; }, []);

  return { agentRef, statsRef, reset, onFrame };
}

// RLAgent — drops itself absolutely inside containerRef. The `theme` prop
// controls visual style. The component itself manages its DOM via refs to
// avoid 60fps React renders.
//
//   theme: {
//     mode: 'sprite' | 'dot' | 'ink' | 'pixel',
//     accent: '#hex',
//     trail: boolean,
//     glow: boolean,
//     hud: 'minimal' | 'full' | 'none',
//     hudPosition: 'tl' | 'tr' | 'bl' | 'br',
//     label?: string,
//   }
function RLAgent({ containerRef, theme = {}, options = {} }) {
  const T = {
    mode: 'dot', accent: '#c96442', trail: true, glow: false,
    hud: 'minimal', hudPosition: 'br', label: 'AGENT',
    ...theme,
  };
  const spriteRef = useRef(null);
  const trailRef = useRef(null);
  const { agentRef, statsRef, reset, onFrame } = useRLAgent(containerRef, options);

  useEffect(() => {
    onFrame((agent, stats) => {
      const el = spriteRef.current;
      if (el) {
        el.style.transform = `translate3d(${agent.x - 8}px, ${agent.y - 8}px, 0)`;
      }
      const tEl = trailRef.current;
      if (tEl && T.trail) {
        let d = '';
        for (let i = 0; i < agent.trail.length; i++) {
          const p = agent.trail[i];
          d += (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ' ';
        }
        tEl.setAttribute('d', d);
      }
    });
  }, [T.trail]); // eslint-disable-line

  const stats = statsRef.current;
  const eps = stats.eps;
  const learn = 1 - (eps - 0.05) / 0.95;
  const learnPct = Math.max(0, Math.min(100, learn * 100));

  // Visual primitives per mode.
  let sprite = null;
  if (T.mode === 'dot') {
    sprite = (
      <div ref={spriteRef} style={{
        position: 'absolute', left: 0, top: 0, width: 16, height: 16,
        borderRadius: '50%', background: T.accent,
        boxShadow: T.glow ? `0 0 18px ${T.accent}, 0 0 36px ${T.accent}88` : 'none',
        pointerEvents: 'none', willChange: 'transform',
      }} />
    );
  } else if (T.mode === 'sprite') {
    // HUD-style square sprite with crosshair tick.
    sprite = (
      <div ref={spriteRef} style={{
        position: 'absolute', left: 0, top: 0, width: 16, height: 16,
        pointerEvents: 'none', willChange: 'transform',
      }}>
        <div style={{
          position: 'absolute', inset: 2, background: T.accent,
          boxShadow: T.glow ? `0 0 14px ${T.accent}, 0 0 28px ${T.accent}66` : 'none',
        }} />
        <div style={{ position: 'absolute', left: 7, top: -4, width: 2, height: 4, background: T.accent }} />
        <div style={{ position: 'absolute', left: 7, bottom: -4, width: 2, height: 4, background: T.accent }} />
        <div style={{ position: 'absolute', top: 7, left: -4, height: 2, width: 4, background: T.accent }} />
        <div style={{ position: 'absolute', top: 7, right: -4, height: 2, width: 4, background: T.accent }} />
      </div>
    );
  } else if (T.mode === 'ink') {
    // Editorial — an inky blot with slight asymmetry.
    sprite = (
      <div ref={spriteRef} style={{
        position: 'absolute', left: 0, top: 0, width: 16, height: 16,
        pointerEvents: 'none', willChange: 'transform',
      }}>
        <svg width="22" height="22" viewBox="-3 -3 22 22" style={{ overflow: 'visible' }}>
          <path
            d="M8 1 C 12 2, 14 5, 14 8 C 15 11, 11 15, 8 14 C 4 15, 1 11, 2 8 C 2 4, 4 1, 8 1 Z"
            fill={T.accent}
            style={{ filter: T.glow ? `drop-shadow(0 0 3px ${T.accent}66)` : 'none' }}
          />
        </svg>
      </div>
    );
  } else if (T.mode === 'pixel') {
    // 8-bit-y: 3x3 chunky pixel
    sprite = (
      <div ref={spriteRef} style={{
        position: 'absolute', left: 0, top: 0, width: 16, height: 16,
        pointerEvents: 'none', willChange: 'transform',
        imageRendering: 'pixelated',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 4, width: 16, height: 8, background: T.accent }} />
        <div style={{ position: 'absolute', left: 4, top: 0, width: 8, height: 16, background: T.accent }} />
      </div>
    );
  }

  // HUD readouts.
  let hud = null;
  if (T.hud !== 'none') {
    const pos = {
      tl: { top: 12, left: 12 },
      tr: { top: 12, right: 12 },
      bl: { bottom: 12, left: 12 },
      br: { bottom: 12, right: 12 },
    }[T.hudPosition];
    const hudStyle = {
      position: 'absolute', ...pos, zIndex: 5, pointerEvents: 'auto',
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 10, lineHeight: 1.4, color: T.accent,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      background: T.hudBg || 'rgba(0,0,0,0)',
      padding: T.hudBg ? '8px 10px' : 0,
      border: T.hudBg ? `1px solid ${T.accent}55` : 'none',
      userSelect: 'none', cursor: 'default',
    };
    if (T.hud === 'minimal') {
      hud = (
        <div style={hudStyle} title="A tiny Q-learning agent learning to chase your cursor.">
          {T.label} · learning {learnPct.toFixed(0)}%
        </div>
      );
    } else {
      hud = (
        <div style={hudStyle}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{T.label} v0.1</div>
          <div>steps&nbsp;&nbsp;&nbsp;{stats.steps.toLocaleString()}</div>
          <div>ε&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{eps.toFixed(3)}</div>
          <div>captures&nbsp;{stats.captures}</div>
          <div>r̄&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{stats.avgReward.toFixed(3)}</div>
          <div style={{
            marginTop: 6, width: 100, height: 3,
            background: `${T.accent}22`, position: 'relative',
          }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${learnPct}%`, background: T.accent,
            }} />
          </div>
          <button
            onClick={reset}
            style={{
              marginTop: 6, background: 'transparent',
              border: `1px solid ${T.accent}55`, color: T.accent,
              font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit',
              padding: '3px 6px', cursor: 'pointer',
            }}
          >reset</button>
        </div>
      );
    }
  }

  return (
    <>
      {T.trail && (
        <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
          <path ref={trailRef} fill="none" stroke={T.accent}
                strokeWidth={T.mode === 'pixel' ? 2 : 1.2}
                strokeOpacity={T.trailOpacity ?? 0.32}
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}>
        {sprite}
      </div>
      {hud}
    </>
  );
}

Object.assign(window, { RLAgent });
