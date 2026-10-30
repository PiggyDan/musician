/**
 * Teaching diagram for Lesson 1: one octave (C–B) with the two-black-key group
 * outlined and C labelled, showing "C sits just left of the two black keys".
 */
export function KeyPatternDiagram({ label }: { label: string }) {
  const whites = ["C", "D", "E", "F", "G", "A", "B"];
  const blacks = [0.62, 1.68, 3.58, 4.64, 5.7]; // left edge, in white-key units
  const w = 40;
  const h = 132;

  return (
    <svg viewBox={`-6 -26 ${w * 7 + 12} ${h + 34}`} role="img" aria-label={label} className="w-full max-w-sm">
      <defs>
        <linearGradient id="kpd-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9d2ff" />
          <stop offset="1" stopColor="#a99bff" />
        </linearGradient>
      </defs>
      {/* Bracket over the two black keys */}
      <path
        d={`M ${0.62 * w} -6 v -8 h ${(1.68 + 0.7 - 0.62) * w} v 8`}
        fill="none"
        stroke="#2fd8ee"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <text x={((0.62 + 2.38) / 2) * w} y="-18" textAnchor="middle" fill="#2fd8ee" fontSize="10" fontFamily="var(--font-mono)">
        2
      </text>
      <path d={`M ${3.58 * w} -6 v -8 h ${(5.7 + 0.7 - 3.58) * w} v 8`} fill="none" stroke="#37375a" strokeWidth="1.5" strokeLinecap="round" />
      <text x={((3.58 + 6.4) / 2) * w} y="-18" textAnchor="middle" fill="#77749a" fontSize="10" fontFamily="var(--font-mono)">
        3
      </text>

      {whites.map((name, i) => (
        <g key={name}>
          <rect
            x={i * w + 1}
            y={0}
            width={w - 2}
            height={h}
            rx={6}
            fill={i === 0 ? "url(#kpd-c)" : "#ecebf5"}
            stroke={i === 0 ? "#8b7bff" : "none"}
            strokeWidth={i === 0 ? 2 : 0}
          />
          <text
            x={i * w + w / 2}
            y={h - 12}
            textAnchor="middle"
            fontSize="12"
            fontWeight={i === 0 ? 700 : 500}
            fill={i === 0 ? "#3b2db8" : "#77749a"}
            fontFamily="var(--font-mono)"
          >
            {name}
          </text>
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
          fill={i < 2 ? "#1f1c3d" : "#15151f"}
          stroke={i < 2 ? "#2fd8ee" : "none"}
          strokeOpacity={0.6}
        />
      ))}
    </svg>
  );
}
