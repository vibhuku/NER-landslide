/**
 * NERA 2.0 - Advanced SIH26001 Features Controller
 * Modular client interface for:
 * - What-If Risk Simulator & Explainable AI (XAI)
 * - Evacuation Corridor & Safest Route Generator
 * - Top 10 High-Risk Hill Villages
 * - IoT Sensor Telemetry Monitor
 * - Multi-Channel Alert Dispatcher & Localized Voice Audio Alerts
 * - Officer Incident Command Portal & Situation Report Generator
 * - Community Emergency Volunteer Directory
 * - Crowd-Sourced Rainfall Validation
 * - Critical Infrastructure Map Layer
 * - Monsoon Mode Switcher
 */

import { i18n } from './i18n.js';
import { advancedService, authService } from './services.js';

class AdvancedFeaturesController {
  constructor() {
    this.map = null;
    this.routeLayerGroup = (typeof L !== 'undefined') ? L.layerGroup() : null;
    this.infraLayerGroup = (typeof L !== 'undefined') ? L.layerGroup() : null;
    this.sensorLayerGroup = (typeof L !== 'undefined') ? L.layerGroup() : null;
    this.currentMonsoonMode = 'monsoon';
    this.eventsBound = false;
  }

  openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    i18n.translateDOM();
  }

  closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  init(leafletMap) {
    this.map = leafletMap;
    if (this.map && typeof L !== 'undefined') {
      if (!this.routeLayerGroup) {
        this.routeLayerGroup = L.layerGroup();
      }
      this.routeLayerGroup.addTo(this.map);
      if (!this.infraLayerGroup) {
        this.infraLayerGroup = L.layerGroup();
      }
      if (!this.sensorLayerGroup) {
        this.sensorLayerGroup = L.layerGroup();
      }
      this.loadInfrastructureMapLayer();
    }
    this.bindUIEvents();
  }

  bindUIEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;
    // Language selector
    const langSelect = document.getElementById('langSelector');
    if (langSelect) {
      langSelect.value = i18n.getLanguage();
      langSelect.addEventListener('change', (e) => {
        i18n.setLanguage(e.target.value);
      });
    }

    // Monsoon mode selector
    const monsoonSelect = document.getElementById('monsoonModeSelector');
    if (monsoonSelect) {
      monsoonSelect.value = this.currentMonsoonMode;
      monsoonSelect.addEventListener('change', (e) => {
        this.currentMonsoonMode = e.target.value;
        this.notifyMonsoonChange();
      });
    }

    // Tools Dropdown Toggle
    const btnTools = document.getElementById('btnToolsDropdown');
    const menuTools = document.getElementById('toolsDropdownMenu');
    if (btnTools && menuTools) {
      btnTools.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = menuTools.style.display === 'none';
        menuTools.style.display = isHidden ? 'flex' : 'none';
        btnTools.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      });

      document.addEventListener('click', (e) => {
        if (!menuTools.contains(e.target) && e.target !== btnTools) {
          menuTools.style.display = 'none';
          btnTools.setAttribute('aria-expanded', 'false');
        }
      });

      menuTools.querySelectorAll('.dropdown-tool-item').forEach(item => {
        item.addEventListener('click', () => {
          menuTools.style.display = 'none';
          btnTools.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // Modal Triggers
    const btnWhatIf = document.getElementById('btnOpenWhatIf');
    if (btnWhatIf) btnWhatIf.addEventListener('click', () => this.openWhatIfModal());

    const btnSafestRoute = document.getElementById('btnOpenSafestRoute');
    if (btnSafestRoute) btnSafestRoute.addEventListener('click', () => this.openSafestRouteModal());

    const btnTopVillages = document.getElementById('btnOpenTopVillages');
    if (btnTopVillages) btnTopVillages.addEventListener('click', () => this.openTopVillagesModal());

    const btnSensors = document.getElementById('btnOpenSensors');
    if (btnSensors) btnSensors.addEventListener('click', () => this.openSensorsModal());

    const btnOfficerPortal = document.getElementById('btnOpenOfficerPortal');
    if (btnOfficerPortal) btnOfficerPortal.addEventListener('click', () => this.openOfficerPortalModal());

    const btnVolunteers = document.getElementById('btnOpenVolunteers');
    if (btnVolunteers) btnVolunteers.addEventListener('click', () => this.openVolunteersModal());

    const btnDispatchDemo = document.getElementById('btnOpenDispatchDemo');
    if (btnDispatchDemo) btnDispatchDemo.addEventListener('click', () => this.openDispatchDemoModal());

    // Listen for language changes to update dynamic modals if opened
    window.addEventListener('nera:language-changed', () => {
      // Re-translate DOM
      i18n.translateDOM();
    });
  }

  notifyMonsoonChange() {
    const labels = {
      pre_monsoon: 'Pre-Monsoon (Thresholds Relaxed by 15%)',
      monsoon: 'Peak Monsoon Mode (Active Strict Thresholds)',
      post_monsoon: 'Post-Monsoon (Residual Saturation Monitored)'
    };
    const banner = document.getElementById('monsoonNoticeBanner');
    if (banner) {
      banner.textContent = labels[this.currentMonsoonMode] || 'Monsoon Mode Active';
      banner.style.display = 'block';
      setTimeout(() => {
        if (banner) banner.style.display = 'none';
      }, 4000);
    }
  }

  // --- 1. Critical Infrastructure Layer ---
  async loadInfrastructureMapLayer() {
    if (!this.map || !this.infraLayerGroup) return;
    try {
      const items = await advancedService.getInfrastructure();
      this.infraLayerGroup.clearLayers();

      const icons = {
        Hospital: '🏥',
        Shelter: '🏕️',
        Bridge: '🌉',
        Substation: '⚡',
        Default: '📍'
      };

      items.forEach(pt => {
        const iconChar = icons[pt.category] || icons.Default;
        const icon = L.divIcon({
          className: 'infra-marker-icon',
          html: `<div style="background:#1e293b;border:2px solid #38bdf8;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${iconChar}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([pt.lat, pt.lng], { icon });
        marker.bindPopup(`
          <div style="font-family:inherit;min-width:180px;">
            <div style="font-size:10px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.5px;">${pt.category} · ${pt.state_code}</div>
            <strong style="display:block;font-size:13px;margin:2px 0 6px;">${pt.name}</strong>
            <div style="font-size:11px;color:var(--text-secondary, #94a3b8);line-height:1.4;">
              ${pt.capacity_beds ? `<div>🛏️ Capacity: <b>${pt.capacity_beds} beds</b></div>` : ''}
              ${pt.emergency_shelter ? `<div>🛡️ <b>Designated Relief Center</b></div>` : ''}
              <div style="font-size:10px;color:#64748b;margin-top:4px;">Coord: ${pt.lat.toFixed(3)}, ${pt.lng.toFixed(3)}</div>
            </div>
          </div>
        `);
        this.infraLayerGroup.addLayer(marker);
      });
    } catch (e) {
      console.warn('Could not load infrastructure points layer', e);
    }
  }

  toggleInfrastructureLayer(visible) {
    if (!this.map || !this.infraLayerGroup) return;
    if (visible) {
      this.infraLayerGroup.addTo(this.map);
    } else {
      this.map.removeLayer(this.infraLayerGroup);
    }
  }

  // --- 2. What-If Risk Simulator ---
  openWhatIfModal() {
    let modal = document.getElementById('whatIfModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'whatIfModal';
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 680px;">
          <div class="modal-head">
            <div>
              <p class="eyebrow" data-i18n="lbl_xai_factors">What-If Risk Simulation & XAI</p>
              <h3 data-i18n="modal_whatif_title">Interactive What-If Landslide Simulator</h3>
            </div>
            <button class="modal-close" id="btnCloseWhatIf">&times;</button>
          </div>
          <div style="padding: 16px 20px;">
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;" data-i18n="modal_whatif_desc">
              Adjust environmental stress variables to simulate dynamic slope response in mountain catchments.
            </p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
              <div class="form-group">
                <label style="display:flex;justify-content:space-between;font-size:12px;">
                  <span>24h Rainfall Accumulation</span>
                  <b id="valRainfall" style="font-family:'DM Mono',monospace;color:#38bdf8;">140 mm</b>
                </label>
                <input type="range" id="sliderRainfall" min="0" max="300" step="5" value="140" style="width:100%;">
              </div>
              <div class="form-group">
                <label style="display:flex;justify-content:space-between;font-size:12px;">
                  <span>Soil Moisture Saturation</span>
                  <b id="valSoil" style="font-family:'DM Mono',monospace;color:#38bdf8;">85 %</b>
                </label>
                <input type="range" id="sliderSoil" min="10" max="100" step="1" value="85" style="width:100%;">
              </div>
              <div class="form-group">
                <label style="display:flex;justify-content:space-between;font-size:12px;">
                  <span>Hillslope Angle</span>
                  <b id="valSlope" style="font-family:'DM Mono',monospace;color:#38bdf8;">42°</b>
                </label>
                <input type="range" id="sliderSlope" min="10" max="75" step="1" value="42" style="width:100%;">
              </div>
              <div class="form-group">
                <label style="font-size:12px;margin-bottom:6px;display:block;">Season / Monsoon Mode</label>
                <select id="simMonsoonMode" class="form-control" style="font-size:12px;padding:6px 10px;">
                  <option value="monsoon" selected>Peak Monsoon (Strict Saturation)</option>
                  <option value="pre_monsoon">Pre-Monsoon (Early Shower)</option>
                  <option value="post_monsoon">Post-Monsoon (Residual Moisture)</option>
                </select>
              </div>
            </div>

            <!-- Simulation Output Card -->
            <div id="simResultCard" style="background:rgba(15,23,42,0.6);border:1px solid var(--border-subtle);border-radius:8px;padding:14px;margin-top:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div>
                  <span style="font-size:10px;text-transform:uppercase;color:var(--text-secondary);letter-spacing:0.5px;">Projected Landslide Hazard Score</span>
                  <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px;">
                    <span id="simRiskScore" style="font-size:28px;font-weight:800;font-family:'DM Mono',monospace;color:#ef4444;">86</span>
                    <span id="simRiskLevel" class="badge-role" style="background:rgba(239,68,68,0.2);color:#ef4444;font-weight:700;">Critical</span>
                    <small id="simDeltaText" style="font-size:11px;color:#94a3b8;">(+41 from baseline)</small>
                  </div>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;">Primary Trigger</span>
                  <div id="simTriggerText" style="font-size:12px;font-weight:700;color:#f59e0b;margin-top:2px;">Antecedent Rainfall</div>
                </div>
              </div>

              <!-- Explainable AI Factor Breakdown -->
              <div style="margin-top:12px;border-top:1px solid var(--border-subtle);padding-top:10px;">
                <div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:8px;" data-i18n="lbl_xai_factors">
                  Explainable AI (XAI) Factor Contribution
                </div>
                <div id="simFactorsContainer" style="display:flex;flex-direction:column;gap:8px;"></div>
              </div>

              <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;background:rgba(239,68,68,0.08);padding:8px 12px;border-radius:6px;">
                <span style="font-size:11px;color:var(--text-secondary);">Downstream Debris Cascade Risk:</span>
                <strong id="simCascadeProb" style="font-size:12px;color:#ef4444;">73% Probability</strong>
              </div>

              <div style="margin-top:10px;font-size:11px;color:var(--text-secondary);line-height:1.4;">
                <span style="color:#38bdf8;font-weight:700;">Recommended Action:</span>
                <span id="simActionText">Immediate evacuation of downslope settlements; suspend NH vehicular transit.</span>
              </div>
            </div>

            <div class="modal-actions" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
              <span class="status-indicator" style="font-size:10px;font-family:'DM Mono',monospace;">DEMO / SIMULATED</span>
              <div style="display:flex;gap:8px;">
                <button type="button" class="btn-primary" id="btnApplySimToMap" style="font-size:11px;">Highlight Critical Slopes on Map</button>
                <button type="button" class="btn-secondary" id="btnCloseWhatIfBtn" style="font-size:11px;">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Event listeners for sliders
      const rSlider = document.getElementById('sliderRainfall');
      const sSlider = document.getElementById('sliderSoil');
      const slSlider = document.getElementById('sliderSlope');
      const mSelect = document.getElementById('simMonsoonMode');

      const triggerSim = () => {
        document.getElementById('valRainfall').textContent = `${rSlider.value} mm`;
        document.getElementById('valSoil').textContent = `${sSlider.value} %`;
        document.getElementById('valSlope').textContent = `${slSlider.value}°`;

        this.runSimulation({
          rainfall_24h_mm: parseFloat(rSlider.value),
          soil_moisture_pct: parseFloat(sSlider.value),
          slope_deg: parseFloat(slSlider.value),
          monsoon_mode: mSelect.value
        });
      };

      rSlider.addEventListener('input', triggerSim);
      sSlider.addEventListener('input', triggerSim);
      slSlider.addEventListener('input', triggerSim);
      mSelect.addEventListener('change', triggerSim);

      document.getElementById('btnCloseWhatIf').onclick = () => this.closeModal(modal);
      document.getElementById('btnCloseWhatIfBtn').onclick = () => this.closeModal(modal);
      document.getElementById('btnApplySimToMap').onclick = () => {
        this.closeModal(modal);
        if (this.map) {
          this.map.flyTo([25.5788, 91.8933], 9, { duration: 1.2 });
        }
      };
      modal.onclick = (e) => {
        if (e.target === modal) this.closeModal(modal);
      };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) this.closeModal(modal);
      });
    }

    this.openModal(modal);
    // Initial run
    const rSlider = document.getElementById('sliderRainfall');
    const sSlider = document.getElementById('sliderSoil');
    const slSlider = document.getElementById('sliderSlope');
    const mSelect = document.getElementById('simMonsoonMode');
    this.runSimulation({
      rainfall_24h_mm: parseFloat(rSlider.value),
      soil_moisture_pct: parseFloat(sSlider.value),
      slope_deg: parseFloat(slSlider.value),
      monsoon_mode: mSelect.value
    });
  }

  async runSimulation(payload) {
    try {
      const res = await advancedService.simulateWhatIf(payload);
      
      const scoreEl = document.getElementById('simRiskScore');
      const levelEl = document.getElementById('simRiskLevel');
      const deltaEl = document.getElementById('simDeltaText');
      const triggerEl = document.getElementById('simTriggerText');
      const cascadeEl = document.getElementById('simCascadeProb');
      const actionEl = document.getElementById('simActionText');
      const factorsBox = document.getElementById('simFactorsContainer');

      if (!scoreEl) return;

      scoreEl.textContent = res.risk_score;
      levelEl.textContent = res.risk_level;
      deltaEl.textContent = `(${res.delta_from_baseline >= 0 ? '+' : ''}${res.delta_from_baseline} from baseline)`;
      triggerEl.textContent = res.primary_trigger;
      cascadeEl.textContent = `${res.cascade_probability_pct}% Probability`;
      actionEl.textContent = res.recommended_action;

      // Colors
      const colorMap = {
        Low: '#22c55e',
        Moderate: '#eab308',
        High: '#f97316',
        Critical: '#ef4444'
      };
      const col = colorMap[res.risk_level] || '#ef4444';
      scoreEl.style.color = col;
      levelEl.style.color = col;
      levelEl.style.background = `${col}22`;

      // Render XAI factors bars
      factorsBox.innerHTML = '';
      res.factors.forEach(f => {
        const item = document.createElement('div');
        item.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
            <span>${f.factor}</span>
            <b style="font-family:'DM Mono',monospace;">${f.contribution_pct}%</b>
          </div>
          <div style="background:rgba(255,255,255,0.1);height:6px;border-radius:3px;overflow:hidden;">
            <div style="background:${col};width:${f.contribution_pct}%;height:100%;border-radius:3px;transition:width 0.3s ease;"></div>
          </div>
          <small style="font-size:10px;color:#94a3b8;display:block;margin-top:2px;">${f.description}</small>
        `;
        factorsBox.appendChild(item);
      });
    } catch (e) {
      console.warn('Simulation API failed', e);
    }
  }

  // --- 3. Safest Route & Evacuation Corridor ---
  openSafestRouteModal() {
    let modal = document.getElementById('safestRouteModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'safestRouteModal';
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 640px;">
          <div class="modal-head">
            <div>
              <p class="eyebrow" data-i18n="nav_evac">Disaster Response Routing</p>
              <h3 data-i18n="modal_evac_title">Evacuation Corridor & Safest Route</h3>
            </div>
            <button class="modal-close" id="btnCloseSafestRoute">&times;</button>
          </div>
          <div style="padding: 16px 20px;">
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;" data-i18n="modal_evac_desc">
              Computes a landslide-free mountain bypass corridor avoiding blocked highway stretches (NH-6 / NH-29) and active debris flow alerts.
            </p>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
              <div class="form-group">
                <label style="font-size:12px;">Origin Settlement</label>
                <input type="text" id="routeOrigin" class="form-control" value="East Khasi Hills (Shillong)" readonly style="font-size:12px;">
              </div>
              <div class="form-group">
                <label style="font-size:12px;">Destination Safety Node</label>
                <input type="text" id="routeDest" class="form-control" value="Guwahati Regional Relief Center" readonly style="font-size:12px;">
              </div>
            </div>

            <div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;">
              <input type="checkbox" id="chkAvoidBlocked" checked style="accent-color:#38bdf8;">
              <label for="chkAvoidBlocked" style="font-size:12px;color:var(--text-secondary);">
                Actively bypass reported road blockages &amp; unstable hill crests
              </label>
            </div>

            <button type="button" class="btn-primary" id="btnComputeRoute" style="width:100%;margin-bottom:14px;">
              Compute &amp; Display Safest Mountain Corridor
            </button>

            <!-- Route Summary Card -->
            <div id="routeResultsCard" style="display:none;background:rgba(15,23,42,0.6);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div>
                  <span style="font-size:10px;text-transform:uppercase;color:var(--text-secondary);">Route Safety Rating</span>
                  <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
                    <span id="routeSafetyScore" style="font-size:24px;font-weight:800;color:#22c55e;font-family:'DM Mono',monospace;">88/100</span>
                    <span class="badge-role" style="background:rgba(34,197,94,0.2);color:#22c55e;">Low Risk Corridor</span>
                  </div>
                </div>
                <div style="text-align:right;">
                  <span style="font-size:10px;text-transform:uppercase;color:var(--text-secondary);">Estimated Transit</span>
                  <div id="routeEstTime" style="font-size:14px;font-weight:700;color:#38bdf8;margin-top:2px;">2h 15m (101 km)</div>
                </div>
              </div>

              <div style="font-size:11px;color:#94a3b8;margin-bottom:10px;">
                🛡️ <b>2 Blocked Mountain Sections Bypassed</b> (NH-6 km 42 debris point avoided).
              </div>

              <div style="border-top:1px solid var(--border-subtle);padding-top:8px;">
                <span style="font-size:11px;font-weight:700;color:var(--text-primary);display:block;margin-bottom:6px;">Emergency Shelters &amp; Triage en Route:</span>
                <ul id="routeSheltersList" style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px;font-size:11px;color:var(--text-secondary);">
                </ul>
              </div>
            </div>

            <div class="modal-actions" style="display:flex;justify-content:space-between;align-items:center;">
              <span class="status-indicator" style="font-size:10px;font-family:'DM Mono',monospace;">DEMO / SIMULATED</span>
              <div style="display:flex;gap:8px;">
                <button type="button" class="btn-secondary" id="btnClearRouteBtn" style="font-size:11px;">Clear Map Route</button>
                <button type="button" class="btn-primary" id="btnCloseSafestRouteBtn" style="font-size:11px;">Close</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btnCloseSafestRoute').onclick = () => this.closeModal(modal);
      document.getElementById('btnCloseSafestRouteBtn').onclick = () => this.closeModal(modal);
      document.getElementById('btnClearRouteBtn').onclick = () => {
        if (this.routeLayerGroup) this.routeLayerGroup.clearLayers();
        document.getElementById('routeResultsCard').style.display = 'none';
      };
      modal.onclick = (e) => {
        if (e.target === modal) this.closeModal(modal);
      };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) this.closeModal(modal);
      });

      document.getElementById('btnComputeRoute').onclick = async () => {
        const btn = document.getElementById('btnComputeRoute');
        btn.textContent = 'Calculating optimal terrain path...';
        btn.disabled = true;
        try {
          const res = await advancedService.getSafestRoute({
            origin: { lat: 25.5788, lng: 91.8933 }, // Shillong
            destination: { lat: 26.1445, lng: 91.7362 }, // Guwahati
            avoid_blocked_roads: document.getElementById('chkAvoidBlocked').checked
          });

          // Show results card
          const card = document.getElementById('routeResultsCard');
          card.style.display = 'block';
          document.getElementById('routeSafetyScore').textContent = `${res.safety_score}/100`;
          document.getElementById('routeEstTime').textContent = `${Math.floor(res.estimated_time_min / 60)}h ${res.estimated_time_min % 60}m (${res.total_distance_km} km)`;

          const sList = document.getElementById('routeSheltersList');
          sList.innerHTML = '';
          if (res.shelters_en_route && res.shelters_en_route.length > 0) {
            res.shelters_en_route.forEach(s => {
              const li = document.createElement('li');
              li.innerHTML = `📍 <b>${s.name}</b> (${s.category}) — Capacity: ${s.capacity_beds || 50} beds`;
              sList.appendChild(li);
            });
          } else {
            sList.innerHTML = '<li>📍 Shillong Civil Hospital &amp; Nongpoh Transit Relief Center</li>';
          }

          // Draw path on Leaflet map
          const activeMap = this.map || window.map;
          if (activeMap) {
            if (!this.routeLayerGroup && typeof L !== 'undefined') {
              this.routeLayerGroup = L.layerGroup().addTo(activeMap);
            }
            if (this.routeLayerGroup) {
              this.routeLayerGroup.clearLayers();
              const polyline = L.polyline(res.safe_path, {
                color: '#10b981',
                weight: 5,
                opacity: 0.9,
                dashArray: '8, 8'
              }).addTo(this.routeLayerGroup);

              // Add start & end markers
              L.marker(res.safe_path[0]).bindPopup('<b>Evacuation Origin</b>: Shillong').addTo(this.routeLayerGroup);
              L.marker(res.safe_path[res.safe_path.length - 1]).bindPopup('<b>Safety Node</b>: Guwahati Safe Zone').addTo(this.routeLayerGroup);

              activeMap.fitBounds(polyline.getBounds(), { padding: [40, 40] });
            }
          }
        } catch (err) {
          console.error('Safest route error', err);
          alert('Could not compute evacuation corridor. Please try again.');
        } finally {
          btn.textContent = 'Compute & Display Safest Mountain Corridor';
          btn.disabled = false;
        }
      };
    }
    this.openModal(modal);
  }

  // --- 4. Top 10 High-Risk Hill Villages ---
  async openTopVillagesModal() {
    let modal = document.getElementById('topVillagesModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'topVillagesModal';
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 720px;">
          <div class="modal-head">
            <div>
              <p class="eyebrow" data-i18n="nav_villages">Vulnerable Human Settlements</p>
              <h3 data-i18n="modal_villages_title">Top 10 High-Risk Hill Villages</h3>
            </div>
            <button class="modal-close" id="btnCloseTopVillages">&times;</button>
          </div>
          <div style="padding: 16px 20px;">
            <div id="villageStatsBanner" style="display:flex;gap:14px;margin-bottom:14px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:10px 14px;">
              <div>
                <small style="font-size:10px;text-transform:uppercase;color:#ef4444;font-weight:700;">Total Pop. at Critical Risk</small>
                <div id="villageTotalPop" style="font-size:18px;font-weight:800;font-family:'DM Mono',monospace;color:var(--text-primary);">--</div>
              </div>
              <div style="border-left:1px solid rgba(239,68,68,0.3);padding-left:14px;">
                <small style="font-size:10px;text-transform:uppercase;color:#ef4444;font-weight:700;">Critical Settlements</small>
                <div id="villageCriticalCount" style="font-size:18px;font-weight:800;font-family:'DM Mono',monospace;color:var(--text-primary);">--</div>
              </div>
            </div>

            <div style="overflow-x:auto;max-height:55vh;">
              <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border-medium);color:var(--text-secondary);">
                    <th style="padding:6px 8px;">Village Name</th>
                    <th style="padding:6px 8px;">State / District</th>
                    <th style="padding:6px 8px;">Population</th>
                    <th style="padding:6px 8px;">Slope</th>
                    <th style="padding:6px 8px;">Risk Score</th>
                    <th style="padding:6px 8px;">Action</th>
                  </tr>
                </thead>
                <tbody id="villagesTableBody">
                  <tr><td colspan="6" style="padding:14px;text-align:center;">Loading settlements...</td></tr>
                </tbody>
              </table>
            </div>

            <div class="modal-actions" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
              <span class="status-indicator" style="font-size:10px;font-family:'DM Mono',monospace;">AVAILABLE (NER Ground Registry)</span>
              <button type="button" class="btn-primary" id="btnCloseTopVillagesBtn" style="font-size:11px;">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btnCloseTopVillages').onclick = () => this.closeModal(modal);
      document.getElementById('btnCloseTopVillagesBtn').onclick = () => this.closeModal(modal);
      modal.onclick = (e) => {
        if (e.target === modal) this.closeModal(modal);
      };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) this.closeModal(modal);
      });
    }

    this.openModal(modal);
    try {
      const data = await advancedService.getTopRiskVillages(10);
      document.getElementById('villageTotalPop').textContent = (data.total_population_at_risk || 0).toLocaleString();
      document.getElementById('villageCriticalCount').textContent = data.critical_villages_count || 0;

      const tbody = document.getElementById('villagesTableBody');
      tbody.innerHTML = '';
      data.villages.forEach(v => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-subtle)';
        
        const riskBadge = v.risk_score >= 80 
          ? `<span style="background:#ef444422;color:#ef4444;padding:2px 6px;border-radius:4px;font-weight:700;">${v.risk_score} (Critical)</span>`
          : `<span style="background:#f9731622;color:#f97316;padding:2px 6px;border-radius:4px;font-weight:700;">${v.risk_score} (High)</span>`;

        tr.innerHTML = `
          <td style="padding:8px;font-weight:600;">${v.name}</td>
          <td style="padding:8px;color:var(--text-secondary);">${v.district}, ${v.state_code}</td>
          <td style="padding:8px;font-family:'DM Mono',monospace;">${v.population.toLocaleString()}</td>
          <td style="padding:8px;font-family:'DM Mono',monospace;">${v.slope_deg}°</td>
          <td style="padding:8px;">${riskBadge}</td>
          <td style="padding:8px;">
            <button type="button" class="btn-secondary btn-fly-village" data-lat="${v.lat}" data-lng="${v.lng}" data-name="${v.name}" style="padding:3px 8px;font-size:10px;">
              📍 View
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind fly buttons
      modal.querySelectorAll('.btn-fly-village').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const lat = parseFloat(e.currentTarget.getAttribute('data-lat'));
          const lng = parseFloat(e.currentTarget.getAttribute('data-lng'));
          const name = e.currentTarget.getAttribute('data-name');
          this.closeModal(modal);
          const activeMap = this.map || window.map;
          if (activeMap) {
            activeMap.flyTo([lat, lng], 13, { duration: 1.5 });
            if (typeof L !== 'undefined') {
              L.popup().setLatLng([lat, lng]).setContent(`<b>${name}</b><br>High-Risk Settlement`).openOn(activeMap);
            }
          }
        });
      });
    } catch (err) {
      console.error('Failed to load top villages', err);
    }
  }

  // --- 5. IoT Sensor Ground Stations ---
  async openSensorsModal() {
    let modal = document.getElementById('sensorsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'sensorsModal';
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 720px;">
          <div class="modal-head">
            <div>
              <p class="eyebrow" data-i18n="nav_sensors">Real-Time In-Situ Telemetry</p>
              <h3 data-i18n="modal_sensors_title">IoT Ground Sensor Telemetry Network</h3>
            </div>
            <button class="modal-close" id="btnCloseSensors">&times;</button>
          </div>
          <div style="padding: 16px 20px;">
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">
              Solar-powered wireless mesh telemetry (LoRaWAN &amp; NB-IoT) deployed at critical hill pass bottlenecks and rail corridors.
            </p>

            <div id="sensorsContainer" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-height:55vh;overflow-y:auto;">
              <div style="padding:20px;text-align:center;grid-column:span 2;">Loading sensor network telemetry...</div>
            </div>

            <div class="modal-actions" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
              <span class="status-indicator" style="font-size:10px;font-family:'DM Mono',monospace;">DEMO / SIMULATED</span>
              <button type="button" class="btn-primary" id="btnCloseSensorsBtn" style="font-size:11px;">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btnCloseSensors').onclick = () => this.closeModal(modal);
      document.getElementById('btnCloseSensorsBtn').onclick = () => this.closeModal(modal);
      modal.onclick = (e) => {
        if (e.target === modal) this.closeModal(modal);
      };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) this.closeModal(modal);
      });
    }

    this.openModal(modal);
    try {
      const data = await advancedService.getSensors();
      const container = document.getElementById('sensorsContainer');
      container.innerHTML = '';

      data.stations.forEach(st => {
        const card = document.createElement('div');
        card.style.background = 'rgba(15,23,42,0.6)';
        card.style.border = '1px solid var(--border-subtle)';
        card.style.borderRadius = '8px';
        card.style.padding = '12px';

        const statusColors = {
          ONLINE: '#22c55e',
          WARNING: '#f59e0b',
          ALERT: '#ef4444'
        };
        const col = statusColors[st.status] || '#22c55e';

        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
            <div>
              <span style="font-size:10px;font-family:'DM Mono',monospace;color:#38bdf8;">${st.id} · ${st.state_code}</span>
              <strong style="display:block;font-size:12px;margin-top:1px;">${st.station_name}</strong>
            </div>
            <span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:${col}22;color:${col};">${st.status}</span>
          </div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">
            <div>📡 ${st.connectivity}</div>
            <div>⚡ Battery: <b>${st.battery_pct}%</b> · Ping: <i>${st.last_ping}</i></div>
          </div>
          <div style="background:rgba(255,255,255,0.05);padding:6px 8px;border-radius:4px;font-family:'DM Mono',monospace;font-size:11px;color:#e2e8f0;margin-bottom:6px;">
            ${st.reading_current}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#94a3b8;">
            <span>Pore: ${st.pore_pressure_kpa} kPa</span>
            <span>Tilt: ${st.tilt_angle_deg}°</span>
            <span>Moist: ${st.soil_saturation_pct}%</span>
          </div>
        `;
        container.appendChild(card);
      });
    } catch (err) {
      console.error('Failed to load sensors', err);
    }
  }

  // --- 6. Multi-Channel Alert Dispatcher & Voice Alert Demo ---
  openDispatchDemoModal() {
    let modal = document.getElementById('dispatchModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dispatchModal';
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 620px;">
          <div class="modal-head">
            <div>
              <p class="eyebrow">Disaster Broadcast Subsystem</p>
              <h3>Multi-Channel Early Warning Dispatcher</h3>
            </div>
            <button class="modal-close" id="btnCloseDispatch">&times;</button>
          </div>
          <div style="padding: 16px 20px;">
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">
              Demonstrates multi-modal alert dissemination across telecom SMS gateways, WhatsApp Cloud API, Web Push, and localized voice IVR audio.
            </p>

            <div class="form-group" style="margin-bottom:12px;">
              <label style="font-size:12px;">Alert Message Content (Auto-Translated)</label>
              <textarea id="dispatchMsgText" class="form-control" rows="3" style="font-size:12px;">EMERGENCY WARNING: Torrential rainfall has exceeded the critical geotechnical threshold in East Khasi Hills. Evacuate downslope locations immediately.</textarea>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
              <div>
                <label style="font-size:11px;font-weight:700;display:block;margin-bottom:6px;">Target Delivery Channels</label>
                <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;color:var(--text-secondary);">
                  <label><input type="checkbox" id="chkSms" checked> 📱 SMS (NIC/CDAC Gateway Demo)</label>
                  <label><input type="checkbox" id="chkWa" checked> 💬 WhatsApp Business Cloud (Demo)</label>
                  <label><input type="checkbox" id="chkPush" checked> 🔔 Browser Web Push (VAPID)</label>
                  <label><input type="checkbox" id="chkIvr" checked> 📞 Telecom Voice Call IVR (Demo)</label>
                </div>
              </div>
              <div>
                <label style="font-size:11px;font-weight:700;display:block;margin-bottom:6px;">Local Voice Alert Synthesizer</label>
                <p style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">
                  Play synthesized audio alert in current interface language (${i18n.getLanguage().toUpperCase()}).
                </p>
                <button type="button" class="btn-secondary" id="btnPlayVoiceAlert" style="width:100%;font-size:11px;display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>🔊</span> <span data-i18n="btn_listen_alert">Listen Audio Alert</span>
                </button>
              </div>
            </div>

            <button type="button" class="btn-primary" id="btnSendDispatch" style="width:100%;margin-bottom:12px;">
              Simulate Broadcast to 2,450 Registered Contacts
            </button>

            <div id="dispatchResultsLog" style="display:none;background:rgba(15,23,42,0.6);border:1px solid var(--border-subtle);border-radius:6px;padding:10px;font-family:'DM Mono',monospace;font-size:10px;color:#a5f3fc;max-height:120px;overflow-y:auto;">
            </div>

            <div class="modal-actions" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
              <span class="status-indicator" style="font-size:10px;font-family:'DM Mono',monospace;">DEMO / SIMULATED</span>
              <button type="button" class="btn-primary" id="btnCloseDispatchBtn" style="font-size:11px;">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btnCloseDispatch').onclick = () => this.closeModal(modal);
      document.getElementById('btnCloseDispatchBtn').onclick = () => this.closeModal(modal);
      modal.onclick = (e) => {
        if (e.target === modal) this.closeModal(modal);
      };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) this.closeModal(modal);
      });

      document.getElementById('btnPlayVoiceAlert').onclick = () => {
        const text = document.getElementById('dispatchMsgText').value;
        i18n.speakAlert(text);
      };

      document.getElementById('btnSendDispatch').onclick = async () => {
        const channels = [];
        if (document.getElementById('chkSms').checked) channels.push('sms');
        if (document.getElementById('chkWa').checked) channels.push('whatsapp');
        if (document.getElementById('chkPush').checked) channels.push('webpush');
        if (document.getElementById('chkIvr').checked) channels.push('voice_ivr');

        const log = document.getElementById('dispatchResultsLog');
        log.style.display = 'block';
        log.innerHTML = 'Broadcasting messages to carrier queues...<br>';

        try {
          const res = await advancedService.dispatchNotification({
            channels,
            recipients: ['+919876543210', '+919876543211'],
            message: document.getElementById('dispatchMsgText').value,
            priority: 'critical',
            language: i18n.getLanguage()
          });

          log.innerHTML = `[SUCCESS] ${res.summary}<br>`;
          res.channels_dispatched.forEach(c => {
            log.innerHTML += `  • ${c.channel}: ${c.status} (${c.gateway_latency})<br>`;
          });
        } catch (e) {
          log.innerHTML = `[ERROR] Dispatch simulation failed.`;
        }
      };
    }
    this.openModal(modal);
  }

  // --- 7. Officer Command Portal & Action Tracker ---
  async openOfficerPortalModal() {
    const user = authService.getUser();
    const isOfficer = user && (user.role === 'officer' || user.role === 'admin');

    let modal = document.getElementById('officerPortalModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'officerPortalModal';
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 760px;">
          <div class="modal-head">
            <div>
              <p class="eyebrow" data-i18n="nav_officer">Incident Command System (ICS)</p>
              <h3 data-i18n="modal_officer_title">Officer Command Portal &amp; Action Tracker</h3>
            </div>
            <button class="modal-close" id="btnCloseOfficerPortal">&times;</button>
          </div>
          <div style="padding: 16px 20px;">
            <div id="officerRbacNotice" style="display:none;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:12px 14px;margin-bottom:14px;">
              <span style="font-size:12px;color:#ef4444;font-weight:700;">Official Clearance Notice</span>
              <p style="font-size:11px;color:var(--text-secondary);margin:4px 0 0;line-height:1.4;">
                You are currently browsing as a public citizen. Operational emergency actions (mobilizing response teams, road closures, damage assessments, and generating situation reports) are restricted to authorized Disaster Response Officers. Please sign in with an authorized departmental account.
              </p>
            </div>

            <!-- Officer Stats Header -->
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-bottom:14px;">
              <div style="background:rgba(15,23,42,0.6);border:1px solid var(--border-subtle);border-radius:6px;padding:10px;">
                <span style="font-size:10px;text-transform:uppercase;color:var(--text-secondary);">Average Response Time</span>
                <div id="officerAvgResponse" style="font-size:18px;font-weight:800;font-family:'DM Mono',monospace;color:#22c55e;">14 min</div>
              </div>
              <div style="background:rgba(15,23,42,0.6);border:1px solid var(--border-subtle);border-radius:6px;padding:10px;">
                <span style="font-size:10px;text-transform:uppercase;color:var(--text-secondary);">Actions Logged Today</span>
                <div id="officerTotalActions" style="font-size:18px;font-weight:800;font-family:'DM Mono',monospace;color:#38bdf8;">--</div>
              </div>
              <div style="background:rgba(15,23,42,0.6);border:1px solid var(--border-subtle);border-radius:6px;padding:10px;">
                <span style="font-size:10px;text-transform:uppercase;color:var(--text-secondary);">SitRep Status</span>
                <div style="font-size:14px;font-weight:700;color:#f59e0b;margin-top:3px;">Ready to Compile</div>
              </div>
            </div>

            <!-- Action Log Table -->
            <div style="margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <strong style="font-size:12px;">Recent Officer Mobilizations &amp; Advisories</strong>
                <button type="button" class="btn-secondary" id="btnOpenAddAction" style="font-size:10px;padding:3px 8px;">+ Log New Action</button>
              </div>
              <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border-subtle);border-radius:6px;">
                <table style="width:100%;border-collapse:collapse;font-size:11px;">
                  <thead style="background:rgba(255,255,255,0.03);border-bottom:1px solid var(--border-subtle);">
                    <tr>
                      <th style="padding:6px;text-align:left;">Action Type</th>
                      <th style="padding:6px;text-align:left;">Officer</th>
                      <th style="padding:6px;text-align:left;">Details</th>
                      <th style="padding:6px;text-align:left;">Resp. Time</th>
                    </tr>
                  </thead>
                  <tbody id="officerActionsTableBody">
                    <tr><td colspan="4" style="padding:10px;text-align:center;">Loading action history...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- One-Click SitRep Generator -->
            <div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.2);border-radius:6px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong style="font-size:12px;color:var(--text-primary);display:block;">One-Click Operational Situation Report (SitRep)</strong>
                <span style="font-size:11px;color:var(--text-secondary);">Generates an authoritative executive briefing summary for State Disaster Authorities.</span>
              </div>
              <button type="button" class="btn-primary" id="btnGenSitRep" style="font-size:11px;white-space:nowrap;" data-i18n="btn_export_pdf">
                📄 Generate SitRep
              </button>
            </div>

            <div class="modal-actions" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
              <span class="status-indicator" style="font-size:10px;font-family:'DM Mono',monospace;">OPERATIONAL (RBAC Guarded)</span>
              <button type="button" class="btn-primary" id="btnCloseOfficerPortalBtn" style="font-size:11px;">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btnCloseOfficerPortal').onclick = () => this.closeModal(modal);
      document.getElementById('btnCloseOfficerPortalBtn').onclick = () => this.closeModal(modal);
      modal.onclick = (e) => {
        if (e.target === modal) this.closeModal(modal);
      };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) this.closeModal(modal);
      });

      document.getElementById('btnGenSitRep').onclick = async () => {
        try {
          const rep = await advancedService.getSituationReport();
          alert(`Situation Report ${rep.report_id} generated.\n\nActive Emergency Alerts: ${rep.summary.active_emergency_alerts}\nBlocked Arterial Routes: ${rep.summary.blocked_arterial_routes}\nPending Citizen Validations: ${rep.summary.pending_citizen_validations}\n\nRecommendations:\n${rep.recommendations.join('\n')}`);
        } catch (e) {
          alert('Could not generate SitRep.');
        }
      };

      document.getElementById('btnOpenAddAction').onclick = async () => {
        const actionType = prompt('Enter Action Type (e.g. ROAD_DIVERSION, SDRF_DEPLOYMENT, SHELTER_OPEN):', 'ROAD_DIVERSION');
        if (!actionType) return;
        const details = prompt('Enter Details:', 'Traffic diverted to bypass route due to slope displacement.');
        if (!details) return;

        try {
          await advancedService.recordOfficerAction({
            officer_name: user ? user.full_name : 'Officer Lyngdoh',
            action_type: actionType,
            notes: details,
            response_time_minutes: 12
          });
          alert('Official action recorded successfully.');
          this.refreshOfficerActions();
        } catch (e) {
          alert('Failed to log action: ' + e.message);
        }
      };
    }

    // Toggle RBAC notice
    document.getElementById('officerRbacNotice').style.display = isOfficer ? 'none' : 'block';
    this.openModal(modal);
    this.refreshOfficerActions();
  }

  async refreshOfficerActions() {
    try {
      const data = await advancedService.getOfficerActions();
      document.getElementById('officerTotalActions').textContent = data.total_actions;
      document.getElementById('officerAvgResponse').textContent = `${data.average_response_time_min} min`;

      const tbody = document.getElementById('officerActionsTableBody');
      tbody.innerHTML = '';
      data.actions.forEach(a => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-subtle)';
        tr.innerHTML = `
          <td style="padding:6px;font-weight:600;color:#38bdf8;">${a.action_type}</td>
          <td style="padding:6px;color:var(--text-secondary);">${a.officer_name}</td>
          <td style="padding:6px;">${a.notes || a.details || 'N/A'}</td>
          <td style="padding:6px;font-family:'DM Mono',monospace;">${a.response_time_minutes || a.response_time_min || 15}m</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.warn('Could not fetch actions', e);
    }
  }

  // --- 8. Emergency Volunteer Directory ---
  async openVolunteersModal() {
    let modal = document.getElementById('volunteersModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'volunteersModal';
      modal.className = 'modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 680px;">
          <div class="modal-head">
            <div>
              <p class="eyebrow" data-i18n="nav_volunteers">Grassroots Disaster Response</p>
              <h3 data-i18n="modal_volunteer_title">NER Emergency Community Volunteer Directory</h3>
            </div>
            <button class="modal-close" id="btnCloseVolunteers">&times;</button>
          </div>
          <div style="padding: 16px 20px;">
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 14px;">
              Trained local youth, HAM radio operators, and certified disaster responders across hill districts.
            </p>

            <div style="overflow-x:auto;max-height:50vh;">
              <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border-medium);color:var(--text-secondary);">
                    <th style="padding:6px;">Volunteer Name</th>
                    <th style="padding:6px;">State / District</th>
                    <th style="padding:6px;">Role / Skill</th>
                    <th style="padding:6px;">Badge</th>
                    <th style="padding:6px;">Status</th>
                  </tr>
                </thead>
                <tbody id="volunteersTableBody">
                  <tr><td colspan="5" style="padding:12px;text-align:center;">Loading volunteers...</td></tr>
                </tbody>
              </table>
            </div>

            <div class="modal-actions" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;">
              <span class="status-indicator" style="font-size:10px;font-family:'DM Mono',monospace;">AVAILABLE (Volunteer Network)</span>
              <button type="button" class="btn-primary" id="btnCloseVolunteersBtn" style="font-size:11px;">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btnCloseVolunteers').onclick = () => this.closeModal(modal);
      document.getElementById('btnCloseVolunteersBtn').onclick = () => this.closeModal(modal);
      modal.onclick = (e) => {
        if (e.target === modal) this.closeModal(modal);
      };
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) this.closeModal(modal);
      });
    }

    this.openModal(modal);
    try {
      const list = await advancedService.getVolunteers();
      const tbody = document.getElementById('volunteersTableBody');
      tbody.innerHTML = '';
      list.forEach(v => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--border-subtle)';
        tr.innerHTML = `
          <td style="padding:8px;font-weight:600;">${v.name}</td>
          <td style="padding:8px;color:var(--text-secondary);">${v.district}, ${v.state_code}</td>
          <td style="padding:8px;">${v.role}</td>
          <td style="padding:8px;"><span class="badge-role" style="font-size:9px;">🏅 ${v.badge}</span></td>
          <td style="padding:8px;"><span style="color:#22c55e;font-weight:700;">${v.status}</span></td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.warn('Failed to load volunteers', e);
    }
  }
}

export const advancedFeatures = new AdvancedFeaturesController();

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => advancedFeatures.bindUIEvents());
  } else {
    advancedFeatures.bindUIEvents();
  }
}
