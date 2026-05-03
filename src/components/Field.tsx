/**
 * Field — shared review-form input row.
 *
 * A labeled, soft-purple input row used by the receipt review surfaces:
 * Capture's parsed-details review step today, and ReceiptDetail's edit form
 * (next phase). Lifted verbatim from Capture so both screens stay visually
 * locked: same padding, same label treatment, same border tint. Keep the
 * prop signature minimal (label/value/type/onChange) — anything richer
 * (validation, hints) should live in the caller, not this primitive.
 */
export type FieldProps = {
  label: string;
  value: string;
  type?: string;
  onChange: (v: string) => void;
};

export function Field(props: FieldProps) {
  const { label, value, type = 'text', onChange } = props;
  return (
    <label
      style={{
        padding: '10px 14px',
        borderRadius: 12,
        background: '#F5F2FE',
        border: '0.5px solid rgba(91,71,168,0.10)',
        display: 'block',
      }}
    >
      <div
        className="text-muted font-semibold"
        style={{
          fontSize: 10,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-semibold text-ink"
        style={{
          fontSize: 14,
          marginTop: 4,
          letterSpacing: -0.2,
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
        }}
      />
    </label>
  );
}
