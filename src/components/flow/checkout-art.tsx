export function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 19.2c.8-3.2 3.2-5.2 6.5-5.2s5.7 2 6.5 5.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect
        x="3.4"
        y="5.6"
        width="17.2"
        height="12.8"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="m5.2 8 6.8 5.1L18.8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M4 12h15m-5.5-5.5L19 12l-5.5 5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M12 3.4 19 6v5.4c0 4.4-2.8 7.6-7 9.2-4.2-1.6-7-4.8-7-9.2V6l7-2.6Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="m8.8 12 2.1 2.1 4.4-4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function PlotThumbnail({ label }: { label: string }) {
  return (
    <svg
      className="checkout-thumb"
      viewBox="0 0 96 72"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="96" height="72" fill="#dce8d8" />
      <path d="M0 40c14-9 27-5 41-8 16-4 31 3 55-4v44H0V40Z" fill="#c9dcc3" />
      <path d="M0 54c19-8 34 0 51-4 19-4 31 4 45-1v23H0V54Z" fill="#aec9a7" />
      <path d="M0 64c18-5 37 2 55-1 14-2 27-5 41-2v11H0V64Z" fill="#93b58c" />
      <circle cx="66" cy="26" r="16" fill="#6f946b" />
      <circle cx="55" cy="33" r="11" fill="#7fa179" />
      <circle cx="77" cy="34" r="10" fill="#5d855c" />
      <rect x="64" y="38" width="4" height="20" rx="1.5" fill="#806b50" />
      <ellipse cx="38" cy="65" rx="15" ry="3.4" fill="#7fa27a" opacity=".55" />
      <path
        d="M20 72c2-7 8-11 16-13"
        stroke="#f4f7ef"
        strokeLinecap="round"
        strokeWidth="1.4"
        opacity=".7"
      />
    </svg>
  );
}

export function SelectionWave() {
  return (
    <svg
      className="selection-wave"
      viewBox="0 0 300 74"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 40c36-16 66 6 101-2 38-9 65 9 101 1 36-8 64 1 98-9v44H0V40Z"
        fill="#dfe9d8"
        opacity=".75"
      />
      <path
        d="M0 56c35-9 70 8 108 1 35-6 61 7 95 1 34-6 64 2 97-4v20H0V56Z"
        fill="#d4e2cc"
        opacity=".75"
      />
    </svg>
  );
}

export function CheckoutScenery({ leaves = false }: { leaves?: boolean }) {
  return (
    <div className="checkout-scenery" aria-hidden="true">
      <svg
        className="checkout-waves"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path
          d="M0 772c212-54 388 50 620 42 246-9 410-74 610-46 86 12 152 42 210 56v76H0V772Z"
          fill="#f5f7f2"
          opacity=".9"
        />
        <path
          d="M0 818c196-44 420 38 648 28 262-11 420-68 610-44 72 10 132 26 182 36v62H0V818Z"
          fill="#f0f4eb"
          opacity=".85"
        />
        <path
          d="M0 858c246-38 498 20 738 13 250-9 466-50 702-17v46H0v-42Z"
          fill="#eaf0e4"
          opacity=".8"
        />
      </svg>
      {leaves ? (
        <svg
          className="checkout-leaves"
          viewBox="0 0 240 320"
          preserveAspectRatio="xMidYMax meet"
          focusable="false"
        >
          <g fill="none" stroke="#a6baa1" strokeLinecap="round" strokeWidth="1.3">
            <path d="M126 320c-8-58 2-108 34-158 20-31 30-62 32-94" />
            <path d="M132 262c-27-18-44-44-52-78" />
            <path d="M146 210c30-12 48-32 58-60" />
            <path d="M158 160c-20-22-26-44-24-68" />
            <path d="M180 108c22-18 34-42 34-66" />
          </g>
          <g fill="#c2d5bb" opacity=".78">
            <path d="M80 184c-22-14-32-38-30-62 22 10 36 32 30 62Z" />
            <path d="M132 262c-20-10-32-28-36-48 22 6 36 24 36 48Z" />
            <path d="M204 150c18-12 28-32 26-54-20 8-32 28-26 54Z" />
            <path d="M134 92c-16-12-22-30-18-48 16 10 24 28 18 48Z" />
            <path d="M192 68c14-16 20-38 16-58-16 10-24 32-16 58Z" />
            <path d="M214 42c16-10 24-28 22-48-18 6-28 24-22 48Z" />
          </g>
          <g fill="#9fb89a" opacity=".62">
            <path d="M94 232c-14-6-24-18-28-32 16 2 28 14 28 32Z" />
            <path d="M164 190c-4-16 0-30 10-42 8 14 6 30-10 42Z" />
          </g>
        </svg>
      ) : null}
    </div>
  );
}
