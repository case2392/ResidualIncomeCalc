# VA Residual Income Calculator (Chrome Extension)

Adds a **Run Residual Income Calc** button to the Zillow Home Loans operator portal
(`operator.zillowhomeloans.com`). The button only appears when **Veteran type** is
`Regular military` or `National Guard or reserves`. Clicking it computes the VA
residual income from values already on the page and writes the result into the
**VA residual income** field.

## Install (unpacked, for development)

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** on (top right).
3. Click **Load unpacked** and select this folder (`ResidualIncomeCalc`).
4. Open a loan in the operator portal. Set Veteran type to `Regular military` or
   `National Guard or reserves`. The button appears next to the
   **Military service completed** checkbox.

## What it calculates

Standard VA residual income worksheet:

```
Gross monthly income (from Employment section, all borrowers combined)
  − Federal income tax     (15%)
  − Social Security/Medicare (7.625%)
  − State income tax       (2%)
  − Monthly debts          (from Monthly liabilities)
  − Proposed PITI          (from Monthly PITI)
  − Maintenance & utilities (2,500 sq ft × $0.14 = $350)
= Residual income
```

The result is written into the **VA residual income** input. A toast shows the
breakdown; full details are also logged to the DevTools console under
`[Residual Income Calc]`.

## Assumptions / current defaults

| Item | Value | Source |
| --- | --- | --- |
| Federal tax rate | 15% | configured |
| SS/Medicare | 7.625% | configured |
| State tax rate | 2% | configured |
| Home size | 2,500 sq ft | default until sq ft is wired up |
| Maintenance/utilities | $0.14 / sq ft | VA standard |
| Family size | 1 + (1 if married) + count of Dependent ages | per page |
| Region | derived from Subject property state | per page |

Co-borrower incomes are combined automatically because the script reads the
Employment section across the whole page (and falls back to the sidebar's
"Monthly income" total).

## Editing the rates

All rates and the default sq ft live at the top of `content.js`:

```js
const FED_TAX_RATE = 0.15;
const FICA_RATE = 0.07625;
const STATE_TAX_RATE = 0.02;
const MAINT_PER_SQFT = 0.14;
const DEFAULT_SQFT = 2500;
```

## Troubleshooting

If the button doesn't appear or a value reads as `$0.00`:

1. Open DevTools → Console. Errors are prefixed with `[Residual Income Calc]`.
2. The script finds fields by their **visible label text**. If Blend renames a
   label, update the matching string in `content.js`
   (`findFieldByLabel('Veteran type')`, etc.).
