/**
 * Marketplace — claimable products curated by LHDN relief category.
 *
 * Visual port of Finpersona-mobile-build "Screen 13: Marketplace".
 * Renders BETWEEN the StatusBar and BottomNav supplied by AppShell, so
 * this file owns only the scrolling content area (paddingBottom: 110
 * reserves space for the floating glass nav).
 *
 * Dynamic data:
 *   - Real LHDN categories (cap/used/color) come from useLhdn() — same
 *     hook as /lhdn and /insights. We never hard-code relief amounts;
 *     the headroom strip and category pills are derived from whatever
 *     the user's tax_categories table returns for the active YA.
 *   - Products + featured banner copy come from marketplaceMock since
 *     there's no products table yet. Each product joins to a live
 *     LhdnCategory by id so its colour swatch tracks the DB.
 *
 * "All" pill shows total product count; per-category pills show the
 * count of products mapped to that category id (so empty categories
 * still appear from the LHDN side, with count 0).
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useLhdn } from '@/hooks/useLhdn';
import { lhdnMock, marketplaceMock } from '@/mocks/seed';
import type { MarketplaceProduct } from '@/mocks/seed';
import { tokens } from '@/styles/tokens';

const HAIRLINE = tokens.color.hairline;
const SHADOW_CARD = tokens.shadow.card;
const SHADOW_PURPLE = tokens.shadow.purple;
const GRAD_CARD = tokens.gradient.card;
const GRAD_GLOW = tokens.gradient.glow;

const ALL_CATEGORY_ID = 'all';

function formatRm(n: number): string {
  return n.toLocaleString('en-MY');
}

export default function Marketplace() {
  const navigate = useNavigate();
  // Falls back to lhdnMock when the query is disabled (signed-out) or pending,
  // matching the Lhdn / Insights screens.
  const { data: lhdn = lhdnMock } = useLhdn();
  const { products, featured, cartCount } = marketplaceMock;

  const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_CATEGORY_ID);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Build the pill row from real LHDN categories. Each pill shows the count
  // of marketplace products mapped to that category id.
  const categoryPills = useMemo(() => {
    const productCountByCat = new Map<string, number>();
    for (const p of products) {
      productCountByCat.set(p.categoryId, (productCountByCat.get(p.categoryId) ?? 0) + 1);
    }
    return [
      { id: ALL_CATEGORY_ID, name: 'All', count: products.length, color: undefined as string | undefined },
      ...lhdn.categories.map((c) => ({
        id: c.id,
        name: c.name,
        count: productCountByCat.get(c.id) ?? 0,
        color: c.color,
      })),
    ];
  }, [lhdn.categories, products]);

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const inCategory =
        activeCategoryId === ALL_CATEGORY_ID || p.categoryId === activeCategoryId;
      if (!inCategory) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sub.toLowerCase().includes(q)
      );
    });
  }, [activeCategoryId, products, searchQuery]);

  // Pick up to 4 categories for the headroom strip — prefer those with the
  // most remaining cap so users see where they have the most to claim.
  const headroomCategories = useMemo(() => {
    return [...lhdn.categories]
      .map((c) => ({ ...c, left: Math.max(c.cap - c.used, 0) }))
      .sort((a, b) => b.left - a.left)
      .slice(0, 4);
  }, [lhdn.categories]);

  const totalLeft = useMemo(
    () => lhdn.categories.reduce((sum, c) => sum + Math.max(c.cap - c.used, 0), 0),
    [lhdn.categories],
  );

  const featuredCategory = lhdn.categories.find((c) => c.id === featured.categoryId);
  const featuredLeft = featuredCategory ? Math.max(featuredCategory.cap - featuredCategory.used, 0) : null;
  const featuredTitle =
    featuredLeft !== null
      ? `Sports relief — RM ${formatRm(featuredLeft)} left to claim`
      : featured.title;

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
            Marketplace
          </h1>
        </div>
        <button
          type="button"
          aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
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
          {cartCount > 0 && (
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
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderRadius: tokens.radius.pill,
            background: tokens.color.surface,
            border: `0.5px solid ${HAIRLINE}`,
            boxShadow: SHADOW_CARD,
          }}
        >
          <Icon name="search" size={16} color={tokens.color.faint} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${products.length} claimable items`}
            aria-label="Search marketplace"
            autoComplete="off"
            inputMode="search"
            enterKeyHint="search"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: tokens.color.ink,
              fontWeight: 500,
              padding: 0,
              minWidth: 0,
            }}
          />
        </div>

        {/* Relief headroom strip — derived from live LHDN categories */}
        <div
          style={{
            marginTop: 14,
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
                Your relief headroom
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
                RM {formatRm(totalLeft)} LEFT
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {headroomCategories.map((c) => {
                const usedRatio = c.cap > 0 ? Math.min(c.used / c.cap, 1) : 0;
                return (
                  <div key={c.id} style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        opacity: 0.75,
                        marginBottom: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: -0.3,
                      }}
                    >
                      RM {formatRm(c.left)}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        height: 3,
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Category pills */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
          role="tablist"
          aria-label="Relief categories"
        >
          {categoryPills.map((c) => {
            const active = c.id === activeCategoryId;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveCategoryId(c.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: tokens.radius.pill,
                  background: active ? tokens.color.ink : tokens.color.surface,
                  color: active ? '#fff' : tokens.color.ink2,
                  border: active ? 'none' : `0.5px solid ${HAIRLINE}`,
                  boxShadow: active ? '0 4px 12px rgba(26,21,48,0.18)' : SHADOW_CARD,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: -0.1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {c.color && !active && (
                  <span
                    aria-hidden
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: c.color,
                      display: 'inline-block',
                    }}
                  />
                )}
                {c.name}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: 6,
                    background: active ? 'rgba(255,255,255,0.20)' : tokens.color.mistDeep,
                    color: active ? '#fff' : tokens.color.purple,
                  }}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Featured banner */}
        <div
          style={{
            marginTop: 16,
            padding: 18,
            borderRadius: 20,
            background: featured.gradient,
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(31,181,115,0.32)',
          }}
        >
          <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, background: GRAD_GLOW, pointerEvents: 'none' }}
          />
          <div
            aria-hidden
            style={{ position: 'absolute', right: -20, top: -20, opacity: 0.15 }}
          >
            <Icon name="pulse" size={120} color="#fff" strokeWidth={1.5} />
          </div>
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 8,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.5,
                background: 'rgba(255,255,255,0.22)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <Icon name="fire" size={10} color="#fff" strokeWidth={2} /> {featured.badge}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: -0.4,
                marginTop: 8,
                lineHeight: 1.2,
              }}
            >
              {featuredTitle}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4, lineHeight: 1.4 }}>
              {featured.subtitle}
            </div>
            <button
              type="button"
              onClick={() => setActiveCategoryId(featured.categoryId)}
              style={{
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '7px 12px',
                borderRadius: tokens.radius.pill,
                background: '#fff',
                color: featured.accent,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: -0.1,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {featured.cta}
              <Icon name="arrowRight" size={12} color={featured.accent} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Section header */}
        <div
          style={{
            marginTop: 22,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: tokens.color.ink,
                letterSpacing: -0.4,
              }}
            >
              Picked for you
            </div>
            <div
              style={{
                fontSize: 11,
                color: tokens.color.muted,
                fontWeight: 500,
                marginTop: 1,
              }}
            >
              Based on your unclaimed reliefs
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              color: tokens.color.purple,
            }}
          >
            <Icon name="sparkle" size={12} color={tokens.color.purple} strokeWidth={2} /> AI
          </div>
        </div>

        {/* Product grid */}
        {visibleProducts.length === 0 ? (
          <div
            style={{
              padding: '32px 16px',
              borderRadius: 18,
              background: tokens.color.mist,
              border: `0.5px dashed ${tokens.color.purpleLight}`,
              textAlign: 'center',
              color: tokens.color.muted,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {searchQuery.trim()
              ? `No items match "${searchQuery.trim()}".`
              : 'No items in this category yet.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {visibleProducts.map((p) => {
              const liveCat = lhdn.categories.find((c) => c.id === p.categoryId);
              const reliefName = (liveCat?.name ?? p.categoryId).toUpperCase();
              const reliefColor = liveCat?.color ?? tokens.color.purple;
              return (
                <ProductCard key={p.id} p={p} reliefName={reliefName} reliefColor={reliefColor} />
              );
            })}
          </div>
        )}

        {/* Trust footer */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 18,
            background: tokens.color.mist,
            border: `0.5px dashed ${tokens.color.purpleLight}`,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              flexShrink: 0,
              background: tokens.color.surface,
              boxShadow: SHADOW_CARD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="shield" size={18} color={tokens.color.purple} strokeWidth={2} />
          </div>
          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: tokens.color.ink,
                letterSpacing: -0.2,
              }}
            >
              Curated for LHDN compliance
            </div>
            <div
              style={{
                fontSize: 11,
                color: tokens.color.ink2,
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              Every product is reviewed for relief eligibility. Receipts file
              automatically to your Borang BE.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  p,
  reliefName,
  reliefColor,
}: {
  p: MarketplaceProduct;
  reliefName: string;
  reliefColor: string;
}) {
  const discountPct = p.was ? Math.round((1 - p.price / p.was) * 100) : null;
  return (
    <div
      style={{
        background: tokens.color.surface,
        borderRadius: 18,
        border: `0.5px solid ${HAIRLINE}`,
        boxShadow: SHADOW_CARD,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Image placeholder */}
      <div
        style={{
          aspectRatio: '1',
          background: p.tint,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Icon name={p.iconName} size={42} color="rgba(255,255,255,0.9)" strokeWidth={1.4} />
        {p.hot && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '3px 7px',
              borderRadius: 8,
              background: tokens.color.ink,
              color: '#fff',
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: 0.3,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Icon name="fire" size={9} color="#fff" strokeWidth={2} /> HOT
          </div>
        )}
        {discountPct !== null && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: '3px 7px',
              borderRadius: 8,
              background: tokens.color.red,
              color: '#fff',
              fontSize: 9,
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
            bottom: 8,
            left: 8,
            padding: '3px 8px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.3,
            color: reliefColor,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              background: reliefColor,
              display: 'inline-block',
            }}
          />
          {reliefName}
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: 12 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: tokens.color.ink,
            letterSpacing: -0.2,
            lineHeight: 1.25,
            height: 30,
            overflow: 'hidden',
          }}
        >
          {p.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: tokens.color.muted,
            marginTop: 3,
            fontWeight: 500,
          }}
        >
          {p.sub}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 4,
            marginTop: 8,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 9, color: tokens.color.muted, fontWeight: 600 }}>RM</span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: tokens.color.ink,
              letterSpacing: -0.4,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {p.price.toFixed(2)}
          </span>
          {p.priceSuffix && (
            <span style={{ fontSize: 10, color: tokens.color.muted, fontWeight: 500 }}>
              {p.priceSuffix}
            </span>
          )}
          {p.was && (
            <span
              style={{
                fontSize: 10,
                color: tokens.color.faint,
                fontWeight: 500,
                textDecoration: 'line-through',
              }}
            >
              RM {p.was.toFixed(2)}
            </span>
          )}
        </div>
        {/* Auto-receipt strip */}
        <div
          style={{
            marginTop: 8,
            padding: '6px 8px',
            borderRadius: 8,
            background: tokens.color.greenSoft,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Icon name="check" size={10} color={tokens.color.green} strokeWidth={2.6} />
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: tokens.color.green,
              letterSpacing: 0.2,
            }}
          >
            Receipt auto-filed
          </span>
        </div>
      </div>
    </div>
  );
}
