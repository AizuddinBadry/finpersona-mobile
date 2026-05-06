export interface FinSplitConfig {
  displayName: string;
  bankName: string;
  accountNumber: string;
  qrImageBase64: string | null;
  setupCompleted: boolean;
  updatedAt: string;
}

export interface SplitParticipant {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
}

const CONFIG_KEY = 'finsplit_config';

export function getFinSplitConfig(): FinSplitConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FinSplitConfig;
  } catch {
    return null;
  }
}

export function saveFinSplitConfig(config: FinSplitConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearFinSplitConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}
