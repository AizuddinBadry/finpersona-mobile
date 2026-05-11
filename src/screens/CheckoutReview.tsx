/**
 * CheckoutReview — collects name, phone, and delivery address before payment.
 *
 * Only shows address fields when the cart contains at least one physical
 * product (`kind === 'product'`). Services (consultations) need no address.
 *
 * On "Confirm & Pay" it calls create-order (with shippingAddress) then
 * initiate-payment, and opens the ToyyibPay hosted page via Capacitor Browser.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import type { PluginListenerHandle } from '@capacitor/core';
import { Icon } from '@/components/Icon';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useMarketplaceProducts } from '@/hooks/useMarketplaceProducts';
import { supabase } from '@/lib/supabase/client';
import { marketplaceMock } from '@/mocks/seed';
import { tokens } from '@/styles/tokens';

const HAIRLINE = tokens.color.hairline;
const PAYMENT_GATEWAY = 'toyyibpay';

interface ShippingAddress {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          color: tokens.color.muted,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}{required && <span style={{ color: tokens.color.red }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: tokens.radius.sm,
          border: `1px solid ${HAIRLINE}`,
          background: tokens.color.surface,
          fontSize: 14,
          color: tokens.color.ink,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

export default function CheckoutReview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: products = marketplaceMock.products } = useMarketplaceProducts();
  const { lines, clear } = useCart();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingOrderRef = useRef<string | null>(null);
  const browserListenerRef = useRef<PluginListenerHandle | null>(null);

  // Pre-fill name from profile
  useEffect(() => {
    if (profile?.full_name) setName(profile.full_name);
  }, [profile?.full_name]);

  useEffect(() => {
    return () => {
      browserListenerRef.current?.remove();
    };
  }, []);

  const hasPhysicalProduct = lines.some((l) => l.kind === 'product');

  const total = lines.reduce((sum, line) => {
    const item = products.find((p) => p.id === line.itemId);
    if (!item) return sum;
    return sum + (line.kind === 'product' ? item.price * line.qty : item.price);
  }, 0);

  const itemCount = lines.reduce(
    (sum, l) => (l.kind === 'product' ? sum + l.qty : sum + 1),
    0,
  );

  if (lines.length === 0) {
    navigate('/marketplace/cart', { replace: true });
    return null;
  }

  const onConfirm = async () => {
    if (loading || !user) return;

    if (!name.trim()) { setError('Please enter your full name.'); return; }
    if (!phone.trim()) { setError('Please enter your phone number.'); return; }
    if (hasPhysicalProduct && (!street.trim() || !city.trim() || !state.trim() || !postcode.trim())) {
      setError('Please fill in all delivery address fields.');
      return;
    }

    setLoading(true);
    setError(null);

    const shippingAddress: ShippingAddress = {
      name: name.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      postcode: postcode.trim(),
    };

    try {
      const { data: orderData, error: orderErr } = await supabase.functions.invoke('create-order', {
        body: { lines, shippingAddress: hasPhysicalProduct ? shippingAddress : { name: name.trim(), phone: phone.trim() } },
      });
      if (orderErr) throw new Error(orderErr.message);
      if (orderData?.error) throw new Error(orderData.error);

      const { data: paymentData, error: paymentErr } = await supabase.functions.invoke(
        'initiate-payment',
        { body: { orderId: orderData.orderId, gateway: PAYMENT_GATEWAY } },
      );
      if (paymentErr) throw new Error(paymentErr.message);
      if (paymentData?.error) throw new Error(paymentData.error);

      pendingOrderRef.current = orderData.orderNumber;
      clear();

      browserListenerRef.current = await Browser.addListener('browserFinished', () => {
        browserListenerRef.current?.remove();
        browserListenerRef.current = null;
        navigate(`/checkout/status?order_id=${pendingOrderRef.current ?? ''}`);
      });

      await Browser.open({ url: paymentData.paymentUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ color: tokens.color.ink, paddingBottom: 180 }}>
      {/* Header */}
      <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: tokens.color.purple, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Finpersona
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, margin: 0, color: tokens.color.ink }}>
            Review Order
          </h1>
        </div>
        <div style={{ fontSize: 12, color: tokens.color.muted, fontWeight: 600 }}>
          {itemCount} item{itemCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        {/* Contact details */}
        <div
          style={{
            background: tokens.color.surface,
            borderRadius: tokens.radius.lg,
            border: `0.5px solid ${HAIRLINE}`,
            padding: '18px 16px 4px',
            marginBottom: 16,
            boxShadow: '0 1px 2px rgba(40,20,90,0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: tokens.color.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14 }}>
            Contact
          </div>
          <Field label="Full name" value={name} onChange={setName} placeholder="Your full name" required />
          <Field label="Phone number" value={phone} onChange={setPhone} placeholder="+60 12-345 6789" type="tel" required />
        </div>

        {/* Delivery address — only for physical products */}
        {hasPhysicalProduct && (
          <div
            style={{
              background: tokens.color.surface,
              borderRadius: tokens.radius.lg,
              border: `0.5px solid ${HAIRLINE}`,
              padding: '18px 16px 4px',
              marginBottom: 16,
              boxShadow: '0 1px 2px rgba(40,20,90,0.04)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: tokens.color.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14 }}>
              Delivery Address
            </div>
            <Field label="Street address" value={street} onChange={setStreet} placeholder="No. 1, Jalan Example" required />
            <Field label="City" value={city} onChange={setCity} placeholder="Kuala Lumpur" required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="State" value={state} onChange={setState} placeholder="Selangor" required />
              <Field label="Postcode" value={postcode} onChange={setPostcode} placeholder="50000" type="tel" required />
            </div>
          </div>
        )}

        {/* Order summary */}
        <div
          style={{
            background: tokens.color.surface,
            borderRadius: tokens.radius.lg,
            border: `0.5px solid ${HAIRLINE}`,
            padding: '18px 16px',
            boxShadow: '0 1px 2px rgba(40,20,90,0.04)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: tokens.color.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 14 }}>
            Order Summary
          </div>
          {lines.map((line) => {
            const item = products.find((p) => p.id === line.itemId);
            if (!item) return null;
            const qty = line.kind === 'product' ? line.qty : 1;
            const amount = item.price * qty;
            return (
              <div
                key={line.itemId}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: tokens.color.ink, marginBottom: 1 }}>{item.name}</div>
                  {qty > 1 && (
                    <div style={{ fontSize: 11, color: tokens.color.muted }}>Qty {qty}</div>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: tokens.color.ink, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  RM {amount.toFixed(2)}
                </div>
              </div>
            );
          })}
          <div
            style={{
              borderTop: `0.5px solid ${HAIRLINE}`,
              paddingTop: 10,
              marginTop: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: tokens.color.ink }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: tokens.color.ink, fontVariantNumeric: 'tabular-nums' }}>
              RM {total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
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
          flexDirection: 'column',
          gap: 8,
          zIndex: 50,
        }}
      >
        {error && (
          <div style={{ fontSize: 12, color: tokens.color.red, fontWeight: 600, textAlign: 'center' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: tokens.color.muted, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Total
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: tokens.color.ink, letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>
              RM {total.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '12px 22px',
              borderRadius: tokens.radius.pill,
              background: loading ? tokens.color.faint : tokens.color.purple,
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: -0.2,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing…' : 'Confirm & Pay'}
            {!loading && <Icon name="arrowRight" size={14} color="#fff" strokeWidth={2.4} />}
          </button>
        </div>
      </div>
    </div>
  );
}
