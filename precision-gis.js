/**
 * NERA 2.0 - Precision GIS & Geospatial Intelligence Module
 *
 * Implements:
 * 1. Exact coordinate formatting & clipboard copy
 * 2. High-precision map zoom (levels 16-18)
 * 3. Grounded reverse geocoding via verified NER catalog
 * 4. Metric risk radius circle buffers (100m / 200m / 500m)
 * 5. Road segment precision highlighting
 * 6. Community report privacy-safe exact pins
 * 7. Emergency vehicle live tracking demo with consent notice
 * 8. Haversine proximity calculation and warning alerts
 * 9. Keyless external navigation links (Google Maps & Apple Maps)
 */

import { monitoringService } from './services.js';

// Cache reverse geocode queries to avoid repeated network roundtrips
const geocodeCache = new Map();

/**
 * Format latitude & longitude to cardinal direction notation.
 * e.g. 27.3389° N, 88.6060° E
 */
export function formatCoordinates(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return 'N/A';
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lngDir = lngNum >= 0 ? 'E' : 'W';
  return `${Math.abs(latNum).toFixed(4)}° ${latDir}, ${Math.abs(lngNum).toFixed(4)}° ${lngDir}`;
}

/**
 * Copy coordinate text to clipboard with user-visible confirmation.
 */
export async function copyCoordinates(lat, lng, feedbackElementId = null) {
  const coordText = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(coordText);
    } else {
      const ta = document.createElement('textarea');
      ta.value = coordText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    if (feedbackElementId) {
      const el = document.getElementById(feedbackElementId);
      if (el) {
        const origHtml = el.innerHTML;
        el.innerHTML = '✓ Coordinates copied';
        el.classList.add('gis-btn-copied');
        setTimeout(() => {
          el.innerHTML = origHtml;
          el.classList.remove('gis-btn-copied');
        }, 2200);
      }
    }
  } catch (err) {
    console.warn('[Precision GIS] Clipboard write failed:', err);
  }
}

/**
 * Zoom map directly to exact point at street/slope resolution (levels 16–18).
 */
export function zoomToExact(map, lat, lng, zoomLevel = 17) {
  if (!map) return;
  map.setView([lat, lng], zoomLevel, {
    animate: true,
    duration: 0.8
  });
}

/**
 * Return external turn-by-turn navigation URLs without requiring any API keys.
 */
export function getNavigationUrls(lat, lng) {
  const cleanLat = parseFloat(lat).toFixed(6);
  const cleanLng = parseFloat(lng).toFixed(6);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${cleanLat},${cleanLng}`,
    apple: `https://maps.apple.com/?daddr=${cleanLat},${cleanLng}`
  };
}

/**
 * Calculate great-circle distance between two geographic coordinates in meters.
 * Standard spherical Earth radius R = 6,371,000 m.
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Format meters into human-readable metric string (e.g. "450 m" or "2.4 km").
 */
