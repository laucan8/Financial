// IDX Financial Report Search – Backend Integration
// Connects the Finance ID frontend to IDX.CO.ID API

(function() {
  'use strict';

  function normalizePeriod(val) {
    if (!val) return 'Q1';
    val = val.trim();
    if (val === 'FY' || val === 'Full Year' || val === 'Tahunan') return 'Full Year';
    return val;
  }

  const PERIOD_MAP = { 'Q1': 'TW1', 'Q2': 'TW2', 'Q3': 'TW3', 'Full Year': 'Tahunan' };
  const ROMAN_MAP  = { 'Q1': 'I',   'Q2': 'II',  'Q3': 'III',  'Full Year': 'Tahunan' };
  const IDX_BASE = 'https://www.idx.co.id';

  // CORS proxies - corsproxy.io is FREE for GitHub.io origins
  const CORS_PROXIES = [
    url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
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
    const idxPeriod = PERIOD_MAP[period] || 'TW1';
    return `${IDX_BASE}/umbraco/Surface/ListedCompany/GetFinancialReport?indexFrom=0&pageSize=10&year=${year}&reportType=rdf&periode=${idxPeriod.toLowerCase()}&kodeEmiten=${ticker.toUpperCase()}`;
  }

  async function fetchJSON(url) {
    const r = await fetch(url, { headers: { 'Accept': 'application/json, text/plain, */*' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    return JSON.parse(text);
  }

  async function fetchAttachments(apiUrl) {
    // Try direct call
    try {
      const data = await fetchJSON(apiUrl);
      if (data && data.Results && data.Results.length > 0) return data.Results[0].Attachments || [];
    } catch(e) {}

    // Try each CORS proxy
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
    o.innerHTML = `<div style="background:#0d1b2a;border-radius:16px;padding:40px;max-width:500px;width:90%;text-align:center;color:#fff;">
      <div style="width:40px;height:40px;border:3px solid #334;border-top-color:#7eb3ff;border-radius:50%;animation:idx-spin 0.8s linear infinite;margin:0 auto 20px;"></div>
      <p style="color:#8ab;margin:0;">Fetching report from IDX...</p></div>`;
    return o;
  }

  function showResults(ticker, year, period, files) {
    let o = document.getElementById('idx-result-overlay');
    if (!o) o = createOverlay();
    o.style.display = 'flex';
    const label = period === 'Full Year' ? 'Annual (Audited)' : period;
    const rows = files.map(f =>
      `<div style="display:flex;align-items:center;justify-content:space-between;background:#1a2a3a;border-radius:10px;padding:12px 16px;margin-bottom:8px;">
        <span style="color:#cde;font-size:13px;">&#128196;&nbsp;&nbsp;${f.name}</span>
        <a href="${f.url}" target="_blank" style="background:#2a5fd0;color:#fff;padding:6px 14px;border-radius:7px;font-size:12px;text-decoration:none;white-space:nowrap;margin-left:12px;">&#8659; Open</a>
      </div>`).join('');
    o.innerHTML = `<div style="background:#0d1b2a;border-radius:16px;padding:32px;max-width:560px;width:92%;color:#fff;position:relative;">
      <button onclick="document.getElementById('idx-result-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;">&#215;</button>
      <p style="color:#7eb3ff;font-size:11px;letter-spacing:2px;margin:0 0 8px;">FINANCIAL REPORT</p>
      <h2 style="margin:0 0 4px;font-size:28px;">${ticker.toUpperCase()}</h2>
      <p style="color:#89a;font-size:13px;margin:0 0 20px;">${label} &bull; ${year} &bull; ${files.length} file(s) found</p>
      ${rows}
      <p style="color:#556;font-size:11px;text-align:center;margin-top:16px;">Source: IDX.CO.ID &bull; Click to open in new tab</p></div>`;
  }

  function showError(message) {
    let o = document.getElementById('idx-result-overlay');
    if (!o) o = createOverlay();
    o.style.display = 'flex';
    o.innerHTML = `<div style="background:#0d1b2a;border-radius:16px;padding:40px;max-width:480px;width:90%;text-align:center;color:#fff;position:relative;">
      <button onclick="document.getElementById('idx-result-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;">&#215;</button>
      <div style="font-size:36px;margin-bottom:16px;">&#9888;&#65039;</div>
      <h3 style="margin:0 0 8px;">${message}</h3>
      <p style="color:#89a;font-size:13px;">Please check the ticker symbol and try again.</p></div>`;
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

    const attachments = await fetchAttachments(buildApiUrl(ticker, year, period));
    let files = [];

    if (attachments.length > 0) {
      // Priority: company report PDF (not system files)
      const company = attachments
        .filter(a => isCompanyReport(a.File_Name || a.file_name || ''))
        .map(a => ({ name: a.File_Name || a.file_name, url: fixUrl(a.File_Path || a.file_path) }));

      files = company.length > 0 ? company :
        attachments
          .filter(a => (a.File_Name || a.file_name || '').toLowerCase().endsWith('.pdf'))
          .map(a => ({ name: a.File_Name || a.file_name, url: fixUrl(a.File_Path || a.file_path) }));
    }

    // All proxies failed - show IDX website link
    if (files.length === 0) {
      const idxPeriod = PERIOD_MAP[period] || 'TW1';
      files = [{ 
        name: `View ${ticker.toUpperCase()} reports on IDX website`,
        url: `https://www.idx.co.id/id/perusahaan-tercatat/laporan-keuangan-dan-tahunan`
      }];
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
        const year = selects[0] ? selects[0].value : '2025';
        const periodRaw = selects[1] ? selects[1].value : 'Q1';
        searchReport(ticker, year, periodRaw);
      }, true);
      console.log('[IDX Search] Attached');
    } else {
      setTimeout(attachEventListeners, 1000);
    }
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', attachEventListeners)
    : setTimeout(attachEventListeners, 500);

})();
