/**
 * NERA 2.0 - Centralized API & Offline Service Layer
 * Seamlessly interfaces with the FastAPI backend while maintaining
 * offline IndexedDB synchronization and fallback reliability.
 */

import { states as fallbackStates, alerts as fallbackAlerts, roads as fallbackRoads } from './data.js';
import { offlineStore } from './offline-store.js';

const API_BASE = ''; // Same-origin relative URLs when served by FastAPI, or configurable

export const authService = {
  getToken() {
    return localStorage.getItem('nera_token') || null;
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('nera_user') || 'null');
    } catch {
      return null;
    }
  },

  setSession(token, user) {
    localStorage.setItem('nera_token', token);
    localStorage.setItem('nera_user', JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('nera:auth-changed', { detail: { token, user } }));
  },

  logout() {
    localStorage.removeItem('nera_token');
    localStorage.removeItem('nera_user');
    window.dispatchEvent(new CustomEvent('nera:auth-changed', { detail: { token: null, user: null } }));
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Authentication failed');
    }
    const data = await res.json();
    this.setSession(data.access_token, data.user);
    return data;
  },

  async register(userData) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    this.setSession(data.access_token, data.user);
    return data;
  },

  async getFirebaseConfig() {
    // 1. Check if injected by Vite or modern bundler via import.meta.env
    try {
      if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
        const env = import.meta.env;
        const viteApiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY;
        const viteProjectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID;
        if (viteApiKey || viteProjectId) {
          return {
            apiKey: viteApiKey || '',
            authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || env.FIREBASE_AUTH_DOMAIN || (viteProjectId ? `${viteProjectId}.firebaseapp.com` : ''),
            projectId: viteProjectId || '',
            storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || env.FIREBASE_STORAGE_BUCKET || (viteProjectId ? `${viteProjectId}.appspot.com` : ''),
            messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || env.FIREBASE_MESSAGING_SENDER_ID || '',
            appId: env.VITE_FIREBASE_APP_ID || env.FIREBASE_APP_ID || '',
            measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || env.FIREBASE_MEASUREMENT_ID || ''
          };
        }
      }
    } catch (e) {
      // In non-Vite ESM environments continue to server config
    }

    // 2. Check window global config (if injected)
    try {
      const g = typeof window !== 'undefined' && (window.__NERA_CONFIG__ || window.ENV);
      if (g && (g.VITE_FIREBASE_API_KEY || g.FIREBASE_API_KEY)) {
        return {
          apiKey: g.VITE_FIREBASE_API_KEY || g.FIREBASE_API_KEY || '',
          authDomain: g.VITE_FIREBASE_AUTH_DOMAIN || g.FIREBASE_AUTH_DOMAIN || '',
          projectId: g.VITE_FIREBASE_PROJECT_ID || g.FIREBASE_PROJECT_ID || '',
          storageBucket: g.VITE_FIREBASE_STORAGE_BUCKET || g.FIREBASE_STORAGE_BUCKET || '',
          messagingSenderId: g.VITE_FIREBASE_MESSAGING_SENDER_ID || g.FIREBASE_MESSAGING_SENDER_ID || '',
          appId: g.VITE_FIREBASE_APP_ID || g.FIREBASE_APP_ID || '',
          measurementId: g.VITE_FIREBASE_MEASUREMENT_ID || g.FIREBASE_MEASUREMENT_ID || ''
        };
      }
    } catch (e) {
      // Ignore
    }

    // 3. Fetch from FastAPI backend /api/auth/firebase-config
    try {
      const res = await fetch(`${API_BASE}/api/auth/firebase-config`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.apiKey || data.projectId)) {
          return data;
        }
      }
    } catch (err) {
      console.warn('Could not fetch Firebase config from server:', err);
    }
    return null;
  },

  async googleLogin(authData) {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Google sign-in failed' }));
      throw new Error(err.detail || 'Google sign-in failed');
    }
    const data = await res.json();
    this.setSession(data.access_token, data.user);
    return data;
  },

  async updateProfile(full_name) {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ full_name })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Update failed' }));
      throw new Error(err.detail || 'Failed to update profile');
    }
    const updatedUser = await res.json();
    const current = this.getUser() || {};
    const merged = { ...current, ...updatedUser };
    this.setSession(token, merged);
    return merged;
  },

  async getMe() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return await res.json();
      this.logout();
      return null;
    } catch {
      return this.getUser();
    }
  }
};

