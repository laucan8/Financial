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
    const filename = period === 'Full Year'
      ? `FinancialStatement-${year}-Tahunan-${ticker.toUpperCase()}.pdf`
      : `FinancialStatement-${year}-${roman}-${ticker.toUpperCase()}.pdf`;
    return `${IDX_BASE}/Portals/0/StaticData/ListedCompanies/Corporate_Actions/New_Info_JSX/Jenis_Informasi/01_Laporan_Keuangan/02_Soft_Copy_Laporan_Keuangan//${folderYear}/${idxPeriod}/${ticker.toUpperCase()}/${filename}`;
  }

  function showLoading() {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) {
      overlay = createOverlay();
    }
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="background:rgba(10,18,32,0.97);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:40px;max-width:600px;width:90%;position:relative;">
        <div style="text-align:center;">
          <div style="width:48px;height:48px;border:3px solid rgba(255,255,255,0.1);border-top:3px solid #a8c5f0;border-radius:50%;animation:idx-spin 0.8s linear infinite;margin:0 auto 20px;"></div>
          <p style="color:#a8c5f0;font-size:16px;margin:0;">Fetching report from IDX...</p>
        </div>
      </div>
    `;
    return overlay;
  }

  function showResults(ticker, year, period, files) {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) overlay = createOverlay();
    overlay.style.display = 'flex';

    const idxPeriod = PERIOD_MAP[period] || 'TW1';
    const periodLabel = period === 'Full Year' ? 'Annual' : period;

    const fileRows = files.map(f => {
      const isPdf = f.name.toLowerCase().endsWith('.pdf');
      const icon = isPdf ? '\uD83D\uDCC4' : '\uD83D\uDCE6';
      return `
        <a href="${f.url}" target="_blank" rel="noopener"
           style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#e8f4ff;text-decoration:none;transition:background 0.2s;margin-bottom:8px;">
          <span style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">${icon}</span>
            <span style="font-size:14px;word-break:break-all;">${f.name}</span>
          </span>
          <span style="font-size:12px;background:#3b82f6;padding:4px 10px;border-radius:6px;white-space:nowrap;margin-left:12px;">Open</span>
        </a>
      `;
    }).join('');

    overlay.innerHTML = `
      <div style="background:rgba(10,18,32,0.97);border:1px solid rgba(255,255,255,0.15);border-radius:16px;padding:32px;max-width:640px;width:90%;position:relative;max-height:85vh;overflow-y:auto;">
        <button onclick="document.getElementById('idx-result-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">&times;</button>
        <div style="margin-bottom:20px;">
          <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;">Financial Report</p>
          <h2 style="color:#fff;font-size:24px;margin:0 0 4px;">${ticker.toUpperCase()}</h2>
          <p style="color:#a8c5f0;font-size:14px;margin:0;">${periodLabel} &bull; ${year} &bull; ${files.length} file(s) found</p>
        </div>
        <div>${fileRows}</div>
        <p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:16px;text-align:center;">Source: IDX.CO.ID &bull; Click to open in new tab</p>
      </div>
    `;
  }

  function showError(message) {
    let overlay = document.getElementById('idx-result-overlay');
    if (!overlay) overlay = createOverlay();
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="background:rgba(10,18,32,0.97);border:1px solid rgba(255,100,100,0.3);border-radius:16px;padding:40px;max-width:500px;width:90%;position:relative;">
        <button onclick="document.getElementById('idx-result-overlay').style.display='none'" style="position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:16px;">&times;</button>
        <div style="text-align:center;">
          <div style="font-size:40px;margin-bottom:16px;">\u26A0\uFE0F</div>
          <p style="color:#f87171;font-size:16px;margin:0 0 8px;">${message}</p>
          <p style="color:rgba(255,255,255,0.4);font-size:13px;margin:0;">Please check the ticker symbol and try again.</p>
        </div>
      </div>
    `;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'idx-result-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.style.display = 'none';
    });
    document.body.appendChild(overlay);

    // Add spin animation
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
      const response = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.Results && data.Results.length > 0) {
          const attachments = data.Results[0].Attachments || [];
          files = attachments.map(a => ({
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
            files = attachments.map(a => ({
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
      // Try HEAD request to check if file exists
      try {
        const check = await fetch(directUrl, { method: 'HEAD', mode: 'no-cors' });
        // no-cors won't give status, so we just add the link
      } catch (e) {}

      files = [
        {
          name: period === 'Full Year'
            ? `FinancialStatement-${year}-Tahunan-${ticker.toUpperCase()}.pdf`
            : `FinancialStatement-${year}-${ROMAN_MAP[period]}-${ticker.toUpperCase()}.pdf`,
          url: directUrl
        }
      ];
    }

    if (files.length > 0) {
      showResults(ticker, year, period, files);
    } else {
      showError(`No reports found for ${ticker.toUpperCase()} (${period} ${year})`);
    }
  }

  // Hook into the Search Report button
  function attachEventListeners() {
    const btn = document.querySelector('button');
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
        const yearSelect = document.querySelector('select');
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

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachEventListeners);
  } else {
    setTimeout(attachEventListeners, 500);
  }

})();
