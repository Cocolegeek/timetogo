interface IconProps {
  size?: number;
  className?: string;
}

export function CityMapperIcon({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="48" height="48" rx="11" fill="#00D2D3" />
      {/* Metro lines */}
      <circle cx="10" cy="24" r="3.5" fill="white" />
      <rect x="13" y="22.5" width="10" height="3" fill="white" />
      <circle cx="26" cy="24" r="3.5" fill="white" />
      <rect x="29" y="22.5" width="9" height="3" fill="white" />
      <circle cx="38" cy="24" r="3.5" fill="white" />
      {/* Top branch */}
      <circle cx="26" cy="13" r="3.5" fill="white" opacity="0.8" />
      <rect x="24.5" y="13" width="3" height="11.5" fill="white" opacity="0.8" />
      {/* Bottom branch */}
      <circle cx="26" cy="35" r="3.5" fill="white" opacity="0.8" />
      <rect x="24.5" y="23.5" width="3" height="12" fill="white" opacity="0.8" />
    </svg>
  );
}

export function GoogleMapsIcon({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M24 4C16.27 4 10 10.27 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.73-6.27-14-14-14z"
        fill="#EA4335"
      />
      <path
        d="M24 4C16.27 4 10 10.27 10 18c0 3.26 1.1 6.26 2.93 8.64L24 4z"
        fill="#34A853"
      />
      <path
        d="M24 4L12.93 26.64A14 14 0 0024 32c3.63 0 6.94-1.38 9.41-3.64L24 4z"
        fill="#FBBC05"
      />
      <path
        d="M24 4l9.41 24.36A13.93 13.93 0 0038 18c0-7.73-6.27-14-14-14z"
        fill="#4285F4"
      />
      <circle cx="24" cy="18" r="6" fill="white" />
    </svg>
  );
}

export function WazeIcon({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Body */}
      <ellipse cx="24" cy="26" rx="18" ry="16" fill="#33CCFF" />
      {/* Horn left */}
      <ellipse cx="11" cy="13" rx="5" ry="6" fill="#33CCFF" />
      {/* Horn right */}
      <ellipse cx="37" cy="13" rx="5" ry="6" fill="#33CCFF" />
      {/* Ear bumps */}
      <circle cx="11" cy="8" r="3.5" fill="#33CCFF" />
      <circle cx="37" cy="8" r="3.5" fill="#33CCFF" />
      {/* Eye whites */}
      <ellipse cx="18" cy="24" rx="5" ry="5.5" fill="white" />
      <ellipse cx="30" cy="24" rx="5" ry="5.5" fill="white" />
      {/* Pupils */}
      <circle cx="19.5" cy="24.5" r="2.5" fill="#1A1A2E" />
      <circle cx="31.5" cy="24.5" r="2.5" fill="#1A1A2E" />
      {/* Smile */}
      <path
        d="M17 33 Q24 39 31 33"
        stroke="#1A1A2E"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Blush left */}
      <ellipse cx="13" cy="31" rx="3" ry="1.5" fill="#FF9AC1" opacity="0.6" />
      {/* Blush right */}
      <ellipse cx="35" cy="31" rx="3" ry="1.5" fill="#FF9AC1" opacity="0.6" />
    </svg>
  );
}

export function AppleMapsIcon({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background rounded square */}
      <rect width="48" height="48" rx="11" fill="url(#appleMapsBg)" />
      <defs>
        <linearGradient id="appleMapsBg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#56C6F5" />
          <stop offset="100%" stopColor="#1B74B8" />
        </linearGradient>
      </defs>
      {/* Road */}
      <path d="M4 36 L22 20 L26 28 L44 12" stroke="white" strokeWidth="4" strokeLinecap="round" strokeOpacity="0.6" />
      {/* Road center */}
      <path d="M4 36 L22 20 L26 28 L44 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" />
      {/* Green areas */}
      <path d="M4 28 L14 18 L24 24 L10 38Z" fill="#57C36C" opacity="0.7" />
      <path d="M28 14 L44 8 L44 22 L32 26Z" fill="#57C36C" opacity="0.7" />
      {/* Location pin */}
      <path d="M30 28C30 24.69 27.31 22 24 22S18 24.69 18 28c0 5 6 10 6 10s6-5 6-10z" fill="#EA4335" />
      <circle cx="24" cy="28" r="2.5" fill="white" />
    </svg>
  );
}
