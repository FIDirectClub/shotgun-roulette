"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Shotgun } from "@/lib/types";

const COLORS = [
  "#E74C3C", "#3498DB", "#2ECC71", "#E67E22", "#9B59B6", "#1ABC9C",
  "#C0392B", "#2980B9", "#27AE60", "#D35400", "#8E44AD", "#16A085",
];

interface WheelProps {
  shotguns: Shotgun[];
  onResult: (shotgun: Shotgun) => void;
  disabled?: boolean;
}

export default function Wheel({ shotguns, onResult, disabled }: WheelProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Shotgun | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const whooshAudioRef = useRef<HTMLAudioElement | null>(null);
  const revealAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSegmentRef = useRef<number>(-1);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    tickAudioRef.current = new Audio("/sounds/tick.mp3");
    whooshAudioRef.current = new Audio("/sounds/whoosh.mp3");
    revealAudioRef.current = new Audio("/sounds/reveal.mp3");
    tickAudioRef.current.volume = 0.3;
  }, []);

  const n = shotguns.length;
  const segAngle = 360 / n;

  const playTick = useCallback(() => {
    if (tickAudioRef.current) {
      tickAudioRef.current.currentTime = 0;
      tickAudioRef.current.play().catch(() => {});
    }
  }, []);

  function spin() {
    if (spinning || disabled || n === 0) return;
    setResult(null);
    setShowReveal(false);
    setSpinning(true);
    lastSegmentRef.current = -1;

    if (whooshAudioRef.current) {
      whooshAudioRef.current.currentTime = 0;
      whooshAudioRef.current.play().catch(() => {});
    }

    // Random result: 5-8 full rotations + random offset
    const fullRotations = (5 + Math.random() * 3) * 360;
    const randomOffset = Math.random() * 360;
    // Snap to segment center if near a border (within 10% of segment)
    const segIndex = Math.floor(randomOffset / segAngle);
    const segCenter = segIndex * segAngle + segAngle / 2;
    const distFromCenter = Math.abs(randomOffset - segCenter);
    const threshold = segAngle * 0.1;
    const finalOffset =
      distFromCenter < threshold || distFromCenter > segAngle - threshold
        ? segCenter
        : randomOffset;

    const targetRotation = rotation + fullRotations + finalOffset;
    const duration = 4000 + Math.random() * 2000;
    const startRotation = rotation;
    const startTime = performance.now();

    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const currentRotation = startRotation + (targetRotation - startRotation) * eased;
      setRotation(currentRotation);

      // Tick on segment boundary crossings
      const normalizedAngle = ((currentRotation % 360) + 360) % 360;
      const currentSegment = Math.floor(normalizedAngle / segAngle) % n;
      if (currentSegment !== lastSegmentRef.current && lastSegmentRef.current !== -1) {
        playTick();
      }
      lastSegmentRef.current = currentSegment;

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Determine winner: the segment at the top (0 degrees / pointer position)
        const finalNorm = ((targetRotation % 360) + 360) % 360;
        // The pointer is at the top (0 deg). The wheel rotates clockwise.
        // Segment under pointer = opposite of rotation direction
        const pointerAngle = (360 - finalNorm) % 360;
        const winnerIndex = Math.floor(pointerAngle / segAngle) % n;
        const winner = shotguns[winnerIndex];

        setTimeout(() => {
          setResult(winner);
          setSpinning(false);
          if (revealAudioRef.current) {
            revealAudioRef.current.currentTime = 0;
            revealAudioRef.current.play().catch(() => {});
          }
          // Trigger confetti
          import("canvas-confetti").then((mod) => {
            const confetti = mod.default;
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 },
              colors: ["#F59E0B", "#EF4444", "#3B82F6", "#10B981"],
            });
          });
          setTimeout(() => {
            setShowReveal(true);
            onResult(winner);
          }, 800);
        }, 300);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  if (showReveal && result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] reveal-pulse">
        <p className="text-gray-400 text-lg uppercase tracking-widest mb-2">You got</p>
        <p className="text-5xl md:text-7xl font-black text-amber-400 text-center">
          {result.name}
        </p>
      </div>
    );
  }

  const useRadialText = n > 6;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pointer */}
      <div className="text-4xl text-amber-400" style={{ marginBottom: "-20px", zIndex: 10 }}>
        &#9660;
      </div>

      {/* Wheel SVG */}
      <svg
        viewBox="0 0 300 300"
        className={`w-72 h-72 md:w-96 md:h-96 ${result ? "wheel-glow" : ""}`}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinning ? "none" : undefined,
        }}
      >
        <circle cx="150" cy="150" r="148" fill="none" stroke="#374151" strokeWidth="3" />
        {shotguns.map((sg, i) => {
          const startAngle = (i * segAngle * Math.PI) / 180;
          const endAngle = ((i + 1) * segAngle * Math.PI) / 180;
          const x1 = 150 + 145 * Math.sin(startAngle);
          const y1 = 150 - 145 * Math.cos(startAngle);
          const x2 = 150 + 145 * Math.sin(endAngle);
          const y2 = 150 - 145 * Math.cos(endAngle);
          const largeArc = segAngle > 180 ? 1 : 0;

          const color = COLORS[i % COLORS.length];

          // Text positioning
          const textRotation = i * segAngle + segAngle / 2;

          return (
            <g key={sg.id}>
              <path
                d={`M150,150 L${x1},${y1} A145,145 0 ${largeArc},1 ${x2},${y2} Z`}
                fill={color}
                stroke="#1f2937"
                strokeWidth="1"
              />
              {useRadialText ? (
                <text
                  fill="#111"
                  fontSize={n > 10 ? "8" : "9.5"}
                  fontWeight="900"
                  textAnchor="start"
                  stroke="white"
                  strokeWidth="2.5"
                  paintOrder="stroke"
                  transform={`translate(150,150) rotate(${textRotation - 90}) translate(32,4)`}
                >
                  {sg.name}
                </text>
              ) : (
                <text
                  fill="#111"
                  fontSize="14"
                  fontWeight="900"
                  textAnchor="middle"
                  stroke="white"
                  strokeWidth="3"
                  paintOrder="stroke"
                  transform={`translate(150,150) rotate(${textRotation - 90}) translate(80,5)`}
                >
                  {sg.name}
                </text>
              )}
            </g>
          );
        })}
        <circle cx="150" cy="150" r="28" fill="#1f2937" stroke="#F59E0B" strokeWidth="3" />
      </svg>

      {/* Spin button */}
      <button
        onClick={spin}
        disabled={spinning || disabled || n === 0}
        className="px-10 py-4 bg-amber-500 text-gray-900 font-black text-2xl rounded-full hover:bg-amber-400 disabled:opacity-50 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/25"
      >
        {spinning ? "SPINNING..." : "SPIN!"}
      </button>
    </div>
  );
}
