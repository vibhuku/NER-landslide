import { authService, monitoringService } from './services.js';
import { riskColor } from './data.js';
import { nerBoundaries } from './ner-boundaries.js';
import { i18n } from './i18n.js';
import { advancedFeatures } from './advanced-features.js';
import {
  formatCoordinates,
  copyCoordinates,
  zoomToExact,
  getNavigationUrls,
  renderRiskBuffer,
  clearRiskBuffer,
  highlightRoadSegment,
  clearRoadSegmentHighlight,
  vehicleTracker,
  buildPrecisionPopup,
  getRoadRiskColor,
  getRoadDashArray,
  buildRoadSegmentPopup,
  createLandslideIcon,
  buildLandslideIncidentPopup
} from './precision-gis.js';

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

let activeLocation = null;
function showLocation(s) {
  if (!s) return;
  activeLocation = s;
  const translatedLevel = i18n.t('risk_' + s.level.toLowerCase()) || s.level;
  const coordsFormatted = formatCoordinates(s.lat, s.lng);
  const navUrls = getNavigationUrls(s.lat, s.lng);
  const radius = (s.level === 'Critical') ? 500 : (s.level === 'High' ? 200 : 100);

  if (map) {
    renderRiskBuffer(map, s.lat, s.lng, s.level, radius);
  }
  vehicleTracker.setTarget(s.lat, s.lng, s.name);

  $('#locationDetail').innerHTML = `
    <div class="selected-place">
      <span class="pin" style="background:${riskColor[s.level]};box-shadow:0 0 0 3px rgba(255,255,255,0.15), 0 0 10px ${riskColor[s.level]};"></span>
      <div>
        <h2>${s.name}</h2>
        <p>${s.short} · ${s.data_status || 'Demo'} assessment</p>
      </div>
    </div>
    <div class="location-risk">
      <span>Risk score</span>
      <strong>${s.score}<small>/100</small></strong>
      <b class="risk-label ${levelClass(s.level)}">${translatedLevel}</b>
    </div>

    <div class="location-precision-strip">
      <div class="precision-meta-row">
        <span class="precision-meta-label">Coordinates</span>
        <strong class="precision-meta-value">${coordsFormatted}</strong>
      </div>
      <div class="precision-meta-row">
        <span class="precision-meta-label">Risk Zone</span>
        <span class="precision-meta-value"><strong>${radius} m radius</strong> <small class="demo-tag">DEMO</small></span>
      </div>
      <div class="location-actions-row">
        <button type="button" class="btn-location-action btn-zoom" onclick="window.neraGis.zoom(${s.lat}, ${s.lng}, 17)" title="Zoom map to exact coordinates">
          <span class="action-icon" aria-hidden="true">🔍</span>
          <span class="action-label">Zoom to Exact</span>
        </button>
        <button type="button" class="btn-location-action btn-copy" id="btnCopyLocDetail" onclick="window.neraGis.copy(${s.lat}, ${s.lng}, 'btnCopyLocDetail')" title="Copy coordinates to clipboard">
          <span class="action-icon" aria-hidden="true">📋</span>
          <span class="action-label">Copy Coordinates</span>
        </button>
        <button type="button" class="btn-location-action btn-view-map" id="btnLocDetailViewMap" onclick="window.neraGis.toggleFullscreenMap(true)" title="Open internal large map view">
          <span class="action-icon" aria-hidden="true">🗺️</span>
          <span class="action-label">View Map</span>
        </button>
        <a href="${navUrls.google}" target="_blank" rel="noopener" class="btn-location-action btn-nav" title="Open Google Maps turn-by-turn navigation">
          <span class="action-icon" aria-hidden="true">🧭</span>
          <span class="action-label">Navigate</span>
        </a>
      </div>
    </div>

    <dl class="detail-grid">
      <div><dt>Rainfall (24h)</dt><dd>${s.rain} mm</dd></div>
      <div><dt>Soil moisture</dt><dd>${s.soil}%</dd></div>
      <div><dt>Avg. slope</dt><dd>${s.slope}</dd></div>
      <div><dt>Elevation</dt><dd>${s.elevation}</dd></div>
    </dl>
    <div class="recent">
      <span>Recent information</span>
      <p>${s.event}</p>
    </div>
    <div class="detail-bottom">
      <span>Last updated ${s.updated}</span>
      <b>${s.alerts ? `${s.alerts} active alert${s.alerts > 1 ? 's' : ''}` : 'No active alerts'}</b>
    </div>
  `;
  if (s && s.short) updatePredictionDisplay(s.short);
}

