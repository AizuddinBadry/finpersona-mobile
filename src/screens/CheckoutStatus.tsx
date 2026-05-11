/**
 * CheckoutStatus — final screen after payment gateway interaction.
 *
 * Two entry paths:
 *
 * A) Via browserFinished listener (primary — Capacitor native):
 *    /checkout/status?order_id=ORD-2026-000001
 *    No status_id → polls Supabase for payment_status (callback may be
 *    slightly delayed). Shows loading spinner while polling.
 *
 * B) Via ToyyibPay return URL redirect (web/PWA fallback):
 *    /checkout/status?status_id=1&order_id=ORD-2026-000001
 *    Skips polling and shows result immediately from URL params.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { supabase } from '@/lib/supabase/client';
import { tokens } from '@/styles/tokens';

type PaymentStatus = 'loading' | 'success' | 'pending' | 'failed';

/** Poll orders by order_number up to maxAttempts times, 1.5 s apart. */
async function pollPaymentStatus(orderNumber: string, maxAttempts = 6): Promise<PaymentStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('order_number', orderNumber)
      .single();

    const status = (data?.payment_status ?? 'pending') as string;
    if (status === 'success') return 'success';
    if (status === 'failed') return 'failed';
    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  // Still pending after all attempts — callback may arrive later
  return 'pending';
}

type StatusConfig = {
  icon: 'check' | 'calendar' | 'close';
  iconBg: string;
  iconColor: string;
  title: string;
  body: string;
  primaryLabel: string;
  primaryAction: () => void;
  showSecondary: boolean;
};

export default function CheckoutStatus() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const statusIdParam = params.get('status_id') ?? params.get('status');
  const orderRef = params.get('order_id') ?? '';

  // If status_id is in the URL (return URL path), resolve immediately.
  // Otherwise start in loading state and poll.
  const initialStatus: PaymentStatus = statusIdParam
    ? statusIdParam === '1' ? 'success' : statusIdParam === '2' ? 'pending' : 'failed'
    : 'loading';

  const [status, setStatus] = useState<PaymentStatus>(initialStatus);

  useEffect(() => {
    if (status !== 'loading' || !orderRef) {
      if (status === 'loading') setStatus('pending'); // no order ref, show pending
      return;
    }
    let cancelled = false;
    pollPaymentStatus(orderRef).then((resolved) => {
      if (!cancelled) setStatus(resolved);
    });
    return () => { cancelled = true; };
  }, []);

  if (status === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: tokens.color.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: tokens.color.ink,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            border: `3px solid ${tokens.color.lavender}`,
            borderTopColor: tokens.color.purple,
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: 13, color: tokens.color.muted, margin: 0 }}>
          Checking payment status…
        </p>
      </div>
    );
  }

  const config: StatusConfig =
    status === 'success'
      ? {
          icon: 'check',
          iconBg: tokens.color.greenSoft,
          iconColor: tokens.color.green,
          title: 'Payment Successful',
          body: orderRef
            ? `Order ${orderRef} is confirmed. Receipts will be auto-filed to your LHDN relief.`
            : 'Your order is confirmed. Receipts will be auto-filed to your LHDN relief.',
          primaryLabel: 'Back to Marketplace',
          primaryAction: () => navigate('/marketplace'),
          showSecondary: false,
        }
      : status === 'pending'
      ? {
          icon: 'calendar',
          iconBg: tokens.color.amberSoft,
          iconColor: tokens.color.amber,
          title: 'Payment Pending',
          body: "Your payment is being verified. We'll notify you once it's confirmed.",
          primaryLabel: 'Back to Marketplace',
          primaryAction: () => navigate('/marketplace'),
          showSecondary: false,
        }
      : {
          icon: 'close',
          iconBg: tokens.color.redSoft,
          iconColor: tokens.color.red,
          title: 'Payment Failed',
          body: 'Something went wrong with your payment. Your cart has been saved — try again.',
          primaryLabel: 'Try Again',
          primaryAction: () => navigate('/marketplace/cart'),
          showSecondary: true,
        };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.color.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        color: tokens.color.ink,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          background: config.iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Icon name={config.icon} size={32} color={config.iconColor} strokeWidth={2.2} />
      </div>

      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: -0.5,
          margin: '0 0 10px',
          textAlign: 'center',
        }}
      >
        {config.title}
      </h1>

      <p
        style={{
          fontSize: 13,
          color: tokens.color.muted,
          textAlign: 'center',
          lineHeight: 1.55,
          margin: '0 0 32px',
          maxWidth: 280,
        }}
      >
        {config.body}
      </p>

      {orderRef && (
        <div
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            background: tokens.color.mist,
            fontSize: 11,
            fontWeight: 700,
            color: tokens.color.purple,
            letterSpacing: 0.3,
            marginBottom: 28,
          }}
        >
          {orderRef}
        </div>
      )}

      <button
        type="button"
        onClick={config.primaryAction}
        style={{
          width: '100%',
          maxWidth: 320,
          padding: '14px 20px',
          borderRadius: tokens.radius?.pill ?? 999,
          background: tokens.color.ink,
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: -0.2,
          border: 'none',
          cursor: 'pointer',
          marginBottom: config.showSecondary ? 12 : 0,
        }}
      >
        {config.primaryLabel}
      </button>

      {config.showSecondary && (
        <button
          type="button"
          onClick={() => navigate('/marketplace')}
          style={{
            width: '100%',
            maxWidth: 320,
            padding: '14px 20px',
            borderRadius: tokens.radius?.pill ?? 999,
            background: 'transparent',
            color: tokens.color.muted,
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Back to Marketplace
        </button>
      )}
    </div>
  );
}
