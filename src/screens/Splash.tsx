/**
 * Splash — visual port of Finpersona-mobile-build/screens-9.jsx.
 * Brand-led launch screen used while auth bootstraps and while RequireAuth/
 * RequireOnboarded queries are loading. Static (no auth state references) so
 * it can render before Providers mount.
 */
export default function Splash() {
  return (
    <div
      data-testid="splash"
      className="relative h-screen w-full overflow-hidden text-ink"
      style={{
        background:
          'linear-gradient(180deg, #F5F2FE 0%, #FAF8FF 55%, #FFFFFF 100%)',
      }}
    >
      {/* Soft glow, bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: 380,
          height: 380,
          borderRadius: '50%',
          right: -120,
          bottom: 60,
          background:
            'radial-gradient(circle, rgba(155,123,241,0.16) 0%, rgba(155,123,241,0) 70%)',
          filter: 'blur(8px)',
        }}
      />

      {/* Logo card */}
      <div className="absolute left-0 right-0 flex flex-col items-center" style={{ top: 76 }}>
        <div
          className="flex items-center justify-center overflow-hidden rounded-[22px] bg-surface"
          style={{
            width: 84,
            height: 84,
            boxShadow:
              '0 18px 40px rgba(60,40,140,0.10), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 0.5px rgba(91,71,168,0.10)',
          }}
        >
          <img
            src="/logo-light.svg"
            alt="Finpersona"
            width={64}
            height={64}
            style={{
              filter:
                'brightness(0) saturate(100%) invert(28%) sepia(72%) saturate(2200%) hue-rotate(248deg) brightness(95%) contrast(92%)',
            }}
          />
        </div>
      </div>

      {/* Headline */}
      <div
        className="absolute left-0 right-0 px-9 text-center"
        style={{ top: '46%' }}
      >
        <p
          className="text-ink"
          style={{
            fontFamily: '"New York", "Times New Roman", Georgia, serif',
            fontWeight: 500,
            fontSize: 28,
            letterSpacing: -0.6,
            lineHeight: 1.25,
          }}
        >
          Spend with intent.
          <br />
          <span className="italic text-purple">Save with personality.</span>
        </p>
      </div>

      {/* Build line */}
      <div className="absolute left-0 right-0 text-center" style={{ bottom: 36 }}>
        <span
          className="font-mono text-faint"
          style={{ fontSize: 10, letterSpacing: 1.2 }}
        >
          Made in Kuala Lumpur · v1.0.0
        </span>
      </div>
    </div>
  );
}
