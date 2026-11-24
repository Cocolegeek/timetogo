const COLORS = ["#FFC83D", "#10B981", "#38BDF8", "#F472B6", "#FB923C"];
const DOTS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2;
  const dist = 26 + (i % 2) * 8;
  return { bx: Math.round(Math.cos(angle) * dist), by: Math.round(Math.sin(angle) * dist), color: COLORS[i % COLORS.length] };
});

/** Petite explosion de confettis (CSS pur). À monter au moment de la réussite ; disparaît seule. */
export function Burst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {DOTS.map((d, i) => (
        <span
          key={i}
          className="burst-dot"
          style={{ background: d.color, "--bx": `${d.bx}px`, "--by": `${d.by}px` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
