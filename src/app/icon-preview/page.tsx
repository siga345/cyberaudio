import Script from "next/script";

const stageShadow = "drop-shadow(0 34px 84px rgba(0,0,0,0.44))";

export default function IconPreviewPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] p-10">
      <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_22%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.03),transparent_28%)]" />

      <div id="icon-stage" className="relative h-[1024px] w-[1024px]" style={{ filter: stageShadow }}>
        <svg
          viewBox="0 0 1024 1024"
          className="h-full w-full"
          role="img"
          aria-label="Самиздат app icon"
        >
          <defs>
            <linearGradient id="outer-shell" x1="184" y1="120" x2="850" y2="936" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1A1A1A" />
              <stop offset="0.52" stopColor="#0B0B0C" />
              <stop offset="1" stopColor="#151515" />
            </linearGradient>
            <linearGradient id="outer-sheen" x1="512" y1="96" x2="512" y2="360" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="1" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          <rect x="104" y="104" width="816" height="816" rx="150" fill="url(#outer-shell)" />
          <rect x="104" y="104" width="816" height="816" rx="150" fill="none" stroke="#5C6470" strokeWidth="3" opacity="0.9" />
          <rect x="104" y="104" width="816" height="816" rx="150" fill="url(#outer-sheen)" opacity="0.65" />

          <rect x="264" y="170" width="496" height="496" rx="18" fill="#F5F5F5" />

          <text
            x="512"
            y="302"
            fill="#111111"
            fontSize="114"
            fontWeight="900"
            fontFamily="Arial Black, Arial, sans-serif"
            letterSpacing="-4"
            textAnchor="middle"
          >
            РАДИО
          </text>
          <text
            x="512"
            y="424"
            fill="#111111"
            fontSize="72"
            fontWeight="900"
            fontFamily="Arial Black, Arial, sans-serif"
            letterSpacing="-3"
            textAnchor="middle"
          >
            САМИЗДАТ
          </text>

          <path d="M324 470H504L408 646L324 470Z" fill="#111111" />
          <path d="M520 470H700L616 646L520 470Z" fill="#111111" />
          <path d="M450 666L512 562L574 666H450Z" fill="#111111" />
          <path d="M378 782L512 556L646 782H378Z" fill="#F5F5F5" />
        </svg>
      </div>
    </div>
  );
}
