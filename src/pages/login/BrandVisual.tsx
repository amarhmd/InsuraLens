/**
 * The brand panel's lens illustration.
 *
 * A single lens: a soft teal halo behind three faint concentric rings, a bright
 * core ringed by four focus brackets, and four thin lines reaching out to a
 * small cluster of nodes in the upper area — three teal, one blue accent. The
 * nodes and lines stay above the panel's headline, so nothing ever collides
 * with the copy; the halo and rings may pass softly behind it.
 *
 * Decorative only: aria-hidden, because the headline and support line already
 * carry the message. The halo and the faint ring stack share one very slow,
 * subtle pulse (CSS, keyed off .bv-halo / .bv-rings); base.css collapses it
 * under prefers-reduced-motion.
 */
export function BrandVisual({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 470 470"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Soft teal halo behind the ring stack. */}
        <radialGradient id="bv-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0" />
        </radialGradient>
        {/* Bright core: pale mint → teal → deep teal. */}
        <radialGradient id="bv-core" cx="0.42" cy="0.38" r="0.65">
          <stop offset="0%" stopColor="#CCFBF1" />
          <stop offset="55%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0A5F66" />
        </radialGradient>
      </defs>

      <circle cx="235" cy="235" r="290" fill="url(#bv-halo)" className="bv-halo" />

      {/* Faint concentric rings. */}
      <g className="bv-rings" fill="none">
        <circle cx="235" cy="235" r="205" stroke="#FFFFFF" strokeOpacity="0.07" />
        <circle cx="235" cy="235" r="150" stroke="#FFFFFF" strokeOpacity="0.1" />
        <circle cx="235" cy="235" r="100" stroke="#2DD4BF" strokeOpacity="0.3" />
      </g>

      {/* Four thin teal lines from the core out to the node cluster. */}
      <g stroke="#2DD4BF" strokeOpacity="0.4" strokeWidth="1.5">
        <line x1="235" y1="235" x2="92" y2="96" />
        <line x1="235" y1="235" x2="235" y2="54" />
        <line x1="235" y1="235" x2="382" y2="104" />
        <line x1="235" y1="235" x2="168" y2="150" />
      </g>

      {/* Three teal nodes and one blue accent node, all in the upper area. */}
      <g>
        <circle cx="92" cy="96" r="7" fill="#2DD4BF" />
        <circle cx="235" cy="54" r="6" fill="#2DD4BF" />
        <circle cx="382" cy="104" r="7" fill="#2DD4BF" />
        <circle cx="168" cy="150" r="9" fill="#5B8CFF" />
      </g>

      {/* The lens core: bright gradient disc with a dark centre. */}
      <circle cx="235" cy="235" r="74" fill="url(#bv-core)" />
      <circle cx="235" cy="235" r="50" fill="#061A30" />

      {/* Focus brackets around the core. */}
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.85"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M139 169 V139 H169" />
        <path d="M301 139 H331 V169" />
        <path d="M331 301 V331 H301" />
        <path d="M169 331 H139 V301" />
      </g>

      {/* A single white highlight on the core. */}
      <circle cx="211" cy="211" r="8" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  )
}
