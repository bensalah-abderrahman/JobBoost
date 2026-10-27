"use client";

import { useEffect, useRef } from "react";
import type { PointerEvent, ReactNode } from "react";
import {
  BriefcaseBusiness,
  Check,
  FileText,
  Mail,
  Search,
  Sparkles,
} from "lucide-react";

// Faces du cube : le parcours d'une candidature.
const CUBE_FACES = [
  { icon: Search, transform: "rotateY(0deg) translateZ(34px)" },
  { icon: Sparkles, transform: "rotateY(90deg) translateZ(34px)" },
  { icon: FileText, transform: "rotateY(180deg) translateZ(34px)" },
  { icon: Mail, transform: "rotateY(270deg) translateZ(34px)" },
  { icon: BriefcaseBusiness, transform: "rotateX(90deg) translateZ(34px)" },
  { icon: Check, transform: "rotateX(-90deg) translateZ(34px)" },
];

// Fond fluide : des masses de couleur qui dérivent, et une qui suit le curseur.
const BLOBS = [
  { color: "124,58,237", r: 0.42, fx: 0.00031, fy: 0.00043, px: 0.0, py: 1.3 },
  { color: "168,85,247", r: 0.36, fx: 0.00047, fy: 0.00029, px: 2.1, py: 0.4 },
  { color: "217,70,239", r: 0.30, fx: 0.00036, fy: 0.00052, px: 4.0, py: 2.6 },
  { color: "99,102,241", r: 0.38, fx: 0.00025, fy: 0.00038, px: 5.2, py: 3.9 },
];

function runFluid(canvas: HTMLCanvasElement, pointer: { x: number; y: number }) {
  const context = canvas.getContext("2d");
  if (!context) return () => undefined;

  let width = 0;
  let height = 0;
  let frame = 0;
  let follow = { x: 0.5, y: 0.5 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    context!.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function blob(x: number, y: number, radius: number, color: string, alpha: number) {
    const gradient = context!.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${color},${alpha})`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    context!.fillStyle = gradient;
    context!.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  function draw(time: number) {
    const dark = document.documentElement.classList.contains("dark");
    const size = Math.min(width, height);

    context!.clearRect(0, 0, width, height);
    context!.globalCompositeOperation = dark ? "lighter" : "source-over";

    for (const item of BLOBS) {
      const x = width * (0.5 + 0.38 * Math.sin(time * item.fx + item.px));
      const y = height * (0.5 + 0.38 * Math.cos(time * item.fy + item.py));
      blob(x, y, size * item.r * 1.15, item.color, dark ? 0.3 : 0.2);
    }

    // La masse qui suit le curseur, avec de l'inertie.
    follow.x += (pointer.x - follow.x) * 0.045;
    follow.y += (pointer.y - follow.y) * 0.045;
    blob(follow.x * width, follow.y * height, size * 0.3, "192,132,252", dark ? 0.42 : 0.3);

    frame = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  frame = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
  };
}

const css = `
@keyframes jb-cube-spin {
  from { transform: rotateX(-24deg) rotateY(0deg); }
  to   { transform: rotateX(-24deg) rotateY(360deg); }
}
@keyframes jb-cube-float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-7px); }
}
@keyframes jb-shadow-pulse {
  0%, 100% { transform: scale(1);   opacity: .45; }
  50%      { transform: scale(.82); opacity: .28; }
}
.jb-cube-spin { animation: jb-cube-spin 16s linear infinite; }
.jb-cube-float { animation: jb-cube-float 4.5s ease-in-out infinite; }
.jb-cube-shadow { animation: jb-shadow-pulse 4.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .jb-cube-spin { animation-duration: 48s; }
  .jb-cube-float, .jb-cube-shadow { animation-duration: 9s; }
}
`;

export default function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5 });
  const cardRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    return runFluid(canvasRef.current, pointerRef.current);
  }, []);

  // Inclinaison 3D de la carte et du cube selon la souris.
  function onPointerMove(event: PointerEvent<HTMLElement>) {
    pointerRef.current.x = event.clientX / window.innerWidth;
    pointerRef.current.y = event.clientY / window.innerHeight;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const x = pointerRef.current.x - 0.5;
    const y = pointerRef.current.y - 0.5;

    if (cardRef.current) {
      cardRef.current.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
    }
    if (cubeRef.current) {
      cubeRef.current.style.transform = `rotateY(${x * 28}deg) rotateX(${-y * 18}deg)`;
    }
  }

  function onPointerLeave() {
    if (cardRef.current) cardRef.current.style.transform = "";
    if (cubeRef.current) cubeRef.current.style.transform = "";
  }
  return (
    <main
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--jb-background)] px-4 py-12 text-[var(--jb-text)]"
    >
      <style>{css}</style>

      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 h-full w-full"
      />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Marque */}
        <div className="mb-8 flex flex-col items-center">
          <div
            className="relative h-[96px] w-[96px]"
            style={{ perspective: "520px" }}
          >
            <div
              ref={cubeRef}
              className="h-full w-full transition-transform duration-200 ease-out"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className="jb-cube-float flex h-full w-full items-center justify-center"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="jb-cube-spin relative h-[68px] w-[68px]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {CUBE_FACES.map(({ icon: Icon, transform }, index) => (
                    <div
                      key={index}
                      className="absolute inset-0 flex items-center justify-center rounded-[14px] border border-white/25 text-white"
                      style={{
                        transform,
                        background:
                          "linear-gradient(135deg, rgba(124,58,237,0.92), rgba(168,85,247,0.82))",
                        boxShadow: "inset 0 0 18px rgba(255,255,255,0.12)",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      <Icon size={24} strokeWidth={2} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              aria-hidden
              className="jb-cube-shadow absolute -bottom-2 left-1/2 h-3 w-14 -translate-x-1/2 rounded-full bg-violet-600/40 blur-md"
            />
          </div>

          <p className="mt-5 text-[20px] font-bold tracking-[-0.02em]">
            JobBoost AI
          </p>
          <p className="mt-0.5 text-[13px] text-[var(--jb-muted)]">
            Recherche d'emploi et candidatures
          </p>
        </div>

        {/* Carte */}
        <div style={{ perspective: "1100px" }}>
        <div
          ref={cardRef}
          className="rounded-[20px] border border-[var(--jb-border)] bg-[var(--jb-surface)] p-7 transition-transform duration-200 ease-out"
          style={{ boxShadow: "0 18px 50px rgba(88, 28, 135, 0.10)" }}
        >
          <h1 className="text-[18px] font-semibold tracking-[-0.015em]">
            {title}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--jb-muted)]">
            {subtitle}
          </p>

          {children}
        </div>
        </div>

        {footer && (
          <p className="mt-6 text-center text-[13px] text-[var(--jb-muted)]">
            {footer}
          </p>
        )}
      </div>
    </main>
  );
}
