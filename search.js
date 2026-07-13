// IDX Financial Report Search - Backend Integration
// Connects the Finance ID frontend to IDX.CO.ID API

(function() {
  'use strict';

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
    const folder = period === 'Full Year' ? 'Audit' : idxPeriod;
    const filename = period === 'Full Year'
      ? `FinancialStatement-${year}-Tahunan-${ticker.toUpperCase()}.pdf`
      : `FinancialStatement-${year}-${roman}-${ticker.toUpperCase()}.pdf`;
    return `${IDX_BASE}/Portals/0/StaticData/ListedCompanies/Corporate_Actions/New_Info_JSX/Jenis_Informasi/01_Laporan_Keuangan/02_Soft_Copy_Laporan_Keuangan//${folderYear}/${folder}/${ticker.toUpperCase()}/${filename}`;
  }

  function showLoading() {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) {
      overlay = createOverlay();
    }
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px;max-width:500px;width:90%;text-align:center;color:#fff;">
        <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.2);border-top-color:#6c8ebf;border-radius:50%;animation:idx-spin 0.8s linear infinite;margin:0 auto 20px;"></div>
        <p style="margin:0;opacity:0.7;">Fetching report from IDX...</p>
      </div>`;
    return overlay;
  }

  function showResults(ticker, year, period, files) {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) overlay = createOverlay();
    overlay.style.display = 'flex';
    const idxPeriod = PERIOD_MAP[period] || 'TW1';
    const periodLabel = period === 'Full Year' ? 'Annual (Audited)' : period;
    const fileRows = files.map(f => {
      const isPdf = f.name.toLowerCase().endsWith('.pdf');
      const icon = isPdf ? '\uD83D\uDCC4' : '\uD83D\uDCE6';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(255,255,255,0.05);border-radius:8px;margin-bottom:8px;">
        <span style="color:#ccc;font-size:13px;flex:1;text-align:left;margin-right:12px;">${icon}&nbsp;&nbsp;${f.name}</span>
        <a href="${f.url}" target="_blank" download style="background:#6c8ebf;color:#fff;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:12px;white-space:nowrap;">&#11123; Download</a>
      </div>`;
    }).join('');
    overlay.innerHTML = `
      <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;max-width:560px;width:90%;color:#fff;position:relative;">
        <button onclick="this.closest('#idx-result-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;opacity:0.6;">&times;</button>
        <h3 style="margin:0 0 4px;font-size:18px;">Financial Report</h3>
        <p style="margin:0 0 20px;font-size:22px;font-weight:bold;color:#6c8ebf;">${ticker.toUpperCase()}</p>
        <p style="margin:0 0 16px;font-size:13px;opacity:0.6;">${periodLabel} &bull; ${year} &bull; ${files.length} file(s) found</p>
        ${fileRows}
        <p style="margin:16px 0 0;font-size:11px;opacity:0.4;text-align:center;">Source: IDX.CO.ID</p>
      </div>`;
  }

  function showError(message) {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) overlay = createOverlay();
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:40px;max-width:480px;width:90%;text-align:center;color:#fff;position:relative;">
        <button onclick="this.closest('#idx-result-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:none;border:none;color:#fff;font-size:20px;cursor:pointer;opacity:0.6;">&times;</button>
        <div style="font-size:40px;margin-bottom:16px;">&#9888;&#65039;</div>
        <p style="margin:0 0 8px;font-size:16px;font-weight:bold;">${message}</p>
        <p style="margin:0;font-size:13px;opacity:0.6;">Please check the ticker symbol and try again.</p>
      </div>`;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'idx-result-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.style.display = 'none';
    });
    document.body.appendChild(overlay);
    if (!document.getElementById('idx-styles')) {
      const style = document.createElement('style');
      style.id = 'idx-styles';
      style.textContent = '@keyframes idx-spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    return overlay;
  }

  async function searchReport(ticker, year, period) {
    if (!ticker || ticker.trim() === '') {
      showError('Please enter a ticker symbol');
      return;
    }
    showLoading();
    const idxPeriod = PERIOD_MAP[period] || 'TW1';
    const apiUrl = `${IDX_BASE}/umbraco/Surface/ListedCompany/GetFinancialReport?indexFrom=0&pageSize=10&year=${year}&reportType=rdf&periode=${idxPeriod.toLowerCase()}&kodeEmiten=${ticker.toUpperCase()}`;
    let files = [];

    try {
      // Try direct API call first
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
      if (response.ok) {
        const data = await response.json();
        if (data.Results && data.Results.length > 0) {
          const attachments = data.Results[0].Attachments || [];
          files = attachments
            .filter(a => {
              const name = (a.File_Name || a.file_name || '').toLowerCase();
              // For Full Year: include only the main financial statement PDF (FinancialStatement or audited report)
              // Exclude XBRL, zip, ESG, Annual Report files
              if (period === 'Full Year') {
                return name.endsWith('.pdf') && !name.includes('esg') && !name.includes('annualreport') && !name.includes('ojk');
              }
              // For quarterly: include only the FinancialStatement PDF
              return name.startsWith('financialstatement') && name.endsWith('.pdf');
            })
            .map(a => ({
              name: a.File_Name || a.file_name || 'file',
              url: a.File_Path || a.file_path || '#'
            }));
        }
      }
    } catch (e) {
      // Direct call failed (likely CORS), try via CORS proxy
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
                if (period === 'Full Year') {
                  return name.endsWith('.pdf') && !name.includes('esg') && !name.includes('annualreport') && !name.includes('ojk');
                }
                return name.startsWith('financialstatement') && name.endsWith('.pdf');
              })
              .map(a => ({
                name: a.File_Name || a.file_name || 'file',
                url: a.File_Path || a.file_path || '#'
              }));
          }
        }
      } catch (e2) {
        // CORS proxy also failed, use fallback direct URL
      }
    }

    // Fallback: build predictable direct URL if API failed or returned no results
    if (files.length === 0) {
      const directUrl = buildDirectPdfUrl(ticker, year, period);
      files = [{
        name: period === 'Full Year'
          ? `FinancialStatement-${year}-Tahunan-${ticker.toUpperCase()}.pdf`
          : `FinancialStatement-${year}-${ROMAN_MAP[period]}-${ticker.toUpperCase()}.pdf`,
        url: directUrl
      }];
    }

    if (files.length > 0) {
      showResults(ticker, year, period, files);
    } else {
      showError(`No reports found for ${ticker.toUpperCase()} (${period} ${year})`);
    }
  }

  // Hook into the Search Report button
  function attachEventListeners() {
    const buttons = document.querySelectorAll('button');
    let searchBtn = null;
    buttons.forEach(b => {
      if (b.textContent.trim().includes('Search Report')) searchBtn = b;
    });
    if (searchBtn) {
      searchBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const tickerInput = document.querySelector('input[placeholder*="BBCA"], input[placeholder*="bbca"]');
        const selects = document.querySelectorAll('select');
        const ticker = tickerInput ? tickerInput.value.trim() : '';
        const year = selects[0] ? selects[0].value : '2025';
        const period = selects[1] ? selects[1].value : 'Q1';
        searchReport(ticker, year, period);
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
