/**
 * Orders — full order history list, newest first.
 *
 * Each row shows: order number, date, item summary, total, and a
 * colour-coded payment status chip. Tapping a row navigates to OrderDetail.
 */
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useOrders, type Order } from '@/hooks/useOrders';
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
  return new Date(iso).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function itemSummary(order: Order) {
  const items = order.order_items;
  if (!items.length) return 'No items';
  const first = items[0].products?.title ?? 'Item';
  return items.length === 1 ? first : `${first} +${items.length - 1} more`;
}

function OrderRow({ order }: { order: Order }) {
  const navigate = useNavigate();
  const chip = statusChip(order.payment_status);
  return (
    <button
      type="button"
      onClick={() => navigate(`/orders/${order.id}`)}
      style={{
        width: '100%',
        padding: '14px 16px',
        background: 'transparent',
        border: 'none',
        borderTop: `0.5px solid ${HAIRLINE}`,
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {/* Left — order info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: tokens.color.purple,
              background: tokens.color.mist,
              padding: '2px 7px',
              borderRadius: 6,
              letterSpacing: 0.3,
            }}
          >
            {order.order_number}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: chip.color,
              background: chip.bg,
              padding: '2px 7px',
              borderRadius: 6,
              letterSpacing: 0.2,
            }}
          >
            {chip.label}
          </span>
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: tokens.color.ink,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
          }}
        >
          {itemSummary(order)}
        </div>
        <div style={{ fontSize: 11, color: tokens.color.muted }}>{formatDate(order.created_at)}</div>
      </div>

      {/* Right — total + chevron */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: tokens.color.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          RM {order.total_amount.toFixed(2)}
        </span>
        <Icon name="chevronRight" size={14} color={tokens.color.faint} />
      </div>
    </button>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading, isError } = useOrders();

  return (
    <div style={{ color: tokens.color.ink, paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '4px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, margin: 0, flex: 1, color: tokens.color.ink }}>
          My Orders
        </h1>
      </div>

      {isLoading && (
        <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 16,
              border: `3px solid ${tokens.color.lavender}`,
              borderTopColor: tokens.color.purple,
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {isError && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: tokens.color.muted, fontSize: 13 }}>
          Failed to load orders. Pull to retry.
        </div>
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <div
          style={{
            padding: '60px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64, height: 64, borderRadius: 32,
              background: tokens.color.mist,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="cart" size={28} color={tokens.color.purple} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: tokens.color.ink, letterSpacing: -0.3 }}>
            No orders yet
          </div>
          <div style={{ fontSize: 13, color: tokens.color.muted, maxWidth: 240, lineHeight: 1.5 }}>
            Browse the Marketplace to find claimable products and services.
          </div>
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            style={{
              marginTop: 4,
              padding: '10px 20px',
              borderRadius: tokens.radius.pill,
              background: tokens.color.ink,
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Browse Marketplace
          </button>
        </div>
      )}

      {!isLoading && orders.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <div
            style={{
              background: tokens.color.surface,
              borderRadius: tokens.radius.lg,
              border: `0.5px solid ${HAIRLINE}`,
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(40,20,90,0.04)',
            }}
          >
            {orders.map((order, idx) => (
              <div key={order.id} style={{ borderTop: idx === 0 ? 'none' : undefined }}>
                <OrderRow order={order} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
