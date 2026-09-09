import { authService, monitoringService } from './services.js';
import { riskColor } from './data.js';
import { nerBoundaries } from './ner-boundaries.js';

const $ = (s) => document.querySelector(s);
let map, boundaryLayer, markerLayer, rainfallLayer, soilMoistureLayer, slopeLayer, historyLayer, reportsLayer, roadsLayer, nerBounds, stateData = [];
const NER_CENTER = [25.8, 92.5];
const NER_ZOOM = 6.8;
const levelClass = (level) => level.toLowerCase().replace(' ', '-');
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

let photoBase64 = null;

function getBoundaryStyle(feature, isSelected = false) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isSelected) {
    return {
      color: isLight ? '#1d4ed8' : '#38bdf8',
      weight: 3.2,
      opacity: 1,
      fillColor: isLight ? '#3b82f6' : '#0284c7',
      fillOpacity: isLight ? 0.22 : 0.26,
      dashArray: null
    };
  }
  return {
    color: isLight ? '#2563eb' : '#38bdf8',
    weight: 2,
    opacity: 0.92,
    fillColor: isLight ? '#60a5fa' : '#0284c7',
    fillOpacity: isLight ? 0.08 : 0.12,
    dashArray: '3, 4'
  };
}

function showLocation(s) {
  $('#locationDetail').innerHTML = `<div class="selected-place"><span class="pin" style="background:${riskColor[s.level]};box-shadow:0 0 0 3px rgba(255,255,255,0.15), 0 0 10px ${riskColor[s.level]};"></span><div><h2>${s.name}</h2><p>${s.short} · ${s.data_status || 'Demo'} assessment</p></div></div><div class="location-risk"><span>Risk score</span><strong>${s.score}<small>/100</small></strong><b class="risk-label ${levelClass(s.level)}">${s.level}</b></div><dl class="detail-grid"><div><dt>Rainfall (24h)</dt><dd>${s.rain} mm</dd></div><div><dt>Soil moisture</dt><dd>${s.soil}%</dd></div><div><dt>Avg. slope</dt><dd>${s.slope}</dd></div><div><dt>Elevation</dt><dd>${s.elevation}</dd></div></dl><div class="recent"><span>Recent information</span><p>${s.event}</p></div><div class="detail-bottom"><span>Last updated ${s.updated}</span><b>${s.alerts ? `${s.alerts} active alert${s.alerts > 1 ? 's' : ''}` : 'No active alerts'}</b></div>`;
}

function popupContent(s) {
  return `<div class="map-popup"><strong>${s.name}</strong><small>${s.data_status || 'DEMO / SIMULATED DATA'}</small><dl><div><dt>Risk level</dt><dd>${s.level} (${s.score}/100)</dd></div><div><dt>Rainfall</dt><dd>${s.rain} mm / 24h</dd></div><div><dt>Slope</dt><dd>${s.slope}</dd></div><div><dt>Soil moisture</dt><dd>${s.soil}%</dd></div><div><dt>Last updated</dt><dd>${s.updated}</dd></div></dl></div>`;
}

function selectState(s) {
  showLocation(s);
  map.flyTo([s.lat, s.lng], 8.5, { duration: 0.7 });
  if (boundaryLayer) {
    boundaryLayer.eachLayer(layer => {
      if (layer.feature) {
        const isMatch = layer.feature.properties.state_code === s.short || layer.feature.properties.name === s.name;
        layer.setStyle(getBoundaryStyle(layer.feature, isMatch));
      }
    });
  }
}

function setupCustomLayersControl(map, layersConfig) {
  const CustomControl = L.Control.extend({
    options: {
      position: 'topright'
    },
    onAdd: function () {
      const container = L.DomUtil.create('div', 'nera-layers-control leaflet-control');

      // Prevent map drag and scroll when interacting with control
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);

      // Compact "☷ Layers" trigger button
      const toggleBtn = L.DomUtil.create('button', 'nera-layers-btn', container);
      toggleBtn.type = 'button';
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.setAttribute('aria-haspopup', 'true');
      toggleBtn.setAttribute('aria-label', 'Toggle map layers');
      toggleBtn.title = 'Layers';
      toggleBtn.innerHTML = '<span class="nera-layers-icon" aria-hidden="true">☷</span><span class="nera-layers-text">Layers</span>';

      // Floating dropdown popover panel
      const panel = L.DomUtil.create('div', 'nera-layers-panel', container);
      panel.style.display = 'none';

      panel.innerHTML = `
        <div class="nera-layers-group">
          <div class="nera-layers-heading">BASEMAP</div>
          <label class="nera-layer-option">
            <input type="radio" name="nera_basemap" value="osm" checked>
            <span>OpenStreetMap Standard</span>
          </label>
        </div>
        <div class="nera-layers-group">
          <div class="nera-layers-heading">NERA RISK &amp; MONITORING LAYERS</div>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="boundary" ${layersConfig.boundary && map.hasLayer(layersConfig.boundary) ? 'checked' : ''}>
            <span>NER State Boundaries</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="risk" ${layersConfig.risk && map.hasLayer(layersConfig.risk) ? 'checked' : ''}>
            <span>Landslide Risk</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="rain" ${layersConfig.rain && map.hasLayer(layersConfig.rain) ? 'checked' : ''}>
            <span>Rainfall</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="moisture" ${layersConfig.moisture && map.hasLayer(layersConfig.moisture) ? 'checked' : ''}>
            <span>Soil Moisture</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="slope" ${layersConfig.slope && map.hasLayer(layersConfig.slope) ? 'checked' : ''}>
            <span>Slope</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="history" ${layersConfig.history && map.hasLayer(layersConfig.history) ? 'checked' : ''}>
            <span>Historical Landslides</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="reports" ${layersConfig.reports && map.hasLayer(layersConfig.reports) ? 'checked' : ''}>
            <span>Community Reports</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="roads" ${layersConfig.roads && map.hasLayer(layersConfig.roads) ? 'checked' : ''}>
            <span>Roads</span>
          </label>
        </div>
      `;

      // Helper to open / close dropdown
      const setOpen = (open) => {
        if (open) {
          panel.style.display = 'block';
          toggleBtn.classList.add('is-active');
          toggleBtn.setAttribute('aria-expanded', 'true');
        } else {
          panel.style.display = 'none';
          toggleBtn.classList.remove('is-active');
          toggleBtn.setAttribute('aria-expanded', 'false');
        }
      };

      // Toggle on button click / tap
      L.DomEvent.on(toggleBtn, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        const isOpen = panel.style.display === 'block';
        setOpen(!isOpen);
      });

      // Handle layer checkboxes
      const checkboxes = panel.querySelectorAll('input[type="checkbox"][data-layer-key]');
      checkboxes.forEach(cb => {
        L.DomEvent.on(cb, 'change', (e) => {
          L.DomEvent.stopPropagation(e);
          const key = cb.dataset.layerKey;
          const targetLayer = layersConfig[key];
          if (targetLayer) {
            if (cb.checked) {
              if (!map.hasLayer(targetLayer)) map.addLayer(targetLayer);
            } else {
              if (map.hasLayer(targetLayer)) map.removeLayer(targetLayer);
            }
          }
        });
      });

      // Synchronize checkboxes if layers are modified externally
      const syncCheckboxes = () => {
        checkboxes.forEach(cb => {
          const key = cb.dataset.layerKey;
          const targetLayer = layersConfig[key];
          if (targetLayer) {
            cb.checked = map.hasLayer(targetLayer);
          }
        });
      };
      map.on('layeradd layerremove', syncCheckboxes);

      // Close dropdown when clicking outside (on map or document)
      const onDocClick = (e) => {
        if (!container.contains(e.target)) {
          setOpen(false);
        }
      };
      document.addEventListener('click', onDocClick);
      map.on('click', () => setOpen(false));

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
      });

      return container;
    }
  });

  return new CustomControl().addTo(map);
}

