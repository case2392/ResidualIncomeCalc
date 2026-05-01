(function () {
  'use strict';

  const BUTTON_ID = 'rric-run-button';
  const TRIGGER_VETERAN_TYPES = ['Regular military', 'National Guard or reserves'];

  const FED_TAX_RATE = 0.15;
  const FICA_RATE = 0.07625;
  const STATE_TAX_RATE = 0.02;
  const MAINT_PER_SQFT = 0.14;
  const DEFAULT_SQFT = 2500;

  const VA_REGION_BY_STATE = {
    Northeast: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
    Midwest: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
    South: ['AL', 'AR', 'DE', 'DC', 'FL', 'GA', 'KY', 'LA', 'MD', 'MS', 'NC', 'OK', 'SC', 'TN', 'TX', 'VA', 'WV', 'PR'],
    West: ['AK', 'AZ', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'NM', 'OR', 'UT', 'WA', 'WY', 'GU']
  };

  function regionFor(stateCode) {
    const code = (stateCode || '').toUpperCase();
    for (const [region, list] of Object.entries(VA_REGION_BY_STATE)) {
      if (list.includes(code)) return region;
    }
    return null;
  }

  function parseMoney(s) {
    if (s == null) return 0;
    const n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  function normalizeText(s) {
    return (s || '').replace(/\s+/g, ' ').replace(/\*/g, '').trim().toLowerCase();
  }

  function findLabel(text, scope) {
    const target = normalizeText(text);
    const root = scope || document;
    const labels = root.querySelectorAll('label');
    for (const lbl of labels) {
      const t = normalizeText(lbl.textContent);
      if (t === target || t.startsWith(target + ' ') || t === target + ' *') return lbl;
    }
    for (const lbl of labels) {
      const t = normalizeText(lbl.textContent);
      if (t.startsWith(target)) return lbl;
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
    if (scope) {
      stateInp = findFieldByLabel('State', scope);
    }
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
    const els = document.querySelectorAll('div, span, td, p, dt, li');
    for (const el of els) {
      if (normalizeText(el.textContent) === target) {
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
    return 0;
  }

  function getGrossMonthlyIncome() {
    const employment = getEmploymentIncome();
    if (employment > 0) return employment;
    return getPanelNumber('Monthly income');
  }

  function getMonthlyDebts() {
    const v = getPanelNumber('Monthly liabilities');
    if (v) return v;
    return getPanelNumber('Monthly debts');
  }

  function getProposedPITI() {
    return getPanelNumber('Monthly PITI') || getPanelNumber('PITI');
  }

  function calculate() {
    const grossIncome = getGrossMonthlyIncome();
    const monthlyDebts = getMonthlyDebts();
    const piti = getProposedPITI();
    const fedTax = grossIncome * FED_TAX_RATE;
    const fica = grossIncome * FICA_RATE;
    const stateTax = grossIncome * STATE_TAX_RATE;
    const maintenance = MAINT_PER_SQFT * DEFAULT_SQFT;

    const residual = grossIncome - fedTax - fica - stateTax - monthlyDebts - piti - maintenance;

    const married = /married/.test(getMaritalStatus());
    const familySize = 1 + (married ? 1 : 0) + getDependentCount();
    const state = getPropertyState();
    const region = regionFor(state);

    return {
      inputs: {
        grossIncome,
        monthlyDebts,
        piti,
        sqft: DEFAULT_SQFT,
        familySize,
        state,
        region
      },
      deductions: {
        federalTax: fedTax,
        socialSecurityMedicare: fica,
        stateTax,
        monthlyDebts,
        proposedPITI: piti,
        maintenanceUtilities: maintenance
      },
      residualIncome: Math.round(residual * 100) / 100
    };
  }

  function setReactInputValue(input, value) {
    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function showToast(message, opts) {
    opts = opts || {};
    const existing = document.querySelector('.rric-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'rric-toast' + (opts.error ? ' rric-error' : '');
    toast.textContent = message;
    if (opts.detail) {
      const pre = document.createElement('pre');
      pre.textContent = opts.detail;
      toast.appendChild(pre);
    }
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast.parentElement) toast.remove();
    }, opts.error ? 9000 : 6000);
  }

  function fmt(n) {
    return '$' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function runCalculator() {
    try {
      const result = calculate();
      const target = findFieldByLabel('VA residual income');
      if (!target) {
        showToast('Could not find the "VA residual income" field.', { error: true });
        return;
      }
      if (!result.inputs.grossIncome) {
        showToast('Could not read gross monthly income from Employment or sidebar. Aborting.', { error: true });
        return;
      }
      setReactInputValue(target, result.residualIncome.toFixed(2));

      const detail =
        'Gross income:        ' + fmt(result.inputs.grossIncome) + '\n' +
        '- Federal tax (15%): ' + fmt(result.deductions.federalTax) + '\n' +
        '- SS/Medicare (7.625%): ' + fmt(result.deductions.socialSecurityMedicare) + '\n' +
        '- State tax (2%):    ' + fmt(result.deductions.stateTax) + '\n' +
        '- Monthly debts:     ' + fmt(result.deductions.monthlyDebts) + '\n' +
        '- Proposed PITI:     ' + fmt(result.deductions.proposedPITI) + '\n' +
        '- Maint/utilities:   ' + fmt(result.deductions.maintenanceUtilities) + ' (2,500 sq ft × $0.14)\n' +
        '= Residual income:   ' + fmt(result.residualIncome) + '\n' +
        'Family size: ' + result.inputs.familySize + '   State: ' + (result.inputs.state || '?') + '   Region: ' + (result.inputs.region || '?');
      showToast('Residual income: ' + fmt(result.residualIncome), { detail });
      console.log('[Residual Income Calc]', result);
    } catch (e) {
      console.error('[Residual Income Calc] error', e);
      showToast('Calculator error: ' + e.message, { error: true });
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
      try {
        ensureButtonState();
      } catch (e) {
        console.error('[Residual Income Calc] observer error', e);
      }
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });

  document.addEventListener('change', schedule, true);
  document.addEventListener('input', schedule, true);

  schedule();
})();
