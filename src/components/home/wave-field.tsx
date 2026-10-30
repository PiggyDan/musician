"use client";

import { useEffect, useRef } from "react";
import { audioEngine } from "@/audio/engine";
import { cn } from "@/lib/cn";

interface Strand {
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  offset: number;
  hue: number;
}

interface Ripple {
  x: number;
  born: number;
  strength: number;
}

const STRANDS = 9;
const MAX_DPR = 2;

/**
 * Hero visualization: luminous wave strands that bend toward the pointer and
 * swell with every note played (from any input). Pauses offscreen and when the
 * tab is hidden; renders a single still frame with reduced motion.
 */
export function WaveField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const strands: Strand[] = Array.from({ length: STRANDS }, (_, i) => ({
      amplitude: 26 + i * 5,
      frequency: 0.0016 + i * 0.00023,
      speed: 0.00022 + i * 0.000035,
      phase: i * 0.9,
      offset: (i - (STRANDS - 1) / 2) * 9,
      hue: 252 - i * 9, // violet → cyan
    }));
    const ripples: Ripple[] = [];
    const pointer = { x: 0.62, y: 0.5, tx: 0.62, ty: 0.5, presence: 0, targetPresence: 0 };
    let energy = 0.15;
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) draw(performance.now());
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;
      pointer.presence += (pointer.targetPresence - pointer.presence) * 0.04;
      energy += (0.15 - energy) * 0.025;

      for (let r = ripples.length - 1; r >= 0; r -= 1) {
        if (time - ripples[r].born > 2200) ripples.splice(r, 1);
      }

      const midY = height * 0.56;
      const px = pointer.x * width;
      const py = pointer.y * height;
      const step = Math.max(4, Math.round(width / 260));

      strands.forEach((strand, index) => {
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, `hsla(${strand.hue + 20}, 95%, 66%, 0)`);
        gradient.addColorStop(0.3, `hsla(${strand.hue}, 95%, 68%, ${0.18 + energy * 0.3})`);
        gradient.addColorStop(0.7, `hsla(${strand.hue - 30}, 95%, 64%, ${0.2 + energy * 0.3})`);
        gradient.addColorStop(1, `hsla(${strand.hue - 40}, 95%, 60%, 0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = index === Math.floor(STRANDS / 2) ? 1.8 : 1.1;
        ctx.beginPath();

        for (let x = 0; x <= width + step; x += step) {
          const t = time * strand.speed;
          let y =
            Math.sin(x * strand.frequency + t + strand.phase) * strand.amplitude * (0.7 + energy) +
            Math.sin(x * strand.frequency * 2.3 - t * 1.4 + index) * strand.amplitude * 0.25;

          // Pointer pulls nearby strands toward it.
          const dx = (x - px) / (width * 0.18);
          const pull = Math.exp(-dx * dx) * pointer.presence;
          y += (py - midY - strand.offset) * pull * 0.55;

          // Note ripples travel outward from where the note sits on the keyboard.
          for (const ripple of ripples) {
            const age = (time - ripple.born) / 1000;
            const distance = Math.abs(x - ripple.x * width) - age * width * 0.35;
            const envelope = Math.exp(-(distance * distance) / 2400) * Math.exp(-age * 1.6);
            y += Math.sin(distance * 0.05) * 30 * ripple.strength * envelope;
          }

          const screenY = midY + strand.offset + y;
          if (x === 0) ctx.moveTo(x, screenY);
          else ctx.lineTo(x, screenY);
        }
        ctx.stroke();
      });

      ctx.globalCompositeOperation = "source-over";
    };

    const loop = (time: number) => {
      draw(time);
      frame = visible && document.visibilityState === "visible" ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!reduceMotion && !frame) frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.tx = (event.clientX - rect.left) / rect.width;
      pointer.ty = (event.clientY - rect.top) / rect.height;
      pointer.targetPresence = pointer.ty > -0.1 && pointer.ty < 1.1 ? 1 : 0;
    };
    const onPointerLeave = () => {
      pointer.targetPresence = 0;
    };

    const unsubscribe = audioEngine.subscribeNotes((event) => {
      if (event.type !== "on") return;
      energy = Math.min(1.2, energy + 0.22 + event.velocity * 0.15);
      // Map C2–C7 across the canvas width.
      const x = Math.min(1, Math.max(0, (event.midi - 36) / 60));
      ripples.push({ x, born: performance.now(), strength: 0.6 + event.velocity * 0.6 });
      if (ripples.length > 12) ripples.shift();
      if (reduceMotion) draw(performance.now());
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    intersection.observe(canvas);
    const onVisibility = () => document.visibilityState === "visible" && start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    resize();
    if (reduceMotion) draw(performance.now());
    else start();

    return () => {
      cancelAnimationFrame(frame);
      unsubscribe();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={cn("block h-full w-full", className)} />;
}