function setupMap(data) {
  if (!window.L) throw new Error('Leaflet library was not loaded.');

  // Dedicated North-Eastern Region (NER) Geographic Extent
  // Covers all 8 NER states: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura
  // plus surrounding geographic context (Siliguri corridor, Bhutan, Bangladesh border, Myanmar frontier)
  nerBounds = L.latLngBounds([
    [21.8, 87.5], // South-West limit (Mizoram/Tripura south & Siliguri corridor)
    [29.6, 97.6]  // North-East limit (Upper & Eastern Arunachal Pradesh frontier)
  ]);
  const nerMaxBounds = L.latLngBounds([
    [20.5, 85.5], // Panning SW boundary
    [30.8, 99.5]  // Panning NE boundary
  ]);

  map = L.map('map', {
    zoomControl: false,
    scrollWheelZoom: true,
    zoomSnap: 0.1,
    zoomDelta: 0.5,
    minZoom: 5.8,
    maxZoom: 16,
    maxBounds: nerMaxBounds,
    maxBoundsViscosity: 0.85
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Fit initial viewport strictly to the NER geographic extent with smooth fractional zoom
  map.fitBounds(nerBounds, { padding: [16, 16], maxZoom: 8 });

  // OpenStreetMap Standard Basemap (100% open, zero API key, no watermark)
  const baseMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> | NER Boundaries: Survey of India / <a href="https://github.com/datameet/maps" target="_blank">DataMeet</a> (CC-BY 4.0)'
  }).addTo(map);

  baseMap.on('tileerror', () => {
    console.warn('An OpenStreetMap tile could not be loaded; Leaflet will retry.');
  });

  // Dedicated Leaflet Pane for Authoritative Boundaries (below markers, above basemap)
  if (!map.getPane('nerBoundariesPane')) {
    map.createPane('nerBoundariesPane');
    map.getPane('nerBoundariesPane').style.zIndex = 350;
  }

  // Load authoritative 8-state NER boundary dataset (Survey of India / DataMeet GIS)
  const hasValidBoundaries = Boolean(typeof nerBoundaries !== 'undefined' && nerBoundaries && nerBoundaries.features && nerBoundaries.features.length === 8);
  if (hasValidBoundaries) {
    try {
      boundaryLayer = L.geoJSON(nerBoundaries, {
        pane: 'nerBoundariesPane',
        style: (feature) => getBoundaryStyle(feature, false),
        onEachFeature: (feature, layer) => {
          layer.on({
            mouseover: (e) => {
              const l = e.target;
              const isLight = document.documentElement.getAttribute('data-theme') === 'light';
              l.setStyle({
                weight: 3.2,
                color: isLight ? '#1e40af' : '#7dd3fc',
                fillOpacity: isLight ? 0.2 : 0.25
              });
              if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                l.bringToFront();
              }
            },
            mouseout: (e) => {
              boundaryLayer.resetStyle(e.target);
            },
            click: () => {
              const stateName = feature.properties.name;
              const matchingState = stateData.find(s => s.name.toLowerCase() === stateName.toLowerCase() || s.short === feature.properties.state_code);
              if (matchingState) selectState(matchingState);
            }
          });
          layer.bindTooltip(`
            <div style="font-weight:700;font-size:12px;">${escapeHtml(feature.properties.name)}</div>
            <div style="font-size:9px;color:var(--text-muted);font-family:'DM Mono',monospace;margin-top:2px;">
              Authoritative NER Boundary · Capital: ${escapeHtml(feature.properties.capital)}
            </div>
          `, {
            sticky: true,
            direction: 'auto',
            className: 'boundary-tooltip'
          });
        }
      });
      boundaryLayer.addTo(map);
    } catch (err) {
      console.warn('[NERA Map] Error initializing NER boundary overlay:', err);
    }
  } else {
    console.warn('[NERA Map] Authoritative NER 8-state boundary dataset is missing or unavailable. Map running in baseline mode without boundary layer.');
  }

  // Default state: Landslide Risk = ON, Others = OFF
  markerLayer = L.layerGroup().addTo(map);
  rainfallLayer = L.layerGroup();
  soilMoistureLayer = L.layerGroup();
  slopeLayer = L.layerGroup();
  historyLayer = L.layerGroup();
  reportsLayer = L.layerGroup();
  roadsLayer = L.layerGroup();

  data.forEach(s => {
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 11 + s.score / 14,
      color: '#ffffff',
      weight: 1.5,
      fillColor: riskColor[s.level],
      fillOpacity: 0.9
    })
      .bindTooltip(`${s.name} (${s.score})`, {
        direction: 'top',
        permanent: true,
        className: 'state-map-label',
        offset: [0, -12]
      })
      .bindPopup(popupContent(s), { maxWidth: 260 });
    marker.on('click', () => showLocation(s));
    marker.addTo(markerLayer);

    if (s.event !== 'No new landslide record') {
      L.marker([s.lat + 0.12, s.lng + 0.15], { icon: L.divIcon({ className: 'history-marker', html: '<span style="color:#ef4444;font-size:16px;text-shadow:0 0 4px rgba(0,0,0,0.9);">▲</span>', iconSize: [16, 16] }) }).bindTooltip(`Historical/reference: ${s.event}`).addTo(historyLayer);
    }
  });

  const layers = {
    baseMap,
    boundary: boundaryLayer,
    risk: markerLayer,
    rain: rainfallLayer,
    moisture: soilMoistureLayer,
    slope: slopeLayer,
    history: historyLayer,
    reports: reportsLayer,
    roads: roadsLayer
  };

  setupCustomLayersControl(map, layers);

  document.querySelectorAll('[data-layer]').forEach(input => {
    input.addEventListener('change', () => {
      const layer = layers[input.dataset.layer];
      if (layer) {
        input.checked ? map.addLayer(layer) : map.removeLayer(layer);
      }
    });
  });

  // Pinpoint location on map click if report modal is open
  map.on('click', (e) => {
    if ($('#reportModal').classList.contains('active')) {
      $('#repLat').value = e.latlng.lat.toFixed(4);
      $('#repLng').value = e.latlng.lng.toFixed(4);
      $('#gpsHelp').textContent = `Location picked from map: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
    }
  });

  $('#resetMap').onclick = () => {
    map.fitBounds(nerBounds, { duration: 0.7, padding: [16, 16] });
    if (boundaryLayer) {
      boundaryLayer.eachLayer(layer => {
        if (layer.feature) {
          layer.setStyle(getBoundaryStyle(layer.feature, false));
        }
      });
    }
  };
  requestAnimationFrame(() => map.invalidateSize());
  window.addEventListener('resize', () => map.invalidateSize());
}

function renderTable(data) {
  $('#stateTable').innerHTML = data.map(s => `<tr tabindex="0" data-state="${s.short}"><td><strong>${s.name}</strong></td><td><span class="tag ${levelClass(s.level)}-tag">${s.level}</span></td><td>${s.score}</td><td>${s.rain} mm</td><td>${s.alerts || '—'}</td><td>${s.updated}</td></tr>`).join('');
  document.querySelectorAll('#stateTable tr').forEach(row => {
    const select = () => selectState(data.find(s => s.short === row.dataset.state));
    row.onclick = select;
    row.onkeydown = e => { if (e.key === 'Enter') select(); };
  });
}

function renderBars(data) {
  $('#stateBars').innerHTML = data.slice().sort((a, b) => b.score - a.score).map(s => `<div><label>${s.short}<span>${s.score}</span></label><i><b style="width:${s.score}%;background:${riskColor[s.level]}"></b></i></div>`).join('');
}

function renderAlerts(items) {
  $('#alertCount').textContent = String(items.length).padStart(2, '0');
  if (!items.length) {
    $('#alertList').innerHTML = '<p style="padding:10px 0;color:var(--slate);font-size:11px;">No active alerts at this time.</p>';
    return;
  }
  $('#alertList').innerHTML = items.map(a => `<div class="alert-item"><span class="alert-indicator ${a.level.toLowerCase()}"></span><div><div><strong>${a.location}, ${a.state}</strong><span>${a.time}</span></div><p>${a.reason}</p><small><b>Action:</b> ${a.action}</small></div><em>${a.level}</em></div>`).join('');
}

function openReportViewer(title, eyebrow, contentHtml, dataStatus) {
  const modal = $('#reportViewerModal');
  if (!modal) return;
  $('#reportViewerTitle').textContent = title;
  $('#reportViewerEyebrow').textContent = eyebrow;
  $('#reportViewerContent').innerHTML = contentHtml;
  $('#reportViewerStatusBadge').textContent = dataStatus || 'Demo / Data source not connected';
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
}

function closeReportViewer() {
  const modal = $('#reportViewerModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}

async function loadCommunityReports() {
  const reportsContainer = $('#communityReportsList');
  if (!reportsContainer) return;

  reportsContainer.innerHTML = '<div style="padding:14px 0;color:var(--text-muted);font-size:11px;">Loading submitted incident reports from server...</div>';

  let reports;
  try {
    reports = await monitoringService.getReports();
  } catch (err) {
    reportsContainer.innerHTML = `
      <div style="padding:14px 0;color:#f87171;font-size:11px;">
        Failed to load incident reports.
        <button class="text-button" id="btnRetryReports" style="margin-left:6px;">Retry</button>
      </div>`;
    const btnRetry = $('#btnRetryReports');
    if (btnRetry) btnRetry.onclick = () => loadCommunityReports();
    return;
  }

  reportsLayer.clearLayers();

  if (!reports || !reports.length) {
    if (map.hasLayer(reportsLayer)) {
      map.removeLayer(reportsLayer);
    }
    reportsContainer.innerHTML = '<div style="padding:14px 0;color:var(--text-muted);font-size:11px;">No incident reports submitted yet. Use "+ Report Incident" to submit.</div>';
    return;
  }

  // Default state: Community Reports = ON only if currently available
  if (!map.hasLayer(reportsLayer)) {
    map.addLayer(reportsLayer);
  }

  const currentUser = authService.getUser();
  const isOfficer = currentUser && (currentUser.role === 'officer' || currentUser.role === 'admin');

  reportsContainer.innerHTML = reports.map(r => {
    const isVerified = r.status === 'verified';
    const isRejected = r.status === 'rejected';
    const verifStatusText = isVerified
      ? `Verified${r.verified_by ? ` (${escapeHtml(r.verified_by)})` : ''}`
      : (isRejected ? 'Rejected' : 'Pending Verification');
    const locText = r.location || 'Reported Site';
    const distText = r.district ? `, ${r.district}` : '';
    const stateText = r.state ? ` (${r.state})` : '';
    const dateFormatted = new Date(r.created_at).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="community-report-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
          <div>
            <b>${escapeHtml(r.incident_type)}</b>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">
              📍 <strong>${escapeHtml(locText)}</strong>${escapeHtml(distText)}${escapeHtml(stateText)}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
            <span class="tag-${r.status}">${r.status}</span>
            <span style="font-size:10px;color:var(--text-muted);font-family:'DM Mono',monospace;">${verifStatusText}</span>
          </div>
        </div>
        <p style="margin:6px 0;color:var(--text-secondary);line-height:1.4;">${escapeHtml(r.description)}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;color:var(--text-muted);font-size:10px;font-family:'DM Mono',monospace;">
          <span>By: ${escapeHtml(r.citizen_name || 'Anonymous')} · GPS: ${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}</span>
          <span>${dateFormatted}</span>
        </div>
        ${r.media_url ? `<div style="margin-top:5px;"><a href="${escapeHtml(r.media_url)}" target="_blank" style="color:var(--accent-blue);font-size:11px;font-weight:700;">📷 View Attached Photo</a></div>` : ''}
        ${r.officer_notes ? `<div style="margin-top:5px;font-size:11px;color:#facc15;background:rgba(234,179,8,0.08);padding:4px 8px;border-left:2px solid #facc15;border-radius:2px;"><strong>Officer Note:</strong> ${escapeHtml(r.officer_notes)}</div>` : ''}
        ${isOfficer && r.status === 'pending' ? `
          <div style="margin-top:6px;display:flex;gap:6px;">
            <button class="btn-secondary btn-verify-report" data-id="${r.id}" style="padding:2px 8px;font-size:10px;">Verify</button>
            <button class="btn-secondary btn-reject-report" data-id="${r.id}" style="padding:2px 8px;font-size:10px;color:#f87171;">Reject</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Add markers to reportsLayer
  reports.forEach(r => {
    const isVerified = r.status === 'verified';
    const markerColor = isVerified ? '#216646' : '#d66c26';
    const locName = r.location ? `${r.location}${r.state ? `, ${r.state}` : ''}` : `GPS ${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}`;
    const marker = L.circleMarker([r.lat, r.lng], {
      radius: 8,
      color: '#fff',
      weight: 2,
      fillColor: markerColor,
      fillOpacity: 0.9
    }).bindTooltip(`Report: ${r.incident_type} (${r.status})`, { direction: 'top' })
      .bindPopup(`
        <div class="map-popup">
          <strong>${escapeHtml(r.incident_type)} (Report)</strong>
          <small>Status: ${r.status.toUpperCase()} · ${escapeHtml(locName)}</small>
          <p style="font-size:11px;margin:5px 0;">${escapeHtml(r.description)}</p>
          <div style="font-size:10px;color:var(--text-muted);">Reported by: ${escapeHtml(r.citizen_name)}</div>
        </div>
      `);
    marker.addTo(reportsLayer);
  });

  // Attach officer action handlers
  document.querySelectorAll('.btn-verify-report').forEach(btn => {
    btn.onclick = async () => {
      const notes = prompt('Enter officer verification notes:');
      if (notes !== null) {
        try {
          await monitoringService.verifyReport(btn.dataset.id, 'verified', notes);
          alert('Report verified successfully.');
          await loadCommunityReports();
        } catch (err) {
          alert('Verification failed: ' + err.message);
        }
      }
    };
  });

  document.querySelectorAll('.btn-reject-report').forEach(btn => {
    btn.onclick = async () => {
      const notes = prompt('Enter reason for rejection:');
      if (notes !== null) {
        try {
          await monitoringService.verifyReport(btn.dataset.id, 'rejected', notes);
          alert('Report marked as rejected.');
          await loadCommunityReports();
        } catch (err) {
          alert('Action failed: ' + err.message);
        }
      }
    };
  });
}

async function loadDataSources() {
  const sources = await monitoringService.getDataSources();
  const badge = $('#dataModeBadge');
  if (sources && sources.length) {
    const isLive = sources.some(s => s.status === 'LIVE' || s.status === 'CONNECTED');
    if (badge) {
      badge.textContent = isLive ? 'LIVE / AVAILABLE / PROCESSING' : 'DEMO / SIMULATED DATA';
      badge.className = isLive ? 'data-badge live' : 'data-badge';
    }
  }

  if (!sources || !sources.length) return;

  const nisarL = sources.find(s => s.key === 'nisar_l');
  if (nisarL) {
    const chip = $('#satelliteStatusChip');
    const disc = $('#satelliteDisclaimer');
    if (chip) {
      chip.textContent = nisarL.status_label;
      chip.className = `status-chip ${nisarL.status.toLowerCase()}`;
    }
    if (disc) {
      disc.textContent = nisarL.status_label;
    }
  }
}

async function loadHistorical() {
  const table = $('#historicalTable');
  if (!table) return;
  const records = await monitoringService.getHistorical();
  if (records && records.length) {
    table.innerHTML = records.map(r => `
      <tr>
        <td><strong>${r.location}</strong></td>
        <td>${r.date}</td>
        <td><span class="tag ${levelClass(r.severity)}-tag">${r.severity}</span></td>
        <td>${r.trigger}</td>
      </tr>
    `).join('');
  }
}

async function loadRoads() {
  const roads = await monitoringService.getRoads();
  roadsLayer.clearLayers();
  if (!roads || !roads.length) return;

  roads.forEach(r => {
    const statusColor = r.status === 'BLOCKED' ? '#ef4444' : r.status === 'RESTRICTED' ? '#f97316' : '#3b82f6';
    const marker = L.circleMarker([r.lat, r.lng], {
      radius: 8,
      color: '#ffffff',
      weight: 1.5,
      fillColor: statusColor,
      fillOpacity: 0.9
    }).bindTooltip(`${r.highway_code}: ${r.name} (${r.status})`, { direction: 'top' })
      .bindPopup(`
        <div class="map-popup">
          <strong>${r.highway_code} · ${r.name}</strong>
          <small>HIGHWAY CORRIDOR · ${r.status}</small>
          <dl>
            <div><dt>State</dt><dd>${r.state_code}</dd></div>
            <div><dt>Vulnerable Stretch</dt><dd>${r.vulnerable_stretch_km} km</dd></div>
            <div><dt>Elevation</dt><dd>${r.elevation_m} m</dd></div>
            <div><dt>Status</dt><dd><span style="color:${statusColor};font-weight:700;">${r.status}</span></dd></div>
          </dl>
        </div>
      `, { maxWidth: 260 });
    marker.addTo(roadsLayer);
  });
}

let firebaseInitialized = false;

async function initFirebaseAuth() {
  if (firebaseInitialized && typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
    return true;
  }
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded.');
    return false;
  }
  const config = await authService.getFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    console.warn('Firebase configuration is incomplete or unavailable in environment.');
    return false;
  }
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain || (config.projectId ? `${config.projectId}.firebaseapp.com` : ''),
        projectId: config.projectId,
        storageBucket: config.storageBucket || (config.projectId ? `${config.projectId}.appspot.com` : ''),
        messagingSenderId: config.messagingSenderId || '',
        appId: config.appId || '',
        measurementId: config.measurementId || ''
      });
    }
    firebaseInitialized = true;
    return true;
  } catch (err) {
    console.error('Firebase initialization error:', err);
    return false;
  }
}