function popupContent(s) {
  const rainWeight = Math.min(45, Math.max(15, Math.round((s.rain / 120) * 40)));
  const soilWeight = Math.min(35, Math.max(15, Math.round((s.soil / 100) * 35)));
  const slopeWeight = Math.max(10, 100 - rainWeight - soilWeight);
  const radius = (s.level === 'Critical') ? 500 : (s.level === 'High' ? 200 : 100);

  return buildPrecisionPopup({
    title: s.name,
    badgeText: s.data_status || 'AVAILABLE',
    badgeType: s.data_status === 'LIVE' ? 'live' : 'available',
    riskLevel: s.level,
    riskScore: s.score,
    lat: s.lat,
    lng: s.lng,
    radiusM: radius,
    details: [
      { label: 'Rainfall (24h)', value: `${s.rain} mm` },
      { label: 'Slope Gradient', value: s.slope },
      { label: 'Soil Moisture', value: `${s.soil}%` },
      { label: 'Elevation', value: s.elevation },
      { label: 'Last Updated', value: s.updated },
      {
        label: 'XAI Contribution',
        value: `<span style="color:#38bdf8;font-size:10px;">Rain ${rainWeight}%</span> · <span style="color:#f59e0b;font-size:10px;">Soil ${soilWeight}%</span> · <span style="color:#c084fc;font-size:10px;">Slope ${slopeWeight}%</span>`
      }
    ]
  });
}