export const monitoringService = {
  /**
   * Fetch 8 NER states risk assessment.
   */
  async getStates() {
    try {
      const res = await fetch(`${API_BASE}/api/risk-data/states`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[NERA Service] Backend unreachable, using cached state records:', err.message);
    }
    return fallbackStates;
  },

  /**
   * Fetch active advisories.
   */
  async getAlerts() {
    try {
      const res = await fetch(`${API_BASE}/api/alerts?status=ACTIVE`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[NERA Service] Backend unreachable, using cached alerts:', err.message);
    }
    return fallbackAlerts;
  },

  /**
   * Fetch top-level regional status strip indicators.
   */
  async getRegionalStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/risk-data/regional-status`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[NERA Service] Fallback to simulated regional status');
    }
    return {
      regional_assessment: 'Elevated risk',
      districts_attention_count: 2,
      active_alerts_count: fallbackAlerts.length,
      high_risk_locations_count: 3,
      rainfall_status: 'Above normal',
      rainfall_anomaly_24h: '+18% 24h regional anomaly',
      data_freshness_min: 12,
      data_mode: 'Demo / simulated data'
    };
  },

  /**
   * Fetch environmental metrics and 7-day rainfall.
   */
  async getAnalyticsSummary() {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/summary`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[NERA Service] Analytics summary fallback');
    }
    return null;
  },

  /**
   * Fetch data sources operational readiness.
   */
  async getDataSources() {
    try {
      const res = await fetch(`${API_BASE}/api/data-sources/status`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[NERA Service] Data sources status fallback');
    }
    return [];
  },

  /**
   * Fetch historical landslide inventory.
   */
  async getHistorical() {
    try {
      const res = await fetch(`${API_BASE}/api/analytics/historical`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[NERA Service] Historical records fallback');
    }
    return [];
  },

  /**
   * Fetch vulnerable road corridors and national highway blockage status.
   */
  async getRoads(stateCode) {
    try {
      const url = stateCode ? `${API_BASE}/api/roads?state_code=${encodeURIComponent(stateCode)}` : `${API_BASE}/api/roads`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[NERA Service] Roads fetch fallback');
    }
    return fallbackRoads;
  },

  /**
   * Fetch citizen reports.
   */
  async getReports(status = null) {
    try {
      const url = status ? `${API_BASE}/api/reports?status=${status}` : `${API_BASE}/api/reports`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[NERA Service] Reports query fallback:', err.message);
    }
    return [];
  },

  /**
   * Fetch compiled daily regional risk summary report.
   */
  async getDailyRiskReport() {
    try {
      const res = await fetch(`${API_BASE}/api/reports/daily-summary`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[NERA Service] Daily report fetch fallback:', err.message);
    }
    return null;
  },

  /**
   * Fetch compiled weekly risk trend & advisory review report.
   */
  async getWeeklyRiskSummary() {
    try {
      const res = await fetch(`${API_BASE}/api/reports/weekly-summary`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[NERA Service] Weekly report fetch fallback:', err.message);
    }
    return null;
  },

  /**
   * Fetch 8-state comprehensive situation register report.
   */
  async getStateWiseRiskReport() {
    try {
      const res = await fetch(`${API_BASE}/api/reports/state-wise`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('[NERA Service] State-wise report fetch fallback:', err.message);
    }
    return null;
  },

  /**
   * Upload incident media (Base64).
   */
  async uploadMedia(filename, dataBase64) {
    const res = await fetch(`${API_BASE}/api/reports/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, data_base64: dataBase64 })
    });
    if (!res.ok) throw new Error('Media upload failed');
    return await res.json();
  },

  /**
   * Submit citizen report with automatic offline IndexedDB queue.
   */
  async submitReport(reportData) {
    // If browser is offline, directly save to IndexedDB queue
    if (!navigator.onLine) {
      console.log('[NERA Offline] Device is offline. Storing report in IndexedDB queue...');
      return await offlineStore.saveReport(reportData);
    }

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`Server returned HTTP ${res.status}`);
    } catch (err) {
      console.warn('[NERA Service] Network request failed. Saving to offline IndexedDB queue:', err.message);
      return await offlineStore.saveReport(reportData);
    }
  },

  /**
   * Officer verification of report.
   */
  async verifyReport(reportId, status, officerNotes = '') {
    const token = authService.getToken();
    const res = await fetch(`${API_BASE}/api/reports/${reportId}/verify`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status, officer_notes: officerNotes })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Verification failed' }));
      throw new Error(err.detail || 'Verification failed');
    }
    return await res.json();
  },

  /**
   * Create alert (Officer/Admin only).
   */
  async createAlert(alertData) {
    const token = authService.getToken();
    const res = await fetch(`${API_BASE}/api/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(alertData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create alert' }));
      throw new Error(err.detail || 'Alert creation failed');
    }
    return await res.json();
  },

  /**
   * Resolve alert (Officer/Admin only).
   */
  async resolveAlert(alertId) {
    const token = authService.getToken();
    const res = await fetch(`${API_BASE}/api/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to resolve alert');
    return await res.json();
  },

  /**
   * Evaluate AI/ML Landslide Susceptibility.
   */
  async evaluatePrediction(inputs) {
    const res = await fetch(`${API_BASE}/api/predictions/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs)
    });
    if (!res.ok) throw new Error('Prediction calculation failed');
    return await res.json();
  }
};
