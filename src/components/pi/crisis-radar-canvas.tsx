"use client";

/* ============================================================
 * PIE UI — CrisisRadarCanvas
 * The hero visual: a living particle network where every node is
 * a patient twin from the live Crisis Radar sweep.
 *
 *   Stable twins    → cyan pulses  (#06b6d4)  gentle breathing
 *   Watchlist twins → amber throb  (#f59e0b)  slow, heavy
 *   Critical twins  → crimson beat (#ef4444)  rhythmic, urgent
 *
 * A rotating radar sweep crosses the field; nodes flare as the
 * beam passes. Rendered on <canvas> for 60fps at any DPR.
 *
 * [PIE API] `nodes` inject from runRadar() rows (server component
 * passes band + score per patient). Ambient nodes are synthetic
 * filler to suggest the full cohort around the sampled sweep.
 * ============================================================ */

import { useEffect, useRef } from "react";

export interface RadarNode {
  id: string;
  band: string; // "green" | "yellow" | "red"
  score: number;
}

const BAND_COLOR: Record<string, string> = {
  green: "6, 182, 212", // electric cyan — healthy signal
  yellow: "245, 158, 11", // warm amber — caution
  red: "239, 68, 68", // crimson — critical
};

const PULSE_SPEC: Record<string, { freq: number; amp: number; base: number }> = {
  green: { freq: 1.1, amp: 0.18, base: 2.4 },
  yellow: { freq: 0.55, amp: 0.42, base: 3.2 },
  red: { freq: 1.7, amp: 0.6, base: 3.8 },
};

interface Sim {
  x: number; y: number; // relative 0..1
  vx: number; vy: number;
  phase: number;
  band: string;
  score: number;
  real: boolean;
  flare: number; // 0..1 sweep flare decay
}

