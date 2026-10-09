/**
 * The brand panel's abstract visual.
 *
 * Four ideas, kept faint: a document pair (the evidence), a node cluster under
 * focus (the relationships), rings around it (the lens), and connections
 * running between them. Nothing here is an illustration of a car, a crash or a
 * brain — it is the shape of an investigation workspace, at an opacity that
 * stays behind the copy rather than competing with it.
 *
 * Decorative: aria-hidden, because it carries no information the words do not.
 */
export function BrandVisual({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id="bv-grid" width="46" height="46" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.3" fill="#A9BCD0" opacity="0.1" />
        </pattern>
        <radialGradient id="bv-wash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#159A9C" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#159A9C" stopOpacity="0" />
        </radialGradient>
        <filter id="bv-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Structured information: a faint field the rest is measured against. */}
      <rect width="640" height="900" fill="url(#bv-grid)" />
      <ellipse cx="470" cy="356" rx="336" ry="308" fill="url(#bv-wash)" />

      {/* Documents */}
        <g fill="#FFFFFF" fillOpacity="0.055" stroke="#FFFFFF" strokeOpacity="0.14">
          <rect x="76" y="262" width="170" height="216" rx="12" />
          <rect x="146" y="344" width="170" height="216" rx="12" />
        </g>
      <g
        stroke="#FFFFFF"
        strokeOpacity="0.16"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M102 300h104" />
        <path d="M102 326h76" />
        <path d="M172 392h118" />
        <path d="M172 418h94" />
        <path d="M172 444h66" />
      </g>
      <path
        d="M172 486h54"
        stroke="#159A9C"
        strokeOpacity="0.65"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* The lens */}
      <g fill="none">
        <circle cx="470" cy="356" r="212" stroke="#FFFFFF" strokeOpacity="0.07" />
        <circle cx="470" cy="356" r="156" stroke="#159A9C" strokeOpacity="0.3" strokeWidth="1.25" />
        <circle cx="470" cy="356" r="100" stroke="#4C6FFF" strokeOpacity="0.22" />
        <circle cx="470" cy="356" r="46" stroke="#159A9C" strokeOpacity="0.38" />
      </g>

      {/* Evidence relationships, seen through the lens */}
      <g stroke="#A9BCD0" strokeOpacity="0.32" fill="none">
        <path d="M416 318 528 330 534 400 430 414 416 318" />
        <path d="M416 318 534 400" />
        <path d="M416 318 354 344 312 392" />
        <path d="M430 414 372 468 316 500" />
        <path d="M534 400 566 470" />
        <path d="M416 318 400 240" />
      </g>
      <g>
        <circle cx="416" cy="318" r="11" fill="#159A9C" fillOpacity="0.16" className="bv-pulse" />
        <circle cx="416" cy="318" r="7" fill="#159A9C" fillOpacity="0.92" filter="url(#bv-glow)" />
        <circle cx="528" cy="330" r="4.5" fill="#159A9C" fillOpacity="0.6" />
        <circle cx="534" cy="400" r="5" fill="#4C6FFF" fillOpacity="0.75" />
        <circle cx="430" cy="414" r="4.5" fill="#159A9C" fillOpacity="0.6" />
        <circle cx="354" cy="344" r="3.5" fill="#A9BCD0" fillOpacity="0.55" />
        <circle cx="372" cy="468" r="3.5" fill="#A9BCD0" fillOpacity="0.55" />
        <circle cx="566" cy="470" r="3.5" fill="#A9BCD0" fillOpacity="0.5" />
        <circle cx="400" cy="240" r="3.5" fill="#A9BCD0" fillOpacity="0.5" />
      </g>
    </svg>
  )
}
