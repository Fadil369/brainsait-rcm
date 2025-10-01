const state = {
  apiBaseUrl: window.demoConfig?.apiBaseUrl || 'https://api.brainsait.com',
  locale: window.demoConfig?.locale || 'en'
};

const selectors = {
  statusChip: '[data-status-chip]',
  statusValue: '[data-status-value]',
  metric: '[data-metric]',
  meta: '[data-meta]',
  sparkline: '[data-sparkline]',
  tabSet: '[data-tab-set]',
  tabButton: '[data-tab-button]',
  tabPanel: '[data-tab-panel]',
  actions: '[data-action]',
  playgroundForm: '[data-form="config"]',
  playgroundResults: '[data-playground-results]'
};

const i18n = {
  en: {
    online: 'Online',
    degraded: 'Degraded',
    offline: 'Offline',
    checking: 'Checking…',
    letters: (count) => `${count} pending`,
    alerts: (count) => `${count} alerts`,
    refreshed: 'Updated just now',
    syncStarted: 'Syncing with API…',
    syncFailed: 'Unable to reach backend. Confirm the URL and try again.',
    syncSuccess: 'Live data refreshed. All systems nominal.'
  },
  ar: {
    online: 'متصل',
    degraded: 'متقطع',
    offline: 'غير متصل',
    checking: 'جاري الفحص…',
    letters: (count) => `${count} قيد الإرسال`,
    alerts: (count) => `${count} تنبيهات`,
    refreshed: 'تم التحديث للتو',
    syncStarted: 'جاري المزامنة مع الواجهة الخلفية…',
    syncFailed: 'تعذر الوصول إلى الواجهة الخلفية. تأكد من الرابط وحاول مرة أخرى.',
    syncSuccess: 'تم تحديث البيانات بنجاح. جميع الأنظمة تعمل.'
  }
};

const getCopy = (key) => i18n[state.locale][key];

