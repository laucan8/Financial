// IDX Financial Report Search – Backend Integration
// Connects the Finance ID frontend to IDX.CO.ID API

(function() {
  'use strict';

  function normalizePeriod(val) {
    if (!val) return 'Q1';
    val = val.trim();
    if (val === 'FY' || val === 'Full Year' || val === 'Tahunan' || val === 'Annual') return 'Full Year';
    return val;
  }

  // IDX API periode values: tw1, tw2, tw3, audit
  const PERIOD_MAP = { 'Q1': 'tw1', 'Q2': 'tw2', 'Q3': 'tw3', 'Full Year': 'audit' };
  const IDX_BASE = 'https://www.idx.co.id';
  const CACHE_BASE = 'https://laucan8.github.io/Financial/api';
  const CF_WORKER = 'https://idx-proxy.rengga-aditya828.workers.dev';

  const CORS_PROXIES = [
    url => `${CF_WORKER}?url=${encodeURIComponent(url)}`,
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];

  const EXCLUDE_PREFIXES = [
    'financialstatement', 'ojk', 'esg', 'annualreport',
    'instance', 'inlinexbrl', 'xbrl', 'checklist'
  ];

  function isCompanyReport(filename) {
    const lower = (filename || '').toLowerCase();
    if (!lower.endsWith('.pdf')) return false;
    for (const p of EXCLUDE_PREFIXES) { if (lower.startsWith(p)) return false; }
    return true;
  }

  function fixUrl(url) {
    if (!url) return '#';
    return url.startsWith('http') ? url : IDX_BASE + (url.startsWith('/') ? '' : '/') + url;
  }

  function buildApiUrl(ticker, year, period) {
    const idxPeriod = PERIOD_MAP[period] || 'tw1';
    return `${IDX_BASE}/primary/ListedCompany/GetFinancialReport?indexFrom=0&pageSize=10&year=${year}&reportType=rdf&periode=${idxPeriod}&kodeEmiten=${ticker.toUpperCase()}`;
  }

  function buildCacheUrl(ticker, year, period) {
    const idxPeriod = PERIOD_MAP[period] || 'tw1';
    return `${CACHE_BASE}/${ticker.toUpperCase()}_${year}_${idxPeriod}.json`;
  }

  async function fetchJSON(url) {
    const r = await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    return JSON.parse(text);
  }

  async function fetchAttachments(ticker, year, period) {
    const apiUrl = buildApiUrl(ticker, year, period);
    const cacheUrl = buildCacheUrl(ticker, year, period);

    // 1. Try cached JSON from GitHub Pages (same-origin, no CORS issues)
    try {
      const data = await fetchJSON(cacheUrl);
      if (data && data.Results && data.Results.length > 0) {
        console.log('[IDX Search] Served from cache:', cacheUrl);
        return data.Results[0].Attachments || [];
      }
    } catch(e) {}

    // 2. Try direct IDX call
    try {
      const data = await fetchJSON(apiUrl);
      if (data && data.Results && data.Results.length > 0) return data.Results[0].Attachments || [];
    } catch(e) {}

    // 3. Try proxies
    for (const proxyFn of CORS_PROXIES) {
      try {
        const data = await fetchJSON(proxyFn(apiUrl));
        if (data && data.Results && data.Results.length > 0) return data.Results[0].Attachments || [];
      } catch(e) {}
    }

    return [];
  }

  function showLoading() {
    let o = document.getElementById('idx-result-overlay');
    if (!o) o = createOverlay();
    o.style.display = 'flex';
    o.innerHTML = `
      <div style="background:#0f1923;border-radius:16px;padding:40px;text-align:center;color:#fff;">
        <div style="width:40px;height:40px;border:3px solid #334;border-top-color:#4af;border-radius:50%;animation:idx-spin 0.8s linear infinite;margin:0 auto 16px;"></div>
        <p style="margin:0;opacity:.7;">Fetching report from IDX...</p>
      </div>`;
    return o;
  }

  function showResults(ticker, year, period, files) {
    let o = document.getElementById('idx-result-overlay');
    if (!o) o = createOverlay();
    o.style.display = 'flex';
    const label = period === 'Full Year' ? 'Annual (Audited)' : period;
    const rows = files.map(f => `
      <div style="display:flex;align-items:center;gap:12px;background:#1a2533;border-radius:10px;padding:12px 16px;margin-top:10px;">
        <span style="font-size:20px;">📄</span>
        <span style="flex:1;font-size:13px;color:#cdd;word-break:break-all;">${f.name}</span>
        <a href="${f.url}" target="_blank" style="background:#1d6fdb;color:#fff;padding:6px 14px;border-radius:8px;text-decoration:none;font-size:13px;white-space:nowrap;">⇓ Open</a>
      </div>`).join('');
    o.innerHTML = `
      <div style="background:#0f1923;border-radius:16px;padding:30px;max-width:520px;width:90%;color:#fff;position:relative;">
        <button onclick="document.getElementById('idx-result-overlay').style.display='none'" style="position:absolute;top:12px;right:16px;background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;">×</button>
        <p style="font-size:11px;letter-spacing:2px;color:#4af;margin:0 0 8px;">FINANCIAL REPORT</p>
        <h2 style="margin:0 0 4px;font-size:26px;">${ticker.toUpperCase()}</h2>
        <p style="margin:0 0 16px;opacity:.6;font-size:13px;">${label} • ${year} • ${files.length} file(s) found</p>
        ${rows}
        <p style="margin:16px 0 0;font-size:11px;opacity:.4;text-align:center;">Source: IDX.CO.ID • Click to open in new tab</p>
      </div>`;
  }

  function showError(message) {
    let o = document.getElementById('idx-result-overlay');
    if (!o) o = createOverlay();
    o.style.display = 'flex';
    o.innerHTML = `
      <div style="background:#0f1923;border-radius:16px;padding:40px;max-width:400px;width:90%;color:#fff;text-align:center;position:relative;">
        <button onclick="document.getElementById('idx-result-overlay').style.display='none'" style="position:absolute;top:12px;right:16px;background:none;border:none;color:#aaa;font-size:20px;cursor:pointer;">×</button>
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h3 style="margin:0 0 8px;">${message}</h3>
        <p style="margin:0;opacity:.6;font-size:13px;">Please check the ticker symbol and try again.</p>
      </div>`;
  }

  function createOverlay() {
    const o = document.createElement('div');
    o.id = 'idx-result-overlay';
    o.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);';
    o.addEventListener('click', e => { if (e.target === o) o.style.display = 'none'; });
    document.body.appendChild(o);
    if (!document.getElementById('idx-styles')) {
      const s = document.createElement('style');
      s.id = 'idx-styles';
      s.textContent = '@keyframes idx-spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(s);
    }
    return o;
  }

  async function searchReport(ticker, year, periodRaw) {
    if (!ticker || !ticker.trim()) { showError('Please enter a ticker symbol'); return; }
    const period = normalizePeriod(periodRaw);
    showLoading();
    const attachments = await fetchAttachments(ticker, year, period);
    let files = [];
    if (attachments.length > 0) {
      const company = attachments
        .filter(a => isCompanyReport(a.File_Name || a.file_name || ''))
        .map(a => ({ name: a.File_Name || a.file_name, url: fixUrl(a.File_Path || a.file_path) }));
      files = company.length > 0 ? company : attachments
        .filter(a => (a.File_Name || a.file_name || '').toLowerCase().endsWith('.pdf'))
        .map(a => ({ name: a.File_Name || a.file_name, url: fixUrl(a.File_Path || a.file_path) }));
    }
    if (files.length === 0) {
      files = [{ name: `View ${ticker.toUpperCase()} reports on IDX website`, url: 'https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan' }];
    }
    showResults(ticker, year, period, files);
  }

  function attachEventListeners() {
    const buttons = document.querySelectorAll('button');
    let searchBtn = null;
    buttons.forEach(b => { if (b.textContent.trim().includes('Search Report')) searchBtn = b; });
    if (searchBtn) {
      searchBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const tickerInput = document.querySelector('input[placeholder*="BBCA"], input[placeholder*="bbca"]');
        const selects = document.querySelectorAll('select');
        const ticker = tickerInput ? tickerInput.value.trim() : '';
        const year   = selects[0] ? selects[0].value : '2025';
        const periodRaw = selects[1] ? selects[1].value : 'Q1';
        searchReport(ticker, year, periodRaw);
      }, true);
      console.log('[IDX Search] Ready – cache + live fallback');
    } else {
      setTimeout(attachEventListeners, 1000);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', attachEventListeners)
    : setTimeout(attachEventListeners, 500);

})();
