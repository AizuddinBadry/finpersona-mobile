/**
 * PURCHASE_TYPES — the shared list of receipt categories surfaced to the user
 * in manual-entry / edit forms. Ported verbatim from the web app's manual
 * receipt modal so mobile and web stay aligned. Used by the manual capture
 * screen (Task 6) and ReceiptDetail edit (future task).
 */
export type PurchaseType = {
  value: string;
  label: string;
};

export const PURCHASE_TYPES: ReadonlyArray<PurchaseType> = [
  { value: 'food & dining', label: 'Food & Dining' },
  { value: 'groceries', label: 'Groceries' },
  { value: 'fuel', label: 'Fuel / Petrol' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing & Fashion' },
  { value: 'medical', label: 'Medical / Healthcare' },
  { value: 'pharmacy', label: 'Pharmacy / Medicine' },
  { value: 'education', label: 'Education' },
  { value: 'books', label: 'Books & Stationery' },
  { value: 'childcare', label: 'Childcare / Kids' },
  { value: 'home', label: 'Home & Household' },
  { value: 'beauty', label: 'Beauty & Personal Care' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports & Fitness' },
  { value: 'pets', label: 'Pets' },
  { value: 'travel', label: 'Travel' },
  { value: 'utilities', label: 'Utilities & Bills' },
  { value: 'services', label: 'Services' },
  { value: 'other', label: 'Other' },
];
