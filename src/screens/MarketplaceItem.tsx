/**
 * MarketplaceItem — product / service detail screen.
 *
 * Renders a hero, relief-headroom strip (live useLhdn data), description,
 * a quantity stepper for products or a "What's included" list for services,
 * and a sticky bottom bar that adds to cart (or jumps to /marketplace/cart
 * when the line is already present).
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useCart } from '@/contexts/CartContext';
import { useLhdn } from '@/hooks/useLhdn';
import { lhdnMock, marketplaceMock } from '@/mocks/seed';
import { tokens } from '@/styles/tokens';

const HAIRLINE = tokens.color.hairline;
const SHADOW_CARD = tokens.shadow.card;
const SHADOW_PURPLE = tokens.shadow.purple;
const GRAD_CARD = tokens.gradient.card;
const GRAD_GLOW = tokens.gradient.glow;

function formatRm(n: number): string {
  return n.toLocaleString('en-MY');
}

const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function MarketplaceItemDetail() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { data: lhdn = lhdnMock } = useLhdn();
  const { lines, totalCount, add } = useCart();

  const item = marketplaceMock.products.find((p) => p.id === itemId);

  // Lazy initial qty: if a product line already exists, prefill from it.
  const [qty, setQty] = useState<number>(() => {
    if (!item || item.kind !== 'product') return 1;
    const existing = lines.find((l) => l.kind === 'product' && l.itemId === item.id);
    return existing && existing.kind === 'product' ? existing.qty : 1;
  });

  const liveCategory = useMemo(
    () => (item ? lhdn.categories.find((c) => c.id === item.categoryId) : undefined),
    [item, lhdn.categories],
  );

  if (!item) {
    return (
      <div
        style={{
          color: tokens.color.ink,
          padding: '40px 16px',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: tokens.color.mist,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="search" size={24} color={tokens.color.purple} strokeWidth={2} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
          Item not found
        </div>
        <div style={{ fontSize: 12, color: tokens.color.muted, textAlign: 'center' }}>
          We couldn't find that listing. It may have been removed.
        </div>
        <button
          type="button"
          onClick={() => navigate('/marketplace')}
          style={{
            marginTop: 4,
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
          Back to marketplace
        </button>
      </div>
    );
  }

  const isProduct = item.kind === 'product';
  const existingLine = lines.find((l) => l.itemId === item.id);
  const alreadyInCart = Boolean(existingLine);

  const reliefName = liveCategory?.name ?? item.categoryId;
  const reliefColor = liveCategory?.color ?? tokens.color.purple;
  const reliefCap = liveCategory?.cap ?? 0;
  const reliefUsed = liveCategory?.used ?? 0;
  const reliefLeft = Math.max(reliefCap - reliefUsed, 0);
  const usedRatio = reliefCap > 0 ? Math.min(reliefUsed / reliefCap, 1) : 0;

  const discountPct = item.was ? Math.round((1 - item.price / item.was) * 100) : null;

  const subtotal = isProduct ? item.price * qty : item.price;

  const decQty = () => setQty((q) => Math.max(1, q - 1));
  const incQty = () => setQty((q) => Math.min(99, q + 1));

  const onPrimary = () => {
    if (alreadyInCart) {
      navigate('/marketplace/cart');
      return;
    }
    if (isProduct) {
      add(item, qty);
    } else {
      add(item);
    }
    navigate('/marketplace/cart');
  };

  let primaryLabel: string;
  if (alreadyInCart) {
    primaryLabel = isProduct ? 'In cart \u2014 view' : 'Booked \u2014 view cart';
  } else {
    primaryLabel = isProduct ? 'Add to cart' : 'Book consultation';
  }

  return (
    <div style={{ color: tokens.color.ink, paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
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
            {isProduct ? 'Product' : 'Service'}
          </h1>
        </div>
        <button
          type="button"
          aria-label={`Cart, ${totalCount} item${totalCount === 1 ? '' : 's'}`}
          onClick={() => navigate('/marketplace/cart')}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: tokens.color.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: SHADOW_CARD,
            border: `0.5px solid ${HAIRLINE}`,
            position: 'relative',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <Icon name="cart" size={18} color={tokens.color.ink2} />
          {totalCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -3,
                right: -3,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                padding: '0 4px',
                background: tokens.color.purple,
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #fff',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {totalCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Hero tile */}
        <div
          style={{
            aspectRatio: '16 / 10',
            background: item.tint,
            borderRadius: 22,
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: SHADOW_CARD,
          }}
        >
          <Icon name={item.iconName} size={72} color="rgba(255,255,255,0.95)" strokeWidth={1.4} />
          {item.hot && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                padding: '4px 9px',
                borderRadius: 9,
                background: tokens.color.ink,
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Icon name="fire" size={10} color="#fff" strokeWidth={2} /> HOT
            </div>
          )}
          {discountPct !== null && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: '4px 9px',
                borderRadius: 9,
                background: tokens.color.red,
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              −{discountPct}%
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              padding: '4px 10px',
              borderRadius: 9,
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
              color: reliefColor,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              textTransform: 'uppercase',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: reliefColor,
                display: 'inline-block',
              }}
            />
            {reliefName}
          </div>
        </div>

        {/* Title block */}
        <div style={{ marginTop: 16 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: -0.5,
              color: tokens.color.ink,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {item.name}
          </h2>
          <div
            style={{
              fontSize: 12,
              color: tokens.color.muted,
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            {item.sub}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              marginTop: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, color: tokens.color.muted, fontWeight: 600 }}>RM</span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: tokens.color.ink,
                letterSpacing: -0.6,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.price.toFixed(2)}
            </span>
            {item.was && (
              <span
                style={{
                  fontSize: 12,
                  color: tokens.color.faint,
                  fontWeight: 500,
                  textDecoration: 'line-through',
                }}
              >
                RM {item.was.toFixed(2)}
              </span>
            )}
            {item.priceSuffix && (
              <span style={{ fontSize: 12, color: tokens.color.muted, fontWeight: 500 }}>
                {item.priceSuffix}
              </span>
            )}
          </div>
        </div>

        {/* Relief headroom strip */}
        <div
          style={{
            marginTop: 16,
            padding: '14px 16px',
            borderRadius: 18,
            background: GRAD_CARD,
            color: '#fff',
            boxShadow: SHADOW_PURPLE,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, background: GRAD_GLOW, pointerEvents: 'none' }}
          />
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  opacity: 0.9,
                  textTransform: 'uppercase',
                }}
              >
                {reliefName} relief headroom
              </div>
              <div
                style={{
                  padding: '3px 8px',
                  borderRadius: 10,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  background: 'rgba(255,255,255,0.20)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                }}
              >
                RM {formatRm(reliefLeft)} LEFT
              </div>
            </div>
            <div
              style={{
                marginTop: 10,
                height: 4,
                background: 'rgba(255,255,255,0.20)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${usedRatio * 100}%`,
                  height: '100%',
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: 2,
                }}
              />
            </div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 8, lineHeight: 1.4 }}>
              {item.price > 0
                ? `Buying this auto-files RM ${item.price.toFixed(2)} toward your ${reliefName} relief.`
                : `Booking this counts toward your ${reliefName} relief.`}
            </div>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            marginTop: 16,
            marginBottom: 0,
            fontSize: 13,
            lineHeight: 1.55,
            color: tokens.color.ink2,
          }}
        >
          {item.description}
        </p>

        {/* Quantity stepper (product only) */}
        {isProduct && (
          <div
            style={{
              marginTop: 18,
              padding: '14px 16px',
              borderRadius: 16,
              background: tokens.color.surface,
              border: `0.5px solid ${HAIRLINE}`,
              boxShadow: SHADOW_CARD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: tokens.color.ink,
                letterSpacing: -0.2,
              }}
            >
              Quantity
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={decQty}
                disabled={qty <= 1}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: tokens.color.mist,
                  border: `0.5px solid ${HAIRLINE}`,
                  color: tokens.color.ink,
                  fontSize: 16,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                  opacity: qty <= 1 ? 0.4 : 1,
                  padding: 0,
                }}
              >
                <span aria-hidden="true">−</span>
                <span style={srOnly}>Decrease quantity</span>
              </button>
              <span
                aria-label="quantity"
                aria-live="polite"
                style={{
                  minWidth: 28,
                  textAlign: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  color: tokens.color.ink,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: -0.3,
                }}
              >
                {qty}
              </span>
              <button
                type="button"
                onClick={incQty}
                disabled={qty >= 99}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  background: tokens.color.ink,
                  border: 'none',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: qty >= 99 ? 'not-allowed' : 'pointer',
                  opacity: qty >= 99 ? 0.4 : 1,
                  padding: 0,
                }}
              >
                <span aria-hidden="true">+</span>
                <span style={srOnly}>Increase quantity</span>
              </button>
            </div>
          </div>
        )}

        {/* Service: What's included */}
        {!isProduct && item.serviceIncludes && item.serviceIncludes.length > 0 && (
          <div
            style={{
              marginTop: 18,
              padding: '14px 16px',
              borderRadius: 16,
              background: tokens.color.surface,
              border: `0.5px solid ${HAIRLINE}`,
              boxShadow: SHADOW_CARD,
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: tokens.color.ink,
                letterSpacing: -0.3,
              }}
            >
              {"What's included"}
            </div>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: '10px 0 0 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {item.serviceIncludes.map((line) => (
                <li
                  key={line}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    fontSize: 12.5,
                    color: tokens.color.ink2,
                    lineHeight: 1.45,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: tokens.color.greenSoft,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                    }}
                  >
                    <Icon name="check" size={11} color={tokens.color.green} strokeWidth={2.6} />
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Receipt auto-filed strip */}
        <div
          style={{
            marginTop: 16,
            padding: '10px 12px',
            borderRadius: 12,
            background: tokens.color.greenSoft,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Icon name="check" size={12} color={tokens.color.green} strokeWidth={2.6} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: tokens.color.green,
              letterSpacing: 0.2,
            }}
          >
            Receipt auto-filed
          </span>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom)) 16px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `0.5px solid ${HAIRLINE}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 20,
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
            Subtotal
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: tokens.color.ink,
              letterSpacing: -0.4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            RM {subtotal.toFixed(2)}
          </div>
        </div>
        <button
          type="button"
          onClick={onPrimary}
          style={{
            padding: '12px 20px',
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
          {primaryLabel}
          <Icon name="arrowRight" size={14} color="#fff" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
