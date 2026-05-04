/**
 * SegmentedTabs — generic-typed pill-style tab control with proper
 * tablist/tab ARIA semantics. The active segment uses a white inset on a
 * faint pill background to match the existing Insights period switcher
 * (see src/screens/Insights.tsx) without coupling to it.
 *
 * Used first by /insights for the Claimable | All-spend toggle (T5). The
 * generic value parameter lets callers pin the literal union so onChange
 * narrows to the exact option set.
 */

type SegmentedTabsProps<T extends string> = {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
};

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: 3,
        borderRadius: 999,
        background: 'rgba(91,71,168,0.08)',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
            className="font-semibold"
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              fontSize: 12,
              background: active ? '#fff' : 'transparent',
              color: active ? '#1A1530' : '#7E7491',
              border: 'none',
              boxShadow: active
                ? '0 1px 2px rgba(26,21,48,0.08)'
                : 'none',
              cursor: active ? 'default' : 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
