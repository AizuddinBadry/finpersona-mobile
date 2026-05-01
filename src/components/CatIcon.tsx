/**
 * Category icon tile — a rounded square with a tinted background and a
 * stroked icon. Ported from Finpersona-mobile-build/shell.jsx. Used by
 * Home recent transactions and (later) Activity, Cards, Rewards rows.
 */
import { Icon } from './Icon';

export type CatIconName =
  | 'food'
  | 'coffee'
  | 'bag'
  | 'car'
  | 'home2'
  | 'medical'
  | 'book'
  | 'receipt'
  | 'transfer'
  | 'bank'
  | 'gift';

const PALETTE: Record<CatIconName, { bg: string; fg: string }> = {
  food: { bg: '#FEF0E8', fg: '#D97636' },
  coffee: { bg: '#F5ECE3', fg: '#956B3F' },
  bag: { bg: '#EDEAFB', fg: '#6E4CE6' },
  car: { bg: '#E5F4FB', fg: '#1E80B5' },
  home2: { bg: '#F3EBFB', fg: '#8438C9' },
  medical: { bg: '#FCE9EA', fg: '#D63440' },
  book: { bg: '#E8F4ED', fg: '#1FB573' },
  receipt: { bg: '#FBEFD6', fg: '#B57415' },
  transfer: { bg: '#EDEAFB', fg: '#6E4CE6' },
  bank: { bg: '#EDEAFB', fg: '#5837C9' },
  gift: { bg: '#FCE9F4', fg: '#C73E96' },
};

type Props = {
  name: CatIconName;
  size?: number;
  tint?: string;
};

export function CatIcon({ name, size = 40, tint }: Props) {
  const c = PALETTE[name];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: tint ?? c.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon name={name} size={Math.round(size * 0.5)} color={c.fg} strokeWidth={1.9} />
    </div>
  );
}