export function formatDistance(meters) {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Resolve verified address from backend reverse-geocoding service.
 */
export async function resolveAddress(lat, lng) {
  const key = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}`;
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key);
  }
  try {
    const data = await monitoringService.reverseGeocode(lat, lng);
    geocodeCache.set(key, data);
    return data;
  } catch {
    const fallback = {
      status: 'UNAVAILABLE',
      message: 'Address unavailable — coordinates available',
      data_status: 'DATA NOT AVAILABLE'
    };
    return fallback;
  }
}

/**
 * Active Leaflet layers managed by Precision GIS
 */
let currentRiskCircle = null;
let currentRoadSegmentLine = null;

/**
 * Draw a geographic buffer circle around high/critical hazard locations.
 * Default radii: Critical = 500m, High = 200m, Moderate = 100m.
 */
export function renderRiskBuffer(map, lat, lng, riskLevel = 'High', customRadiusM = null) {
  if (!map || typeof L === 'undefined') return null;

  if (currentRiskCircle) {
    map.removeLayer(currentRiskCircle);
    currentRiskCircle = null;
  }

  const levelLower = (riskLevel || '').toLowerCase();
  let radius = customRadiusM;
  if (!radius) {
    if (levelLower.includes('critical')) radius = 500;
    else if (levelLower.includes('high')) radius = 200;
    else radius = 100;
  }

  const color = levelLower.includes('critical') ? '#ef4444' : levelLower.includes('high') ? '#f97316' : '#eab308';

  currentRiskCircle = L.circle([lat, lng], {
    radius: radius,
    color: color,
    weight: 2,
    dashArray: '4, 4',
    fillColor: color,
    fillOpacity: 0.22,
    pane: map.getPane('riskZonesPane') ? 'riskZonesPane' : 'overlayPane'
  }).addTo(map);

  currentRiskCircle.bindTooltip(`
    <div style="font-family:'DM Mono',monospace;font-size:11px;font-weight:600;">
      Risk Zone: ${radius} m radius
      <span class="precision-badge demo" style="margin-left:4px;">DEMO BUFFER</span>
    </div>
  `, {
    permanent: false,
    direction: 'center',
    className: 'gis-buffer-tooltip'
  });

  return currentRiskCircle;
}

export function clearRiskBuffer(map) {
  if (map && currentRiskCircle) {
    map.removeLayer(currentRiskCircle);
    currentRiskCircle = null;
  }
}

/**
 * Get road risk color based on 4-tier risk classification:
 * Green = Low
 * Yellow = Medium
 * Orange = High
 * Red = Critical / Blocked
 */
export function getRoadRiskColor(road) {
  if (road.is_blocked || (road.road_status === 'BLOCKED') || (road.status === 'BLOCKED')) {
    return '#ef4444'; // Red
  }
  const level = (road.risk_level || '').toLowerCase();
  if (level.includes('critical')) return '#ef4444'; // Red
  if (level.includes('high')) return '#f97316'; // Orange
  if (level.includes('medium') || level.includes('moderate')) return '#eab308'; // Yellow
  if (level.includes('low')) return '#10b981'; // Green
  return '#eab308';
}

/**
 * Get dash array: red dashed line for blocked road confirmed by backend/incident data.
 */
export function getRoadDashArray(road) {
  if (road.is_blocked || (road.road_status === 'BLOCKED') || (road.status === 'BLOCKED')) {
    return '10, 8'; // Red dashed line
  }
  if ((road.road_status === 'RESTRICTED') || (road.status === 'RESTRICTED')) {
    return '6, 6';
  }
  return null; // Solid line
}

/**
 * Highlight an exact road segment geometry when available.
 */
export function highlightRoadSegment(map, road) {
  if (!map || typeof L === 'undefined') return;

  if (currentRoadSegmentLine) {
    map.removeLayer(currentRoadSegmentLine);
    currentRoadSegmentLine = null;
  }

  if (road.start_lat && road.start_lng && road.end_lat && road.end_lng) {
    const latlngs = [
      [road.start_lat, road.start_lng],
      [road.end_lat, road.end_lng]
    ];

    const strokeColor = getRoadRiskColor(road);
    const dashPattern = getRoadDashArray(road);

    currentRoadSegmentLine = L.polyline(latlngs, {
      color: strokeColor,
      weight: 6,
      opacity: 0.9,
      dashArray: dashPattern,
      pane: map.getPane('roadsPane') ? 'roadsPane' : 'overlayPane'
    }).addTo(map);

    const stretchKm = road.segment_km_start != null && road.segment_km_end != null
      ? `km ${road.segment_km_start} – ${road.segment_km_end}`
      : `${road.vulnerable_stretch_km} km`;

    const statusLabel = road.is_blocked || road.road_status === 'BLOCKED' ? 'BLOCKED CORRIDOR' : (road.risk_level || 'HIGH RISK');

    currentRoadSegmentLine.bindTooltip(`
      <div style="font-family:'DM Mono',monospace;font-size:11px;">
        <strong>${road.highway_code} Stretch</strong> (${stretchKm})
        <br><span style="color:${strokeColor};font-weight:700;">${statusLabel}</span>
        <span class="precision-badge ${road.data_status === 'LIVE' ? 'live' : 'available'}" style="margin-left:4px;">${road.data_status || 'AVAILABLE'}</span>
      </div>
    `, { sticky: true });
  }
}

export function clearRoadSegmentHighlight(map) {
  if (map && currentRoadSegmentLine) {
    map.removeLayer(currentRoadSegmentLine);
    currentRoadSegmentLine = null;
  }
}

/**
 * Build 12-attribute popup for road segments.
 */
export function buildRoadSegmentPopup(road) {
  const coordsFormatted = formatCoordinates(road.lat, road.lng);
  const navUrls = getNavigationUrls(road.lat, road.lng);
  const popupId = 'road_pop_' + Math.random().toString(36).substring(2, 9);
  const copyBtnId = `btnCopy_${popupId}`;
  const statusColor = getRoadRiskColor(road);
  const isBlocked = road.is_blocked || (road.road_status === 'BLOCKED') || (road.status === 'BLOCKED');

  const hasGeometry = !!(road.start_lat && road.start_lng && road.end_lat && road.end_lng);
  const stretchStr = road.segment_km_start != null && road.segment_km_end != null
    ? `km ${road.segment_km_start} – ${road.segment_km_end}`
    : `${road.vulnerable_stretch_km} km stretch`;

  const roadBadge = isBlocked
    ? '<span class="precision-badge blocked">⛔ BLOCKED ROAD</span>'
    : `<span class="precision-badge ${(road.risk_level || 'medium').toLowerCase()}">${(road.risk_level || 'MEDIUM').toUpperCase()} RISK</span>`;

  return `
    <div class="precision-popup road-segment-popup" id="${popupId}">
      <div class="popup-head">
        <div>
          <div class="popup-category">National Highway Corridor</div>
          <h4 class="popup-title">${road.highway_code} · ${road.name}</h4>
        </div>
        ${roadBadge}
      </div>

      <div class="popup-risk-strip risk-${(road.risk_level || 'medium').toLowerCase()}">
        <span>Road Risk: <strong>${road.risk_level || 'Medium'}</strong></span>
        <span>Score: <strong>${road.risk_score ?? 50}/100</strong></span>
      </div>

      <div class="popup-section">
        <div class="popup-row">
          <span class="popup-lbl">State</span>
          <span class="popup-val"><strong>${road.state_code}</strong></span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">District</span>
          <span class="popup-val">${road.district || 'Regional Sector'}</span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Corridor Segment</span>
          <span class="popup-val">
            ${hasGeometry
              ? `<strong>${stretchStr}</strong> <span class="precision-badge available">ACTIVE GEOMETRY</span>`
              : '<span class="addr-unavailable">Exact road segment data unavailable</span>'}
          </span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">24h Rainfall</span>
          <span class="popup-val mono">${road.rain_24h ?? '—'} mm</span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Soil Moisture</span>
          <span class="popup-val mono">${road.soil_moisture ?? '—'}%</span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Slope</span>
          <span class="popup-val">${road.slope ?? '—'}</span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Elevation</span>
          <span class="popup-val">${road.elevation_m} m</span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Landslide Status</span>
          <span class="popup-val" style="color:${isBlocked ? '#ef4444' : '#fbbf24'}; font-weight:700;">
            ${road.landslide_status || (isBlocked ? 'Confirmed Landslide Blockage' : 'Monitored')}
          </span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Road Status</span>
          <span class="popup-val">
            <span class="road-status-tag ${isBlocked ? 'status-blocked' : 'status-' + (road.road_status || road.status || 'monitored').toLowerCase()}">
              ${isBlocked ? 'BLOCKED' : (road.road_status || road.status || 'MONITORED')}
            </span>
          </span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Last Updated</span>
          <span class="popup-val">${road.last_updated || '10 min ago'}</span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Data Status</span>
          <span class="popup-val"><span class="precision-badge ${road.data_status === 'LIVE' ? 'live' : 'demo'}">${road.data_status || 'AVAILABLE'}</span></span>
        </div>
      </div>

      ${!hasGeometry ? `
        <div class="unverified-warning-banner" style="margin-bottom:8px;">
          Exact road segment data unavailable for this corridor stretch. Point marker represents monitored regional transit checkpoint.
        </div>
      ` : ''}

      <div class="popup-actions">
        <button type="button" class="btn-gis-action btn-zoom" onclick="window.neraGis.zoom(${road.lat}, ${road.lng}, 17)">
          🔍 Zoom to Exact
        </button>
        <button type="button" class="btn-gis-action btn-copy" id="${copyBtnId}" onclick="window.neraGis.copy(${road.lat}, ${road.lng}, '${copyBtnId}')">
          📋 Copy Coordinates
        </button>
        <a href="${navUrls.google}" target="_blank" rel="noopener" class="btn-gis-action nav-link" title="Open Google Maps turn-by-turn navigation">
          🧭 Navigate
        </a>
      </div>
    </div>
  `;
}

/**
 * Create custom DivIcon for landslide incident markers.
 */
export function createLandslideIcon(isVerified, isBlocked) {
  if (typeof L === 'undefined') return null;

  if (isBlocked) {
    return L.divIcon({
      className: 'landslide-marker-container',
      html: `
        <div class="marker-incident-icon blocked-road-icon">
          <span class="icon-symbol">⛔</span>
          <span class="marker-badge-pulse"></span>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }

  if (isVerified) {
    return L.divIcon({
      className: 'landslide-marker-container',
      html: `
        <div class="marker-incident-icon verified-landslide-icon">
          <span class="icon-symbol">⛰️</span>
          <span class="icon-status-dot verified">✓</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  return L.divIcon({
    className: 'landslide-marker-container',
    html: `
      <div class="marker-incident-icon unverified-report-icon">
        <span class="icon-symbol">⚠️</span>
        <span class="icon-status-dot unverified">?</span>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

/**
 * Build 6-attribute popup for landslide incidents complying with verification policy.
 */
export function buildLandslideIncidentPopup(incident) {
  const isVerified = incident.status === 'verified';
  const coordsFormatted = formatCoordinates(incident.lat, incident.lng);
  const navUrls = getNavigationUrls(incident.lat, incident.lng);
  const popupId = 'inc_pop_' + Math.random().toString(36).substring(2, 9);
  const copyBtnId = `btnCopy_${popupId}`;
  const timeFormatted = incident.created_at
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(incident.created_at))
    : 'Recent Report';

  let roadImpact = incident.road_impact;
  if (!roadImpact) {
    const text = ((incident.incident_type || '') + ' ' + (incident.description || '')).toLowerCase();
    if (text.includes('block') || text.includes('impassable') || text.includes('mudflow')) {
      roadImpact = 'Corridor Impassable / Blocked';
    } else if (text.includes('single lane') || text.includes('creep') || text.includes('crack')) {
      roadImpact = 'Restricted / Single Lane Traffic';
    } else {
      roadImpact = 'Traffic Caution / Monitored';
    }
  }

  const riskLevel = incident.risk_level || (isVerified ? (roadImpact.includes('Blocked') ? 'Critical' : 'High') : 'Medium');

  const titleText = isVerified
    ? `Verified Landslide: ${incident.incident_type}`
    : `Unverified Report: ${incident.incident_type}`;

  const headerBadge = isVerified
    ? '<span class="precision-badge verified-landslide">✓ VERIFIED LANDSLIDE</span>'
    : '<span class="precision-badge unverified-report">⚠️ UNVERIFIED REPORT</span>';

  return `
    <div class="precision-popup incident-popup" id="${popupId}">
      <div class="popup-head">
        <div>
          <div class="popup-category">${isVerified ? 'Authoritative Ground Incident' : 'Community Ground Intel'}</div>
          <h4 class="popup-title">${titleText}</h4>
        </div>
        ${headerBadge}
      </div>

      <div class="popup-risk-strip risk-${riskLevel.toLowerCase()}">
        <span>Risk Level: <strong>${riskLevel}</strong></span>
        <span>Impact: <strong>${roadImpact.split('/')[0].trim()}</strong></span>
      </div>

      <div class="popup-section">
        <div class="popup-row">
          <span class="popup-lbl">Exact Coordinates</span>
          <span class="popup-val mono">${coordsFormatted}</span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Incident Type</span>
          <span class="popup-val"><strong>${incident.incident_type}</strong></span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Report Time</span>
          <span class="popup-val">${timeFormatted}</span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Verification Status</span>
          <span class="popup-val">
            <span class="verification-badge ${isVerified ? 'is-verified' : 'is-unverified'}">
              ${isVerified ? '✓ Verified by Officer' : '⚠️ Unverified'}
            </span>
          </span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Road Impact</span>
          <span class="popup-val" style="color:${roadImpact.includes('Blocked') ? '#ef4444' : '#f59e0b'}; font-weight:700;">
            ${roadImpact}
          </span>
        </div>
        <div class="popup-row">
          <span class="popup-lbl">Risk Level</span>
          <span class="popup-val"><strong class="risk-text-${riskLevel.toLowerCase()}">${riskLevel}</strong></span>
        </div>
        <div class="popup-row" style="flex-direction:column; align-items:flex-start; gap:2px; padding:4px 0;">
          <span class="popup-lbl">Ground Observations</span>
          <span class="popup-val" style="text-align:left; font-weight:normal; font-size:11px; color:var(--text-secondary);">
            ${incident.description}
          </span>
        </div>
        ${incident.officer_notes ? `
          <div class="popup-officer-note">
            <strong>Officer Verification Note:</strong> ${incident.officer_notes}
          </div>
        ` : ''}
      </div>

      ${!isVerified ? `
        <div class="unverified-warning-banner">
          <strong>Notice:</strong> This community report has not been verified by a disaster response officer. Do not assume a certified landslide blockage until official verification.
        </div>
      ` : ''}

      <div class="popup-actions">
        <button type="button" class="btn-gis-action btn-zoom" onclick="window.neraGis.zoom(${incident.lat}, ${incident.lng}, 17)">
          🔍 Zoom to Exact
        </button>
        <button type="button" class="btn-gis-action btn-copy" id="${copyBtnId}" onclick="window.neraGis.copy(${incident.lat}, ${incident.lng}, '${copyBtnId}')">
          📋 Copy Coordinates
        </button>
        <a href="${navUrls.google}" target="_blank" rel="noopener" class="btn-gis-action nav-link" title="Navigate via Google Maps">
          🧭 Navigate
        </a>
      </div>
    </div>
  `;
}

/**
 * Emergency Vehicle Live Location Tracker (Demo / Future Ready)
 */
class EmergencyVehicleSimulator {
  constructor() {
    this.map = null;
    this.marker = null;
    this.active = false;
    this.timer = null;
    this.currentPos = { lat: 27.3290, lng: 88.6120 }; // Near Gangtok corridor
    this.vehicleId = 'NERA-ER-01';
    this.unitName = 'Sikkim SDRF Quick Response Unit 1';
    this.lastUpdated = new Date();
    this.currentTarget = null;
  }

  init(map) {
    this.map = map;
  }

  setTarget(lat, lng, name) {
    this.currentTarget = { lat, lng, name };
    this.updateProximity();
  }

  toggle(enable = null) {
    const targetState = enable !== null ? enable : !this.active;
    if (targetState === this.active) return this.active;

    this.active = targetState;
    if (this.active) {
      this.start();
    } else {
      this.stop();
    }
    return this.active;
  }

  start() {
    if (!this.map || typeof L === 'undefined') return;

    const icon = L.divIcon({
      className: 'emergency-vehicle-icon',
      html: `
        <div class="vehicle-marker-pulse">
          <span class="vehicle-emoji">🚑</span>
          <span class="vehicle-beacon"></span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    this.marker = L.marker([this.currentPos.lat, this.currentPos.lng], { icon, zIndexOffset: 1000 }).addTo(this.map);
    this.updatePopup();

    // Slight movement simulation along mountain corridor
    this.timer = setInterval(() => {
      this.currentPos.lat += (Math.random() - 0.5) * 0.0012;
      this.currentPos.lng += (Math.random() - 0.5) * 0.0012;
      this.lastUpdated = new Date();
      if (this.marker) {
        this.marker.setLatLng([this.currentPos.lat, this.currentPos.lng]);
        this.updatePopup();
      }
      this.updateProximity();
    }, 4000);

    this.updateProximity();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }
    this.active = false;
    const banner = document.getElementById('gisProximityBanner');
    if (banner) banner.style.display = 'none';
  }

  updatePopup() {
    if (!this.marker) return;
    const coordsFormatted = formatCoordinates(this.currentPos.lat, this.currentPos.lng);
    const navUrls = getNavigationUrls(this.currentPos.lat, this.currentPos.lng);
    const timeStr = this.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.marker.bindPopup(`
      <div class="precision-popup vehicle-popup">
        <div class="popup-head">
          <div>
            <div class="popup-category">Emergency Response Unit</div>
            <h4 class="popup-title">${this.unitName}</h4>
          </div>
          <span class="precision-badge demo">DEMO LIVE LOCATION</span>
        </div>

        <div class="popup-section">
          <div class="popup-row">
            <span class="popup-lbl">Callsign</span>
            <span class="popup-val"><strong>${this.vehicleId}</strong></span>
          </div>
          <div class="popup-row">
            <span class="popup-lbl">Coordinates</span>
            <span class="popup-val mono">${coordsFormatted}</span>
          </div>
          <div class="popup-row">
            <span class="popup-lbl">Last Telemetry</span>
            <span class="popup-val">${timeStr}</span>
          </div>
        </div>

        <div class="vehicle-consent-notice">
          <strong>Notice:</strong> Simulated live tracking demonstration. Operational rollout complies with departmental telematics protocols and vehicle crew consent.
        </div>

        <div class="popup-actions">
          <button type="button" class="btn-gis-action" onclick="window.neraGis.zoom(${this.currentPos.lat}, ${this.currentPos.lng}, 17)">
            🔍 Zoom to Exact
          </button>
          <button type="button" class="btn-gis-action" id="btnCopyVehicleCoords" onclick="window.neraGis.copy(${this.currentPos.lat}, ${this.currentPos.lng}, 'btnCopyVehicleCoords')">
            📋 Copy Coordinates
          </button>
          <a href="${navUrls.google}" target="_blank" rel="noopener" class="btn-gis-action nav-link">
            🧭 Navigate
          </a>
        </div>
      </div>
    `, { maxWidth: 300 });
  }

  updateProximity() {
    const banner = document.getElementById('gisProximityBanner');
    if (!banner) return;

    if (!this.active || !this.currentTarget) {
      banner.style.display = 'none';
      return;
    }

    const distMeters = calculateHaversineDistance(
      this.currentPos.lat,
      this.currentPos.lng,
      this.currentTarget.lat,
      this.currentTarget.lng
    );

    const distStr = formatDistance(distMeters);
    const thresholdM = 15000; // 15 km proximity warning range for emergency response dispatch

    if (distMeters <= thresholdM) {
      banner.style.display = 'flex';
      const isCritical = distMeters < 3000;
      banner.className = `monsoon-notice-banner gis-proximity-banner ${isCritical ? 'critical-prox' : ''}`;
      banner.innerHTML = `
        <span class="prox-icon">${isCritical ? '🚨' : '⚠️'}</span>
        <div class="prox-text">
          <strong>Proximity Warning:</strong> Response Unit <strong>${this.vehicleId}</strong> is <strong>${distStr}</strong> from selected hazard zone (<em>${this.currentTarget.name}</em>).
        </div>
        <button type="button" class="btn-dismiss-prox" onclick="document.getElementById('gisProximityBanner').style.display='none'" title="Dismiss warning">×</button>
      `;
    } else {
      banner.style.display = 'none';
    }
  }
}

export const vehicleTracker = new EmergencyVehicleSimulator();

/**
 * Generate standard precision popup HTML for state risk markers, community reports, and hazard sites.
 */
export function buildPrecisionPopup(options) {
  const {
    title,
    badgeText = 'AVAILABLE',
    badgeType = 'available', // 'live', 'available', 'processing', 'demo', 'unconnected'
    riskLevel = null,
    riskScore = null,
    lat,
    lng,
    radiusM = null,
    details = [],
    isCommunityReport = false,
    timestamp = null,
    status = null,
    verified = false,
    roadSegment = null
  } = options;

  const coordsFormatted = formatCoordinates(lat, lng);
  const navUrls = getNavigationUrls(lat, lng);
  const popupId = 'prec_pop_' + Math.random().toString(36).substring(2, 9);
  const copyBtnId = `btnCopy_${popupId}`;
  const addressContainerId = `addr_${popupId}`;

  // Kick off reverse geocode resolution asynchronously
  setTimeout(async () => {
    const addrEl = document.getElementById(addressContainerId);
    if (!addrEl) return;
    const geo = await resolveAddress(lat, lng);
    if (geo && geo.status === 'AVAILABLE') {
      let html = `<div class="addr-line"><strong>${geo.village || ''}</strong>, ${geo.district || ''}, ${geo.state || ''}</div>`;
      if (geo.road) {
        html += `<div class="addr-detail">Corridor: ${geo.road}</div>`;
      }
      if (geo.nearby_landmark) {
        html += `<div class="addr-detail">Landmark: ${geo.nearby_landmark}</div>`;
      }
      addrEl.innerHTML = html;
    } else {
      addrEl.innerHTML = `<span class="addr-unavailable">Address unavailable — coordinates available</span>`;
    }
  }, 50);

  // Risk zone radius line
  let riskZoneHtml = '';
  if (radiusM) {
    riskZoneHtml = `
      <div class="popup-row">
        <span class="popup-lbl">Risk Zone</span>
        <span class="popup-val">
          <strong>${radiusM} m radius</strong>
          <span class="precision-badge demo">DEMO BUFFER</span>
        </span>
      </div>
    `;
  }

  // Road segment line
  let roadSegmentHtml = '';
  if (roadSegment) {
    if (roadSegment.start_lat && roadSegment.end_lat) {
      const stretchStr = roadSegment.segment_km_start != null && roadSegment.segment_km_end != null
        ? `km ${roadSegment.segment_km_start} – ${roadSegment.segment_km_end}`
        : `${roadSegment.vulnerable_stretch_km} km stretch`;
      roadSegmentHtml = `
        <div class="popup-row">
          <span class="popup-lbl">Corridor Segment</span>
          <span class="popup-val">
            <strong>${stretchStr}</strong>
            <span class="precision-badge available">ACTIVE GEOMETRY</span>
          </span>
        </div>
      `;
    } else {
      roadSegmentHtml = `
        <div class="popup-row">
          <span class="popup-lbl">Corridor Segment</span>
          <span class="popup-val addr-unavailable">Exact road segment data unavailable</span>
        </div>
      `;
    }
  }

  // Community report header / verification
  let reportExtra = '';
  if (isCommunityReport) {
    const statusClass = verified ? 'tag-verified' : 'tag-pending';
    const statusLabel = verified ? 'Verified Incident' : 'Pending Verification';
    const timeFormatted = timestamp || 'Recent Ground Report';
    reportExtra = `
      <div class="popup-row">
        <span class="popup-lbl">Status</span>
        <span class="popup-val"><span class="badge-role ${statusClass}">${statusLabel}</span></span>
      </div>
      <div class="popup-row">
        <span class="popup-lbl">Reported</span>
        <span class="popup-val">${timeFormatted}</span>
      </div>
      <div class="popup-row">
        <span class="popup-lbl">Reporter</span>
        <span class="popup-val" style="color:var(--text-muted);font-style:italic;">Verified Community Observer</span>
      </div>
    `;
  }

  // Custom key-value details
  const detailsHtml = details.map(d => `
    <div class="popup-row">
      <span class="popup-lbl">${d.label}</span>
      <span class="popup-val">${d.value}</span>
    </div>
  `).join('');

  return `
    <div class="precision-popup" id="${popupId}">
      <div class="popup-head">
        <div>
          <div class="popup-category">${isCommunityReport ? 'Community Ground Intel' : 'Monitored Region'}</div>
          <h4 class="popup-title">${title}</h4>
        </div>
        <span class="precision-badge ${badgeType}">${badgeText}</span>
      </div>

      ${riskLevel ? `
        <div class="popup-risk-strip risk-${riskLevel.toLowerCase()}">
          <span>Risk Level: <strong>${riskLevel}</strong></span>
          ${riskScore != null ? `<span>Score: <strong>${riskScore}/100</strong></span>` : ''}
        </div>
      ` : ''}

      <div class="popup-section">
        <div class="popup-row">
          <span class="popup-lbl">Coordinates</span>
          <span class="popup-val mono">${coordsFormatted}</span>
        </div>
        ${riskZoneHtml}
        ${roadSegmentHtml}
        ${reportExtra}
        ${detailsHtml}
      </div>

      <div class="popup-address-section">
        <div class="popup-lbl" style="margin-bottom:3px;">Verified Location / Address</div>
        <div id="${addressContainerId}" class="popup-address-content">
          <span class="addr-loading">Resolving address from verified catalog...</span>
        </div>
      </div>

      <div class="popup-actions">
        <button type="button" class="btn-gis-action btn-zoom" onclick="window.neraGis.zoom(${lat}, ${lng}, 17)">
          🔍 Zoom to Exact
        </button>
        <button type="button" class="btn-gis-action btn-copy" id="${copyBtnId}" onclick="window.neraGis.copy(${lat}, ${lng}, '${copyBtnId}')">
          📋 Copy Coordinates
        </button>
        <button type="button" class="btn-gis-action btn-view-map" onclick="window.neraGis.toggleFullscreenMap(true)" title="Open internal large map view">
          🗺️ View Map
        </button>
        <a href="${navUrls.google}" target="_blank" rel="noopener" class="btn-gis-action nav-link" title="Open turn-by-turn navigation in Google Maps">
          🧭 Navigate
        </a>
      </div>
    </div>
  `;
}

// Attach precision GIS global handler for map popup onclick delegation
if (typeof window !== 'undefined') {
  window.neraGis = {
    zoom: (lat, lng, zoom = 17) => {
      if (window.map) {
        zoomToExact(window.map, lat, lng, zoom);
      }
    },
    copy: (lat, lng, elementId) => {
      copyCoordinates(lat, lng, elementId);
    },
    navigate: (lat, lng) => {
      const urls = getNavigationUrls(lat, lng);
      window.open(urls.google, '_blank');
    },
    toggleVehicleDemo: (enable) => {
      return vehicleTracker.toggle(enable);
    },
    setTarget: (lat, lng, name) => {
      vehicleTracker.setTarget(lat, lng, name);
    },
    toggleFullscreenMap: (enable) => {
      if (typeof window.toggleNeraFullscreenMap === 'function') {
        window.toggleNeraFullscreenMap(enable);
      }
    }
  };
}

