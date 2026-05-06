# Add-Receipt Flow + Cards→Sources Rename — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port the web app's manual-receipt entry to mobile, add payment-source picker to both manual + scan flows, rename Cards screen/route to Sources.

**Architecture:** A new bottom sheet on the BottomNav `+` button branches to either the existing `/capture` (scan) flow or a new `/capture/manual` (form) flow. Both flows write `source_id` to receipts so the existing DB trigger deducts from `payment_sources.balance`. Cards screen/route renamed to Sources.

**Tech Stack:** React 19, react-router-dom, react-query, Supabase JS, Capacitor.

**Decisions locked in:**
- "+" → choice sheet with Scan / Manual buttons
- Route rename `/cards` → `/sources` with redirect from `/cards`
- Every user has at least one payment source (no zero-source edge case)
- Manual flow uses `PURCHASE_TYPES` (non-tax); scan flow keeps tax-relief codes (matches web)
- MYR-only for now (no currency picker)
- After save → confirmation screen "Saved · RM X deducted from <source>", then back to Home

---

### Task 1: Rename BottomNav tab "Cards" → "Sources" (route stays for now)

**Files:**
- Modify: `src/components/BottomNav.tsx:26` (label only)
- Modify: `src/components/BottomNav.test.tsx` if it asserts the "Cards" label

**Step 1: Failing test** — update BottomNav test to assert label "Sources" instead of "Cards".

**Step 2: Edit BottomNav** — change `label: 'Cards'` → `label: 'Sources'` (line 26). Leave `to: '/cards'` for now (route rename happens in Task 2 to keep diffs reviewable).

**Step 3: Run tests** — `npx vitest run src/components/BottomNav.test.tsx`. Expect pass.

**Step 4: Commit** — `chore(nav): rename Cards tab to Sources`.

---

### Task 2: Move route `/cards` → `/sources` with backward-compat redirect

**Files:**
- Modify: `src/Routes.tsx` (find Cards route entry)
- Modify: `src/components/BottomNav.tsx:26` (`to: '/cards'` → `to: '/sources'`)
- Modify: any `<Link to="/cards">` consumers (Home quick-actions especially — `src/screens/Home.tsx:318` lists `/cards` for Transfer/Top up)
- Modify: `src/screens/Home.test.tsx` if it asserts navigation to `/cards`

**Step 1: Failing test** — add a test to whatever covers Routes that asserts `/sources` renders Cards screen, and `/cards` redirects to `/sources`.

**Step 2: Implement** — change route path to `/sources`; add `<Route path="/cards" element={<Navigate to="/sources" replace />} />`. Update Link consumers.

**Step 3: Run tests** — full suite. Expect pass.

**Step 4: Commit** — `refactor(nav): move /cards → /sources with redirect`.

---

### Task 3: Rename Cards screen header & file (file move optional)

**Files:**
- Modify: `src/screens/Cards.tsx` — change header text "Accounts" → "Sources"
- Optional move: `src/screens/Cards.tsx` → `src/screens/Sources.tsx` (only if every reference is easy to update; otherwise leave file name and update header only)
- Modify: `src/screens/Cards.test.tsx` to match

**Step 1: Failing test** — assert screen renders header "Sources".

**Step 2: Edit screen** — change header text only.

**Step 3: Tests** — pass.

**Step 4: Commit** — `feat(sources): rename screen header to Sources`.

---

### Task 4: Add `payment_sources` query layer (mobile)

**Files:**
- Modify: `src/lib/supabase/queries/sources.ts` (existing? check; if not, create)
- Test: `src/lib/supabase/queries/sources.test.ts`

**Goal:** Expose `fetchPaymentSources(userId): Promise<PaymentSource[]>` ordered `is_default desc, created_at asc` (mirrors web modal lines 81-90). Returns id, name, last4, balance, currency, source_type, is_default.

**Step 1: Failing test** — mock supabase client; assert ordering and field shape.

**Step 2: Implement** — single SELECT, throw on error.

**Step 3: Hook** — `src/hooks/usePaymentSources.ts` returning react-query `['payment-sources', userId]`.

**Step 4: Commit** — `feat(sources): expose payment_sources query for receipt flow`.

---

### Task 5: BottomNav `+` opens a choice sheet (Scan / Manual)

**Files:**
- Modify: `src/components/BottomNav.tsx` — replace `<Link to="/capture">` for the FAB with a button that toggles a sheet state.
- Create: `src/components/CaptureSheet.tsx` — Radix-style or hand-rolled bottom sheet with two CTAs:
  - "Scan receipt" → navigate to `/capture`
  - "Add manually" → navigate to `/capture/manual`
- Test: `src/components/CaptureSheet.test.tsx`

**Step 1: Failing test** — assert clicking FAB opens sheet, sheet has two buttons, clicking each navigates.

**Step 2: Implement** — sheet uses `useState` for visibility, `useNavigate` for routing. Backdrop click + Escape close it. Animate up from bottom (transform translateY).

**Step 3: A11y** — `role="dialog"`, focus trap optional but sheet should at least be keyboard-dismissible.

**Step 4: Tests + tsc** — pass.

**Step 5: Commit** — `feat(capture): bottom-sheet to pick scan vs manual entry`.

---

### Task 6: Build the manual-receipt screen `/capture/manual`

