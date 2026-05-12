/**
 * FinTravel — AI-powered travel itinerary planner at /fintravel.
 *
 * Three phases:
 *   wizard   — 3-step form: destination → trip details → purpose
 *   loading  — full-screen overlay while Claude generates the itinerary
 *   result   — itinerary display: hero, transport, accommodation, day tabs,
 *              budget breakdown, payment strategy, packing essentials
 *
 * History tab lists saved itineraries from /api/travel/itineraries.
 * All API calls forward the Supabase access_token as Bearer.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/hooks/useAuth';
import { fetchTravelSources } from '@/lib/supabase/queries/travel';
import { supabase } from '@/lib/supabase/client';
import { getEnv } from '@/lib/env';

// ─── Design tokens ────────────────────────────────────────────────────────────

const INK = '#1A1530';
const INK2 = '#3A3458';
const MUTED = '#7A7392';
const MIST = '#F5F2FE';
const HAIRLINE = 'rgba(91,71,168,0.12)';
const PURPLE = '#6E4CE6';
const SHADOW_CARD = '0 1px 2px rgba(40,20,90,0.04), 0 8px 24px rgba(60,40,140,0.06)';
const SHADOW_PURPLE = '0 8px 24px rgba(110,76,230,0.28), 0 2px 8px rgba(110,76,230,0.16)';

const GRAD_HERO = 'linear-gradient(135deg, #6E4CE6 0%, #9B7BF1 60%, #C9BAFB 100%)';
const GRAD_GLOW = 'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)';
const GRAD_GREEN = 'linear-gradient(135deg, #0A8A5C 0%, #1FB573 100%)';
const GRAD_RED = 'linear-gradient(135deg, #C53030 0%, #E5484D 100%)';

// ─── Types ───────────────────────────────────────────────────────────────────

type Destination = {
  id: string;
  country: string;
  country_code: string;
  city: string;
  region?: string;
  is_popular?: boolean;
};

type PlaceItem = {
  name: string;
  type: 'attraction' | 'food' | 'transport' | 'stay' | 'activity';
  cost: number;
  duration: string;
  tip: string;
};

type DayPlan = {
  day: number;
  title: string;
  places: PlaceItem[];
  day_total: number;
};

type FlightOption = {
  airline: string;
  price_per_pax: number;
  booking_tip?: string;
};

type ItineraryResponse = {
  overview: string;
  accommodation: { name: string; area: string; nightly_cost: number; tip: string };
  budget_analysis: { status: 'under' | 'over'; variance: number; insight: string };
  days: DayPlan[];
  source_strategy: string;
  packing_essentials: string[];
  flight_recommendations?: FlightOption[];
  transport_to_destination?: { mode: string; cost: number; duration: string; tip: string };
};

type SavedItinerary = {
  id: string;
  destination_city: string;
  destination_country: string;
  destination_country_code: string;
  travel_date: string;
  days: number;
  persons: number;
  budget: number;
  purpose: string;
  priorities: string[];
  notes?: string;
  selected_source_ids: string[];
  itinerary: ItineraryResponse;
  created_at: string;
};

type HistoryPage = {
  data: SavedItinerary[];
  total: number;
  page: number;
  totalPages: number;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ORIGIN_COUNTRIES = [
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
];

const PURPOSES = [
  { id: 'leisure', label: 'Leisure' },
  { id: 'business', label: 'Business' },
  { id: 'family', label: 'Family' },
  { id: 'honeymoon', label: 'Honeymoon' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'cultural', label: 'Cultural' },
];

const PRIORITIES = [
  'Food', 'Culture', 'Shopping', 'Nature',
  'Nightlife', 'Relaxation', 'Adventure', 'Photography',
];

const PLACE_TYPE_META: Record<PlaceItem['type'], { color: string; bg: string; label: string }> = {
  attraction: { color: '#6E4CE6', bg: '#EDE7FB', label: 'Attraction' },
  food: { color: '#E89B2A', bg: '#FBEFD6', label: 'Food' },
  transport: { color: '#7C3AED', bg: '#EDE9FE', label: 'Transport' },
  stay: { color: '#1FB573', bg: '#E5F6EE', label: 'Stay' },
  activity: { color: '#0EA5A0', bg: '#CCFBF1', label: 'Activity' },
};

const SOURCE_ICON_NAME: Record<string, 'bank' | 'cards' | 'wallet'> = {
  bank: 'bank', credit_card: 'cards', debit_card: 'cards', ewallet: 'wallet', cash: 'wallet',
};

const PURPOSE_LABELS: Record<string, string> = {
  leisure: 'Leisure', business: 'Business', family: 'Family',
  honeymoon: 'Honeymoon', adventure: 'Adventure', cultural: 'Cultural',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Coerce an itinerary payload into the canonical ItineraryResponse shape,
 * handling both the current schema and older saved itineraries that used
 * different field names (estimated_cost_per_night, estimated_total, etc.).
 */
