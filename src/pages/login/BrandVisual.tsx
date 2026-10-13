/**
 * The brand panel's abstract visual.
 *
 * Three ideas: a document pair (the evidence), a node cluster under focus (the
 * relationships), and connection lines running between them, watched through a
 * set of concentric lens rings. Nothing here is an illustration of a car, a
 * crash or a brain — it is the shape of an investigation workspace, sitting
 * behind the copy rather than competing with it.
 *
 * The dotted field is now a CSS layer on .brand, so this artwork stays
 * transparent where there is no content; the lens rings read teal and fade
 * outward from the focus node. Brighter than a pure texture so it still reads
 * on a bright office monitor, with two slow, decorative motions: the focus
 * halo breathes and the cluster drifts. base.css collapses both under
 * prefers-reduced-motion.
 *
 * Decorative: aria-hidden, because it carries no information the words do not.
 */
export function BrandVisual({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 60 640 580"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="bv-wash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#159A9C" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#159A9C" stopOpacity="0" />
        </radialGradient>
        {/* A tighter glow directly behind the focus node. */}
        <radialGradient id="bv-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#2FE3D0" stopOpacity="0.42" />
          <stop offset="45%" stopColor="#159A9C" stopOpacity="0.2" />
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

      {/* Soft teal glow behind the network. */}
      <ellipse cx="470" cy="356" rx="336" ry="308" fill="url(#bv-wash)" />
      <ellipse cx="416" cy="318" rx="188" ry="188" fill="url(#bv-core)" />

      {/* Documents */}
      <g fill="#FFFFFF" fillOpacity="0.09" stroke="#FFFFFF" strokeOpacity="0.24">
        <rect x="76" y="262" width="170" height="216" rx="12" />
        <rect x="146" y="344" width="170" height="216" rx="12" />
      </g>
      <g stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M102 300h104" />
        <path d="M102 326h76" />
        <path d="M172 392h118" />
        <path d="M172 418h94" />
        <path d="M172 444h66" />
      </g>
      <path
        d="M172 486h54"
        stroke="#159A9C"
        strokeOpacity="0.85"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* The lens: four concentric teal rings that fade outward. */}
      <g fill="none">
        <circle cx="470" cy="356" r="212" stroke="#159A9C" strokeOpacity="0.12" />
        <circle cx="470" cy="356" r="156" stroke="#159A9C" strokeOpacity="0.3" strokeWidth="1.25" />
        <circle cx="470" cy="356" r="100" stroke="#159A9C" strokeOpacity="0.42" />
        <circle cx="470" cy="356" r="46" stroke="#159A9C" strokeOpacity="0.6" />
      </g>

      {/* Evidence relationships, seen through the lens. The whole cluster drifts. */}
      <g className="bv-drift">
        <g stroke="#A9BCD0" strokeOpacity="0.48" fill="none">
          <path d="M416 318 528 330 534 400 430 414 416 318" />
          <path d="M416 318 534 400" />
          <path d="M416 318 354 344 312 392" />
          <path d="M430 414 372 468 316 500" />
          <path d="M534 400 566 470" />
          <path d="M416 318 400 240" />
        </g>
        <g>
          <circle cx="416" cy="318" r="11" fill="#159A9C" fillOpacity="0.22" className="bv-pulse" />
          <circle cx="416" cy="318" r="7" fill="#159A9C" fillOpacity="0.95" filter="url(#bv-glow)" />
          <circle cx="528" cy="330" r="4.5" fill="#159A9C" fillOpacity="0.75" />
          <circle cx="534" cy="400" r="5" fill="#4C6FFF" fillOpacity="0.9" />
          <circle cx="430" cy="414" r="4.5" fill="#159A9C" fillOpacity="0.75" />
          <circle cx="354" cy="344" r="3.5" fill="#A9BCD0" fillOpacity="0.7" />
          <circle cx="372" cy="468" r="3.5" fill="#A9BCD0" fillOpacity="0.7" />
          <circle cx="566" cy="470" r="3.5" fill="#A9BCD0" fillOpacity="0.65" />
          <circle cx="400" cy="240" r="3.5" fill="#A9BCD0" fillOpacity="0.65" />
        </g>
      </g>
    </svg>
  )
}
