/**
 * Rewards — visual port of Finpersona-mobile-build/screens-8.jsx.
 *
 * Persona Points / gamification screen. Hero gradient card with points
 * balance + tier DonutRing (reused from Lhdn), streak + multiplier mini
 * cards, voucher redemption grid (greyed out when not affordable), and
 * recent earnings list with LHDN bonus badges. Footnote explains the
 * 1pt/RM and 2× LHDN rules.
 *
 * Route /rewards (linked from Home Persona Points strip).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { CatIcon } from '@/components/CatIcon';
import { DonutRing } from '@/components/DonutRing';
import { useRewards } from '@/hooks/useRewards';
import { useAuth } from '@/hooks/useAuth';
import { claimReward } from '@/lib/supabase/queries/rewards';
import { rewardsMock } from '@/mocks/seed';

const GRAD_CARD =
  'linear-gradient(140deg, #5837C9 0%, #8E73F0 100%)';
const GRAD_GLOW =
  'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';
const GRAD_HERO =
  'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';

export default function Rewards() {
  const { data = rewardsMock } = useRewards();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const {
    balancePts,
    redeemableMyr,
    tier,
    streak,
    multiplier,
    redeem,
    recent,
    footnote,
  } = data;

  async function handleClaim(rewardId: string) {
    if (!user || claimingId) return;
    setClaimingId(rewardId);
    setClaimError(null);
    try {
      await claimReward(user.id, rewardId);
      await queryClient.invalidateQueries({ queryKey: ['rewards', user.id] });
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Redemption failed.');
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 12px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: 10 }}>
            <Link
              to="/"
              aria-label="Back"
              className="flex items-center justify-center bg-surface shadow-card"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                border: '0.5px solid rgba(91,71,168,0.10)',
              }}
            >
              <Icon name="arrowLeft" size={17} color="#39314F" />
            </Link>
            <div>
              <div
                className="font-bold text-purple"
                style={{
                  fontSize: 11,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                }}
              >
                Persona Points
              </div>
              <h1
                className="font-bold text-ink"
                style={{ fontSize: 22, letterSpacing: -0.5 }}
              >
                FinRewards
              </h1>
            </div>
          </div>
          <button
            type="button"
            aria-label="Information"
            className="flex items-center justify-center bg-surface shadow-card"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              border: '0.5px solid rgba(91,71,168,0.10)',
            }}
          >
            <Icon name="info" size={17} color="#39314F" />
          </button>
        </div>
      </div>

      {/* Hero balance card */}
      <div style={{ padding: '0 16px' }}>
        <div
          className="text-white shadow-purpleGlow"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 24,
            padding: '20px 22px 22px',
            background: GRAD_CARD,
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: GRAD_GLOW,
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              right: -50,
              top: -50,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)',
            }}
          />
          {/* sparkle accents */}
          <div
            aria-hidden
            style={{ position: 'absolute', top: 18, right: 32 }}
          >
            <Icon
              name="sparkle"
              size={10}
              color="rgba(255,255,255,0.6)"
              strokeWidth={2}
            />
          </div>
          <div
            aria-hidden
            style={{ position: 'absolute', top: 64, right: 18 }}
          >
            <Icon
              name="sparkle"
              size={6}
              color="rgba(255,255,255,0.7)"
              strokeWidth={2}
            />
          </div>

          <div
            className="flex items-center justify-between"
            style={{ position: 'relative' }}
          >
            <div>
              <div
                className="font-semibold"
                style={{
                  fontSize: 11,
                  opacity: 0.85,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                Your balance
              </div>
              <div
                className="flex items-baseline"
                style={{ gap: 6, marginTop: 4 }}
              >
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 700,
                    letterSpacing: -1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {balancePts.toLocaleString('en-MY')}
                </span>
                <span
                  className="font-semibold"
                  style={{ fontSize: 14, opacity: 0.85 }}
                >
                  pts
                </span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                ≈ RM{' '}
                {redeemableMyr.toLocaleString('en-MY', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                redeemable
              </div>
            </div>
            <DonutRing pct={tier.progressPct} size={88} strokeWidth={6}>
              <Icon name="star" size={14} color="#fff" strokeWidth={2.4} />
              <span
                className="font-bold"
                style={{
                  fontSize: 10,
                  marginTop: 2,
                  letterSpacing: 0.4,
                  color: '#fff',
                }}
              >
                {tier.name.toUpperCase()}
              </span>
            </DonutRing>
          </div>

          <div
            className="font-medium"
            style={{
              position: 'relative',
              marginTop: 14,
              fontSize: 11.5,
              opacity: 0.9,
            }}
          >
            <strong style={{ fontWeight: 700 }}>
              {tier.pointsToNext} pts
            </strong>{' '}
            to <strong style={{ fontWeight: 700 }}>{tier.next}</strong> ·
            unlocks {tier.nextMultiplier}× receipt multiplier
          </div>
        </div>
      </div>

      {/* Streak + Multiplier */}
      <div
        style={{
          padding: '14px 16px 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        <div
          className="bg-surface shadow-card"
          style={{
            padding: 14,
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          <div
            className="text-muted font-bold"
            style={{
              fontSize: 10,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            Streak
          </div>
          <div
            className="flex items-baseline"
            style={{ gap: 4, marginTop: 4 }}
          >
            <span
              className="font-bold text-ink"
              style={{
                fontSize: 22,
                letterSpacing: -0.4,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {streak.days}
            </span>
            <span className="text-muted font-semibold" style={{ fontSize: 11 }}>
              days
            </span>
          </div>
          <div
            className="flex items-center"
            style={{ gap: 3, marginTop: 8 }}
          >
            {Array.from({ length: streak.receiptGoal }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 2,
                  background: i < streak.receiptsThisWeek ? '#6E4CE6' : '#E8DFFB',
                }}
              />
            ))}
          </div>
          <div
            className="text-muted font-medium"
            style={{ fontSize: 10, marginTop: 6 }}
          >
            {streak.receiptsThisWeek} / {streak.receiptGoal} receipts this week
          </div>
        </div>
        <div
          className="bg-surface shadow-card"
          style={{
            padding: 14,
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
          }}
        >
          <div
            className="text-muted font-bold"
            style={{
              fontSize: 10,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}
          >
            Multiplier
          </div>
          <div
            className="flex items-baseline"
            style={{ gap: 4, marginTop: 4 }}
          >
            <span
              className="font-bold text-purple"
              style={{ fontSize: 22, letterSpacing: -0.4 }}
            >
              {multiplier.value}×
            </span>
            <span className="text-muted font-semibold" style={{ fontSize: 11 }}>
              {multiplier.label}
            </span>
          </div>
          <div
            className="text-muted font-medium"
            style={{ fontSize: 10, marginTop: 14 }}
          >
            Tag claimable · earn double
          </div>
        </div>
      </div>

      {/* Redeem grid */}
      <div style={{ padding: '20px 16px 0' }}>
        <div
          className="flex items-center justify-between"
          style={{ padding: '0 4px', marginBottom: 10 }}
        >
          <span
            className="font-bold text-ink"
            style={{ fontSize: 14, letterSpacing: -0.2 }}
          >
            Redeem
          </span>
          <button
            type="button"
            className="font-semibold text-purple"
            style={{
              fontSize: 12,
              background: 'none',
              border: 'none',
            }}
          >
            All vouchers
          </button>
        </div>
        {claimError && (
          <div
            className="font-medium"
            style={{
              marginBottom: 10,
              padding: '9px 12px',
              borderRadius: 10,
              background: '#FEE2E2',
              color: '#B91C1C',
              fontSize: 12,
            }}
          >
            {claimError}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
          }}
        >
          {redeem.map((r) => {
            const affordable = balancePts >= r.pts;
            const isClaiming = claimingId === r.id;
            const anyBusy = claimingId !== null;
            return (
              <div
                key={r.id}
                className="bg-surface shadow-card"
                style={{
                  borderRadius: 16,
                  padding: 14,
                  border: '0.5px solid rgba(91,71,168,0.10)',
                  position: 'relative',
                  opacity: affordable && !anyBusy ? 1 : 0.6,
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: `${r.brandColor}1A`,
                  }}
                >
                  <Icon
                    name={r.icon}
                    size={18}
                    color={r.brandColor}
                    strokeWidth={2}
                  />
                </div>
                <div
                  className="font-semibold text-ink"
                  style={{ fontSize: 13, marginTop: 10, letterSpacing: -0.1 }}
                >
                  {r.name}
                </div>
                {r.sub && (
                  <div
                    className="text-muted"
                    style={{ fontSize: 10, marginTop: 2 }}
                  >
                    {r.sub}
                  </div>
                )}
                <div
                  className="flex items-center justify-between"
                  style={{ marginTop: 12 }}
                >
                  <div
                    className="flex items-center font-bold"
                    style={{
                      gap: 4,
                      fontSize: 12,
                      color: '#5837C9',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    <Icon
                      name="star"
                      size={11}
                      color="#6E4CE6"
                      strokeWidth={2.2}
                    />
                    {r.pts.toLocaleString('en-MY')}
                  </div>
                  <button
                    type="button"
                    disabled={!affordable || anyBusy}
                    aria-label={
                      isClaiming
                        ? 'Redeeming…'
                        : affordable
                          ? `Redeem ${r.name}`
                          : `Locked: ${r.name}`
                    }
                    onClick={() => handleClaim(r.id)}
                    className="font-bold"
                    style={{
                      padding: '5px 10px',
                      borderRadius: 999,
                      background: affordable && !anyBusy ? GRAD_HERO : '#E8DFFB',
                      color: affordable && !anyBusy ? '#fff' : '#7E7491',
                      fontSize: 10,
                      letterSpacing: 0.2,
                      border: 'none',
                      cursor: affordable && !anyBusy ? 'pointer' : 'default',
                    }}
                  >
                    {isClaiming ? '…' : affordable ? 'Redeem' : 'Locked'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent earnings */}
      <div style={{ padding: '20px 16px 0' }}>
        <div
          className="font-bold text-ink"
          style={{
            fontSize: 14,
            letterSpacing: -0.2,
            marginBottom: 10,
            padding: '0 4px',
          }}
        >
          Recent earnings
        </div>
        <div
          className="bg-surface shadow-card"
          style={{
            borderRadius: 16,
            border: '0.5px solid rgba(91,71,168,0.10)',
            overflow: 'hidden',
          }}
        >
          {recent.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center"
              style={{
                gap: 12,
                padding: '13px 14px',
                borderBottom:
                  i < recent.length - 1
                    ? '0.5px solid rgba(91,71,168,0.08)'
                    : 'none',
              }}
            >
              <CatIcon name={t.icon} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="font-semibold text-ink"
                  style={{ fontSize: 13.5, letterSpacing: -0.2 }}
                >
                  {t.merchant}
                </div>
                <div
                  className="flex items-center text-muted"
                  style={{ fontSize: 11, marginTop: 2, gap: 6 }}
                >
                  {t.category}
                  {t.bonus && (
                    <span
                      className="font-bold"
                      style={{
                        background: '#E8DFFB',
                        color: '#5837C9',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 9,
                        letterSpacing: 0.3,
                      }}
                    >
                      {t.bonus}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="flex items-center font-bold"
                style={{
                  gap: 4,
                  color: '#5837C9',
                  fontSize: 13,
                  letterSpacing: -0.1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                +{t.pts}
                <Icon name="star" size={11} color="#6E4CE6" strokeWidth={2.2} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        className="text-muted"
        style={{ padding: '14px 20px 0', fontSize: 11, lineHeight: 1.5 }}
      >
        {footnote}
      </p>
    </div>
  );
}
