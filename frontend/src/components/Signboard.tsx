/**
 * The green "signboard" panel shown beside auth forms. It's the one bold moment
 * in the app: highway-sign green with a faint route-grid motif, echoing the
 * street signage a citizen sees when spotting a civic problem.
 */
export function Signboard() {
  return (
    <div className="relative hidden overflow-hidden bg-sign-500 lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Faint route-grid / map motif */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        {/* A stylized "route" line threading through the grid */}
        <polyline
          points="0,320 120,320 120,180 300,180 300,420 520,420"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="120" cy="180" r="7" fill="white" />
        <circle cx="300" cy="420" r="7" fill="#f5a524" />
      </svg>

      <div className="relative">
        <div className="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-hazard-500" />
          CivicAI
        </div>
      </div>

      <div className="relative max-w-md">
        <h1 className="text-4xl font-bold leading-tight text-white">
          Spotted a problem on your street?
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-sign-100">
          Snap a photo, drop a pin, and let the city take it from there. Every
          report is analysed, prioritised, and tracked to resolution.
        </p>
      </div>

      <div className="relative flex items-center gap-8 text-sign-100">
        <Step label="Report" />
        <Arrow />
        <Step label="Analyse" />
        <Arrow />
        <Step label="Resolve" />
      </div>
    </div>
  );
}

function Step({ label }: { label: string }) {
  return <span className="text-sm font-semibold uppercase tracking-wide">{label}</span>;
}

function Arrow() {
  return (
    <svg width="28" height="12" viewBox="0 0 28 12" fill="none" aria-hidden="true">
      <path
        d="M1 6h24m0 0-5-4.5M25 6l-5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
