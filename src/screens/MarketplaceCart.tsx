/**
 * MarketplaceCart — review screen for items added from the Marketplace.
 *
 * Lines are grouped by live LHDN category, products carry per-row qty
 * steppers, services render as singleton booking rows, and Checkout
 * clears the cart with a mock confirmation toast.
 */
import { useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useCart, type CartLine } from '@/contexts/CartContext';
import { useLhdn } from '@/hooks/useLhdn';
import {
  lhdnMock,
  marketplaceMock,
  type LhdnCategory,
  type MarketplaceItem,
} from '@/mocks/seed';
import { tokens } from '@/styles/tokens';

const HAIRLINE = tokens.color.hairline;
const SHADOW_CARD = tokens.shadow.card;

type ResolvedLine = { line: CartLine; item: MarketplaceItem };

type Section = {
  categoryId: string;
  category: LhdnCategory | undefined;
  entries: ResolvedLine[];
  subtotal: number;
};

function lineAmount(entry: ResolvedLine): number {
  return entry.line.kind === 'product'
    ? entry.item.price * entry.line.qty
    : entry.item.price;
}

/**
 * Imperative toast: appended to document.body so it survives the
 * navigate('/marketplace') unmount triggered by checkout. React state
 * cannot deliver a toast that outlives its component tree. A module-level
 * `activeToast` ref dedupes rapid double-clicks so we never stack
 * overlapping toasts on top of each other.
 */
let activeToast: HTMLDivElement | null = null;
function showOrderPlacedToast(): void {
  if (typeof document === 'undefined') return;
  if (activeToast) activeToast.remove();
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.style.cssText = [
    'position:fixed',
    'top:16px',
    'left:16px',
    'right:16px',
    'z-index:9999',
    'padding:12px 16px',
    'border-radius:12px',
    `background:${tokens.color.ink}`,
    `color:${tokens.color.white}`,
    'font-size:13px',
    'font-weight:600',
    'box-shadow:0 8px 24px rgba(0,0,0,0.3)',
    'text-align:center',
    'letter-spacing:-0.2px',
  ].join(';');
  toast.textContent = 'Order placed (mock). Receipts will auto-file.';
  document.body.appendChild(toast);
  activeToast = toast;
  window.setTimeout(() => {
    toast.remove();
    if (activeToast === toast) activeToast = null;
  }, 3000);
}

