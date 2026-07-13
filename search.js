// IDX Financial Report Search – Backend Integration
// Connects the Finance ID frontend to IDX.CO.ID API

(function() {
  'use strict';

  // Helper: normalize period value from the dropdown
  // The select option value may be 'FY', 'Q1', 'Q2', 'Q3' etc.
  function normalizePeriod(val) {
    if (!val) return 'Q1';
    val = val.trim();
    if (val === 'FY' || val === 'Full Year' || val === 'Tahunan') return 'Full Year';
    return val; // Q1, Q2, Q3
  }

  // Period mapping: UI value -> IDX API value
  const PERIOD_MAP = {
    'Q1': 'TW1',
    'Q2': 'TW2',
    'Q3': 'TW3',
    'Full Year': 'Tahunan'
  };

  // Roman numeral for FinancialStatement filename
  const ROMAN_MAP = {
    'Q1': 'I',
    'Q2': 'II',
    'Q3': 'III',
    'Full Year': 'Tahunan'
  };

  const IDX_BASE = 'https://www.idx.co.id';
  const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

  function buildApiUrl(ticker, year, period) {
    const idxPeriod = PERIOD_MAP[period] || 'TW1';
    const url = `${IDX_BASE}/umbraco/Surface/ListedCompany/GetFinancialReport?indexFrom=0&pageSize=10&year=${year}&reportType=rdf&periode=${idxPeriod.toLowerCase()}&kodeEmiten=${ticker.toUpperCase()}`;
    return url;
  }

  function buildDirectPdfUrl(ticker, year, period) {
    const idxPeriod = PERIOD_MAP[period] || 'TW1';
    const roman = ROMAN_MAP[period] || 'I';
    const folderYear = `Laporan%20Keuangan%20Tahun%20${year}`;
    // Full Year uses 'Audit' folder; quarterly uses TW1/TW2/TW3 folder
    const isFullYear = period === 'Full Year';
    const folder = isFullYear ? 'Audit' : idxPeriod;
    const filename = isFullYear
      ? `FinancialStatement-${year}-Tahunan-${ticker.toUpperCase()}.pdf`
      : `FinancialStatement-${year}-${roman}-${ticker.toUpperCase()}.pdf`;
    return `${IDX_BASE}/Portals/0/StaticData/ListedCompanies/Corporate_Actions/New_Info_JSX/Jenis_Informasi/01_Laporan_Keuangan/02_Soft_Copy_Laporan_Keuangan//${folderYear}/${folder}/${ticker.toUpperCase()}/${filename}`;
  }

  function showLoading() {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) { overlay = createOverlay(); }
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="background:#0d1b2a;border-radius:16px;padding:40px;max-width:500px;width:90%;text-align:center;color:#fff;">
        <div style="width:40px;height:40px;border:3px solid #334;border-top-color:#7eb3ff;border-radius:50%;animation:idx-spin 0.8s linear infinite;margin:0 auto 20px;"></div>
        <p style="color:#8ab;margin:0;">Fetching report from IDX...</p>
      </div>`;
    return overlay;
  }

  function showResults(ticker, year, period, files) {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) overlay = createOverlay();
    overlay.style.display = 'flex';
    const isFullYear = period === 'Full Year';
    const periodLabel = isFullYear ? 'Annual (Audited)' : period;
    const fileRows = files.map(f => {
      const isPdf = f.name.toLowerCase().endsWith('.pdf');
      const icon = isPdf ? '\uD83D\uDCC4' : '\uD83D\uDCE6';
      return `<div style="display:flex;align-items:center;justify-content:space-between;background:#1a2a3a;border-radius:10px;padding:12px 16px;margin-bottom:8px;">
        <span style="color:#cde;font-size:13px;">${icon}&nbsp;&nbsp;${f.name}</span>
        <a href="${f.url}" target="_blank" style="background:#2a5fd0;color:#fff;padding:6px 14px;border-radius:7px;font-size:12px;text-decoration:none;white-space:nowrap;margin-left:12px;">&#8659; Open</a>
      </div>`;
    }).join('');
    overlay.innerHTML = `
      <div style="background:#0d1b2a;border-radius:16px;padding:32px;max-width:560px;width:92%;color:#fff;position:relative;">
        <button onclick="document.getElementById('idx-result-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;">&#215;</button>
        <p style="color:#7eb3ff;font-size:11px;letter-spacing:2px;margin:0 0 8px;">FINANCIAL REPORT</p>
        <h2 style="margin:0 0 4px;font-size:28px;">${ticker.toUpperCase()}</h2>
        <p style="color:#89a;font-size:13px;margin:0 0 20px;">${periodLabel} &bull; ${year} &bull; ${files.length} file(s) found</p>
        ${fileRows}
        <p style="color:#556;font-size:11px;text-align:center;margin-top:16px;">Source: IDX.CO.ID &bull; Click to open in new tab</p>
      </div>`;
  }

  function showError(message) {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) overlay = createOverlay();
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="background:#0d1b2a;border-radius:16px;padding:40px;max-width:480px;width:90%;text-align:center;color:#fff;position:relative;">
        <button onclick="document.getElementById('idx-result-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#888;font-size:20px;cursor:pointer;">&#215;</button>
        <div style="font-size:36px;margin-bottom:16px;">&#9888;&#65039;</div>
        <h3 style="margin:0 0 8px;">${message}</h3>
        <p style="color:#89a;font-size:13px;">Please check the ticker symbol and try again.</p>
      </div>`;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'idx-result-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.style.display = 'none'; });
    document.body.appendChild(overlay);
    if (!document.getElementById('idx-styles')) {
      const style = document.createElement('style');
      style.id = 'idx-styles';
      style.textContent = '@keyframes idx-spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    return overlay;
  }

  async function searchReport(ticker, year, periodRaw) {
    if (!ticker || ticker.trim() === '') { showError('Please enter a ticker symbol'); return; }
    const period = normalizePeriod(periodRaw);
    showLoading();
    const idxPeriod = PERIOD_MAP[period] || 'TW1';
    const apiUrl = `${IDX_BASE}/umbraco/Surface/ListedCompany/GetFinancialReport?indexFrom=0&pageSize=10&year=${year}&reportType=rdf&periode=${idxPeriod.toLowerCase()}&kodeEmiten=${ticker.toUpperCase()}`;
    const isFullYear = period === 'Full Year';
    let files = [];
    try {
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        if (data.Results && data.Results.length > 0) {
          const attachments = data.Results[0].Attachments || [];
          files = attachments
            .filter(a => {
              const name = (a.File_Name || a.file_name || '').toLowerCase();
              if (isFullYear) {
                return name.endsWith('.pdf') && !name.includes('esg') && !name.includes('annualreport') && !name.includes('ojk');
              }
              return name.startsWith('financialstatement') && name.endsWith('.pdf');
            })
            .map(a => ({ name: a.File_Name || a.file_name || 'file', url: a.File_Path || a.file_path || '#' }));
        }
      }
    } catch (e) {
      try {
        const proxyUrl = CORS_PROXY + encodeURIComponent(apiUrl);
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.Results && data.Results.length > 0) {
            const attachments = data.Results[0].Attachments || [];
            files = attachments
              .filter(a => {
                const name = (a.File_Name || a.file_name || '').toLowerCase();
                if (isFullYear) {
                  return name.endsWith('.pdf') && !name.includes('esg') && !name.includes('annualreport') && !name.includes('ojk');
                }
                return name.startsWith('financialstatement') && name.endsWith('.pdf');
              })
              .map(a => ({ name: a.File_Name || a.file_name || 'file', url: a.File_Path || a.file_path || '#' }));
          }
        }
      } catch (e2) { /* fallback below */ }
    }
    if (files.length === 0) {
      const directUrl = buildDirectPdfUrl(ticker, year, period);
      const roman = ROMAN_MAP[period] || 'I';
      files = [{
        name: isFullYear
          ? `FinancialStatement-${year}-Tahunan-${ticker.toUpperCase()}.pdf`
          : `FinancialStatement-${year}-${roman}-${ticker.toUpperCase()}.pdf`,
        url: directUrl
      }];
    }
    if (files.length > 0) {
      showResults(ticker, year, period, files);
    } else {
      showError(`No reports found for ${ticker.toUpperCase()} (${period} ${year})`);
    }
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
      console.log('[IDX Search] Event listener attached to Search Report button');
    } else {
      console.warn('[IDX Search] Search Report button not found, retrying...');
      setTimeout(attachEventListeners, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEventListeners);
  } else {
    setTimeout(attachEventListeners, 500);
  }

})();
