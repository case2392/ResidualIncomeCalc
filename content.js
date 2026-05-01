(function () {
  'use strict';

  const BUTTON_ID = 'rric-run-button';
  const PANEL_ID = 'rric-panel';
  const TRIGGER_VETERAN_TYPES = ['Regular military', 'National Guard or reserves'];

  const FED_TAX_RATE = 0.15;
  const FICA_RATE = 0.07625;
  const STATE_TAX_RATE = 0.02;
  const MAINT_PER_SQFT = 0.14;
  const DEFAULT_SQFT = 2500;
  const NON_TAXABLE_GROSS_UP_RATE = 0.25;
  const BLEND_VA_GROSSUP_FACTOR = 1.25;

  const VA_REGION_BY_STATE = {
    Northeast: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
    Midwest:   ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
    South:     ['AL', 'AR', 'DE', 'DC', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV', 'PR'],
    West:      ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY', 'GU']
  };

  const VA_TABLE_GT_80K = {
    Northeast: { 1: 450, 2: 755, 3: 909, 4: 1025, 5: 1062 },
    Midwest:   { 1: 441, 2: 738, 3: 889, 4: 1003, 5: 1039 },
    South:     { 1: 441, 2: 738, 3: 889, 4: 1003, 5: 1039 },
    West:      { 1: 491, 2: 823, 3: 990, 4: 1117, 5: 1158 }
  };
  const VA_TABLE_LE_80K = {
    Northeast: { 1: 390, 2: 654, 3: 788, 4: 888,  5: 921 },
    Midwest:   { 1: 382, 2: 641, 3: 772, 4: 868,  5: 902 },
    South:     { 1: 382, 2: 641, 3: 772, 4: 868,  5: 902 },
    West:      { 1: 425, 2: 713, 3: 859, 4: 967,  5: 1004 }
  };

  function regionFor(stateCode) {
    const code = (stateCode || '').toUpperCase();
    for (const [region, list] of Object.entries(VA_REGION_BY_STATE)) {
      if (list.includes(code)) return region;
    }
    return null;
  }

  function vaTableRequirement(familySize, region, loanAmount) {
    if (!region || !familySize || !loanAmount) return null;
    const table = loanAmount > 80000 ? VA_TABLE_GT_80K : VA_TABLE_LE_80K;
    const r = table[region];
    if (!r) return null;
    if (familySize <= 5) return r[Math.max(1, Math.min(familySize, 5))];
    return r[5] + (familySize - 5) * 75;
  }

  function parseMoney(s) {
    if (s == null) return 0;
    const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function normalizeText(s) {
    return (s || '').replace(/\s+/g, ' ').replace(/[*.]/g, '').trim().toLowerCase();
  }

  function findLabel(text, scope) {
    const target = normalizeText(text);
    const root = scope || document;
    const labels = root.querySelectorAll('label');
    for (const lbl of labels) {
      const t = normalizeText(lbl.textContent);
      if (t === target || t === target + ' *') return lbl;
    }
    for (const lbl of labels) {
      const t = normalizeText(lbl.textContent);
      if (t.startsWith(target + ' ') || t.startsWith(target)) return lbl;
    }
    return null;
  }

  function findFieldByLabel(text, scope) {
    const lbl = findLabel(text, scope);
    if (!lbl) return null;
    if (lbl.htmlFor) {
      const el = document.getElementById(lbl.htmlFor);
      if (el) return el;
    }
    let parent = lbl.parentElement;
    for (let i = 0; i < 5 && parent; i++) {
      const candidates = parent.querySelectorAll('input, select, textarea');
      for (const c of candidates) {
        if (c.type !== 'hidden') return c;
      }
      parent = parent.parentElement;
    }
    return null;
  }

  function findSectionScope(headingText) {
    const target = normalizeText(headingText);
    const candidates = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span, section');
    for (const el of candidates) {
      if (normalizeText(el.textContent) === target) {
        let s = el.closest('section') || el.parentElement;
        for (let i = 0; i < 4 && s; i++) {
          if (s.querySelectorAll('input, select').length > 0) return s;
          s = s.parentElement;
        }
      }
    }
    return null;
  }

  function getSelectText(el) {
    if (!el) return '';
    if (el.tagName === 'SELECT') {
      const opt = el.options[el.selectedIndex];
      return opt ? opt.text : '';
    }
    return el.value || el.textContent || '';
  }

  function getVeteranType() {
    return getSelectText(findFieldByLabel('Veteran type')).trim();
  }

  function getMaritalStatus() {
    return getSelectText(findFieldByLabel('Marital status')).trim().toLowerCase();
  }

  function getDependentCount() {
    const inp = findFieldByLabel('Dependent ages');
    if (!inp) return 0;
    const v = (inp.value || '').trim();
    if (!v) return 0;
    return v.split(/[,\s]+/).filter(Boolean).length;
  }

  function getPropertyState() {
    const scope = findSectionScope('Subject property') || findSectionScope('Property information');
    let stateInp = null;
    if (scope) stateInp = findFieldByLabel('State', scope);
    if (!stateInp) stateInp = findFieldByLabel('Property state');
    if (stateInp) {
      const v = getSelectText(stateInp).trim();
      const m = v.match(/\b([A-Z]{2})\b/);
      if (m) return m[1];
      return v.toUpperCase().slice(0, 2);
    }
    const headerMatch = (document.body.innerText || '').match(/,\s*([A-Z]{2})\b/);
    return headerMatch ? headerMatch[1] : '';
  }

  function getEmploymentIncome() {
    const scope = findSectionScope('Employment');
    if (!scope) return 0;
    let total = 0;
    const inputs = scope.querySelectorAll('input');
    for (const inp of inputs) {
      const lbl = inp.closest('label') || (inp.id && document.querySelector('label[for="' + CSS.escape(inp.id) + '"]'));
      const labelText = lbl ? normalizeText(lbl.textContent) : '';
      if (/(monthly income|base pay|bonus|commission|overtime|gross monthly|other|tips)/.test(labelText)) {
        total += parseMoney(inp.value);
      }
    }
    return total;
  }

  function getPanelNumber(label) {
    const target = normalizeText(label);
    const els = document.querySelectorAll('div, span, td, th, p, dt, dd, li, label');
    for (const el of els) {
      const t = normalizeText(el.textContent);
      if (!t) continue;
      if (t === target) {
        let sib = el.nextElementSibling;
        while (sib && !sib.textContent.trim()) sib = sib.nextElementSibling;
        if (sib) {
          const n = parseMoney(sib.textContent);
          if (n) return n;
        }
        const parent = el.parentElement;
        if (parent) {
          const txt = parent.textContent.replace(el.textContent, '');
          const n = parseMoney(txt);
          if (n) return n;
        }
      }
    }
    for (const el of els) {
      const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!raw) continue;
      const t = normalizeText(raw);
      if (t === target) continue;
      if (t.startsWith(target) && raw.length < label.length + 40) {
        const rest = raw.slice(raw.toLowerCase().indexOf(target) + target.length);
        const n = parseMoney(rest);
        if (n) return n;
      }
    }
    return 0;
  }

  function readOtherIncomeRows() {
    const rows = [];
    const tables = document.querySelectorAll('table[aria-label="Table for other incomes"]');
    for (const table of tables) {
      const headers = table.querySelectorAll('thead th');
      let srcCol = -1, moCol = -1;
      headers.forEach(function (th, i) {
        const t = normalizeText(th.textContent);
        if (t === 'income source') srcCol = i;
        if (t === 'income / mo' || t === 'income/mo') moCol = i;
      });
      if (srcCol < 0 || moCol < 0) continue;
      const trs = table.querySelectorAll('tbody > tr');
      for (const tr of trs) {
        const cells = tr.children;
        if (cells.length <= moCol) continue;
        const sourceText = (cells[srcCol] && cells[srcCol].textContent || '').trim();
        if (!sourceText) continue;
        const monthly = parseMoney(cells[moCol] && cells[moCol].textContent);
        rows.push({ source: sourceText, monthly: monthly });
      }
    }
    return rows;
  }

  function isVACompensationSource(source) {
    return /va\s*(compensation|disability)/i.test(source || '');
  }

  function getDisplayedVACompensation() {
    let total = 0;
    for (const row of readOtherIncomeRows()) {
      if (isVACompensationSource(row.source)) total += row.monthly;
    }
    return total;
  }

  function detectVACompensation() {
    return getDisplayedVACompensation() / BLEND_VA_GROSSUP_FACTOR;
  }

  function detectMilitaryEntitlements() {
    let total = 0;
    const inputs = document.querySelectorAll('input[name="militaryEntitlements.amount"]');
    for (const inp of inputs) {
      const amount = parseMoney(inp.value);
      if (!amount) continue;
      const row = inp.closest('tr');
      let freq = 'Monthly';
      if (row) {
        const sel = row.querySelector('select[name="militaryEntitlements.frequency"]');
        if (sel && sel.value) freq = sel.value;
      }
      total += /annual/i.test(freq) ? amount / 12 : amount;
    }
    return total / BLEND_VA_GROSSUP_FACTOR;
  }

  function detectNonTaxableIncome() {
    return detectVACompensation() + detectMilitaryEntitlements();
  }

  function getOtherIncomeTotal() {
    let total = 0;
    for (const row of readOtherIncomeRows()) {
      total += row.monthly;
    }
    return total;
  }

  function getGrossMonthlyIncome() {
    const panel = getPanelNumber('Monthly income');
    if (panel > 0) return panel;
    return getEmploymentIncome() + getOtherIncomeTotal();
  }

  function getMonthlyDebts() {
    return getPanelNumber('Monthly liabilities') || getPanelNumber('Monthly debts');
  }

  function getProposedPITI() {
    return getPanelNumber('Monthly PITI') || getPanelNumber('PITI');
  }

  function getLoanAmount() {
    return getPanelNumber('Total loan amt')
      || getPanelNumber('Base loan amt')
      || getPanelNumber('Total loan amount')
      || getPanelNumber('Base loan amount')
      || getPanelNumber('Loan amount')
      || getPanelNumber('Loan amt')
      || 0;
  }

  function readPageInputs() {
    const grossIncome = getGrossMonthlyIncome();
    const nonTaxableIncome = detectNonTaxableIncome();
    const monthlyDebts = getMonthlyDebts();
    const piti = getProposedPITI();
    const married = /^(married|separated)$/.test(getMaritalStatus());
    const familySize = 1 + (married ? 1 : 0) + getDependentCount();
    const state = getPropertyState();
    const region = regionFor(state);
    const loanAmount = getLoanAmount();
    return {
      grossIncome,
      nonTaxableIncome,
      monthlyDebts,
      piti,
      maintenance: MAINT_PER_SQFT * DEFAULT_SQFT,
      childcare: 0,
      familySize,
      state,
      region,
      loanAmount
    };
  }

  function calculate(state) {
    const gross = state.grossIncome || 0;
    const taxableIncome = Math.max(0, gross - (state.nonTaxableIncome || 0));
    const fedTax = taxableIncome * FED_TAX_RATE;
    const fica = taxableIncome * FICA_RATE;
    const stateTax = taxableIncome * STATE_TAX_RATE;
    const residual = gross
      - fedTax - fica - stateTax
      - (state.monthlyDebts || 0)
      - (state.piti || 0)
      - (state.maintenance || 0)
      - (state.childcare || 0);
    const requirement = vaTableRequirement(state.familySize, state.region, state.loanAmount);
    return {
      taxableIncome,
      federalTax: fedTax,
      fica,
      stateTax,
      residualIncome: Math.round(residual * 100) / 100,
      requirement
    };
  }

  function setReactInputValue(input, value) {
    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function fmt(n) {
    n = (n == null || isNaN(n)) ? 0 : n;
    return '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function getPageFontFamily() {
    const candidates = ['label', 'input', 'select', 'button', 'h2', 'h3', 'p'];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const ff = getComputedStyle(el).fontFamily;
      if (ff) return ff;
    }
    return getComputedStyle(document.body).fontFamily || '';
  }

  function applyResults(state, result) {
    const residualField = findFieldByLabel('VA residual income');
    if (residualField) setReactInputValue(residualField, result.residualIncome.toFixed(2));
    const deductionsField = findFieldByLabel('VA total deductions');
    if (deductionsField && result.requirement != null) {
      setReactInputValue(deductionsField, result.requirement.toFixed(2));
    }
  }

  function showPanel(initialState) {
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();

    const state = Object.assign({}, initialState);
    const fontFamily = getPageFontFamily();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'rric-panel';
    if (fontFamily) panel.style.fontFamily = fontFamily;

    const header = document.createElement('div');
    header.className = 'rric-panel-header';
    const title = document.createElement('div');
    title.className = 'rric-panel-title';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'rric-panel-close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    close.addEventListener('click', function () { panel.remove(); });
    header.appendChild(title);
    header.appendChild(close);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'rric-panel-body';
    panel.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'rric-panel-footer';
    const note = document.createElement('div');
    note.className = 'rric-panel-note';
    note.textContent = 'Edit the highlighted fields, then re-run.';
    const rerun = document.createElement('button');
    rerun.type = 'button';
    rerun.className = 'rric-button rric-rerun';
    rerun.textContent = 'Re-run';
    footer.appendChild(note);
    footer.appendChild(rerun);
    panel.appendChild(footer);

    document.body.appendChild(panel);

    function addRow(label, valueText, opts) {
      opts = opts || {};
      const row = document.createElement('div');
      row.className = 'rric-row'
        + (opts.divider ? ' rric-divider' : '')
        + (opts.emphasis ? ' rric-emphasis' : '')
        + (opts.muted ? ' rric-muted' : '');
      const lbl = document.createElement('div');
      lbl.className = 'rric-label';
      lbl.textContent = label;
      const val = document.createElement('div');
      val.className = 'rric-value';
      val.textContent = valueText;
      row.appendChild(lbl);
      row.appendChild(val);
      body.appendChild(row);
      return row;
    }

    function addEditableRow(label, value, suffix, onChange) {
      const row = document.createElement('div');
      row.className = 'rric-row rric-editable';
      const lbl = document.createElement('div');
      lbl.className = 'rric-label';
      lbl.textContent = label;
      const val = document.createElement('div');
      val.className = 'rric-value';
      const wrap = document.createElement('span');
      wrap.className = 'rric-input-wrap';
      const dollar = document.createElement('span');
      dollar.className = 'rric-input-prefix';
      dollar.textContent = '$';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'rric-input';
      input.value = (Math.round((value || 0) * 100) / 100).toFixed(2);
      input.addEventListener('input', function () { onChange(parseMoney(input.value)); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); rerun.click(); }
      });
      wrap.appendChild(dollar);
      wrap.appendChild(input);
      val.appendChild(wrap);
      if (suffix) {
        const sfx = document.createElement('div');
        sfx.className = 'rric-suffix';
        sfx.textContent = suffix;
        val.appendChild(sfx);
      }
      row.appendChild(lbl);
      row.appendChild(val);
      body.appendChild(row);
    }

    function renderBody() {
      body.innerHTML = '';
      const result = calculate(state);
      title.textContent = 'Residual income: ' + fmt(result.residualIncome);

      addRow('Gross monthly income', fmt(state.grossIncome));
      addEditableRow('Non-Taxable Income (VA Disability, BAH, BAS, etc.)', state.nonTaxableIncome, 'Excluded from taxes', function (v) {
        state.nonTaxableIncome = v;
      });
      addRow('Taxable income', fmt(result.taxableIncome), { divider: true });
      addRow('− Federal tax (15%)', '−' + fmt(result.federalTax));
      addRow('− SS / Medicare (7.625%)', '−' + fmt(result.fica));
      addRow('− State tax (2%)', '−' + fmt(result.stateTax));
      addRow('− Monthly debts', '−' + fmt(state.monthlyDebts));
      addRow('− Proposed PITI', '−' + fmt(state.piti));
      addEditableRow('− Maintenance & utilities', state.maintenance, '2,500 sq ft × $0.14 default', function (v) {
        state.maintenance = v;
      });
      addEditableRow('− Childcare / daycare', state.childcare, 'Defaults to $0', function (v) {
        state.childcare = v;
      });
      addRow('= Residual income', fmt(result.residualIncome), { divider: true, emphasis: true });

      addRow('Family size', String(state.familySize), { divider: true });
      addRow('Property state', state.state || '—');
      addRow('VA region', state.region || '—');
      addRow('Loan amount', fmt(state.loanAmount));
      addRow('VA table requirement', result.requirement != null ? fmt(result.requirement) : '—', { emphasis: true });

      applyResults(state, result);
    }

    rerun.addEventListener('click', renderBody);
    renderBody();
  }

  function findEmploymentSummaryRows() {
    const rows = [];
    const tables = document.querySelectorAll('table[aria-label="Table for employments"]');
    for (const table of tables) {
      for (const tr of table.querySelectorAll('tbody > tr')) {
        const firstCell = tr.children[0];
        if (!firstCell) continue;
        if (firstCell.querySelector('svg[class*="IconChevron"]') && tr.children.length >= 8) {
          rows.push(tr);
        }
      }
    }
    return rows;
  }

  function isEmploymentRowExpanded(summaryRow) {
    const next = summaryRow.nextElementSibling;
    return !!(next && next.querySelector('td[colspan]'));
  }

  function expandEmploymentRow(summaryRow) {
    if (isEmploymentRowExpanded(summaryRow)) return false;
    const firstCell = summaryRow.children[0];
    const targets = [
      firstCell ? firstCell.querySelector('svg') : null,
      firstCell,
      summaryRow
    ].filter(Boolean);
    for (const t of targets) {
      t.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      if (isEmploymentRowExpanded(summaryRow)) return true;
    }
    return false;
  }

  function expandAllEmploymentRows() {
    let any = false;
    for (const row of findEmploymentSummaryRows()) {
      if (!isEmploymentRowExpanded(row)) {
        if (expandEmploymentRow(row)) any = true;
      }
    }
    return any;
  }

  function runCalculator() {
    try {
      const expanded = expandAllEmploymentRows();
      if (expanded) {
        setTimeout(runCalculatorAfterExpand, 250);
        return;
      }
      runCalculatorAfterExpand();
    } catch (e) {
      console.error('[Residual Income Calc] error', e);
      alert('Calculator error: ' + e.message);
    }
  }

  function runCalculatorAfterExpand() {
    try {
      const initialState = readPageInputs();
      if (!initialState.grossIncome) {
        alert('Could not read gross monthly income from the Employment section or sidebar.');
        return;
      }
      showPanel(initialState);
    } catch (e) {
      console.error('[Residual Income Calc] error', e);
      alert('Calculator error: ' + e.message);
    }
  }

  function findMilitaryCompletedRow() {
    const labels = document.querySelectorAll('label, span');
    for (const el of labels) {
      if (normalizeText(el.textContent) === 'military service completed') {
        let row = el.parentElement;
        for (let i = 0; i < 4 && row; i++) {
          if (row.children.length > 1 || (row.offsetWidth > 200)) return row;
          row = row.parentElement;
        }
        return el.parentElement;
      }
    }
    return null;
  }

  function ensureButtonState() {
    const veteranType = getVeteranType();
    const shouldShow = TRIGGER_VETERAN_TYPES.some(function (t) {
      return normalizeText(veteranType) === normalizeText(t);
    });
    const existing = document.getElementById(BUTTON_ID);
    if (!shouldShow) {
      if (existing) existing.remove();
      return;
    }
    if (existing && existing.isConnected) return;
    const anchor = findMilitaryCompletedRow();
    if (!anchor) return;
    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.className = 'rric-button';
    btn.textContent = 'Run Residual Income Calc';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      runCalculator();
    });
    anchor.appendChild(btn);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      scheduled = false;
      try { ensureButtonState(); } catch (e) { console.error('[Residual Income Calc] observer error', e); }
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });
  document.addEventListener('change', schedule, true);
  document.addEventListener('input', schedule, true);
  schedule();
})();