async function handleGoogleSignIn() {
  const errorEl = $('#authError');
  if (errorEl) {
    errorEl.className = 'auth-error-msg';
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

  try {
    const ready = await initFirebaseAuth();
    if (!ready) {
      console.warn('Google sign-in unavailable: Firebase configuration not set in environment.');
      const unavailableMsg = 'Google sign-in is currently unavailable. Please try again later.';
      const authModal = $('#authModal');
      const isAuthModalOpen = authModal && authModal.classList.contains('active');
      if (isAuthModalOpen && errorEl) {
        errorEl.className = 'auth-notice-msg';
        errorEl.textContent = unavailableMsg;
        errorEl.style.display = 'block';
      } else {
        alert(unavailableMsg);
      }
      return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await firebase.auth().signInWithPopup(provider);
    const googleUser = result?.user;
    if (!googleUser) {
      throw new Error('Google authentication did not return a user.');
    }

    const idToken = await googleUser.getIdToken();
    const uid = googleUser.uid;
    const email = googleUser.email;
    const displayName = googleUser.displayName || '';
    const photoURL = googleUser.photoURL || '';

    const authData = {
      id_token: idToken,
      uid: uid,
      firebase_uid: uid,
      email: email,
      display_name: displayName,
      full_name: displayName,
      photo_url: photoURL
    };

    await authService.googleLogin(authData);
    updateAuthUI();

    const authModal = $('#authModal');
    if (authModal) {
      authModal.classList.remove('active');
      authModal.setAttribute('aria-hidden', 'true');
    }

    const reportAuthPrompt = $('#reportAuthPrompt');
    if (reportAuthPrompt) reportAuthPrompt.style.display = 'none';
    const repName = $('#repName');
    if (repName && !repName.value) {
      repName.value = authService.getUser()?.full_name || '';
    }

    await loadCommunityReports();
  } catch (err) {
    console.error('Google Sign-In Error:', err);
    if (err && err.code === 'auth/popup-closed-by-user') {
      return;
    }
    const cleanMsg = (err?.code === 'auth/network-request-failed')
      ? 'Network error during Google sign-in. Please check your connection.'
      : (err?.code === 'auth/cancelled-popup-request')
      ? 'Sign-in cancelled.'
      : 'Google sign-in failed. Please try again later.';

    const authModal = $('#authModal');
    const isAuthModalOpen = authModal && authModal.classList.contains('active');
    if (isAuthModalOpen && errorEl) {
      errorEl.className = 'auth-error-msg';
      errorEl.textContent = cleanMsg;
      errorEl.style.display = 'block';
    } else {
      alert(cleanMsg);
    }
  }
}

function updateAuthUI() {
  const user = authService.getUser();
  const btnOpenAuth = $('#btnOpenAuth');
  const userProfileWrap = $('#userProfileMenuWrap');
  const dropdownMenu = $('#userDropdownMenu');
  const authStatusText = $('#authStatusText');

  if (user && user.role) {
    if (btnOpenAuth) btnOpenAuth.style.display = 'none';
    if (userProfileWrap) userProfileWrap.style.display = 'inline-block';

    const firstName = user.full_name ? user.full_name.trim().split(' ')[0] : 'User';
    const userDisplayName = $('#userDisplayName');
    if (userDisplayName) userDisplayName.textContent = firstName;

    const userAvatarImg = $('#userAvatarImg');
    const userAvatarPlaceholder = $('#userAvatarPlaceholder');
    const initial = user.full_name ? user.full_name.trim().charAt(0).toUpperCase() : '👤';

    if (user.photo_url && userAvatarImg) {
      userAvatarImg.src = user.photo_url;
      userAvatarImg.style.display = 'block';
      if (userAvatarPlaceholder) userAvatarPlaceholder.style.display = 'none';
    } else {
      if (userAvatarImg) userAvatarImg.style.display = 'none';
      if (userAvatarPlaceholder) {
        userAvatarPlaceholder.style.display = 'inline-flex';
        userAvatarPlaceholder.textContent = initial;
      }
    }

    // Dropdown details
    if ($('#dropdownUserName')) $('#dropdownUserName').textContent = user.full_name || 'User';
    if ($('#dropdownUserEmail')) $('#dropdownUserEmail').textContent = user.email || '';
    if ($('#dropdownUserRole')) {
      const roleLabel = (user.role === 'citizen' ? 'Public' : user.role).toUpperCase();
      $('#dropdownUserRole').textContent = roleLabel;
    }

    // Profile card in profile modal
    if ($('#profileCardName')) $('#profileCardName').textContent = user.full_name || 'User';
    if ($('#profileCardEmail')) $('#profileCardEmail').textContent = user.email || '';
    if ($('#profileCardRole')) {
      const roleLabel = (user.role === 'citizen' ? 'Public' : user.role).toUpperCase();
      $('#profileCardRole').textContent = roleLabel;
    }
    if ($('#profileEditName') && document.activeElement !== $('#profileEditName')) {
      $('#profileEditName').value = user.full_name || '';
    }

    const cardAvatar = $('#profileCardAvatar');
    const cardPlaceholder = $('#profileCardPlaceholder');
    if (user.photo_url && cardAvatar) {
      cardAvatar.src = user.photo_url;
      cardAvatar.style.display = 'block';
      if (cardPlaceholder) cardPlaceholder.style.display = 'none';
    } else {
      if (cardAvatar) cardAvatar.style.display = 'none';
      if (cardPlaceholder) {
        cardPlaceholder.style.display = 'flex';
        cardPlaceholder.textContent = initial;
      }
    }

    // Hide report modal prompt if open and prefill user name
    const reportAuthPrompt = $('#reportAuthPrompt');
    if (reportAuthPrompt) reportAuthPrompt.style.display = 'none';
    const repName = $('#repName');
    if (repName && !repName.value && user.full_name) {
      repName.value = user.full_name;
    }
  } else {
    if (btnOpenAuth) btnOpenAuth.style.display = 'inline-flex';
    if (authStatusText) authStatusText.textContent = 'Login';
    if (userProfileWrap) userProfileWrap.style.display = 'none';
    if (dropdownMenu) dropdownMenu.style.display = 'none';
  }
}

function initEventHandlers() {
  // Report Modal Open / Close
  const reportModal = $('#reportModal');
  const authModal = $('#authModal');

  const openReportModal = () => {
    reportModal.classList.add('active');
    reportModal.setAttribute('aria-hidden', 'false');
    const user = authService.getUser();
    const authPrompt = $('#reportAuthPrompt');
    if (!user) {
      if (authPrompt) authPrompt.style.display = 'block';
    } else {
      if (authPrompt) authPrompt.style.display = 'none';
      const repName = $('#repName');
      if (repName && !repName.value && user.full_name) {
        repName.value = user.full_name;
      }
    }
    if (!navigator.onLine) {
      $('#offlineNotice').classList.add('active');
    } else {
      $('#offlineNotice').classList.remove('active');
    }
  };

  if ($('#btnOpenReport')) $('#btnOpenReport').onclick = openReportModal;
  if ($('#heroBtnReport')) $('#heroBtnReport').onclick = openReportModal;
  if ($('#mobileBtnReport')) $('#mobileBtnReport').onclick = openReportModal;

  $('#btnCloseReportModal').onclick = () => {
    reportModal.classList.remove('active');
    reportModal.setAttribute('aria-hidden', 'true');
  };

  $('#btnCancelReport').onclick = () => {
    reportModal.classList.remove('active');
    reportModal.setAttribute('aria-hidden', 'true');
  };

  // Auth Modal Open / Close
  $('#btnOpenAuth').onclick = () => {
    updateAuthUI();
    authModal.classList.add('active');
    authModal.setAttribute('aria-hidden', 'false');
  };

  $('#btnCloseAuthModal').onclick = () => {
    authModal.classList.remove('active');
    authModal.setAttribute('aria-hidden', 'true');
  };

  $('#btnCancelAuth').onclick = () => {
    authModal.classList.remove('active');
    authModal.setAttribute('aria-hidden', 'true');
  };

  // Auto GPS
  $('#btnAutoGps').onclick = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    $('#gpsHelp').textContent = 'Acquiring GPS fix...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        $('#repLat').value = pos.coords.latitude.toFixed(4);
        $('#repLng').value = pos.coords.longitude.toFixed(4);
        $('#gpsHelp').textContent = `GPS Fix acquired (accuracy: ${Math.round(pos.coords.accuracy)}m)`;
      },
      (err) => {
        $('#gpsHelp').textContent = 'Unable to acquire GPS fix. Please click on the map.';
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Photo preview
  $('#repPhoto').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      photoBase64 = null;
      $('#photoPreviewContainer').style.display = 'none';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      photoBase64 = reader.result;
      $('#photoPreview').src = photoBase64;
      $('#photoPreviewContainer').style.display = 'block';
    };
    reader.readAsDataURL(file);
  };

  // Citizen Report Submission
  $('#reportForm').onsubmit = async (e) => {
    e.preventDefault();

    const currentUser = authService.getUser();
    if (!currentUser) {
      const authPrompt = $('#reportAuthPrompt');
      if (authPrompt) {
        authPrompt.style.display = 'block';
        authPrompt.scrollIntoView({ behavior: 'smooth' });
      }
      alert('Please sign in with Google to submit an incident report.');
      return;
    }

    const lat = parseFloat($('#repLat').value);
    const lng = parseFloat($('#repLng').value);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Please provide valid numerical latitude and longitude coordinates.');
      return;
    }

    // Geolocation NER Boundary Validation (21.0° - 30.5° N, 88.0° - 98.0° E)
    if (lat < 21.0 || lat > 30.5 || lng < 88.0 || lng > 98.0) {
      alert('Coordinates must be located within the North Eastern Region of India (Latitude: 21.0° - 30.5° N, Longitude: 88.0° - 98.0° E).');
      return;
    }

    const btnSubmit = $('#btnSubmitReport');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Submitting...';

    const payload = {
      citizen_name: $('#repName').value.trim(),
      contact: $('#repPhone').value.trim() || null,
      incident_type: $('#repType').value,
      description: $('#repDesc').value.trim(),
      lat: lat,
      lng: lng,
      media_url: null,
      offline_client_id: 'off-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6)
    };

    try {
      // If photo was attached, upload media first if online
      if (photoBase64 && navigator.onLine) {
        try {
          const up = await monitoringService.uploadMedia('incident.jpg', photoBase64);
          payload.media_url = up.media_url;
        } catch (err) {
          console.warn('Photo upload failed, proceeding with report payload:', err);
        }
      }

      const res = await monitoringService.submitReport(payload);
      alert(res.queued_offline ? 'Network offline: Report queued in IndexedDB. Will sync when reconnected.' : 'Report submitted successfully!');
      $('#reportForm').reset();
      photoBase64 = null;
      $('#photoPreviewContainer').style.display = 'none';
      reportModal.classList.remove('active');
      await loadCommunityReports();
    } catch (err) {
      alert('Error submitting report: ' + err.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Submit Report';
    }
  };

  // Google Sign-In button handlers
  const btnGoogleSignIn = $('#btnGoogleSignIn');
  if (btnGoogleSignIn) btnGoogleSignIn.onclick = () => handleGoogleSignIn();

  const btnReportSignInGoogle = $('#btnReportSignInGoogle');
  if (btnReportSignInGoogle) btnReportSignInGoogle.onclick = () => handleGoogleSignIn();

  // User Dropdown Menu Events
  const userMenuBtn = $('#btnUserMenu');
  const userDropdown = $('#userDropdownMenu');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.onclick = (e) => {
      e.stopPropagation();
      const isExpanded = userDropdown.style.display === 'block';
      userDropdown.style.display = isExpanded ? 'none' : 'block';
      userMenuBtn.setAttribute('aria-expanded', !isExpanded);
    };
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const wrap = $('#userProfileMenuWrap');
    const dropdown = $('#userDropdownMenu');
    if (dropdown && dropdown.style.display === 'block') {
      if (wrap && !wrap.contains(e.target)) {
        dropdown.style.display = 'none';
        $('#btnUserMenu')?.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Profile Modal Open & Close
  const userProfileModal = $('#userProfileModal');
  const menuItemProfile = $('#menuItemProfile');
  if (menuItemProfile && userProfileModal) {
    menuItemProfile.onclick = () => {
      if (userDropdown) userDropdown.style.display = 'none';
      const u = authService.getUser();
      if (u && $('#profileEditName')) {
        $('#profileEditName').value = u.full_name || '';
      }
      const msg = $('#profileMsg');
      if (msg) msg.style.display = 'none';
      userProfileModal.classList.add('active');
      userProfileModal.setAttribute('aria-hidden', 'false');
    };
  }

  const btnCloseProfileModal = $('#btnCloseProfileModal');
  if (btnCloseProfileModal && userProfileModal) {
    btnCloseProfileModal.onclick = () => {
      userProfileModal.classList.remove('active');
      userProfileModal.setAttribute('aria-hidden', 'true');
    };
  }

  // Save Profile Changes
  const btnSaveProfile = $('#btnSaveProfile');
  if (btnSaveProfile) {
    btnSaveProfile.onclick = async () => {
      const newName = $('#profileEditName')?.value.trim();
      if (!newName) {
        alert('Please enter a display name.');
        return;
      }
      btnSaveProfile.disabled = true;
      btnSaveProfile.textContent = 'Saving...';
      try {
        await authService.updateProfile(newName);
        updateAuthUI();
        const msg = $('#profileMsg');
        if (msg) {
          msg.textContent = 'Profile updated successfully!';
          msg.style.color = '#34d399';
          msg.style.display = 'block';
          setTimeout(() => { if (msg) msg.style.display = 'none'; }, 2000);
        }
      } catch (err) {
        const msg = $('#profileMsg');
        if (msg) {
          msg.textContent = err.message || 'Failed to update profile';
          msg.style.color = '#f87171';
          msg.style.display = 'block';
        }
      } finally {
        btnSaveProfile.disabled = false;
        btnSaveProfile.textContent = 'Save';
      }
    };
  }

  // My Reports Menu Item
  const menuItemMyReports = $('#menuItemMyReports');
  if (menuItemMyReports) {
    menuItemMyReports.onclick = () => {
      if (userDropdown) userDropdown.style.display = 'none';
      const reportsSection = $('#reports');
      if (reportsSection) {
        reportsSection.scrollIntoView({ behavior: 'smooth' });
      }
    };
  }

  // Logout Handlers
  const handleLogout = () => {
    authService.logout();
    updateAuthUI();
    if (userDropdown) userDropdown.style.display = 'none';
    if (userProfileModal) {
      userProfileModal.classList.remove('active');
      userProfileModal.setAttribute('aria-hidden', 'true');
    }
    if (authModal) {
      authModal.classList.remove('active');
      authModal.setAttribute('aria-hidden', 'true');
    }
    loadCommunityReports();
  };

  if ($('#menuItemLogout')) $('#menuItemLogout').onclick = handleLogout;
  if ($('#btnProfileLogout')) $('#btnProfileLogout').onclick = handleLogout;
  if ($('#btnLogout')) $('#btnLogout').onclick = handleLogout;

  // Auth Login Form
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const email = $('#authEmail').value.trim();
    const password = $('#authPassword').value;
    const errorEl = $('#authError');
    errorEl.style.display = 'none';

    try {
      await authService.login(email, password);
      updateAuthUI();
      authModal.classList.remove('active');
      await loadCommunityReports();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  };

  // Pre-fill test buttons (if present in DOM)
  const btnFillOfficer = $('#btnFillOfficer');
  if (btnFillOfficer) {
    btnFillOfficer.onclick = () => {
      $('#authEmail').value = 'officer@nera.gov.in';
      $('#authPassword').value = 'Officer@NERA2026';
    };
  }

  const btnFillAdmin = $('#btnFillAdmin');
  if (btnFillAdmin) {
    btnFillAdmin.onclick = () => {
      $('#authEmail').value = 'admin@nera.gov.in';
      $('#authPassword').value = 'Admin@NERA2026';
    };
  }

  // Refresh reports & history
  $('#btnRefreshReports').onclick = () => loadCommunityReports();
  const btnHistory = $('#btnRefreshHistory');
  if (btnHistory) {
    btnHistory.onclick = () => loadHistorical();
  }

  // Standard Report Viewer Modal handlers
  const btnCloseRVM = $('#btnCloseReportViewerModal');
  if (btnCloseRVM) btnCloseRVM.onclick = closeReportViewer;
  const btnCloseRVBtn = $('#btnCloseReportViewerBtn');
  if (btnCloseRVBtn) btnCloseRVBtn.onclick = closeReportViewer;
  const btnPrintRV = $('#btnPrintReportViewer');
  if (btnPrintRV) btnPrintRV.onclick = () => window.print();

  const reportViewerModal = $('#reportViewerModal');
  if (reportViewerModal) {
    reportViewerModal.onclick = (e) => {
      if (e.target === reportViewerModal) closeReportViewer();
    };
  }

  // Keyboard shortcut: Escape to close open modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (userDropdown && userDropdown.style.display === 'block') userDropdown.style.display = 'none';
      if (userProfileModal?.classList.contains('active')) {
        userProfileModal.classList.remove('active');
        userProfileModal.setAttribute('aria-hidden', 'true');
      }
      if (reportViewerModal?.classList.contains('active')) closeReportViewer();
      if (reportModal?.classList.contains('active')) {
        reportModal.classList.remove('active');
        reportModal.setAttribute('aria-hidden', 'true');
      }
      if (authModal?.classList.contains('active')) {
        authModal.classList.remove('active');
        authModal.setAttribute('aria-hidden', 'true');
      }
    }
  });

  // Daily Risk Report
  const btnDaily = $('#btnDailyRiskReport');
  if (btnDaily) {
    btnDaily.onclick = async () => {
      openReportViewer(
        'Daily Regional Landslide Risk Assessment',
        'NERA Intelligence Register · Daily Regional Summary',
        '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px;">Generating latest daily regional risk summary...</div>',
        'Fetching...'
      );
      const data = await monitoringService.getDailyRiskReport();
      if (!data) {
        openReportViewer(
          'Daily Regional Landslide Risk Assessment',
          'NERA Intelligence Register · Daily Regional Summary',
          '<div style="padding:20px;color:#f87171;font-size:12px;">Failed to fetch daily risk report. Please ensure backend service is active.</div>',
          'Demo / Data source not connected'
        );
        return;
      }

      const priorityRows = (data.priority_zones || []).map(pz => `
        <tr style="border-bottom:1px solid var(--border-subtle);">
          <td style="padding:8px 10px;font-weight:700;">${escapeHtml(pz.state)} (${escapeHtml(pz.short)})</td>
          <td style="padding:8px 10px;"><span class="tag ${pz.level.toLowerCase()}-tag">${pz.level}</span></td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;">${pz.score}/100</td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;">${pz.rain} mm</td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;">${pz.soil}%</td>
        </tr>
      `).join('');

      const advisoryCards = (data.active_advisories || []).map(adv => `
        <div style="padding:10px 12px;background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;border-radius:2px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;color:var(--text-primary);font-size:12px;">
            <span>📍 ${escapeHtml(adv.location)}, ${escapeHtml(adv.state)}</span>
            <span class="tag ${adv.level.toLowerCase()}-tag">${adv.level}</span>
          </div>
          <p style="margin:5px 0 3px;color:var(--text-secondary);font-size:11px;">${escapeHtml(adv.reason)}</p>
          <small style="color:var(--text-muted);font-size:10px;"><strong>Action Required:</strong> ${escapeHtml(adv.action)}</small>
        </div>
      `).join('');

      const html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-subtle);flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-family:\x27DM Mono\x27,monospace;">DATE: ${escapeHtml(data.date)}</div>
            <div style="font-size:14px;font-weight:700;margin-top:2px;">NER Regional Status: <span class="tag ${data.regional_level.toLowerCase()}-tag">${data.regional_level} (Score: ${data.regional_score}/100)</span></div>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);font-family:\x27DM Mono\x27,monospace;">
            <div>States Monitored: ${data.total_states_monitored || 8} / 8</div>
            <div>Priority High/Critical: ${data.states_at_risk_count || 0}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;margin-bottom:16px;">
          <div style="background:var(--bg-card);padding:10px;border:1px solid var(--border-subtle);border-radius:4px;">
            <div style="font-size:10px;color:var(--text-muted);font-family:\x27DM Mono\x27,monospace;">24H REGIONAL RAIN</div>
            <div style="font-size:16px;font-weight:700;color:var(--accent-blue);margin-top:3px;">${data.regional_averages?.rainfall_24h_mm ?? 0} mm</div>
          </div>
          <div style="background:var(--bg-card);padding:10px;border:1px solid var(--border-subtle);border-radius:4px;">
            <div style="font-size:10px;color:var(--text-muted);font-family:\x27DM Mono\x27,monospace;">AVG SOIL SATURATION</div>
            <div style="font-size:16px;font-weight:700;color:#facc15;margin-top:3px;">${data.regional_averages?.soil_moisture_pct ?? 0}%</div>
          </div>
          <div style="background:var(--bg-card);padding:10px;border:1px solid var(--border-subtle);border-radius:4px;">
            <div style="font-size:10px;color:var(--text-muted);font-family:\x27DM Mono\x27,monospace;">ACTIVE ADVISORIES</div>
            <div style="font-size:16px;font-weight:700;color:#f87171;margin-top:3px;">${data.active_alerts_count ?? 0} active</div>
          </div>
        </div>

        <h4 style="font-size:11px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary);">Priority High-Risk Clusters</h4>
        <div style="border:1px solid var(--border-subtle);border-radius:4px;overflow-x:auto;margin-bottom:14px;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border-subtle);text-align:left;">
                <th style="padding:6px 10px;">State</th>
                <th style="padding:6px 10px;">Risk Level</th>
                <th style="padding:6px 10px;">Score</th>
                <th style="padding:6px 10px;">Rainfall</th>
                <th style="padding:6px 10px;">Soil Saturation</th>
              </tr>
            </thead>
            <tbody>
              ${priorityRows || '<tr><td colspan="5" style="padding:10px;text-align:center;color:var(--text-muted);">No high-risk zones currently recorded.</td></tr>'}
            </tbody>
          </table>
        </div>

        <h4 style="font-size:11px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary);">Active Situation Advisories</h4>
        <div style="margin-bottom:14px;">
          ${advisoryCards || '<p style="color:var(--text-muted);font-size:11px;">No critical alerts active at this hour.</p>'}
        </div>

        <div style="padding:10px 12px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.2);border-radius:4px;">
          <strong style="font-size:11px;color:var(--accent-blue);">OFFICIAL OPERATIONAL DIRECTIVE:</strong>
          <p style="margin:4px 0 0;font-size:11px;color:var(--text-secondary);line-height:1.4;">${escapeHtml(data.directive || 'Continue routine geospatial landslide monitoring.')}</p>
        </div>
      `;

      openReportViewer('Daily Regional Landslide Risk Assessment', 'NERA Intelligence Register · Daily Regional Summary', html, data.data_status);
    };
  }

  // Weekly Risk Summary
  const btnWeekly = $('#btnWeeklyRiskSummary');
  if (btnWeekly) {
    btnWeekly.onclick = async () => {
      openReportViewer(
        'Weekly Landslide Risk & Trend Summary',
        'NERA Intelligence Register · Weekly Trend Review',
        '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px;">Compiling 7-day risk trend and advisory data...</div>',
        'Fetching...'
      );
      const data = await monitoringService.getWeeklyRiskSummary();
      if (!data) {
        openReportViewer(
          'Weekly Landslide Risk & Trend Summary',
          'NERA Intelligence Register · Weekly Trend Review',
          '<div style="padding:20px;color:#f87171;font-size:12px;">Failed to fetch weekly risk summary. Please ensure backend service is active.</div>',
          'Demo / Data source not connected'
        );
        return;
      }

      const trendRows = (data.seven_day_trend || []).map(t => `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:11px;">
          <span style="width:42px;font-weight:700;font-family:\x27DM Mono\x27,monospace;">${t.day}</span>
          <div style="flex:1;background:rgba(255,255,255,0.06);height:14px;border-radius:3px;overflow:hidden;position:relative;">
            <div style="background:${t.risk === 'High' ? '#ef4444' : (t.risk === 'Moderate' ? '#f59e0b' : '#10b981')};width:${t.pct}%;height:100%;border-radius:3px;"></div>
          </div>
          <span style="width:55px;text-align:right;font-family:\x27DM Mono\x27,monospace;color:var(--text-secondary);">${t.mm} mm</span>
          <span style="width:70px;text-align:right;"><span class="tag ${t.risk.toLowerCase()}-tag">${t.risk}</span></span>
        </div>
      `).join('');

      const corridorRows = (data.arterial_corridors_monitored || []).map(c => `
        <tr style="border-bottom:1px solid var(--border-subtle);">
          <td style="padding:6px 10px;font-weight:700;font-family:\x27DM Mono\x27,monospace;">${escapeHtml(c.highway_code)}</td>
          <td style="padding:6px 10px;">${escapeHtml(c.name)}</td>
          <td style="padding:6px 10px;">${escapeHtml(c.state_code)}</td>
          <td style="padding:6px 10px;font-family:\x27DM Mono\x27,monospace;">${c.vulnerable_stretch_km} km</td>
          <td style="padding:6px 10px;"><span class="tag ${c.status === 'Passable' ? 'low-tag' : 'high-tag'}">${c.status}</span></td>
        </tr>
      `).join('');

      const html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-subtle);flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-family:\x27DM Mono\x27,monospace;">PERIOD: ${escapeHtml(data.period)}</div>
            <div style="font-size:14px;font-weight:700;margin-top:2px;">7-Day Cumulative Rainfall: <span style="color:var(--accent-blue);font-family:\x27DM Mono\x27,monospace;">${data.cumulative_rainfall_mm} mm</span></div>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);font-family:\x27DM Mono\x27,monospace;">
            <div>Compiled: ${escapeHtml(data.date)}</div>
          </div>
        </div>

        <h4 style="font-size:11px;margin:12px 0 8px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary);">7-Day Rainfall Accumulation &amp; Risk Trend</h4>
        <div style="background:var(--bg-card);padding:10px 14px;border:1px solid var(--border-subtle);border-radius:4px;margin-bottom:16px;">
          ${trendRows}
        </div>

        <h4 style="font-size:11px;margin:14px 0 6px;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-secondary);">Arterial Highway Corridors Monitored</h4>
        <div style="border:1px solid var(--border-subtle);border-radius:4px;overflow-x:auto;margin-bottom:16px;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border-subtle);text-align:left;">
                <th style="padding:6px 10px;">Route</th>
                <th style="padding:6px 10px;">Corridor Name</th>
                <th style="padding:6px 10px;">State</th>
                <th style="padding:6px 10px;">Vulnerable Stretch</th>
                <th style="padding:6px 10px;">Traffic Status</th>
              </tr>
            </thead>
            <tbody>
              ${corridorRows}
            </tbody>
          </table>
        </div>

        <div style="padding:10px 12px;background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);border-radius:4px;">
          <strong style="font-size:11px;color:#f59e0b;">GEOLOGICAL &amp; METEOROLOGICAL ADVISORY OUTLOOK:</strong>
          <p style="margin:4px 0 0;font-size:11px;color:var(--text-secondary);line-height:1.4;">${escapeHtml(data.advisory_outlook)}</p>
        </div>
      `;

      openReportViewer('Weekly Landslide Risk & Trend Summary', 'NERA Intelligence Register · Weekly Trend Review', html, data.data_status);
    };
  }

  // State-wise Risk Report (All 8 NER States)
  const btnStateWise = $('#btnStateWiseRiskReport');
  if (btnStateWise) {
    btnStateWise.onclick = async () => {
      openReportViewer(
        '8-State Comprehensive Situation Register',
        'NERA Intelligence Register · State-wise Risk Report',
        '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px;">Loading 8-state landslide risk register...</div>',
        'Fetching...'
      );
      const data = await monitoringService.getStateWiseRiskReport();
      if (!data) {
        openReportViewer(
          '8-State Comprehensive Situation Register',
          'NERA Intelligence Register · State-wise Risk Report',
          '<div style="padding:20px;color:#f87171;font-size:12px;">Failed to fetch state-wise risk report. Please ensure backend service is active.</div>',
          'Demo / Data source not connected'
        );
        return;
      }

      const stateRows = (data.states || []).map(s => `
        <tr style="border-bottom:1px solid var(--border-subtle);">
          <td style="padding:8px 10px;font-weight:700;">
            <div>${escapeHtml(s.name)}</div>
            <small style="color:var(--text-muted);font-family:\x27DM Mono\x27,monospace;">${escapeHtml(s.short)}</small>
          </td>
          <td style="padding:8px 10px;"><span class="tag ${levelClass(s.level)}-tag">${s.level}</span></td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;font-weight:700;">${s.score}/100</td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;">${s.rain} mm</td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;">${s.soil}%</td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;">${escapeHtml(s.slope)}</td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;">${escapeHtml(s.elevation)}</td>
          <td style="padding:8px 10px;font-family:\x27DM Mono\x27,monospace;">${s.alerts || '0'}</td>
        </tr>
      `).join('');

      const html = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border-subtle);flex-wrap:wrap;gap:8px;">
          <div>
            <div style="font-size:10px;color:var(--text-muted);font-family:\x27DM Mono\x27,monospace;">REGION: North-Eastern Region (NER)</div>
            <div style="font-size:14px;font-weight:700;margin-top:2px;">Comprehensive Multi-State Geospatial Risk Assessment</div>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);font-family:\x27DM Mono\x27,monospace;">
            <div>Registered States: ${data.total_states || 8} / 8</div>
            <div>Generated: ${escapeHtml(data.date)}</div>
          </div>
        </div>

        <div style="border:1px solid var(--border-subtle);border-radius:4px;overflow-x:auto;margin-bottom:14px;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <thead>
              <tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border-subtle);text-align:left;">
                <th style="padding:8px 10px;">State</th>
                <th style="padding:8px 10px;">Risk Level</th>
                <th style="padding:8px 10px;">Score</th>
                <th style="padding:8px 10px;">24h Rain</th>
                <th style="padding:8px 10px;">Soil Sat.</th>
                <th style="padding:8px 10px;">Slope</th>
                <th style="padding:8px 10px;">Elevation</th>
                <th style="padding:8px 10px;">Alerts</th>
              </tr>
            </thead>
            <tbody>
              ${stateRows}
            </tbody>
          </table>
        </div>

        <p class="footnote" style="margin:0;font-size:10px;color:var(--text-muted);">
          All 8 North-Eastern states: Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, and Tripura. Calibrated against 6-factor geotechnical layers.
        </p>
      `;

      openReportViewer('8-State Comprehensive Situation Register', 'NERA Intelligence Register · State-wise Risk Report', html, data.data_status);
    };
  }

  // Listen to offline sync events
  window.addEventListener('nera:reports-synced', () => {
    console.log('[App] Offline reports synced to server, refreshing views...');
    loadCommunityReports();
  });

  window.addEventListener('online', () => {
    $('#offlineNotice').classList.remove('active');
  });

  window.addEventListener('offline', () => {
    $('#offlineNotice').classList.add('active');
  });

  // Theme Toggle (Dark / Light)
  const themeToggle = $('#themeToggle');
  const themeIcon = $('#themeIcon');
  const getTheme = () => document.documentElement.getAttribute('data-theme') || 'dark';

  const updateThemeUI = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nera_theme', theme);
    if (themeIcon) {
      themeIcon.textContent = theme === 'light' ? '☀️' : '🌙';
    }
    if (themeToggle) {
      themeToggle.setAttribute('aria-label', `Current theme: ${theme}. Click to switch.`);
      themeToggle.setAttribute('title', `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`);
    }
    if (boundaryLayer) {
      boundaryLayer.eachLayer(layer => {
        if (layer.feature) {
          layer.setStyle(getBoundaryStyle(layer.feature, false));
        }
      });
    }
  };

  // Sync initial UI state with stored/active theme
  updateThemeUI(getTheme());

  if (themeToggle) {
    themeToggle.onclick = () => {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      updateThemeUI(next);
    };
  }
}

async function init() {
  [stateData] = await Promise.all([monitoringService.getStates(), monitoringService.getRegionalStatus()]);
  const alerts = await monitoringService.getAlerts();
  $('#updateTime').textContent = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date());
  setupMap(stateData);
  showLocation(stateData[0]);
  renderTable(stateData);
  renderBars(stateData);
  renderAlerts(alerts);
  initEventHandlers();
  updateAuthUI();
  await Promise.all([loadCommunityReports(), loadDataSources(), loadHistorical(), loadRoads()]);
}

init().catch((error) => {
  console.error('Map/dashboard initialization failed:', error);
  $('#locationDetail').innerHTML = '<p class="error">Unable to initialize the map. Please check your connection and refresh the page.</p>';
});