function selectState(s) {
  showLocation(s);
  updatePredictionDisplay(s.short);
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
          <div class="nera-layers-heading">BASEMAP (GEOGRAPHIC BASE)</div>
          <label class="nera-layer-option">
            <input type="radio" name="nera_basemap" value="google_roadmap" checked>
            <span>Google Maps (Standard)</span>
          </label>
          <label class="nera-layer-option">
            <input type="radio" name="nera_basemap" value="google_terrain">
            <span>Google Maps (Terrain)</span>
          </label>
          <label class="nera-layer-option">
            <input type="radio" name="nera_basemap" value="osm">
            <span>OpenStreetMap</span>
          </label>
        </div>
        <div class="nera-layers-group">
          <div class="nera-layers-heading" data-i18n="layer_panel_title">NERA RISK &amp; MONITORING LAYERS</div>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="boundary" ${layersConfig.boundary && map.hasLayer(layersConfig.boundary) ? 'checked' : ''}>
            <span data-i18n="layer_boundaries">NER State Boundaries</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="risk" ${layersConfig.risk && map.hasLayer(layersConfig.risk) ? 'checked' : ''}>
            <span data-i18n="layer_risk">Landslide Risk</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="rain" ${layersConfig.rain && map.hasLayer(layersConfig.rain) ? 'checked' : ''}>
            <span data-i18n="layer_rainfall">Rainfall</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="moisture" ${layersConfig.moisture && map.hasLayer(layersConfig.moisture) ? 'checked' : ''}>
            <span data-i18n="layer_soil_moisture">Soil Moisture</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="slope" ${layersConfig.slope && map.hasLayer(layersConfig.slope) ? 'checked' : ''}>
            <span data-i18n="layer_slope">Slope</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="history" ${layersConfig.history && map.hasLayer(layersConfig.history) ? 'checked' : ''}>
            <span data-i18n="layer_history">Historical Landslides</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="reports" ${layersConfig.reports && map.hasLayer(layersConfig.reports) ? 'checked' : ''}>
            <span data-i18n="layer_reports">Community Reports</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="roads" ${layersConfig.roads && map.hasLayer(layersConfig.roads) ? 'checked' : ''}>
            <span data-i18n="layer_roads">Roads</span>
          </label>
          <label class="nera-layer-option">
            <input type="checkbox" data-layer-key="infra" ${layersConfig.infra && map.hasLayer(layersConfig.infra) ? 'checked' : ''}>
            <span data-i18n="layer_infra">Critical Infrastructure</span>
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

      // Handle basemap selection
      const basemapRadios = panel.querySelectorAll('input[name="nera_basemap"]');
      basemapRadios.forEach(radio => {
        L.DomEvent.on(radio, 'change', (e) => {
          L.DomEvent.stopPropagation(e);
          const val = radio.value;
          if (layersConfig.basemaps) {
            Object.values(layersConfig.basemaps).forEach(bm => {
              if (bm && map.hasLayer(bm)) map.removeLayer(bm);
            });
            const activeBm = layersConfig.basemaps[val];
            if (activeBm) {
              activeBm.addTo(map);
              if (activeBm.bringToBack) activeBm.bringToBack();
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

  // Base geographic map: Google Maps layer (with terrain and OSM options)
  const googleRoadmap = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps | NER Boundaries: Survey of India / <a href="https://github.com/datameet/maps" target="_blank">DataMeet</a>'
  });
  const googleTerrain = L.tileLayer('https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps | NER Boundaries: Survey of India / <a href="https://github.com/datameet/maps" target="_blank">DataMeet</a>'
  });
  const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> | NER Boundaries: Survey of India / <a href="https://github.com/datameet/maps" target="_blank">DataMeet</a>'
  });

  // Keep Google Maps strictly as the base geographic map
  const baseMap = googleRoadmap.addTo(map);

  googleRoadmap.on('tileerror', () => {
    console.warn('A Google Maps tile could not be loaded; Leaflet will retry or fallback.');
  });

  // Dedicated Leaflet Panes with explicit z-index hierarchy ensuring overlays stay above Google Maps basemap:
  // z-index 200: tilePane (Google Maps raster basemap)
  // z-index 350: nerBoundariesPane (authoritative 8-state boundaries)
  // z-index 380: riskZonesPane (Landslide Risk Zone hazard perimeter circles)
  // z-index 450: roadsPane (Road-risk segments & blocked dashed lines)
  // z-index 550: markersPane (Risk centroid circleMarkers)
  // z-index 600: markerPane (Verified landslide & unverified incident markers)
  // z-index 650: tooltipPane
  // z-index 700: popupPane
  if (!map.getPane('nerBoundariesPane')) {
    map.createPane('nerBoundariesPane');
    map.getPane('nerBoundariesPane').style.zIndex = 350;
  }
  if (!map.getPane('riskZonesPane')) {
    map.createPane('riskZonesPane');
    map.getPane('riskZonesPane').style.zIndex = 380;
  }
  if (!map.getPane('roadsPane')) {
    map.createPane('roadsPane');
    map.getPane('roadsPane').style.zIndex = 450;
  }
  if (!map.getPane('markersPane')) {
    map.createPane('markersPane');
    map.getPane('markersPane').style.zIndex = 550;
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
            },
            mouseout: (e) => {
              const stateName = feature.properties.name;
              const isSelected = activeLocation && (activeLocation.name.toLowerCase() === stateName.toLowerCase() || activeLocation.short === feature.properties.state_code);
              e.target.setStyle(getBoundaryStyle(feature, isSelected));
            },
            click: (e) => {
              if ($('#reportModal') && $('#reportModal').classList.contains('active')) return;
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

  // Core disaster monitoring layers active by default on top of Google Maps
  markerLayer = L.layerGroup().addTo(map);
  roadsLayer = L.layerGroup().addTo(map);
  reportsLayer = L.layerGroup().addTo(map);

  // Environmental & analytical layers (selectable via Layers control)
  rainfallLayer = L.layerGroup();
  soilMoistureLayer = L.layerGroup();
  slopeLayer = L.layerGroup();
  historyLayer = L.layerGroup();

  // Color mapping: Green = Low, Yellow = Medium/Moderate, Orange = High, Red = Critical
  const riskPalette = {
    Low: '#10b981',
    Medium: '#eab308',
    Moderate: '#eab308',
    High: '#f97316',
    Critical: '#ef4444'
  };

  data.forEach(s => {
    const zoneColor = riskPalette[s.level] || riskColor[s.level] || '#eab308';

    // 1. Landslide Risk Zone (calibrated hazard perimeter circle on Google Maps)
    const zoneRadiusM = (s.level === 'Critical') ? 42000 : (s.level === 'High' ? 32000 : (s.level === 'Moderate' || s.level === 'Medium' ? 22000 : 15000));
    const zoneCircle = L.circle([s.lat, s.lng], {
      radius: zoneRadiusM,
      color: zoneColor,
      weight: 2,
      dashArray: '6, 6',
      fillColor: zoneColor,
      fillOpacity: 0.18,
      pane: 'riskZonesPane'
    }).bindTooltip(`
      <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:700;">
        ${escapeHtml(s.name)} Landslide Risk Zone
        <br><span style="color:${zoneColor};">${s.level} Risk (${s.score}/100)</span>
      </div>
    `, { direction: 'top' });

    // 2. Risk Centroid Marker with permanent identification label
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 12 + s.score / 14,
      color: '#ffffff',
      weight: 2,
      fillColor: zoneColor,
      fillOpacity: 0.95,
      pane: 'markersPane'
    })
      .bindTooltip(`
        <div style="font-weight:800;font-size:11px;">${s.short} · ${s.score}<small>/100</small></div>
      `, {
        direction: 'top',
        permanent: true,
        className: 'state-map-label',
        offset: [0, -14]
      })
      .bindPopup(popupContent(s), { maxWidth: 290 });

    const onSelectNode = () => {
      showLocation(s);
      renderRiskBuffer(map, s.lat, s.lng, s.level, (s.level === 'Critical' ? 500 : (s.level === 'High' ? 200 : 100)));
    };

    marker.on('click', onSelectNode);
    zoneCircle.on('click', () => {
      onSelectNode();
      marker.openPopup();
    });

    marker.addTo(markerLayer);
    zoneCircle.addTo(markerLayer);

    // Analytical layers population:
    L.circleMarker([s.lat, s.lng], {
      radius: Math.min(26, Math.max(10, Math.round(s.rain / 5))),
      color: '#38bdf8',
      weight: 1.5,
      fillColor: '#0284c7',
      fillOpacity: 0.45,
      pane: 'overlayPane'
    }).bindTooltip(`${escapeHtml(s.name)}: ${s.rain} mm (24h Rainfall)`).addTo(rainfallLayer);

    L.circleMarker([s.lat, s.lng], {
      radius: Math.min(26, Math.max(10, Math.round(s.soil / 4))),
      color: '#fbbf24',
      weight: 1.5,
      fillColor: '#d97706',
      fillOpacity: 0.45,
      pane: 'overlayPane'
    }).bindTooltip(`${escapeHtml(s.name)}: ${s.soil}% Soil Moisture`).addTo(soilMoistureLayer);

    L.circleMarker([s.lat, s.lng], {
      radius: 14,
      color: '#c084fc',
      weight: 1.5,
      fillColor: '#7c3aed',
      fillOpacity: 0.45,
      pane: 'overlayPane'
    }).bindTooltip(`${escapeHtml(s.name)}: ${s.slope} Avg. Slope Gradient`).addTo(slopeLayer);

    if (s.event !== 'No new landslide record') {
      L.marker([s.lat + 0.12, s.lng + 0.15], {
        icon: L.divIcon({
          className: 'history-marker',
          html: '<span style="color:#ef4444;font-size:16px;text-shadow:0 0 4px rgba(0,0,0,0.9);">▲</span>',
          iconSize: [16, 16]
        }),
        pane: 'markerPane'
      }).bindTooltip(`Historical/reference: ${s.event}`).addTo(historyLayer);
    }
  });

  const basemaps = {
    google_roadmap: googleRoadmap,
    google_terrain: googleTerrain,
    osm: osmStandard
  };

  const layers = {
    baseMap,
    basemaps,
    boundary: boundaryLayer,
    risk: markerLayer,
    rain: rainfallLayer,
    moisture: soilMoistureLayer,
    slope: slopeLayer,
    history: historyLayer,
    reports: reportsLayer,
    roads: roadsLayer
  };

  window.map = map;
  advancedFeatures.init(map);
  layers.infra = advancedFeatures.infraLayerGroup;

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
    clearRiskBuffer(map);
    clearRoadSegmentHighlight(map);
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

export function toggleNeraFullscreenMap(enable) {
  const mapLayout = document.getElementById('mapLayoutContainer') || document.querySelector('.map-layout');
  const topbar = document.getElementById('mapFullscreenTopBar');
  if (!mapLayout) return;

  const isCurrentlyActive = mapLayout.classList.contains('map-fullscreen-active');
  const shouldEnable = enable !== undefined ? Boolean(enable) : !isCurrentlyActive;

  if (shouldEnable) {
    mapLayout.classList.add('map-fullscreen-active');
    if (topbar) topbar.style.display = 'flex';
    document.body.classList.add('map-modal-open');
  } else {
    mapLayout.classList.remove('map-fullscreen-active');
    if (topbar) topbar.style.display = 'none';
    document.body.classList.remove('map-modal-open');
  }

  // Trigger Leaflet map resize after DOM settles
  setTimeout(() => {
    if (map && typeof map.invalidateSize === 'function') {
      map.invalidateSize();
    }
  }, 100);
  setTimeout(() => {
    if (map && typeof map.invalidateSize === 'function') {
      map.invalidateSize();
    }
  }, 300);
}
window.toggleNeraFullscreenMap = toggleNeraFullscreenMap;

function renderTable(data) {
  $('#stateTable').innerHTML = data.map(s => {
    const translatedLevel = i18n.t('risk_' + s.level.toLowerCase()) || s.level;
    return `<tr tabindex="0" data-state="${s.short}"><td><strong>${s.name}</strong></td><td><span class="tag ${levelClass(s.level)}-tag">${translatedLevel}</span></td><td>${s.score}</td><td>${s.rain} mm</td><td>${s.alerts || '—'}</td><td>${s.updated}</td></tr>`;
  }).join('');
  document.querySelectorAll('#stateTable tr').forEach(row => {
    const select = () => selectState(data.find(s => s.short === row.dataset.state));
    row.onclick = select;
    row.onkeydown = e => { if (e.key === 'Enter') select(); };
  });
}

function renderBars(data) {
  $('#stateBars').innerHTML = data.slice().sort((a, b) => b.score - a.score).map(s => `<div><label>${s.short}<span>${s.score}</span></label><i><b style="width:${s.score}%;background:${riskColor[s.level]}"></b></i></div>`).join('');
}

let alertsData = [];
function renderAlerts(items) {
  alertsData = items || [];
  $('#alertCount').textContent = String(alertsData.length).padStart(2, '0');
  if (!alertsData.length) {
    $('#alertList').innerHTML = `<p style="padding:10px 0;color:var(--slate);font-size:11px;">${i18n.t('no_active_alerts')}</p>`;
    return;
  }
  $('#alertList').innerHTML = alertsData.map(a => {
    const translatedLevel = i18n.t('risk_' + a.level.toLowerCase()) || a.level;
    return `<div class="alert-item"><span class="alert-indicator ${a.level.toLowerCase()}"></span><div><div><strong>${a.location}, ${a.state}</strong><span>${a.time}</span></div><p>${a.reason}</p><small><b>Action:</b> ${a.action}</small></div><em>${translatedLevel}</em></div>`;
  }).join('');
}

function openReportViewer(title, eyebrow, contentHtml, dataStatus) {
  const modal = $('#reportViewerModal');
  if (!modal) return;
  const user = authService.getUser();
  const isPrivileged = user && (user.role === 'officer' || user.role === 'admin');

  $('#reportViewerTitle').textContent = title;
  $('#reportViewerEyebrow').textContent = eyebrow;
  $('#reportViewerContent').innerHTML = contentHtml;
  $('#reportViewerStatusBadge').textContent = isPrivileged
    ? `OFFICER VIEW: ${dataStatus || 'Regional Register'}`
    : (dataStatus || 'Public Summary Assessment');

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
          <span style="display:flex;align-items:center;gap:6px;">By: ${escapeHtml(r.citizen_name || 'Anonymous')} ${r.status === 'verified' ? '<span class="badge-role" style="font-size:9px;background:#22c55e22;color:#22c55e;">🏅 Trusted Reporter</span>' : '<span class="badge-role" style="font-size:9px;background:#f59e0b22;color:#f59e0b;">🌱 Verified Citizen</span>'} · GPS: ${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}</span>
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

  // Add markers to reportsLayer with landslide incident icons & grounded verification popups
  reports.forEach(r => {
    const isVerified = r.status === 'verified';
    const isBlocked = isVerified && (
      (r.road_impact && r.road_impact.toLowerCase().includes('block')) ||
      ((r.description || '').toLowerCase().includes('impassable')) ||
      ((r.incident_type || '').toLowerCase().includes('blockage'))
    );
    const icon = createLandslideIcon(isVerified, isBlocked);
    const popupHtml = buildLandslideIncidentPopup(r);

    const marker = L.marker([r.lat, r.lng], { icon, pane: 'markerPane' })
      .bindTooltip(`${isVerified ? '✓ Verified Landslide' : '⚠️ Unverified Report'}: ${escapeHtml(r.incident_type)}`, { direction: 'top' })
      .bindPopup(popupHtml, { maxWidth: 320 });
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
  let roads = await monitoringService.getRoadSegments();
  if (!roads || !roads.length) {
    roads = await monitoringService.getRoads();
  }
  roadsLayer.clearLayers();
  if (!roads || !roads.length) return;

  if (map && !map.hasLayer(roadsLayer)) {
    map.addLayer(roadsLayer);
  }

  roads.forEach(r => {
    const statusColor = getRoadRiskColor(r);
    const dashPattern = getRoadDashArray(r);
    const isBlocked = r.is_blocked || (r.road_status === 'BLOCKED') || (r.status === 'BLOCKED');

    // If verified segment geometry exists (e.g. NH-10 km 42.3–45.1), draw corridor stretch
    if (r.start_lat && r.start_lng && r.end_lat && r.end_lng) {
      const segmentLine = L.polyline([
        [r.start_lat, r.start_lng],
        [r.end_lat, r.end_lng]
      ], {
        color: statusColor,
        weight: isBlocked ? 6 : 5,
        opacity: 0.95,
        dashArray: dashPattern,
        pane: map && map.getPane('roadsPane') ? 'roadsPane' : 'overlayPane'
      });
      const kmLabel = r.segment_km_start != null && r.segment_km_end != null
        ? `km ${r.segment_km_start}–${r.segment_km_end}`
        : `${r.vulnerable_stretch_km} km`;
      segmentLine.bindTooltip(`Stretch: ${r.highway_code} (${kmLabel})${isBlocked ? ' [BLOCKED]' : ''}`);
      segmentLine.bindPopup(buildRoadSegmentPopup(r), { maxWidth: 320 });
      segmentLine.on('click', () => highlightRoadSegment(map, r));
      segmentLine.addTo(roadsLayer);
    }

    const popupHtml = buildRoadSegmentPopup(r);

    const marker = L.circleMarker([r.lat, r.lng], {
      radius: isBlocked ? 10 : 8,
      color: isBlocked ? '#ef4444' : '#ffffff',
      weight: isBlocked ? 3 : 1.5,
      fillColor: statusColor,
      fillOpacity: 0.95,
      pane: map && map.getPane('roadsPane') ? 'roadsPane' : 'overlayPane'
    }).bindTooltip(`${r.highway_code}: ${r.name} (${isBlocked ? 'BLOCKED' : (r.risk_level || r.status || 'Monitored')})`, { direction: 'top' })
      .bindPopup(popupHtml, { maxWidth: 320 });

    marker.on('click', () => {
      highlightRoadSegment(map, r);
    });

    marker.addTo(roadsLayer);
  });
}

let lastRegionalStatus = null;

function renderRegionalStatus(reg) {
  if (!reg) return;
  lastRegionalStatus = reg;
  const elAss = $('#regAssessment');
  if (elAss) {
    const dotClass = (reg.regional_assessment || '').toLowerCase().includes('critical') ? 'critical'
      : (reg.regional_assessment || '').toLowerCase().includes('elevated') ? 'high' : 'moderate';
    elAss.innerHTML = `<em class="dot ${dotClass}"></em>${escapeHtml(reg.regional_assessment)}`;
  }
  const elDist = $('#regDistricts');
  if (elDist) elDist.textContent = `${reg.districts_attention_count} ${i18n.t('strip_districts_attention') || 'districts require attention'}`;
  const elHigh = $('#regHighRisk');
  if (elHigh) elHigh.textContent = String(reg.high_risk_locations_count).padStart(2, '0');
  const elRain = $('#regRainStatus');
  if (elRain) elRain.textContent = reg.rainfall_status;
  const elAnom = $('#regRainAnomaly');
  if (elAnom) elAnom.textContent = reg.rainfall_anomaly_24h;
  const elFresh = $('#regFreshness');
  if (elFresh) elFresh.textContent = `${reg.data_freshness_min} min`;
  const elMode = $('#dataFreshnessMode');
  if (elMode) elMode.textContent = i18n.t('strip_data_simulated') || reg.data_mode;
}

async function updatePredictionDisplay(stateCode = 'ML') {
  try {
    const res = await monitoringService.getStatePrediction(stateCode);
    if (!res) return;
    const scoreVal = $('#predictionScoreVal');
    if (scoreVal) scoreVal.textContent = res.risk_score;
    const levelTag = $('#predictionLevelTag');
    if (levelTag) {
      levelTag.textContent = res.risk_level.toUpperCase();
      levelTag.className = `gauge-level tag ${levelClass(res.risk_level)}-tag`;
    }
    const gaugeFill = $('#predictionGaugeFill');
    if (gaugeFill) {
      const circumference = 301.6;
      const offset = circumference - (res.risk_score / 100) * circumference;
      gaugeFill.style.strokeDasharray = `${circumference}`;
      gaugeFill.style.strokeDashoffset = `${offset}`;
    }
    const pin = $('#predictionScalePin');
    if (pin) pin.style.left = `${Math.min(95, Math.max(5, res.risk_score))}%`;
  } catch (err) {
    console.warn('[NERA] Prediction update fallback:', err);
  }
}

async function updateAnalyticsSummary() {
  try {
    const data = await monitoringService.getAnalyticsSummary();
    if (!data || !data.weather_environment) return;
    const w = data.weather_environment;
    const metricsEl = document.querySelector('.panel.environment .metrics');
    if (metricsEl) {
      metricsEl.innerHTML = `
        <div><span>Rainfall</span><strong>${w.rainfall_24h_mm} <small>mm</small></strong><b>${escapeHtml(w.rainfall_anomaly)}</b></div>
        <div><span>Soil moisture</span><strong>${w.soil_moisture_pct}<small>%</small></strong><b>${escapeHtml(w.soil_moisture_label)}</b></div>
        <div><span>Temperature</span><strong>${w.temperature_celsius}<small>°C</small></strong><b>${escapeHtml(w.temperature_label)}</b></div>
        <div><span>Humidity</span><strong>${w.humidity_pct}<small>%</small></strong><b>${escapeHtml(w.humidity_label)}</b></div>
      `;
    }
    const barChart = document.querySelector('.bar-chart');
    if (barChart && data.rainfall_accumulation_7day) {
      barChart.innerHTML = data.rainfall_accumulation_7day.map((d, i, arr) => {
        const isCurrent = i === arr.length - 1 ? ' class="current"' : '';
        return `<i style="height:${d.pct}%"${isCurrent} title="${d.day}: ${d.mm}mm"></i>`;
      }).join('');
    }
  } catch (err) {
    console.warn('[NERA] Analytics update fallback:', err);
  }
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
  if (!config || !config.apiKey || !config.projectId || config.apiKey.includes('placeholder') || config.projectId.includes('placeholder')) {
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
      const unavailableMsg = 'Google Sign-In is currently in setup mode. Please sign in using your email and password below.';
      const authModal = $('#authModal');
      const isAuthModalOpen = authModal && authModal.classList.contains('active');
      if (isAuthModalOpen && errorEl) {
        errorEl.className = 'auth-notice-msg';
        errorEl.innerHTML = '<strong>Notice:</strong> Google Sign-In is currently in setup mode. Please sign in using your email and password below.';
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

  // View All Alerts Scroll Handler
  const btnViewAllAlerts = $('#btnViewAllAlerts');
  if (btnViewAllAlerts) {
    btnViewAllAlerts.onclick = () => {
      const alertSection = $('#alerts');
      if (alertSection) alertSection.scrollIntoView({ behavior: 'smooth' });
    };
  }

  // Full-Screen Risk Map Controls
  const btnHeroViewMap = $('#btnHeroViewMap');
  if (btnHeroViewMap) {
    btnHeroViewMap.onclick = (e) => {
      e.preventDefault();
      toggleNeraFullscreenMap(true);
    };
  }

  const btnToolbarViewMap = $('#btnToolbarViewMap');
  if (btnToolbarViewMap) {
    btnToolbarViewMap.onclick = (e) => {
      e.preventDefault();
      toggleNeraFullscreenMap(true);
    };
  }

  const btnExitMapFullscreen = $('#btnExitMapFullscreen');
  if (btnExitMapFullscreen) {
    btnExitMapFullscreen.onclick = () => toggleNeraFullscreenMap(false);
  }

  const btnCloseMapFullscreen = $('#btnCloseMapFullscreen');
  if (btnCloseMapFullscreen) {
    btnCloseMapFullscreen.onclick = () => toggleNeraFullscreenMap(false);
  }

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

  if (authModal) {
    authModal.onclick = (e) => {
      if (e.target === authModal) {
        authModal.classList.remove('active');
        authModal.setAttribute('aria-hidden', 'true');
      }
    };
  }

  if (reportModal) {
    reportModal.onclick = (e) => {
      if (e.target === reportModal) {
        reportModal.classList.remove('active');
        reportModal.setAttribute('aria-hidden', 'true');
      }
    };
  }

  // --- Emergency Alert Modal Flow ---
  const emergencyModal = $('#emergencyModal');
  const btnEmergency = $('#btnEmergencyCall');
  const btnCloseEmergency = $('#btnCloseEmergencyModal');
  const btnCancelEmergency = $('#btnCancelEmergency');
  const btnConfirmEmergency = $('#btnConfirmEmergency');
  const emergencyCoordsDisplay = $('#emergencyCoordsDisplay');
  const emergencyRegionDisplay = $('#emergencyRegionDisplay');
  const emergencyLocStatus = $('#emergencyLocationStatus');
  const emergencyStatusMsg = $('#emergencyStatusMessage');
  const emergencySpinner = $('#btnConfirmEmergencySpinner');
  const emergencyConfirmText = $('#btnConfirmEmergencyText');

  let currentEmergencyCoords = null;

  function closeEmergencyModal() {
    if (emergencyModal) {
      emergencyModal.classList.remove('active');
      emergencyModal.setAttribute('aria-hidden', 'true');
    }
  }

  function openEmergencyModal() {
    if (!emergencyModal) return;

    if (emergencyStatusMsg) {
      emergencyStatusMsg.style.display = 'none';
      emergencyStatusMsg.className = '';
      emergencyStatusMsg.innerHTML = '';
    }

    if (btnConfirmEmergency) {
      btnConfirmEmergency.disabled = false;
    }
    if (emergencySpinner) emergencySpinner.style.display = 'none';
    if (emergencyConfirmText) emergencyConfirmText.textContent = i18n.t('btn_confirm_emergency') || 'Confirm Emergency';

    // 1. Initial coordinates from active state or map center
    if (activeLocation && activeLocation.lat && activeLocation.lng) {
      currentEmergencyCoords = {
        lat: parseFloat(activeLocation.lat),
        lng: parseFloat(activeLocation.lng),
        state: activeLocation.name || activeLocation.short || 'North Eastern Region',
        location: `${activeLocation.name} (${formatCoordinates(activeLocation.lat, activeLocation.lng)})`
      };
      if (emergencyCoordsDisplay) emergencyCoordsDisplay.textContent = formatCoordinates(activeLocation.lat, activeLocation.lng);
      if (emergencyRegionDisplay) emergencyRegionDisplay.textContent = activeLocation.name || 'North Eastern Region';
      if (emergencyLocStatus) {
        emergencyLocStatus.textContent = 'Selected Region';
        emergencyLocStatus.style.background = 'rgba(56, 189, 248, 0.2)';
        emergencyLocStatus.style.color = '#38bdf8';
      }
    } else if (typeof map !== 'undefined' && map && map.getCenter) {
      const center = map.getCenter();
      currentEmergencyCoords = {
        lat: parseFloat(center.lat.toFixed(4)),
        lng: parseFloat(center.lng.toFixed(4)),
        state: 'North Eastern Region',
        location: `NER Grid (${formatCoordinates(center.lat, center.lng)})`
      };
      if (emergencyCoordsDisplay) emergencyCoordsDisplay.textContent = formatCoordinates(center.lat, center.lng);
      if (emergencyRegionDisplay) emergencyRegionDisplay.textContent = 'North Eastern Region';
      if (emergencyLocStatus) {
        emergencyLocStatus.textContent = 'Map Centered';
        emergencyLocStatus.style.background = 'rgba(251, 191, 36, 0.2)';
        emergencyLocStatus.style.color = '#fbbf24';
      }
    } else {
      currentEmergencyCoords = {
        lat: 27.3389,
        lng: 88.6060,
        state: 'Sikkim',
        location: 'Sikkim (27.3389° N, 88.6060° E)'
      };
      if (emergencyCoordsDisplay) emergencyCoordsDisplay.textContent = '27.3389° N, 88.6060° E';
      if (emergencyRegionDisplay) emergencyRegionDisplay.textContent = 'North Eastern Region';
    }

    // 2. Query fine GPS coordinates if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4));
          const lng = parseFloat(pos.coords.longitude.toFixed(4));
          currentEmergencyCoords = {
            lat,
            lng,
            state: currentEmergencyCoords?.state || 'North Eastern Region',
            location: `GPS: ${formatCoordinates(lat, lng)}`
          };
          if (emergencyCoordsDisplay) emergencyCoordsDisplay.textContent = formatCoordinates(lat, lng);
          if (emergencyLocStatus) {
            emergencyLocStatus.textContent = 'GPS Live';
            emergencyLocStatus.style.background = 'rgba(34, 197, 94, 0.2)';
            emergencyLocStatus.style.color = '#22c55e';
          }
        },
        (err) => {
          console.warn('[Emergency] Geolocation check skipped/denied:', err.message);
        },
        { timeout: 3000, maximumAge: 60000, enableHighAccuracy: true }
      );
    }

    emergencyModal.classList.add('active');
    emergencyModal.setAttribute('aria-hidden', 'false');
  }

  if (btnEmergency) {
    btnEmergency.addEventListener('click', (e) => {
      e.preventDefault();
      openEmergencyModal();
    });
  }

  if (btnCloseEmergency) {
    btnCloseEmergency.onclick = closeEmergencyModal;
  }
  if (btnCancelEmergency) {
    btnCancelEmergency.onclick = closeEmergencyModal;
  }
  if (emergencyModal) {
    emergencyModal.onclick = (e) => {
      if (e.target === emergencyModal) closeEmergencyModal();
    };
  }

  if (btnConfirmEmergency) {
    btnConfirmEmergency.onclick = async () => {
      try {
        btnConfirmEmergency.disabled = true;
        if (emergencySpinner) emergencySpinner.style.display = 'inline-block';
        if (emergencyConfirmText) emergencyConfirmText.textContent = 'Sending Alert...';
        if (emergencyStatusMsg) emergencyStatusMsg.style.display = 'none';

        const payload = {
          lat: currentEmergencyCoords?.lat ?? null,
          lng: currentEmergencyCoords?.lng ?? null,
          location: currentEmergencyCoords?.location || 'North Eastern Region',
          state: currentEmergencyCoords?.state || 'North Eastern Region',
          notes: 'Citizen triggered immediate Emergency SOS alert.'
        };

        const res = await services.triggerEmergencyAlert(payload);

        if (emergencyStatusMsg) {
          emergencyStatusMsg.style.display = 'block';
          emergencyStatusMsg.style.background = 'rgba(34, 197, 94, 0.15)';
          emergencyStatusMsg.style.border = '1px solid #22c55e';
          emergencyStatusMsg.style.color = '#4ade80';
          emergencyStatusMsg.innerHTML = `✓ Emergency alert sent successfully. (Advisory: ${res.alert_id || 'SOS-ACTIVE'})`;
        }

        if (typeof loadAlerts === 'function') {
          loadAlerts();
        }

        setTimeout(() => {
          closeEmergencyModal();
        }, 2200);

      } catch (err) {
        console.error('[Emergency] Failed to send alert:', err);
        btnConfirmEmergency.disabled = false;
        if (emergencySpinner) emergencySpinner.style.display = 'none';
        if (emergencyConfirmText) emergencyConfirmText.textContent = i18n.t('btn_confirm_emergency') || 'Confirm Emergency';

        if (emergencyStatusMsg) {
          emergencyStatusMsg.style.display = 'block';
          emergencyStatusMsg.style.background = 'rgba(239, 68, 68, 0.15)';
          emergencyStatusMsg.style.border = '1px solid #ef4444';
          emergencyStatusMsg.style.color = '#f87171';
          emergencyStatusMsg.innerHTML = `⚠️ ${err.message || 'Unable to dispatch emergency alert. Please call 112 directly.'}`;
        }
      }
    };
  }

  const langSelect = $('#langSelector');
  if (langSelect) {
    langSelect.value = i18n.getLanguage();
    langSelect.onchange = (e) => i18n.setLanguage(e.target.value);
  }

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
      authModal.classList.add('active');
      authModal.setAttribute('aria-hidden', 'false');
      alert('Please sign in to submit an incident report.');
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

    const isAnon = $('#repAnonymous') && $('#repAnonymous').checked;
    const payload = {
      citizen_name: isAnon ? 'Anonymous Citizen Observer' : $('#repName').value.trim(),
      contact: isAnon ? null : ($('#repPhone').value.trim() || null),
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
      if (emergencyModal?.classList.contains('active')) closeEmergencyModal();
      if (document.getElementById('mapLayoutContainer')?.classList.contains('map-fullscreen-active')) {
        toggleNeraFullscreenMap(false);
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

  // Emergency Vehicle Tracker Demo Toggle
  const btnVehicle = $('#btnToggleVehicleDemo');
  if (btnVehicle) {
    btnVehicle.onclick = () => {
      const active = vehicleTracker.toggle();
      btnVehicle.classList.toggle('active', active);
      const span = btnVehicle.querySelector('span');
      if (span) {
        span.textContent = active ? '🚑 Vehicle Tracker (Active)' : '🚑 Vehicle Tracker (Demo)';
      }
      if (active && activeLocation) {
        vehicleTracker.setTarget(activeLocation.lat, activeLocation.lng, activeLocation.name);
      }
    };
  }

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
  initEventHandlers();
  updateAuthUI();
  i18n.translateDOM();

  const [states, regional] = await Promise.all([monitoringService.getStates(), monitoringService.getRegionalStatus()]);
  stateData = states;
  if (regional) renderRegionalStatus(regional);
  const alerts = await monitoringService.getAlerts();
  $('#updateTime').textContent = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date());
  setupMap(stateData);
  vehicleTracker.init(map);
  showLocation(stateData[0]);
  renderTable(stateData);
  renderBars(stateData);
  renderAlerts(alerts);

  window.addEventListener('nera:language-changed', () => {
    i18n.translateDOM();
    if (stateData && stateData.length) {
      renderTable(stateData);
      if (activeLocation) showLocation(activeLocation);
      renderBars(stateData);
    }
    if (alertsData && alertsData.length) {
      renderAlerts(alertsData);
    }
    if (lastRegionalStatus) {
      renderRegionalStatus(lastRegionalStatus);
    }
  });

  await Promise.all([
    loadCommunityReports(),
    loadDataSources(),
    loadHistorical(),
    loadRoads(),
    updateAnalyticsSummary(),
    updatePredictionDisplay(stateData[0]?.short || 'ML')
  ]);
}

init().catch((error) => {
  console.error('Map/dashboard initialization failed:', error);
  $('#locationDetail').innerHTML = '<p class="error">Unable to initialize the map. Please check your connection and refresh the page.</p>';
});