**Files:**
- Create: `src/screens/CaptureManual.tsx`
- Modify: `src/Routes.tsx` — register `/capture/manual` with `hideNav={true}` (matches `/capture`)
- Test: `src/screens/CaptureManual.test.tsx`

**Form fields (matches web modal lines 106-128 + payment source):**
- Merchant (text, required)
- Date (date input, default today, required)
- Total RM (number, required, > 0)
- Category (select with `PURCHASE_TYPES` — port the 20-item list from web)
- Payment source (select from `usePaymentSources`, default = `is_default = true` source)
- Save button (disabled until all required fields valid)

**Step 1: Failing tests** — render form; submit-disabled until valid; submit calls insert with `source_id` + `is_manual_entry: true` + `is_claimable: false`.

**Step 2: Component** — controlled inputs, react-query `useMutation` to insert.

**Step 3: Commit** — `feat(capture): manual receipt entry form`.

---

### Task 7: Manual-entry insert path (writes to receipts with source_id)

**Files:**
- Modify: `src/lib/supabase/queries/receiptInsert.ts` — add `source_id`, `is_manual_entry`, `is_claimable` to `ReceiptInsertRow`. Add a sibling `insertManualReceipt(args)` helper that fills sane defaults (`is_manual_entry: true`, `is_claimable: false`, `points_eligible: false`).
- Test: `src/lib/supabase/queries/receiptInsert.test.ts`

**Step 1: Failing test** — assert insert payload contains `source_id`, `is_manual_entry: true`.

**Step 2: Implement** — minimal columns: user_id, merchant_name, receipt_date, total_amount, currency='MYR', category, subcategory (free-text from PURCHASE_TYPES value), is_claimable=false, is_manual_entry=true, source_id, tax_year (=year of receipt_date).

**Step 3: Commit** — `feat(receipts): manual insert path with source_id`.

> **Note on balance deduction:** the existing trigger in `finpersona/supabase/migrations/021_fix_payment_source_trigger.sql` decrements `payment_sources.balance` on receipt insert when `source_id` is set. **Mobile does not need to do this client-side.** Verify by inserting one manual receipt and checking the source balance drops.

---

### Task 8: Scan-flow review step also picks payment source

**Files:**
- Modify: `src/hooks/useCaptureFlow.ts` — extend `ReviewForm` to include `sourceId: string`. Default to user's `is_default` source.
- Modify: `src/screens/Capture.tsx` — add Source dropdown to the review form (next to Category). Use `usePaymentSources`.
- Modify: insert path to pass `source_id` through.
- Tests: update `useCaptureFlow.test.ts` and `Capture.test.tsx`.

**Step 1: Failing tests** — review form contains Source dropdown; submitting includes `source_id` in insert.

**Step 2: Implement** — wire dropdown, pre-select default source.

**Step 3: Commit** — `feat(capture): pick payment source in scan-receipt review step`.

---

### Task 9: After-save confirmation screen "Saved · RM X deducted from <source>"

**Files:**
- Create: `src/screens/CaptureSuccess.tsx`
- Modify: `src/Routes.tsx` — register `/capture/success` (hideNav)
- Modify: both manual flow and scan flow — on success, navigate to `/capture/success` with state `{ amount, sourceName, receiptId }`
- Test: `src/screens/CaptureSuccess.test.tsx`

**Behaviour:**
- Big check icon, "Saved"
- "RM 142.00 deducted from Maybank Visa ••4218"
- Two buttons: "View receipt" (→ `/receipts/:id`), "Back to home" (→ `/`)
- Auto-navigate to `/` after 5s if untouched (web does this; nice-to-have)

**Step 1: Failing test** — render with router state, assert text + buttons + navigation.

**Step 2: Implement** — read `useLocation().state`, fall back to home if state missing.

**Step 3: Commit** — `feat(capture): success screen confirms balance deduction`.

---

### Task 10: Verify in dev (manual smoke test)

**Steps:**
- Start dev server: `npm run dev`
- Sign in to prod Supabase (already pointed there per user's earlier note)
- Tap `+` → choose "Add manually" → fill form, save → confirm Sources balance drops by the entered amount
- Tap `+` → choose "Scan receipt" → upload an image → review → save → confirm balance drops
- Confirm Home Recent shows the new receipts (replacing mock entries)
- Confirm Home LHDN donut updates if the manual entry was incorrectly marked claimable (it shouldn't be)

**No code change.** If any step fails, file a follow-up task.

---

### Final review

After all tasks: dispatch a code reviewer to confirm:
- No mock payment sources sneak in (all reads go through `usePaymentSources`)
- `is_manual_entry: true` is set correctly so points aren't awarded for manual entries
- Tests pass, tsc clean
- No regressions in Home / Insights / Cards (existing) screens

---

### Out of scope (call out, don't build)

- **Editing an existing receipt's source** — web supports this via the trigger's UPDATE branch, but mobile's receipt-detail screen doesn't have a source picker yet. Skip until requested.
- **Currency picker** — locked to MYR per Q1 decision.
- **Deleting a receipt** restores balance — the trigger handles it, but mobile doesn't expose delete yet. Skip.
- **Add new payment source from Sources screen** — Cards.tsx has a placeholder button that's been non-functional; leave as-is.