function normalizeItinerary(raw: unknown, userBudget = 0): ItineraryResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = raw as any;
  const nightlyCost: number =
    r.accommodation?.nightly_cost ?? r.accommodation?.estimated_cost_per_night ?? 0;
  const ba = r.budget_analysis ?? {};
  let status: 'under' | 'over';
  let variance: number;
  if (ba.status !== undefined) {
    status = ba.status as 'under' | 'over';
    variance = Number(ba.variance) || 0;
  } else {
    const withinBudget = ba.within_budget !== false;
    status = withinBudget ? 'under' : 'over';
    variance = userBudget > 0 ? Math.abs((ba.estimated_total ?? 0) - userBudget) : 0;
  }
  const insight: string = ba.insight ?? ba.financial_insight ?? '';
  const flights: FlightOption[] = (r.flight_recommendations ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (f: any) => ({
      airline: f.airline ?? '',
      price_per_pax: f.price_per_pax ?? f.estimated_price_per_person ?? 0,
      booking_tip: f.booking_tip ?? f.tip,
    }),
  );
  const transport = r.transport_to_destination
    ? {
        mode: r.transport_to_destination.mode ?? '',
        cost: r.transport_to_destination.cost ?? r.transport_to_destination.estimated_cost ?? 0,
        duration: r.transport_to_destination.duration ?? '',
        tip: r.transport_to_destination.tip ?? '',
      }
    : undefined;
  return {
    ...r,
    accommodation: { ...r.accommodation, nightly_cost: nightlyCost },
    budget_analysis: { status, variance, insight },
    flight_recommendations: flights.length > 0 ? flights : undefined,
    transport_to_destination: transport,
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function countryFlag(code: string) {
  return code.toUpperCase().replace(/./g, (c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  );
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: MIST,
  border: `1px solid ${HAIRLINE}`,
  borderRadius: 12,
  padding: '12px 14px',
  color: INK,
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
};

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: SHADOW_CARD, border: `0.5px solid ${HAIRLINE}`, ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: MUTED, textTransform: 'uppercase', marginBottom: 8 }}>
      {text}
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center" style={{ margin: '4px 0 20px' }}>
      {[1, 2, 3].map((n, i) => (
        <div key={n} className="flex items-center">
          <div
            className="flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: step >= n ? PURPLE : MIST,
              color: step >= n ? '#fff' : MUTED,
              fontSize: 12,
              fontWeight: 700,
              border: `2px solid ${step >= n ? PURPLE : HAIRLINE}`,
              boxShadow: step === n ? SHADOW_PURPLE : 'none',
              transition: 'all 0.2s',
            }}
          >
            {step > n ? '✓' : n}
          </div>
          {i < 2 && (
            <div style={{
            width: 44,
            height: 2,
            background: step > n ? PURPLE : HAIRLINE,
              transition: 'all 0.2s',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function CounterRow({ label, value, onDec, onInc, min = 1, max = 30 }: {
  label: string; value: number; onDec: () => void; onInc: () => void; min?: number; max?: number;
}) {
  return (
    <div>
      <SectionLabel text={label} />
      <div className="flex items-center" style={{ gap: 10, background: MIST, borderRadius: 12, padding: '6px 10px', border: `1px solid ${HAIRLINE}` }}>
        <button
          onClick={onDec}
          disabled={value <= min}
          style={{
            width: 32, height: 32, borderRadius: 10, background: value > min ? '#fff' : 'transparent',
            border: `1px solid ${value > min ? HAIRLINE : 'transparent'}`,
            color: value > min ? INK : MUTED, fontSize: 18, fontWeight: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: value > min ? SHADOW_CARD : 'none',
          }}
        >
          −
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: 700, color: INK }}>{value}</span>
        <button
          onClick={onInc}
          disabled={value >= max}
          style={{
            width: 32, height: 32, borderRadius: 10, background: value < max ? '#fff' : 'transparent',
            border: `1px solid ${value < max ? HAIRLINE : 'transparent'}`,
            color: value < max ? INK : MUTED, fontSize: 18, fontWeight: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: value < max ? SHADOW_CARD : 'none',
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled = false }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', background: disabled ? MIST : PURPLE, border: 'none', borderRadius: 14,
        padding: '14px', color: disabled ? MUTED : '#fff', fontSize: 15, fontWeight: 700,
        boxShadow: disabled ? 'none' : SHADOW_PURPLE, transition: 'all 0.2s',
      }}
    >
      {children}
    </button>
  );
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: MIST, border: `1px solid ${HAIRLINE}`, borderRadius: 14,
        padding: '14px', color: INK2, fontSize: 15, fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

// ─── Step 1: Destination ──────────────────────────────────────────────────────

interface Step1Props {
  origin: string;
  setOrigin: (v: string) => void;
  destination: Destination | null;
  setDestination: (v: Destination | null) => void;
  onNext: () => void;
}

function Step1Destination({ origin, setOrigin, destination, setDestination, onNext }: Step1Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Destination[]>([]);
  const [popular, setPopular] = useState<Destination[]>([]);
  const [focused, setFocused] = useState(false);
  const [showOrigin, setShowOrigin] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase
      .from('travel_destinations')
      .select('id, country, country_code, city, region, is_popular')
      .eq('is_popular', true)
      .order('city')
      .limit(20)
      .then(({ data }) => setPopular((data ?? []) as Destination[]));
  }, []);

  const handleQuery = useCallback((v: string) => {
    setQuery(v);
    setDestination(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!v.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      supabase
        .from('travel_destinations')
        .select('id, country, country_code, city, region, is_popular')
        .or(`city.ilike.%${v}%,country.ilike.%${v}%`)
        .order('is_popular', { ascending: false })
        .limit(15)
        .then(({ data }) => setResults((data ?? []) as Destination[]));
    }, 300);
  }, [setDestination]);

  const pickDestination = (d: Destination) => {
    setDestination(d);
    setQuery(`${d.city}, ${d.country}`);
    setResults([]);
    setFocused(false);
  };

  const selectedOrigin = ORIGIN_COUNTRIES.find((c) => c.code === origin)!;
  const listItems = query.trim() ? results : (focused ? popular : []);

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: INK, letterSpacing: -0.5, marginBottom: 4 }}>
        Where are you going?
      </h2>
      <p style={{ fontSize: 14, color: MUTED, marginBottom: 24 }}>Choose your origin and destination</p>

      <SectionLabel text="Traveling from" />
      <button
        onClick={() => setShowOrigin((v) => !v)}
        className="flex items-center justify-between"
        style={{ width: '100%', ...inputStyle, padding: '12px 14px', marginBottom: 16 }}
      >
        <span style={{ fontSize: 15, color: INK }}>
          {selectedOrigin.flag}  {selectedOrigin.name}
        </span>
        <Icon name="chevronDown" size={16} color={MUTED} />
      </button>

      {showOrigin && (
        <Card style={{ marginBottom: 16, padding: 8 }}>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {ORIGIN_COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() => { setOrigin(c.code); setShowOrigin(false); }}
                className="flex items-center"
                style={{
                  width: '100%', background: origin === c.code ? MIST : 'transparent',
                  border: 'none', borderRadius: 10, padding: '10px 12px',
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>{c.flag}</span>
                <span style={{ fontSize: 14, color: INK, flex: 1, textAlign: 'left' }}>{c.name}</span>
                {origin === c.code && <span style={{ fontSize: 13, color: PURPLE, fontWeight: 700 }}>✓</span>}
              </button>
            ))}
          </div>
        </Card>
      )}

      <SectionLabel text="Destination" />
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <input
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search city or country…"
          style={{
            ...inputStyle,
            paddingLeft: 40,
            border: `1px solid ${destination ? PURPLE : HAIRLINE}`,
          }}
        />
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
          <Icon name="search" size={16} color={destination ? PURPLE : MUTED} />
        </div>
      </div>

      {listItems.length > 0 && (
        <Card style={{ marginBottom: 16, padding: 8 }}>
          {!query.trim() && (
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px 8px' }}>
              Popular Destinations
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {listItems.map((d) => (
              <button
                key={d.id}
                onMouseDown={() => pickDestination(d)}
                className="flex items-center"
                style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 10, padding: '10px 12px', gap: 10, textAlign: 'left' }}
              >
                <span style={{ fontSize: 20 }}>{countryFlag(d.country_code)}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{d.city}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{d.country}{d.region ? ` · ${d.region}` : ''}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <PrimaryBtn onClick={onNext} disabled={!destination}>Continue</PrimaryBtn>
    </div>
  );
}

// ─── Step 2: Trip Details ─────────────────────────────────────────────────────

interface Step2Props {
  travelDate: string;
  setTravelDate: (v: string) => void;
  days: number;
  setDays: (v: number) => void;
  persons: number;
  setPersons: (v: number) => void;
  budget: string;
  setBudget: (v: string) => void;
  sources: Array<{ id: string; name: string; source_type: string; balance: number; is_default: boolean }>;
  selectedSourceIds: string[];
  toggleSource: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

function Step2Details({ travelDate, setTravelDate, days, setDays, persons, setPersons, budget, setBudget, sources, selectedSourceIds, toggleSource, onBack, onNext }: Step2Props) {
  const valid = !!travelDate && days > 0 && persons > 0 && Number(budget) > 0 && selectedSourceIds.length > 0;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: INK, letterSpacing: -0.5, marginBottom: 4 }}>
        Trip details
      </h2>
      <p style={{ fontSize: 14, color: MUTED, marginBottom: 24 }}>Tell us about your trip plan</p>

      <SectionLabel text="Departure date" />
      <input
        type="date"
        value={travelDate}
        min={new Date().toISOString().split('T')[0]}
        onChange={(e) => setTravelDate(e.target.value)}
        style={{ ...inputStyle, marginBottom: 20, colorScheme: 'light' }}
      />

      <div className="flex" style={{ gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <CounterRow label="Days" value={days} onDec={() => setDays(Math.max(1, days - 1))} onInc={() => setDays(Math.min(30, days + 1))} min={1} max={30} />
        </div>
        <div style={{ flex: 1 }}>
          <CounterRow label="Persons" value={persons} onDec={() => setPersons(Math.max(1, persons - 1))} onInc={() => setPersons(Math.min(20, persons + 1))} min={1} max={20} />
        </div>
      </div>

      <SectionLabel text="Total budget (MYR)" />
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 600, color: MUTED }}>RM</span>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="0.00"
          min={0}
          style={{ ...inputStyle, paddingLeft: 42 }}
        />
      </div>

      <SectionLabel text="Pay with (select sources)" />
      {sources.length === 0 ? (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: MUTED, textAlign: 'center', padding: '8px 0' }}>
            No payment sources found. Add one in Sources.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {sources.map((s) => {
            const selected = selectedSourceIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                className="flex items-center"
                style={{
                  gap: 12, background: selected ? '#F0FDF4' : '#fff',
                  border: `1.5px solid ${selected ? '#1FB573' : HAIRLINE}`,
                  borderRadius: 14, padding: '12px 14px',
                  boxShadow: SHADOW_CARD, textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 10, background: MIST, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={SOURCE_ICON_NAME[s.source_type] ?? 'cards'} size={16} color={PURPLE} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{fmt(s.balance)} available</div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: selected ? '#1FB573' : MIST,
                  border: `2px solid ${selected ? '#1FB573' : HAIRLINE}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {selected && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}><GhostBtn onClick={onBack}>Back</GhostBtn></div>
        <div style={{ flex: 2 }}><PrimaryBtn onClick={onNext} disabled={!valid}>Continue</PrimaryBtn></div>
      </div>
    </div>
  );
}

// ─── Step 3: Purpose ──────────────────────────────────────────────────────────

interface Step3Props {
  purpose: string;
  setPurpose: (v: string) => void;
  priorities: string[];
  togglePriority: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  onBack: () => void;
  onGenerate: () => void;
}

function Step3Purpose({ purpose, setPurpose, priorities, togglePriority, notes, setNotes, onBack, onGenerate }: Step3Props) {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: INK, letterSpacing: -0.5, marginBottom: 4 }}>
        Purpose & priorities
      </h2>
      <p style={{ fontSize: 14, color: MUTED, marginBottom: 24 }}>
        Help Claude personalise your itinerary
      </p>

      <SectionLabel text="Trip purpose" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {PURPOSES.map((p) => {
          const active = purpose === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPurpose(p.id)}
              style={{
                background: active ? PURPLE : '#fff',
                border: `1.5px solid ${active ? PURPLE : HAIRLINE}`,
                borderRadius: 20, padding: '8px 18px',
                color: active ? '#fff' : INK2,
                fontSize: 13, fontWeight: 600,
                boxShadow: active ? SHADOW_PURPLE : SHADOW_CARD, transition: 'all 0.15s',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <SectionLabel text="Priorities (pick any)" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {PRIORITIES.map((pr) => {
          const active = priorities.includes(pr);
          return (
            <button
              key={pr}
              onClick={() => togglePriority(pr)}
              style={{
                background: active ? PURPLE : '#fff',
                border: `1.5px solid ${active ? PURPLE : HAIRLINE}`,
                borderRadius: 20, padding: '7px 16px',
                color: active ? '#fff' : INK2,
                fontSize: 13, fontWeight: 600,
                boxShadow: active ? SHADOW_PURPLE : SHADOW_CARD,
                transition: 'all 0.15s',
              }}
            >
              {pr}
            </button>
          );
        })}
      </div>

      <SectionLabel text="Notes (optional)" />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 200))}
        placeholder="Any special requests or requirements…"
        rows={3}
        style={{
          width: '100%', background: MIST, border: `1px solid ${HAIRLINE}`,
          borderRadius: 12, padding: '12px 14px', color: INK, fontSize: 14,
          resize: 'none', outline: 'none', boxSizing: 'border-box', marginBottom: 4,
        }}
      />
      <div style={{ fontSize: 11, color: MUTED, textAlign: 'right', marginBottom: 24 }}>
        {notes.length}/200
      </div>

      <div className="flex" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}><GhostBtn onClick={onBack}>Back</GhostBtn></div>
        <div style={{ flex: 2 }}><PrimaryBtn onClick={onGenerate} disabled={!purpose}>Generate Itinerary</PrimaryBtn></div>
      </div>
    </div>
  );
}

// ─── Result View ──────────────────────────────────────────────────────────────

interface ResultViewProps {
  itinerary: ItineraryResponse;
  request: {
    destination: Destination;
    travelDate: string;
    days: number;
    persons: number;
    budget: number;
    purpose: string;
  };
  onPlanAnother: () => void;
  onViewHistory: () => void;
}

function ResultView({ itinerary, request, onPlanAnother, onViewHistory }: ResultViewProps) {
  const [activeDay, setActiveDay] = useState(0);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const isOver = itinerary.budget_analysis.status === 'over';

  const totalCost = itinerary.days.reduce((s, d) => s + d.day_total, 0)
    + itinerary.accommodation.nightly_cost * request.days;

  const mapsUrl = (name: string) =>
    `https://maps.google.com/?q=${encodeURIComponent(`${name} ${request.destination.city} ${request.destination.country}`)}`;

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Hero card */}
      <div style={{ background: GRAD_HERO, borderRadius: 24, padding: '20px 20px 18px', marginBottom: 16, position: 'relative', overflow: 'hidden', boxShadow: SHADOW_PURPLE }}>
        <div style={{ position: 'absolute', inset: 0, background: GRAD_GLOW, pointerEvents: 'none' }} aria-hidden />
        <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)' }} aria-hidden />
        <div className="flex items-center" style={{ gap: 12, marginBottom: 14, position: 'relative' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 26 }}>{countryFlag(request.destination.country_code)}</span>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>{request.destination.city}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{request.destination.country}</div>
          </div>
        </div>
        <div className="flex" style={{ gap: 8, flexWrap: 'wrap', position: 'relative' }}>
          {[
            { iconName: 'calendar' as const, text: fmtDate(request.travelDate) },
            { iconName: 'moon' as const, text: `${request.days} nights` },
            { iconName: 'people' as const, text: `${request.persons} pax` },
            { iconName: 'wallet' as const, text: fmt(request.budget) },
          ].map((item) => (
            <div key={item.text} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 20, padding: '5px 11px', fontSize: 12, color: '#fff', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon name={item.iconName} size={12} color="rgba(255,255,255,0.85)" strokeWidth={2} />
              {item.text}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55, position: 'relative' }}>
          {itinerary.overview}
        </div>
      </div>

      {/* Budget status */}
      <div style={{ background: isOver ? GRAD_RED : GRAD_GREEN, borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name={isOver ? 'info' : 'check'} size={18} color="#fff" strokeWidth={2.2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {isOver ? `Over budget by ${fmt(itinerary.budget_analysis.variance)}` : `Under budget by ${fmt(itinerary.budget_analysis.variance)}`}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{itinerary.budget_analysis.insight}</div>
        </div>
      </div>

      {/* Transport */}
      {itinerary.flight_recommendations && itinerary.flight_recommendations.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: MIST, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plane" size={16} color={PURPLE} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>Flight Options</span>
          </div>
          {itinerary.flight_recommendations.map((f, i) => (
            <div key={i} style={{ background: MIST, borderRadius: 12, padding: '10px 12px', marginBottom: i < itinerary.flight_recommendations!.length - 1 ? 8 : 0 }}>
              <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{f.airline}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: PURPLE }}>{fmt(f.price_per_pax)}<span style={{ fontSize: 11, color: MUTED }}>/pax</span></span>
              </div>
              {f.booking_tip && <div style={{ fontSize: 12, color: MUTED }}>{f.booking_tip}</div>}
            </div>
          ))}
        </Card>
      )}

      {itinerary.transport_to_destination && (
        <Card style={{ marginBottom: 14 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: MIST, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="car" size={16} color={PURPLE} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>Getting There</span>
          </div>
          <div className="flex" style={{ gap: 16, marginBottom: 8 }}>
            {[
              { label: 'Mode', val: itinerary.transport_to_destination.mode },
              { label: 'Est. cost', val: fmt(itinerary.transport_to_destination.cost), teal: true },
              { label: 'Duration', val: itinerary.transport_to_destination.duration },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: item.teal ? PURPLE : INK, marginTop: 2 }}>{item.val}</div>
              </div>
            ))}
          </div>
          {itinerary.transport_to_destination.tip && (
            <div style={{ background: MIST, borderRadius: 10, padding: '8px 10px', fontSize: 12, color: INK2 }}>
              {itinerary.transport_to_destination.tip}
            </div>
          )}
        </Card>
      )}

      {/* Accommodation */}
      <Card style={{ marginBottom: 14 }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: MIST, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="home2" size={16} color={PURPLE} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>Where You'll Stay</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: INK }}>{itinerary.accommodation.name}</div>
        <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>{itinerary.accommodation.area}</div>
        <div className="flex items-center" style={{ justifyContent: 'space-between', marginBottom: itinerary.accommodation.tip ? 10 : 12 }}>
          <span style={{ fontSize: 13, color: MUTED }}>Per night</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: PURPLE }}>{fmt(itinerary.accommodation.nightly_cost)}</span>
        </div>
        {itinerary.accommodation.tip && (
          <div style={{ background: MIST, borderRadius: 10, padding: '8px 10px', fontSize: 12, color: INK2, marginBottom: 12 }}>
            {itinerary.accommodation.tip}
          </div>
        )}
        <a
          href={mapsUrl(itinerary.accommodation.name)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: PURPLE, fontWeight: 600, textDecoration: 'none' }}
        >
          <Icon name="mapPin" size={13} color={PURPLE} strokeWidth={2} /> View on Maps
        </a>
      </Card>

      {/* Day tabs */}
      <div style={{ fontSize: 15, fontWeight: 800, color: INK, letterSpacing: -0.3, marginBottom: 10 }}>Day by Day</div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 12 }}>
        {itinerary.days.map((d, i) => (
          <button
            key={d.day}
            onClick={() => setActiveDay(i)}
            style={{
              flexShrink: 0, background: activeDay === i ? PURPLE : '#fff',
              border: `1.5px solid ${activeDay === i ? PURPLE : HAIRLINE}`,
              borderRadius: 20, padding: '7px 18px',
              color: activeDay === i ? '#fff' : INK2,
              fontSize: 13, fontWeight: 600,
              boxShadow: activeDay === i ? SHADOW_PURPLE : SHADOW_CARD,
              transition: 'all 0.15s',
            }}
          >
            Day {d.day}
          </button>
        ))}
      </div>

      {itinerary.days[activeDay] && (
        <Card style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginBottom: 14 }}>
            {itinerary.days[activeDay].title}
          </div>
          {itinerary.days[activeDay].places.map((place, i) => {
            const meta = PLACE_TYPE_META[place.type];
            const isLast = i === itinerary.days[activeDay].places.length - 1;
            return (
              <div key={i} style={{ paddingBottom: isLast ? 0 : 14, marginBottom: isLast ? 0 : 14, borderBottom: isLast ? 'none' : `1px solid ${HAIRLINE}` }}>
                <div className="flex items-start" style={{ gap: 10 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: meta.bg, border: `2px solid ${meta.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: meta.color }}>{i + 1}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center" style={{ gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{place.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, borderRadius: 6, padding: '2px 7px' }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex" style={{ gap: 14, marginBottom: place.tip ? 5 : 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: PURPLE }}>{fmt(place.cost)}</span>
                      <span style={{ fontSize: 12, color: MUTED }}>⏱ {place.duration}</span>
                    </div>
                    {place.tip && (
                      <div style={{ background: MIST, borderRadius: 8, padding: '6px 9px', fontSize: 12, color: INK2, marginBottom: 8 }}>
                        {place.tip}
                      </div>
                    )}
                    <a
                      href={mapsUrl(place.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: PURPLE, fontWeight: 600, textDecoration: 'none' }}
                    >
                      <Icon name="mapPin" size={12} color={PURPLE} strokeWidth={2} /> Maps
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${HAIRLINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Day total</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: INK }}>{fmt(itinerary.days[activeDay].day_total)}</span>
          </div>
        </Card>
      )}

      {/* Budget breakdown (accordion) */}
      <button
        onClick={() => setBudgetOpen((v) => !v)}
        style={{ width: '100%', background: 'none', border: 'none', padding: 0, marginBottom: budgetOpen ? 0 : 14 }}
      >
        <Card>
          <div className="flex items-center" style={{ justifyContent: 'space-between' }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: MIST, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="chart" size={16} color={PURPLE} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>Budget Breakdown</span>
            </div>
            <Icon name={budgetOpen ? 'chevronUp' : 'chevronDown'} size={16} color={MUTED} />
          </div>
        </Card>
      </button>
      {budgetOpen && (
        <Card style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, marginBottom: 14, marginTop: -1, paddingTop: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: MUTED }}>Accommodation ({request.days}n)</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{fmt(itinerary.accommodation.nightly_cost * request.days)}</span>
            </div>
            {itinerary.days.map((d) => (
              <div key={d.day} className="flex" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: MUTED }}>Day {d.day} — {d.title}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{fmt(d.day_total)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: HAIRLINE }} />
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>Total Estimate</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: isOver ? '#E5484D' : '#1FB573' }}>{fmt(totalCost)}</span>
            </div>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: MUTED }}>Your budget</span>
              <span style={{ fontSize: 13, color: INK2 }}>{fmt(request.budget)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Payment strategy */}
      <Card style={{ marginBottom: 14 }}>
        <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: MIST, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="cards" size={16} color={PURPLE} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>Payment Strategy</span>
        </div>
        <div style={{ fontSize: 13, color: INK2, lineHeight: 1.65 }}>{itinerary.source_strategy}</div>
      </Card>

      {/* Packing essentials */}
      {itinerary.packing_essentials?.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: MIST, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="package" size={16} color={PURPLE} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>Packing Essentials</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {itinerary.packing_essentials.map((item) => (
              <span key={item} style={{ background: MIST, borderRadius: 20, padding: '5px 13px', fontSize: 12, color: INK2, fontWeight: 500 }}>
                {item}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}><GhostBtn onClick={onPlanAnother}>Plan Another</GhostBtn></div>
        <div style={{ flex: 1 }}><PrimaryBtn onClick={onViewHistory}>History</PrimaryBtn></div>
      </div>
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────

interface HistoryTabProps {
  onViewItinerary: (item: SavedItinerary) => void;
  onPlanTrip: () => void;
}

function HistoryTab({ onViewItinerary, onPlanTrip }: HistoryTabProps) {
  const { API_BASE_URL } = getEnv();
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<HistoryPage>({
    queryKey: ['travel-history', page],
    queryFn: async () => {
      const h = await authHeader();
      const res = await fetch(`${API_BASE_URL}/api/travel/itineraries?page=${page}`, { headers: h });
      if (!res.ok) throw new Error('Failed to load history');
      return res.json() as Promise<HistoryPage>;
    },
    staleTime: 30_000,
  });

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const h = await authHeader();
      await fetch(`${API_BASE_URL}/api/travel/itineraries/${id}`, { method: 'DELETE', headers: h });
      queryClient.invalidateQueries({ queryKey: ['travel-history'] });
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ background: MIST, borderRadius: 16, height: 110, opacity: 0.7 }} />
        ))}
      </div>
    );
  }

  const trips = data?.data ?? [];

  if (trips.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: MIST, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Icon name="plane" size={28} color={PURPLE} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 6 }}>No trips yet</div>
        <div style={{ fontSize: 14, color: MUTED, marginBottom: 28 }}>Generate your first itinerary to get started</div>
        <button
          onClick={onPlanTrip}
          style={{ background: PURPLE, border: 'none', borderRadius: 14, padding: '13px 28px', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: SHADOW_PURPLE }}
        >
          Plan a Trip
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {trips.map((trip) => (
          <Card key={trip.id}>
            <div className="flex items-start" style={{ gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 30 }}>{countryFlag(trip.destination_country_code)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>{trip.destination_city}</div>
                <div style={{ fontSize: 12, color: MUTED }}>{trip.destination_country}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, background: MIST, color: PURPLE, borderRadius: 8, padding: '4px 10px' }}>
                {PURPOSE_LABELS[trip.purpose] ?? trip.purpose}
              </span>
            </div>
            <div className="flex" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              {[fmtDate(trip.travel_date), `${trip.days}d`, `${trip.persons} pax`, fmt(trip.budget)].map((t) => (
                <span key={t} style={{ fontSize: 12, color: MUTED }}>{t}</span>
              ))}
            </div>
            <div className="flex" style={{ gap: 8 }}>
              <button
                onClick={() => onViewItinerary(trip)}
                style={{ flex: 1, background: PURPLE, border: 'none', borderRadius: 11, padding: '9px 0', color: '#fff', fontSize: 13, fontWeight: 700, boxShadow: SHADOW_PURPLE }}
              >
                View
              </button>
              {confirmId === trip.id ? (
                <>
                  <button
                    onClick={() => handleDelete(trip.id)}
                    disabled={deletingId === trip.id}
                    style={{ flex: 1, background: '#E5484D', border: 'none', borderRadius: 11, padding: '9px 0', color: '#fff', fontSize: 13, fontWeight: 700 }}
                  >
                    {deletingId === trip.id ? '…' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    style={{ flex: 1, background: MIST, border: `1px solid ${HAIRLINE}`, borderRadius: 11, padding: '9px 0', color: INK, fontSize: 13 }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmId(trip.id)}
                  style={{ background: MIST, border: `1px solid ${HAIRLINE}`, borderRadius: 11, padding: '9px 14px', color: MUTED, fontSize: 13 }}
                >
                  Delete
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center" style={{ justifyContent: 'center', gap: 14 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ background: MIST, border: `1px solid ${HAIRLINE}`, borderRadius: 10, padding: '8px 18px', color: page === 1 ? MUTED : INK, fontSize: 13, fontWeight: 600 }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: 13, color: MUTED }}>{page} / {data.totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            style={{ background: MIST, border: `1px solid ${HAIRLINE}`, borderRadius: 10, padding: '8px 18px', color: page === data.totalPages ? MUTED : INK, fontSize: 13, fontWeight: 600 }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Phase = 'wizard' | 'loading' | 'result' | 'history-detail';
type ActiveTab = 'plan' | 'history';

export default function FinTravel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { API_BASE_URL } = getEnv();

  const [activeTab, setActiveTab] = useState<ActiveTab>('plan');
  const [phase, setPhase] = useState<Phase>('wizard');
  const [step, setStep] = useState(1);

  // Wizard state
  const [origin, setOrigin] = useState('MY');
  const [destination, setDestination] = useState<Destination | null>(null);
  const [travelDate, setTravelDate] = useState('');
  const [days, setDays] = useState(3);
  const [persons, setPersons] = useState(2);
  const [budget, setBudget] = useState('');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('');
  const [priorities, setPriorities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Result
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [resultRequest, setResultRequest] = useState<ResultViewProps['request'] | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Sources
  const { data: sources = [] } = useQuery({
    queryKey: ['travel-sources', user?.id],
    queryFn: () => fetchTravelSources(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (sources.length > 0 && selectedSourceIds.length === 0) {
      const def = sources.find((s) => s.is_default);
      if (def) setSelectedSourceIds([def.id]);
    }
  }, [sources, selectedSourceIds.length]);

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const togglePriority = (v: string) => {
    setPriorities((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };

  const resetWizard = () => {
    setStep(1);
    setDestination(null);
    setTravelDate('');
    setDays(3);
    setPersons(2);
    setBudget('');
    setSelectedSourceIds([]);
    setPurpose('');
    setPriorities([]);
    setNotes('');
    setGenerateError(null);
    setPhase('wizard');
  };

  const handleGenerate = async () => {
    if (!destination) return;
    setGenerateError(null);
    setPhase('loading');
    try {
      const h = await authHeader();
      // If no auth header was produced the session is missing — surface early
      if (!h.Authorization) throw new Error('Session expired. Please sign out and sign in again.');
      const res = await fetch(`${API_BASE_URL}/api/travel/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({
          destination: { country: destination.country, country_code: destination.country_code, city: destination.city },
          travel_date: travelDate,
          days,
          persons,
          budget: Number(budget),
          selected_source_ids: selectedSourceIds,
          purpose,
          priorities,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: string }).error ?? `Request failed (${res.status})`;
        // 401 almost always means missing/wrong Supabase env vars on the server
        throw new Error(res.status === 401 ? `Auth failed (${res.status}): check server env vars` : msg);
      }
      const json = (await res.json()) as { itinerary: unknown };
      setItinerary(normalizeItinerary(json.itinerary, Number(budget)));
      setResultRequest({ destination, travelDate, days, persons, budget: Number(budget), purpose });
      setPhase('result');
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setPhase('wizard');
      setStep(3);
    }
  };

  const handleViewHistoryItem = (item: SavedItinerary) => {
    setItinerary(normalizeItinerary(item.itinerary, item.budget));
    setResultRequest({
      destination: { id: '', country: item.destination_country, country_code: item.destination_country_code, city: item.destination_city },
      travelDate: item.travel_date,
      days: item.days,
      persons: item.persons,
      budget: item.budget,
      purpose: item.purpose,
    });
    setPhase('history-detail');
  };

  // ── Loading overlay ────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="text-ink" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ width: 72, height: 72, borderRadius: 24, background: GRAD_HERO, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: SHADOW_PURPLE }}>
          <Icon name="plane" size={32} color="#fff" strokeWidth={1.6} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 8, letterSpacing: -0.4 }}>Planning your trip…</div>
        <div style={{ fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 1.6, maxWidth: 260 }}>
          Our AI is crafting a personalised itinerary based on your budget and travel style.
        </div>
        <div style={{ marginTop: 28, display: 'flex', gap: 6 }}>
            {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: PURPLE, opacity: 0.3 + i * 0.25 }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Result / history-detail ────────────────────────────────────────────────
  if ((phase === 'result' || phase === 'history-detail') && itinerary && resultRequest) {
    const isHistoryDetail = phase === 'history-detail';
    return (
      <div className="text-ink" style={{ paddingBottom: 110 }}>
        <div style={{ padding: '8px 20px 0' }}>
          <div className="flex items-center" style={{ gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => isHistoryDetail ? setPhase('wizard') : resetWizard()}
              style={{ background: MIST, border: `0.5px solid ${HAIRLINE}`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="arrowLeft" size={18} color={INK} />
            </button>
            <div>
              <div style={{               fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {isHistoryDetail ? 'Saved Trip' : 'FinTravel'}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: INK, letterSpacing: -0.5, margin: 0 }}>
                Your Itinerary
              </h1>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 20px' }}>
          <ResultView
            itinerary={itinerary}
            request={resultRequest}
            onPlanAnother={() => { resetWizard(); setActiveTab('plan'); }}
            onViewHistory={() => { setPhase('wizard'); setActiveTab('history'); }}
          />
        </div>
      </div>
    );
  }

  // ── Main (wizard + history tabs) ────────────────────────────────────────────
  return (
    <div className="text-ink" style={{ paddingBottom: 110 }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 0' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <button
              onClick={() => navigate('/')}
              style={{ background: MIST, border: `0.5px solid ${HAIRLINE}`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="arrowLeft" size={18} color={INK} />
            </button>
            <div>
              <div style={{               fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                AI Travel Planner
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: INK, letterSpacing: -0.6, margin: 0 }}>
                FinTravel
              </h1>
            </div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: GRAD_HERO, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW_PURPLE }}>
            <Icon name="plane" size={22} color="#fff" strokeWidth={1.6} />
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex" style={{ background: MIST, borderRadius: 12, padding: 4, gap: 4, marginBottom: 24 }}>
          {(['plan', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                flex: 1, background: activeTab === t ? '#fff' : 'transparent',
                border: 'none', borderRadius: 9, padding: '9px 0',
                color: activeTab === t ? INK : MUTED,
                fontSize: 13, fontWeight: 700,
                boxShadow: activeTab === t ? SHADOW_CARD : 'none',
                transition: 'all 0.2s',
              }}
            >
              {t === 'plan' ? 'Plan' : 'History'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        {activeTab === 'plan' ? (
          <>
            <StepIndicator step={step} />

            {generateError && (
              <div style={{ background: '#FCE9EA', border: '1px solid #E5484D', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#C53030' }}>
                {generateError}
              </div>
            )}

            {step === 1 && (
              <Step1Destination
                origin={origin}
                setOrigin={setOrigin}
                destination={destination}
                setDestination={setDestination}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <Step2Details
                travelDate={travelDate}
                setTravelDate={setTravelDate}
                days={days}
                setDays={setDays}
                persons={persons}
                setPersons={setPersons}
                budget={budget}
                setBudget={setBudget}
                sources={sources}
                selectedSourceIds={selectedSourceIds}
                toggleSource={toggleSource}
                onBack={() => setStep(1)}
                onNext={() => setStep(3)}
              />
            )}
            {step === 3 && (
              <Step3Purpose
                purpose={purpose}
                setPurpose={setPurpose}
                priorities={priorities}
                togglePriority={togglePriority}
                notes={notes}
                setNotes={setNotes}
                onBack={() => setStep(2)}
                onGenerate={handleGenerate}
              />
            )}
          </>
        ) : (
          <HistoryTab
            onViewItinerary={handleViewHistoryItem}
            onPlanTrip={() => setActiveTab('plan')}
          />
        )}
      </div>
    </div>
  );
}
