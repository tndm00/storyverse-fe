// Small inline SVG flags for the language switch. Flag emoji are not used on purpose: Windows does
// not draw them (it shows the letters "VN"/"GB" instead), while inline SVG looks the same everywhere.
// Decorative only (the option's text already names the language), hence aria-hidden.

const FLAG_STYLE = { borderRadius: 2, boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.15)", verticalAlign: "-3px" } as const;

export function VietnamFlag() {
  return (
    <svg width="22" height="15" viewBox="0 0 30 20" aria-hidden="true" focusable="false" style={FLAG_STYLE}>
      <rect width="30" height="20" fill="#da251d" />
      {/* five-pointed star, centred */}
      <polygon
        points="15,4 16.8,9.5 22.6,9.5 17.9,12.9 19.7,18.4 15,15 10.3,18.4 12.1,12.9 7.4,9.5 13.2,9.5"
        fill="#ffff00"
      />
    </svg>
  );
}

export function UnitedKingdomFlag() {
  return (
    <svg width="22" height="15" viewBox="0 0 60 40" aria-hidden="true" focusable="false" style={FLAG_STYLE}>
      <clipPath id="uk-flag-clip">
        <rect width="60" height="40" />
      </clipPath>
      <g clipPath="url(#uk-flag-clip)">
        <rect width="60" height="40" fill="#012169" />
        {/* white diagonals, then the thinner red diagonals on top */}
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#ffffff" strokeWidth="8" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#c8102e" strokeWidth="3" />
        {/* white cross, then the red cross on top */}
        <path d="M30,0 V40 M0,20 H60" stroke="#ffffff" strokeWidth="13" />
        <path d="M30,0 V40 M0,20 H60" stroke="#c8102e" strokeWidth="7" />
      </g>
    </svg>
  );
}