const formatDate = (date) => {
  try {
    return new Intl.DateTimeFormat(state.locale === 'ar' ? 'ar-SA' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch (error) {
    console.warn('Falling back to ISO timestamp formatting', error);
    return date.toISOString();
  }
};

const formatPercent = (value) => {
  if (Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
};

const formatNumber = (value) => {
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(state.locale === 'ar' ? 'ar-SA' : 'en-US').format(value);
};

const doc = document;

function setMeta(key, value) {
  const target = doc.querySelector(`[data-meta="${key}"]`);
  if (target) {
    target.textContent = value;
  }
}

function setMetric(key, value) {
  const target = doc.querySelector(`[data-metric="${key}"]`);
  if (target) {
    target.textContent = value;
  }
}

function setStatus(key, { tone, message }) {
  const chip = doc.querySelector(`[data-status-chip="${key}"]`);
  if (!chip) return;
  chip.classList.remove('status-chip--online', 'status-chip--warning', 'status-chip--critical', 'status-chip--pending');
  chip.classList.add(`status-chip--${tone}`);
  const value = chip.querySelector(selectors.statusValue);
  if (value) {
    value.textContent = message;
  }
}

function setCheckingStates() {
  const chips = doc.querySelectorAll(selectors.statusChip);
  chips.forEach((chip) => {
    chip.classList.remove('status-chip--online', 'status-chip--warning', 'status-chip--critical');
    chip.classList.add('status-chip--pending');
    const value = chip.querySelector(selectors.statusValue);
    if (value) value.textContent = getCopy('checking');
  });
}

async function fetchJson(endpoint) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshLiveData(baseUrl) {
  setCheckingStates();
  const results = doc.querySelector(selectors.playgroundResults);
  if (results) {
    results.innerHTML = `<p class="badge">${getCopy('syncStarted')}</p>`;
  }

  try {
    const [health, analytics] = await Promise.all([
      fetchJson(`${baseUrl.replace(/\/$/, '')}/health`),
      fetchJson(`${baseUrl.replace(/\/$/, '')}/api/analytics/dashboard`)
    ]);

    if (health?.status === 'healthy') {
      setStatus('api', { tone: 'online', message: getCopy('online') });
    } else {
      setStatus('api', { tone: 'warning', message: getCopy('degraded') });
    }

    const dbState = health?.database === 'connected' ? 'online' : 'warning';
    setStatus('database', {
      tone: dbState,
      message: health?.database === 'connected' ? getCopy('online') : getCopy('degraded')
    });

    const pendingLetters = analytics?.metrics?.overdue_letters ?? analytics?.metrics?.pending_letters ?? 0;
    const fraudAlerts = analytics?.recent_alerts?.length ?? 0;

    setStatus('letters', {
      tone: pendingLetters > 0 ? 'warning' : 'online',
      message: i18n[state.locale].letters(pendingLetters)
    });

    setStatus('alerts', {
      tone: fraudAlerts > 0 ? 'critical' : 'online',
      message: i18n[state.locale].alerts(fraudAlerts)
    });

    const totalClaims = analytics?.metrics?.total_claims ?? analytics?.metrics?.claims_this_month ?? NaN;
    const rejectionRate = analytics?.metrics?.rejection_rate ?? NaN;
    const recoveryRate = analytics?.metrics?.recovery_rate ?? NaN;

    setMetric('claims-total', formatNumber(Number(totalClaims)));
    setMetric('rejection-rate', formatPercent(Number(rejectionRate)));
    setMetric('recovery-rate', formatPercent(Number(recoveryRate)));

    const now = new Date();
    setMeta('last-refreshed', formatDate(now));

    if (results) {
      results.innerHTML = `
        <div class="glass-panel">
          <p class="text-secondary">${getCopy('syncSuccess')}</p>
          <ul class="feature-list">
            <li>API health: <strong>${health?.status}</strong></li>
            <li>Pending letters: <strong>${pendingLetters}</strong></li>
            <li>Fraud alerts: <strong>${fraudAlerts}</strong></li>
          </ul>
        </div>
      `;
    }
  } catch (error) {
    console.error('Demo refresh failed', error);
    setStatus('api', { tone: 'critical', message: getCopy('offline') });
    setStatus('database', { tone: 'critical', message: getCopy('offline') });
    setStatus('letters', { tone: 'critical', message: getCopy('offline') });
    setStatus('alerts', { tone: 'critical', message: getCopy('offline') });

    if (doc.querySelector(selectors.playgroundResults)) {
      doc.querySelector(selectors.playgroundResults).innerHTML = `
        <div class="glass-panel">
          <p class="text-secondary">${getCopy('syncFailed')}</p>
          <small class="text-muted">${error.message}</small>
        </div>
      `;
    }
  }
}

function handleTabs(tabSet) {
  const buttons = Array.from(tabSet.querySelectorAll(selectors.tabButton));
  const panels = Array.from(tabSet.querySelectorAll(selectors.tabPanel));

  const activate = (button) => {
    buttons.forEach((btn, index) => {
      const isActive = btn === button;
      btn.setAttribute('aria-selected', String(isActive));
      btn.tabIndex = isActive ? 0 : -1;
      if (panels[index]) {
        if (isActive) {
          panels[index].removeAttribute('hidden');
        } else {
          panels[index].setAttribute('hidden', '');
        }
      }
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => activate(btn));
    btn.addEventListener('keydown', (event) => {
      const currentIndex = buttons.indexOf(btn);
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const next = buttons[(currentIndex + 1) % buttons.length];
        next.focus();
        activate(next);
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = buttons[(currentIndex - 1 + buttons.length) % buttons.length];
        prev.focus();
        activate(prev);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        const first = buttons[0];
        first.focus();
        activate(first);
      }
      if (event.key === 'End') {
        event.preventDefault();
        const last = buttons[buttons.length - 1];
        last.focus();
        activate(last);
      }
    });
  });

  activate(buttons.find((btn) => btn.getAttribute('aria-selected') === 'true') || buttons[0]);
}

function handleActions() {
  doc.querySelectorAll(selectors.actions).forEach((element) => {
    element.addEventListener('click', (event) => {
      const action = event.currentTarget.dataset.action;
      const results = doc.querySelector(selectors.playgroundResults);
      if (!results) return;

      const messages = {
        'open-dashboard': 'Opening the production dashboard in a new tab…',
        'sync-now': 'Triggering live sync with API…',
        'create-rejection': 'Launching the rejection creation modal…',
        'view-rejections': 'Loading the rejection operations center…',
        'generate-letter': 'Preparing compliance letter workflow…',
        'open-notifications': 'Opening communication center with templated messages…',
        'run-fraud': 'Running fraud detection models (xgboost + isolation forest + rules)…',
        'open-analytics': 'Opening predictive analytics studio with Prophet forecasts…'
      };

      if (action === 'sync-now') {
        refreshLiveData(state.apiBaseUrl);
      } else if (action === 'open-dashboard') {
        window.open('/app/dashboard', '_blank', 'noopener');
      }

      results.innerHTML = `
        <div class="glass-panel">
          <p class="text-secondary">${messages[action] || 'Action queued inside demo shell.'}</p>
        </div>
      `;
    });
  });
}

function handleConfigForm() {
  const form = doc.querySelector(selectors.playgroundForm);
  if (!form) return;
  const input = form.querySelector('input[name="api-url"]');
  if (input) {
    input.value = state.apiBaseUrl;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const url = formData.get('api-url');
    if (!url) return;
    state.apiBaseUrl = String(url);
    localStorage.setItem('brainsait-demo-api', state.apiBaseUrl);
    refreshLiveData(state.apiBaseUrl);
  });
}

function handleLocaleToggle() {
  const toggle = doc.querySelector('[data-action="toggle-locale"]');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    state.locale = state.locale === 'en' ? 'ar' : 'en';
    localStorage.setItem('brainsait-demo-locale', state.locale);
    doc.documentElement.lang = state.locale;
    doc.documentElement.dir = state.locale === 'ar' ? 'rtl' : 'ltr';
    refreshLiveData(state.apiBaseUrl);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  doc.documentElement.lang = state.locale;
  doc.documentElement.dir = state.locale === 'ar' ? 'rtl' : 'ltr';
  setMeta('year', new Date().getFullYear());
  setMeta('environment', 'Production-ready');
  setMeta('last-refreshed', getCopy('refreshed'));

  const tabSets = doc.querySelectorAll(selectors.tabSet);
  tabSets.forEach(handleTabs);

  handleActions();
  handleConfigForm();
  handleLocaleToggle();
  refreshLiveData(state.apiBaseUrl);
});
