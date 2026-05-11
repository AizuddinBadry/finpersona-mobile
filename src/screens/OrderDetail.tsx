/**
 * OrderDetail — full breakdown of a single order.
 *
 * Sections:
 *  • Header: order number, date, payment status chip
 *  • Items: thumbnail (or fallback gradient), title, qty × price
 *  • Totals: subtotal, shipping, total
 *  • Delivery info: name, phone, address (hidden when shipping_address is null)
 *  • Payment: gateway, channel, status
 */
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useOrderDetail } from '@/hooks/useOrders';
import { tokens } from '@/styles/tokens';

const HAIRLINE = tokens.color.hairline;

function statusChip(status: string) {
  if (status === 'success') {
    return { label: 'Paid', bg: tokens.color.greenSoft, color: tokens.color.green };
  }
  if (status === 'failed') {
    return { label: 'Failed', bg: tokens.color.redSoft, color: tokens.color.red };
  }
  return { label: 'Pending', bg: tokens.color.amberSoft, color: tokens.color.amber };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: tokens.color.surface,
        borderRadius: tokens.radius.lg,
        border: `0.5px solid ${HAIRLINE}`,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(40,20,90,0.04)',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          padding: '12px 16px 10px',
          borderBottom: `0.5px solid ${HAIRLINE}`,
          fontSize: 11,
          fontWeight: 700,
          color: tokens.color.muted,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '10px 16px',
        borderTop: `0.5px solid ${HAIRLINE}`,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, color: tokens.color.muted, fontWeight: 600, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: tokens.color.ink, fontWeight: 500, textAlign: 'right', flex: 1 }}>{value}</span>
    </div>
  );
}

export default function OrderDetail() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, isError } = useOrderDetail(orderId);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tokens.color.bg,
        }}
      >
        <div
          style={{
            width: 36, height: 36, borderRadius: 18,
            border: `3px solid ${tokens.color.lavender}`,
            borderTopColor: tokens.color.purple,
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', color: tokens.color.muted }}>
        Order not found.
      </div>
    );
  }

  const chip = statusChip(order.payment_status);
  const addr = order.shipping_address;

  return (
    <div style={{ color: tokens.color.ink, paddingBottom: 110, background: tokens.color.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          padding: '4px 16px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          style={{
            width: 36, height: 36, borderRadius: 18, border: `0.5px solid ${HAIRLINE}`,
            background: tokens.color.surface, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0, cursor: 'pointer',
          }}
        >
          <Icon name="arrowLeft" size={16} color={tokens.color.ink2} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: tokens.color.purple,
                background: tokens.color.mist,
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              {order.order_number}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: chip.color,
                background: chip.bg,
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              {chip.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: tokens.color.muted, marginTop: 3 }}>{formatDate(order.created_at)}</div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Items */}
        <SectionCard title="Items">
          {order.order_items.map((item, idx) => {
            const image = item.products?.images?.[0];
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  borderTop: idx === 0 ? 'none' : `0.5px solid ${HAIRLINE}`,
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: tokens.gradient.card,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {image ? (
                    <img
                      src={image}
                      alt={item.products?.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Icon name="bag" size={20} color="rgba(255,255,255,0.8)" />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: tokens.color.ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.products?.title ?? 'Product'}
                  </div>
                  <div style={{ fontSize: 11, color: tokens.color.muted, marginTop: 2 }}>
                    Qty {item.quantity} × RM {item.unit_price.toFixed(2)}
                  </div>
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: tokens.color.ink, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  RM {item.subtotal.toFixed(2)}
                </div>
              </div>
            );
          })}
        </SectionCard>

        {/* Totals */}
        <SectionCard title="Totals">
          <div style={{ padding: '0 0 4px' }}>
            <InfoRow label="Subtotal" value={`RM ${order.subtotal.toFixed(2)}`} />
            <InfoRow label="Shipping" value={order.shipping_total > 0 ? `RM ${order.shipping_total.toFixed(2)}` : 'Free'} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderTop: `0.5px solid ${HAIRLINE}`,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: tokens.color.ink }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: tokens.color.ink, fontVariantNumeric: 'tabular-nums' }}>
                RM {order.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Delivery info — only when address is present */}
        {addr && (
          <SectionCard title="Delivery">
            {addr.name && <InfoRow label="Name" value={addr.name} />}
            {addr.phone && <InfoRow label="Phone" value={addr.phone} />}
            {addr.street && <InfoRow label="Address" value={addr.street} />}
            {(addr.city || addr.state) && (
              <InfoRow label="City / State" value={[addr.city, addr.state].filter(Boolean).join(', ')} />
            )}
            {addr.postcode && <InfoRow label="Postcode" value={addr.postcode} />}
          </SectionCard>
        )}

        {/* Payment details */}
        <SectionCard title="Payment">
          <div style={{ padding: '0 0 4px' }}>
            {order.payment_gateway && (
              <InfoRow label="Gateway" value={order.payment_gateway} />
            )}
            {order.payment_channel && (
              <InfoRow label="Channel" value={order.payment_channel} />
            )}
            <InfoRow label="Status" value={chip.label} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