export default function MarketplaceCart() {
  const navigate = useNavigate();
  const { data: lhdn = lhdnMock } = useLhdn();
  const { lines, setQty, remove, clear } = useCart();

  const resolved: ResolvedLine[] = useMemo(() => {
    const out: ResolvedLine[] = [];
    for (const line of lines) {
      const item = marketplaceMock.products.find((p) => p.id === line.itemId);
      if (item) out.push({ line, item });
    }
    return out;
  }, [lines]);

  const sections: Section[] = useMemo(() => {
    if (resolved.length === 0) return [];
    const byCategory = new Map<string, ResolvedLine[]>();
    for (const entry of resolved) {
      const list = byCategory.get(entry.item.categoryId) ?? [];
      list.push(entry);
      byCategory.set(entry.item.categoryId, list);
    }
    // Order by appearance in lhdn.categories first, then any leftovers in
    // their original insertion order so unknown categories still render.
    const ordered: Section[] = [];
    const seen = new Set<string>();
    for (const cat of lhdn.categories) {
      const entries = byCategory.get(cat.id);
      if (!entries) continue;
      seen.add(cat.id);
      ordered.push({
        categoryId: cat.id,
        category: cat,
        entries,
        subtotal: entries.reduce((sum, e) => sum + lineAmount(e), 0),
      });
    }
    for (const [categoryId, entries] of byCategory) {
      if (seen.has(categoryId)) continue;
      ordered.push({
        categoryId,
        category: undefined,
        entries,
        subtotal: entries.reduce((sum, e) => sum + lineAmount(e), 0),
      });
    }
    return ordered;
  }, [resolved, lhdn.categories]);

  const total = sections.reduce((sum, s) => sum + s.subtotal, 0);
  const itemCount = resolved.reduce(
    (sum, e) => (e.line.kind === 'product' ? sum + e.line.qty : sum + 1),
    0,
  );
  const reliefCount = sections.length;
  const isEmpty = resolved.length === 0;

  const onCheckout = () => {
    showOrderPlacedToast();
    clear();
    navigate('/marketplace');
  };

  return (
    <div style={{ color: tokens.color.ink, paddingBottom: isEmpty ? 24 : 170 }}>
      {/* Header */}
      <div
        style={{
          padding: '4px 16px 0',
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
            width: 32,
            height: 32,
            borderRadius: 16,
            background: tokens.color.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: SHADOW_CARD,
            border: `0.5px solid ${HAIRLINE}`,
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <Icon name="arrowLeft" size={16} color={tokens.color.ink2} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              color: tokens.color.purple,
              fontWeight: 700,
              letterSpacing: 0.6,
            }}
          >
            FINPERSONA
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: -0.5,
              color: tokens.color.ink,
              marginTop: -1,
              marginBottom: 0,
            }}
          >
            Cart
          </h1>
          {!isEmpty && (
            <div
              style={{
                fontSize: 11,
                color: tokens.color.muted,
                marginTop: 2,
                fontWeight: 500,
              }}
            >
              {itemCount} item{itemCount === 1 ? '' : 's'} across {reliefCount}{' '}
              relief{reliefCount === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState onBrowse={() => navigate('/marketplace')} />
      ) : (
        <div style={{ padding: '16px 16px 0' }}>
          {sections.map((section) => (
            <CategorySection
              key={section.categoryId}
              section={section}
              onDecrement={(itemId, qty) => setQty(itemId, qty - 1)}
              onIncrement={(itemId, qty) =>
                setQty(itemId, Math.min(99, qty + 1))
              }
              onRemove={(itemId) => remove(itemId)}
            />
          ))}

          <OrderSummary sections={sections} total={total} />
        </div>
      )}

      {!isEmpty && (
        <div
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: 102,
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 20,
            border: `0.5px solid ${HAIRLINE}`,
            boxShadow: '0 8px 24px rgba(60,40,140,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            zIndex: 50,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                color: tokens.color.muted,
                fontWeight: 600,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}
            >
              Total
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: tokens.color.ink,
                letterSpacing: -0.5,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              RM {total.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={onCheckout}
            style={{
              padding: '12px 22px',
              borderRadius: tokens.radius.pill,
              background: tokens.color.ink,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: -0.2,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Checkout
            <Icon name="arrowRight" size={14} color="#fff" strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div
      style={{
        padding: '40px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          background: tokens.color.mist,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="cart" size={28} color={tokens.color.purple} strokeWidth={2} />
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: tokens.color.ink,
          letterSpacing: -0.3,
        }}
      >
        Your cart is empty
      </div>
      <div
        style={{
          fontSize: 12,
          color: tokens.color.muted,
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        Find claimable products and services in the Marketplace.
      </div>
      <button
        type="button"
        onClick={onBrowse}
        style={{
          marginTop: 6,
          padding: '10px 18px',
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
  );
}

type CategorySectionProps = {
  section: Section;
  onDecrement: (itemId: string, qty: number) => void;
  onIncrement: (itemId: string, qty: number) => void;
  onRemove: (itemId: string) => void;
};

function CategorySection({
  section,
  onDecrement,
  onIncrement,
  onRemove,
}: CategorySectionProps) {
  const reliefName = section.category?.name ?? section.categoryId;
  const reliefColor = section.category?.color ?? tokens.color.purple;

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px 8px',
        }}
      >
        <h2
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            color: tokens.color.ink2,
            textTransform: 'uppercase',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: reliefColor,
              display: 'inline-block',
            }}
          />
          {reliefName}
        </h2>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: tokens.radius.pill,
            background: tokens.color.mist,
            color: tokens.color.ink,
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: -0.2,
          }}
        >
          RM {section.subtotal.toFixed(2)}
        </span>
      </div>

      {/* Rows */}
      <div
        style={{
          background: tokens.color.surface,
          borderRadius: 18,
          border: `0.5px solid ${HAIRLINE}`,
          boxShadow: SHADOW_CARD,
          overflow: 'hidden',
        }}
      >
        {section.entries.map((entry, idx) => {
          const { line, item } = entry;
          return (
            <div
              key={`${line.kind}-${item.id}`}
              style={{
                borderTop: idx === 0 ? 'none' : `0.5px solid ${HAIRLINE}`,
              }}
            >
              {line.kind === 'product' ? (
                (() => {
                  const qty = line.qty;
                  return (
                    <ProductRow
                      item={item}
                      qty={qty}
                      onDecrement={() => onDecrement(item.id, qty)}
                      onIncrement={() => onIncrement(item.id, qty)}
                      onRemove={() => onRemove(item.id)}
                    />
                  );
                })()
              ) : (
                <ServiceRow
                  item={item}
                  onRemove={() => onRemove(item.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const removeBtnStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 14,
  background: 'transparent',
  border: 'none',
  color: tokens.color.muted,
  fontSize: 18,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  flexShrink: 0,
};

function Thumb({ item }: { item: MarketplaceItem }) {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: item.tint,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon
        name={item.iconName}
        size={26}
        color="rgba(255,255,255,0.95)"
        strokeWidth={1.6}
      />
    </div>
  );
}

type ProductRowProps = {
  item: MarketplaceItem;
  qty: number;
  onDecrement: () => void;
  onIncrement: () => void;
  onRemove: () => void;
};

function ProductRow({
  item,
  qty,
  onDecrement,
  onIncrement,
  onRemove,
}: ProductRowProps) {
  const subtotal = item.price * qty;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
      }}
    >
      <Thumb item={item} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: tokens.color.ink,
            letterSpacing: -0.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: tokens.color.muted,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.sub}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
          }}
        >
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={onDecrement}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              background: tokens.color.mist,
              border: `0.5px solid ${HAIRLINE}`,
              color: tokens.color.ink,
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span aria-hidden="true">{'\u2212'}</span>
          </button>
          <span
            aria-hidden
            style={{
              minWidth: 18,
              textAlign: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: tokens.color.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={onIncrement}
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              background: tokens.color.ink,
              border: 'none',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
          <span
            style={{
              fontSize: 12,
              color: tokens.color.ink2,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              marginLeft: 'auto',
            }}
          >
            RM {subtotal.toFixed(2)}
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        onClick={onRemove}
        style={removeBtnStyle}
      >
        <span aria-hidden="true">{'\u00D7'}</span>
      </button>
    </div>
  );
}

function ServiceRow({
  item,
  onRemove,
}: {
  item: MarketplaceItem;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
      }}
    >
      <Thumb item={item} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: tokens.color.ink,
            letterSpacing: -0.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: tokens.color.muted,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.sub}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 8,
              background: tokens.color.mist,
              color: tokens.color.ink2,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            Booking
          </span>
          <span
            style={{
              padding: '3px 8px',
              borderRadius: 8,
              background: 'rgba(110,76,230,0.12)',
              color: tokens.color.purple,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            Schedule after checkout
          </span>
          <span
            style={{
              fontSize: 12,
              color: tokens.color.ink2,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              marginLeft: 'auto',
            }}
          >
            RM {item.price.toFixed(2)}
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        onClick={onRemove}
        style={removeBtnStyle}
      >
        <span aria-hidden="true">{'\u00D7'}</span>
      </button>
    </div>
  );
}

function OrderSummary({
  sections,
  total,
}: {
  sections: Section[];
  total: number;
}) {
  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 16,
        padding: '14px 16px',
        borderRadius: 16,
        background: tokens.color.surface,
        border: `0.5px solid ${HAIRLINE}`,
        boxShadow: SHADOW_CARD,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: tokens.color.ink2,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}
      >
        Order summary
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 10,
          fontSize: 12,
          color: tokens.color.ink2,
        }}
      >
        <span style={{ fontWeight: 600 }}>Subtotal</span>
        <span
          style={{
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: tokens.color.ink,
          }}
        >
          RM {total.toFixed(2)}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginTop: 8,
        }}
      >
        {sections.map((section) => (
          <div
            key={section.categoryId}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: tokens.color.muted,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: section.category?.color ?? tokens.color.purple,
                  display: 'inline-block',
                }}
              />
              Auto-files to {section.category?.name ?? section.categoryId}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
              RM {section.subtotal.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `0.5px solid ${HAIRLINE}`,
          fontSize: 11,
          color: tokens.color.muted,
          lineHeight: 1.5,
        }}
      >
        Receipts will file automatically to your Borang BE on purchase.
      </div>
    </div>
  );
}