/** Deterministic PRNG so SSR → client hydration produces identical layout. */
function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function CrisisRadarCanvas({ nodes, className }: { nodes: RadarNode[]; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<RadarNode[]>(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1;
    let sim: Sim[] = [];
    let edges: [number, number][] = [];
    let raf = 0;
    let sweep = -Math.PI / 2;
    let last = performance.now();

    function build() {
      const rng = mulberry(42 + nodesRef.current.length * 7);
      const real = nodesRef.current.slice(0, 10).map((n, i) => ({
        x: 0.14 + rng() * 0.42,
        y: 0.12 + rng() * 0.76,
        vx: (rng() - 0.5) * 0.00006,
        vy: (rng() - 0.5) * 0.00006,
        phase: rng() * Math.PI * 2,
        band: n.band,
        score: n.score,
        real: true,
        flare: i === 0 ? 1 : 0,
      }));
      const ambient: Sim[] = Array.from({ length: 34 }, () => ({
        x: 0.04 + rng() * 0.9,
        y: 0.06 + rng() * 0.88,
        vx: (rng() - 0.5) * 0.00005,
        vy: (rng() - 0.5) * 0.00005,
        phase: rng() * Math.PI * 2,
        band: "green",
        score: 0,
        real: false,
        flare: 0,
      }));
      sim = [...real, ...ambient];

      // k-nearest edges for the constellation look (real nodes connect more)
      edges = [];
      for (let i = 0; i < sim.length; i++) {
        const dists: { j: number; d: number }[] = [];
        for (let j = 0; j < sim.length; j++) {
          if (i === j) continue;
          const dx = sim[i].x - sim[j].x, dy = sim[i].y - sim[j].y;
          dists.push({ j, d: dx * dx + dy * dy });
        }
        dists.sort((a, b) => a.d - b.d);
        const k = sim[i].real ? 3 : 2;
        for (let n = 0; n < k && n < dists.length; n++) {
          const j = dists[n].j;
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (!edges.some(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`) === key)) {
            edges.push([i, j]);
          }
        }
      }
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas!.width = Math.max(1, Math.round(w * dpr));
      canvas!.height = Math.max(1, Math.round(h * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!sim.length) build();
    }

    function frame(now: number) {
      const dt = Math.min(64, now - last);
      last = now;
      sweep += dt * 0.0009; // ~7s per revolution
      draw(now / 1000, dt);
      raf = requestAnimationFrame(frame);
    }

    function draw(t: number, dt: number) {
      const c = ctx!;
      c.clearRect(0, 0, w, h);

      // update positions + sweep flare
      for (const n of sim) {
        n.x += n.vx * dt; n.y += n.vy * dt;
        if (n.x < 0.03 || n.x > 0.97) n.vx *= -1;
        if (n.y < 0.04 || n.y > 0.96) n.vy *= -1;
        // angle from center vs sweep angle → flare when beam crosses
        const cx = n.x - 0.5, cy = n.y - 0.5;
        let a = Math.atan2(cy, cx) - sweep;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        const cross = Math.abs(a) < 0.06;
        n.flare = cross ? 1 : Math.max(0, n.flare - dt / 900);
      }

      // edges
      for (const [i, j] of edges) {
        const a = sim[i], b = sim[j];
        const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
        const col = a.real ? a.band : b.real ? b.band : "green";
        const alpha = 0.08 + 0.16 * Math.max(a.flare, b.flare) + (a.real && b.real ? 0.14 : 0);
        c.strokeStyle = `rgba(${BAND_COLOR[col]}, ${alpha.toFixed(3)})`;
        c.lineWidth = 1;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
      }

      // instrument rings + crosshair — reads as a radar instrument,
      // not just a particle field
      const icx = w * 0.5, icy = h * 0.5;
      const iR = Math.min(w, h) * 0.46;
      c.strokeStyle = "rgba(125, 211, 252, 0.09)";
      c.lineWidth = 1;
      for (const f of [0.35, 0.62, 0.88]) {
        c.beginPath(); c.arc(icx, icy, iR * f, 0, Math.PI * 2); c.stroke();
      }
      c.strokeStyle = "rgba(125, 211, 252, 0.055)";
      c.beginPath(); c.moveTo(icx - iR, icy); c.lineTo(icx + iR, icy); c.stroke();
      c.beginPath(); c.moveTo(icx, icy - iR); c.lineTo(icx, icy + iR); c.stroke();
      c.fillStyle = "rgba(125, 211, 252, 0.30)";
      c.beginPath(); c.arc(icx, icy, 1.6, 0, Math.PI * 2); c.fill();

      // radar sweep beam (conic wedge fading behind the line)
      const scx = w * 0.5, scy = h * 0.5;
      const beamLen = Math.hypot(w, h) * 0.62;
      const grad = c.createConicGradient ? c.createConicGradient(sweep, scx, scy) : null;
      if (grad) {
        grad.addColorStop(0, "rgba(56,189,248,0)");
        grad.addColorStop(0.985, "rgba(56,189,248,0.05)");
        grad.addColorStop(1, "rgba(56,189,248,0.13)");
        c.fillStyle = grad;
        c.beginPath(); c.moveTo(scx, scy); c.arc(scx, scy, beamLen, sweep - 0.0, sweep + Math.PI * 2); c.fill();
      }
      // leading edge line
      c.strokeStyle = "rgba(125,211,252,0.32)";
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(scx, scy);
      c.lineTo(scx + Math.cos(sweep) * beamLen, scy + Math.sin(sweep) * beamLen);
      c.stroke();

      // nodes
      for (const n of sim) {
        const x = n.x * w, y = n.y * h;
        const spec = PULSE_SPEC[n.band] ?? PULSE_SPEC.green;
        const pulse = 1 + spec.amp * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * spec.freq + n.phase));
        const radius = (n.real ? spec.base + n.score / 34 : 1.6) * pulse + n.flare * 2.4;
        const rgb = BAND_COLOR[n.band] ?? BAND_COLOR.green;
        const baseAlpha = n.real ? 0.95 : 0.42;

        // halo
        const halo = c.createRadialGradient(x, y, 0, x, y, radius * 5.5);
        halo.addColorStop(0, `rgba(${rgb},${(0.30 + n.flare * 0.35).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = halo;
        c.beginPath(); c.arc(x, y, radius * 5.5, 0, Math.PI * 2); c.fill();

        // core
        c.fillStyle = `rgba(${rgb},${Math.min(1, baseAlpha + n.flare * 0.15).toFixed(3)})`;
        c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();

        // crisp center for real twins
        if (n.real) {
          c.fillStyle = "rgba(224,242,254,0.95)";
          c.beginPath(); c.arc(x, y, 1.2, 0, Math.PI * 2); c.fill();
          // tracked-target ring — brightens as the sweep passes
          c.strokeStyle = `rgba(125,211,252,${(0.28 + n.flare * 0.55).toFixed(3)})`;
          c.lineWidth = 1;
          c.beginPath(); c.arc(x, y, radius + 3.5 + n.flare * 2, 0, Math.PI * 2); c.stroke();
        }
      }
    }

    resize();
    const ro = new ResizeObserver(() => { resize(); if (reduced) draw(0, 16); });
    ro.observe(canvas);

    if (reduced) {
      draw(0, 16); // static constellation, no loop
    } else {
      raf = requestAnimationFrame(frame);
      const onVis = () => {
        if (document.hidden) { cancelAnimationFrame(raf); }
        else { last = performance.now(); raf = requestAnimationFrame(frame); }
      };
      document.addEventListener("visibilitychange", onVis);
      return () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVis);
        ro.disconnect();
      };
    }
    return () => ro.disconnect();
  }, []);

  const critical = nodes.filter((n) => n.band === "red").length;
  const watch = nodes.filter((n) => n.band === "yellow").length;
  const stable = nodes.length - critical - watch;

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        role="img"
        aria-label={`Live crisis radar: ${stable} stable twins pulsing cyan, ${watch} on the watchlist throbbing amber, ${critical} critical beating crimson. A sweep beam continuously rescans the cohort.`}
      />
    </div>
  );
}
