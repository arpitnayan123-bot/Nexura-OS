/* ============================================================
 * NEXURA DIY — SCENERY (warm dawn valley)
 * Pure-SVG panorama, viewBox 1440x640, preserveAspectRatio
 * xMidYMax slice. Layers back→front: dawn sky, sun halo,
 * drifting clouds, two bird skeins, far ridge, mid ridge with
 * rim light, valley mist, lake (mirrored ridges + light
 * column + shimmer), ducks, far-shore trees, two foreground
 * banks with pine groves, reeds, six deer, vignette + mineral
 * grain. Every animation class is reduced-motion safe.
 * ============================================================ */

export function Scenery({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 640"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* dawn sky */}
        <linearGradient id="d-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDE8CF" />
          <stop offset="0.45" stopColor="#F9D9B8" />
          <stop offset="0.78" stopColor="#F3C9A6" />
          <stop offset="1" stopColor="#EEC39E" />
        </linearGradient>
        <radialGradient id="d-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFF3DA" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#FBE0B4" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FBE0B4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="d-ridge-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C99B84" />
          <stop offset="1" stopColor="#B98B76" />
        </linearGradient>
        <linearGradient id="d-ridge-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9F7A63" />
          <stop offset="1" stopColor="#8A6754" />
        </linearGradient>
        <linearGradient id="d-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8B58F" />
          <stop offset="0.5" stopColor="#D9A583" />
          <stop offset="1" stopColor="#C99578" />
        </linearGradient>
        <linearGradient id="d-bank-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7E8E67" />
          <stop offset="1" stopColor="#5F7250" />
        </linearGradient>
        <linearGradient id="d-bank-r" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A976F" />
          <stop offset="1" stopColor="#6B7D58" />
        </linearGradient>
        <linearGradient id="d-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FBE3C8" stopOpacity="0" />
          <stop offset="1" stopColor="#FBE3C8" stopOpacity="0.85" />
        </linearGradient>
        {/* lake reflection mask: mirror below the waterline */}
        <mask id="d-water-mask">
          <rect x="0" y="380" width="1440" height="260" fill="#fff" />
        </mask>
        <radialGradient id="d-vignette" cx="0.5" cy="0.42" r="0.85">
          <stop offset="0.62" stopColor="#2E2A26" stopOpacity="0" />
          <stop offset="1" stopColor="#2E2A26" stopOpacity="0.22" />
        </radialGradient>
        <filter id="d-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.05" />
          </feComponentTransfer>
          <feComposite operator="over" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* sky */}
      <rect width="1440" height="640" fill="url(#d-sky)" />

      {/* sun + halo (kept clear of the glass panel: x=1140, y=150) */}
      <circle cx="1140" cy="150" r="150" fill="url(#d-sun)" className="diy-sun-glow" />
      <circle cx="1140" cy="150" r="42" fill="#FFF4DC" opacity="0.95" />

      {/* clouds */}
      <g fill="#FFF1DC" opacity="0.8">
        <g className="diy-cloud-a">
          <ellipse cx="240" cy="96" rx="130" ry="18" />
          <ellipse cx="330" cy="82" rx="90" ry="14" />
        </g>
        <g className="diy-cloud-b">
          <ellipse cx="820" cy="64" rx="150" ry="16" />
          <ellipse cx="930" cy="52" rx="90" ry="12" />
        </g>
      </g>

      {/* bird skeins */}
      <g stroke="#7A5C46" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.75">
        <path d="M180 148 q7 -8 14 0 M194 148 q7 -8 14 0 M208 148 q7 -8 14 0 M226 150 q6 -7 12 0" />
        <path d="M980 118 q6 -7 12 0 M992 118 q6 -7 12 0 M1004 118 q6 -7 12 0" />
      </g>

      {/* far ridge */}
      <path
        d="M0 330 L90 288 L170 316 L260 268 L360 312 L470 258 L560 300 L680 262 L790 306 L900 272 L1010 308 L1130 276 L1250 312 L1360 284 L1440 306 L1440 400 L0 400 Z"
        fill="url(#d-ridge-far)"
        opacity="0.9"
      />
      {/* mid ridge with warm rim */}
      <path
        d="M0 372 L110 330 L220 360 L340 322 L470 362 L600 330 L720 366 L850 334 L980 368 L1110 340 L1240 372 L1360 346 L1440 364 L1440 420 L0 420 Z"
        fill="url(#d-ridge-mid)"
      />
      <path
        d="M0 372 L110 330 L220 360 L340 322 L470 362 L600 330 L720 366 L850 334 L980 368 L1110 340 L1240 372 L1360 346 L1440 364"
        fill="none"
        stroke="#F6CFA4"
        strokeWidth="2.5"
        opacity="0.55"
      />

      {/* valley mist */}
      <rect x="0" y="330" width="1440" height="60" fill="url(#d-mist)" />

      {/* lake with mirrored ridges + light column */}
      <g>
        <rect x="0" y="380" width="1440" height="260" fill="url(#d-lake)" />
        <g mask="url(#d-water-mask)" opacity="0.28">
          <path
            d="M0 430 L110 388 L220 418 L340 380 L470 420 L600 388 L720 424 L850 392 L980 426 L1110 398 L1240 430 L1360 404 L1440 422 L1440 460 L0 460 Z"
            fill="#8A6754"
            transform="translate(0, 32) scale(1, -0.55) translate(0, 660)"
          />
        </g>
        {/* sun light column on water */}
        <rect
          x="1098"
          y="380"
          width="84"
          height="260"
          fill="#FFE9C4"
          opacity="0.32"
          mask="url(#d-water-mask)"
        />
        {/* shimmer */}
        <g fill="#FFEFD2" className="diy-shimmer">
          <ellipse cx="1140" cy="440" rx="60" ry="3.2" opacity="0.8" />
          <ellipse cx="1120" cy="472" rx="90" ry="3.6" opacity="0.6" />
          <ellipse cx="1165" cy="510" rx="120" ry="4" opacity="0.5" />
          <ellipse cx="300" cy="430" rx="70" ry="3" opacity="0.4" />
          <ellipse cx="620" cy="470" rx="100" ry="3.4" opacity="0.35" />
        </g>
        {/* ducks */}
        <g className="diy-duck">
          <path d="M508 452 q10 -8 20 0 q6 6 -2 9 q-14 4 -18 -9 Z" fill="#6B5138" />
          <circle cx="530" cy="448" r="3.4" fill="#6B5138" />
        </g>
        <g className="diy-duck-2">
          <path d="M556 462 q9 -7 18 0 q5 6 -2 8 q-12 4 -16 -8 Z" fill="#7A5C42" />
          <circle cx="576" cy="458" r="3" fill="#7A5C42" />
        </g>
      </g>

      {/* far-shore tree specks */}
      <g fill="#5E7350" opacity="0.7">
        <circle cx="120" cy="382" r="5" />
        <circle cx="140" cy="384" r="4" />
        <circle cx="700" cy="383" r="4.5" />
        <circle cx="716" cy="385" r="3.5" />
        <circle cx="1310" cy="382" r="5" />
        <circle cx="1330" cy="384" r="4" />
      </g>

      {/* left bank + pines + reeds + doe & fawn */}
      <g>
        <path
          d="M0 640 L0 470 Q120 440 260 468 Q420 500 560 560 L560 640 Z"
          fill="url(#d-bank-l)"
        />
        <g fill="#4C6242">
          <path d="M60 470 L78 414 L96 470 Z M60 452 L78 396 L96 452 Z" />
          <path d="M130 486 L150 424 L170 486 Z M130 466 L150 404 L170 466 Z" />
          <path d="M36 494 L52 442 L68 494 Z" />
          <path d="M205 502 L226 442 L247 502 Z M205 480 L226 420 L247 480 Z" />
        </g>
        {/* doe + fawn on the left bank */}
        <g fill="#8A6247">
          <g transform="translate(300, 508)">
            <ellipse cx="0" cy="0" rx="26" ry="13" />
            <rect x="-18" y="8" width="4" height="22" rx="2" />
            <rect x="-6" y="8" width="4" height="22" rx="2" />
            <rect x="8" y="8" width="4" height="22" rx="2" />
            <rect x="18" y="8" width="4" height="22" rx="2" />
            <path d="M20 -8 q14 -4 18 -16 l4 2 q-4 14 -18 20 Z" />
            <circle cx="42" cy="-24" r="6" />
            <path d="M38 -30 l-3 -8 M46 -30 l3 -8" stroke="#8A6247" strokeWidth="2" fill="none" />
          </g>
          <g transform="translate(366, 528) scale(0.6)">
            <ellipse cx="0" cy="0" rx="26" ry="13" />
            <rect x="-18" y="8" width="5" height="24" rx="2" />
            <rect x="10" y="8" width="5" height="24" rx="2" />
            <path d="M20 -8 q14 -4 18 -16 l5 2 q-4 14 -18 20 Z" />
            <circle cx="42" cy="-24" r="6.5" />
          </g>
        </g>
        {/* reeds */}
        <g stroke="#46603E" strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path d="M520 600 q4 -34 -2 -56 M534 604 q-2 -30 6 -50 M548 600 q2 -26 -6 -44" />
        </g>
      </g>

      {/* right bank + pines + stag, fawn, doe */}
      <g>
        <path
          d="M1440 640 L1440 462 Q1300 434 1150 462 Q1000 492 880 552 L880 640 Z"
          fill="url(#d-bank-r)"
        />
        <g fill="#546A48">
          <path d="M1360 476 L1382 410 L1404 476 Z M1360 452 L1382 386 L1404 452 Z" />
          <path d="M1272 496 L1292 438 L1312 496 Z" />
          <path d="M1180 512 L1200 452 L1220 512 Z M1180 490 L1200 430 L1220 490 Z" />
          <path d="M1090 528 L1108 472 L1126 528 Z" />
        </g>
        {/* meadow deer family */}
        <g fill="#8A6247">
          {/* stag */}
          <g transform="translate(1240, 500)">
            <ellipse cx="0" cy="0" rx="30" ry="15" />
            <rect x="-22" y="10" width="5" height="26" rx="2" />
            <rect x="-8" y="10" width="5" height="26" rx="2" />
            <rect x="8" y="10" width="5" height="26" rx="2" />
            <rect x="20" y="10" width="5" height="26" rx="2" />
            <path d="M22 -10 q16 -6 20 -20 l6 3 q-6 18 -22 24 Z" />
            <circle cx="50" cy="-30" r="7" />
            <path
              d="M44 -37 l-6 -12 M50 -38 l0 -13 M56 -37 l6 -12"
              stroke="#8A6247"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
          </g>
          {/* fawn */}
          <g transform="translate(1148, 528) scale(0.55)">
            <ellipse cx="0" cy="0" rx="26" ry="13" />
            <rect x="-18" y="8" width="5" height="24" rx="2" />
            <rect x="-6" y="8" width="5" height="24" rx="2" />
            <rect x="8" y="8" width="5" height="24" rx="2" />
            <rect x="18" y="8" width="5" height="24" rx="2" />
            <path d="M20 -8 q14 -4 18 -16 l5 2 q-4 14 -18 20 Z" />
            <circle cx="42" cy="-24" r="6.5" />
          </g>
          {/* doe */}
          <g transform="translate(1058, 548)">
            <ellipse cx="0" cy="0" rx="26" ry="13" />
            <rect x="-18" y="8" width="4.5" height="24" rx="2" />
            <rect x="-5" y="8" width="4.5" height="24" rx="2" />
            <rect x="9" y="8" width="4.5" height="24" rx="2" />
            <rect x="19" y="8" width="4.5" height="24" rx="2" />
            <path d="M20 -8 q14 -4 18 -16 l4 2 q-4 14 -18 20 Z" />
            <circle cx="42" cy="-24" r="6" />
          </g>
        </g>
        {/* reeds right */}
        <g stroke="#4E6845" strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path d="M905 610 q-4 -36 2 -58 M890 614 q2 -30 -6 -52" />
        </g>
      </g>

      {/* lone shoreline doe (visible at 390px too: x=912) */}
      <g fill="#8A6247" transform="translate(912, 572) scale(0.72)">
        <ellipse cx="0" cy="0" rx="26" ry="13" />
        <rect x="-18" y="8" width="4.5" height="24" rx="2" />
        <rect x="-5" y="8" width="4.5" height="24" rx="2" />
        <rect x="9" y="8" width="4.5" height="24" rx="2" />
        <rect x="19" y="8" width="4.5" height="24" rx="2" />
        <path d="M20 -8 q14 -4 18 -16 l4 2 q-4 14 -18 20 Z" />
        <circle cx="42" cy="-24" r="6" />
        <path d="M38 -30 l-3 -8 M46 -30 l3 -8" stroke="#8A6247" strokeWidth="2" fill="none" />
      </g>

      {/* vignette + mineral grain */}
      <rect width="1440" height="640" fill="url(#d-vignette)" />
      <rect width="1440" height="640" filter="url(#d-grain)" opacity="0.5" />
    </svg>
  );
}
