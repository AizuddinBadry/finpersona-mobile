/**
 * iOS-style status bar ported from Finpersona-mobile-build/shell.jsx.
 * Time is hardcoded to "9:41" — Date.now would just churn snapshots.
 * `dark` swaps icon/text color to white for dark hero backdrops.
 */
type Props = {
  dark?: boolean;
  time?: string;
};

export default function StatusBar({ dark = false, time = '9:41' }: Props) {
  const c = dark ? '#fff' : '#1A1530';
  return (
    <div
      className="relative flex items-center justify-between"
      style={{
        height: 54,
        padding: '0 28px',
        paddingTop: 16,
        zIndex: 30,
      }}
    >
      <span
        style={{
          fontWeight: 600,
          fontSize: 17,
          color: c,
          letterSpacing: -0.2,
        }}
      >
        {time}
      </span>
      <div className="flex items-center" style={{ gap: 6 }}>
        <svg width="18" height="11" viewBox="0 0 18 11" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="0.6" fill={c} />
          <rect x="5" y="5" width="3" height="6" rx="0.6" fill={c} />
          <rect x="10" y="2" width="3" height="9" rx="0.6" fill={c} />
          <rect x="15" y="0" width="3" height="11" rx="0.6" fill={c} />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" aria-hidden="true">
          <path
            d="M8 3.2C9.9 3.2 11.7 4 13 5.3l1-1A8 8 0 008 1.5 8 8 0 002 4.3l1 1A6.7 6.7 0 018 3.2zM8 6.5c1 0 2 .4 2.7 1.1l1-1A5 5 0 008 5a5 5 0 00-3.7 1.6l1 1C6 6.9 7 6.5 8 6.5z"
            fill={c}
          />
          <circle cx="8" cy="9.5" r="1.3" fill={c} />
        </svg>
        <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
          <rect
            x="0.5"
            y="0.5"
            width="22"
            height="11"
            rx="3"
            stroke={c}
            strokeOpacity="0.4"
            fill="none"
          />
          <rect x="2" y="2" width="19" height="8" rx="1.6" fill={c} />
          <path
            d="M24 4v4c.7-.3 1.3-1 1.3-2S24.7 4.3 24 4z"
            fill={c}
            fillOpacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}
