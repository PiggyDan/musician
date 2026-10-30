import { useId } from "react";

export type KeyDiagramVariant = "pattern" | "letters" | "five-finger";

/**
 * One-octave teaching diagram (C–B).
 * - pattern: the two-black-key group outlined and C highlighted (Lesson 1)
 * - letters: every white key named, C as the landmark (Lesson 2)
 * - five-finger: right-hand fingers 1–5 on C–G (Lesson 3)
 */
export function KeyPatternDiagram({
  label,
  variant = "pattern",
}: {
  label: string;
  variant?: KeyDiagramVariant;
}) {
  const id = useId();
  const whites = ["C", "D", "E", "F", "G", "A", "B"];
  const blacks = [0.62, 1.68, 3.58, 4.64, 5.7]; // left edge, in white-key units
  const w = 40;
  const h = 132;
  const highlighted = (i: number) => (variant === "five-finger" ? i <= 4 : i === 0);

  return (
    <svg viewBox={`-6 -30 ${w * 7 + 12} ${h + 38}`} role="img" aria-label={label} className="w-full max-w-sm">
      <defs>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d2ff" />
          <stop offset="1" stopColor="#a99bff" />
        </linearGradient>
      </defs>

      {variant !== "five-finger" && (
        <>
          <path d={`M ${0.62 * w} -6 v -8 h ${(1.68 + 0.7 - 0.62) * w} v 8`} fill="none" stroke="#2fd8ee" strokeWidth="1.5" strokeLinecap="round" />
          <text x={((0.62 + 2.38) / 2) * w} y="-18" textAnchor="middle" fill="#2fd8ee" fontSize="10" fontFamily="var(--font-mono)">
            2
          </text>
          <path d={`M ${3.58 * w} -6 v -8 h ${(5.7 + 0.7 - 3.58) * w} v 8`} fill="none" stroke="#37375a" strokeWidth="1.5" strokeLinecap="round" />
          <text x={((3.58 + 6.4) / 2) * w} y="-18" textAnchor="middle" fill="#77749a" fontSize="10" fontFamily="var(--font-mono)">
            3
          </text>
        </>
      )}

      {whites.map((name, i) => (
        <g key={name}>
          <rect
            x={i * w + 1}
            y={0}
            width={w - 2}
            height={h}
            rx={6}
            fill={highlighted(i) ? `url(#${id}-c)` : "#ecebf5"}
            stroke={highlighted(i) ? "#8b7bff" : "none"}
            strokeWidth={highlighted(i) ? 2 : 0}
          />
          <text
            x={i * w + w / 2}
            y={h - 12}
            textAnchor="middle"
            fontSize="12"
            fontWeight={i === 0 || variant === "letters" ? 700 : 500}
            fill={i === 0 ? "#3b2db8" : variant === "letters" ? "#37375a" : "#77749a"}
            fontFamily="var(--font-mono)"
          >
            {name}
          </text>
          {variant === "five-finger" && i <= 4 && (
            <g>
              <circle cx={i * w + w / 2} cy={-16} r={10} fill="#1a1a2e" stroke="#8b7bff" strokeWidth="1.5" />
              <text x={i * w + w / 2} y={-12} textAnchor="middle" fontSize="11" fontWeight={700} fill="#cdcbe3" fontFamily="var(--font-mono)">
                {i + 1}
              </text>
            </g>
          )}
        </g>
      ))}
      {blacks.map((left, i) => (
        <rect
          key={left}
          x={left * w}
          y={0}
          width={w * 0.7}
          height={h * 0.6}
          rx={4}
          fill={variant !== "five-finger" && i < 2 ? "#1f1c3d" : "#15151f"}
          stroke={variant !== "five-finger" && i < 2 ? "#2fd8ee" : "none"}
          strokeOpacity={0.6}
        />
      ))}
    </svg>
  );
}

/** Quarter notes (1 beat) versus half notes (2 beats) over one bar of four beats. */
export function RhythmDiagram({
  label,
  quarter,
  half,
  beatLabel,
  twoBeatsLabel,
}: {
  label: string;
  quarter: string;
  half: string;
  beatLabel: string;
  twoBeatsLabel: string;
}) {
  const x0 = 96;
  const step = 52;
  const note = (x: number, y: number, filled: boolean) => (
    <g key={`${x}-${y}`}>
      <ellipse cx={x} cy={y} rx={8.5} ry={6.2} transform={`rotate(-20 ${x} ${y})`} fill={filled ? "#cdcbe3" : "none"} stroke="#cdcbe3" strokeWidth={2} />
      <line x1={x + 7.6} y1={y - 2} x2={x + 7.6} y2={y - 34} stroke="#cdcbe3" strokeWidth={2} />
    </g>
  );

  return (
    <svg viewBox="0 0 320 190" role="img" aria-label={label} className="w-full max-w-sm">
      {[0, 1, 2, 3].map((beat) => (
        <g key={beat}>
          <line x1={x0 + beat * step} y1={14} x2={x0 + beat * step} y2={176} stroke="#25253d" strokeDasharray="3 5" />
          <text x={x0 + beat * step} y={186} textAnchor="middle" fontSize="10" fill="#77749a" fontFamily="var(--font-mono)">
            {beat + 1}
          </text>
        </g>
      ))}

      <text x={0} y={64} fontSize="11" fill="#9c99bb">{quarter}</text>
      <text x={0} y={80} fontSize="10" fill="#2fd8ee" fontFamily="var(--font-mono)">{beatLabel}</text>
      {[0, 1, 2, 3].map((beat) => note(x0 + beat * step, 72, true))}

      <text x={0} y={144} fontSize="11" fill="#9c99bb">{half}</text>
      <text x={0} y={160} fontSize="10" fill="#8b7bff" fontFamily="var(--font-mono)">{twoBeatsLabel}</text>
      {[0, 2].map((beat) => (
        <g key={beat}>
          <rect x={x0 + beat * step - 10} y={160} width={step * 2 - 4} height={4} rx={2} fill="#8b7bff" opacity={0.5} />
          {note(x0 + beat * step, 150, false)}
        </g>
      ))}
    </svg>
  );
}
