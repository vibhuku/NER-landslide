// Demonstration data only. Replace these adapters with validated API responses for deployment.
export const states = [
  { name: 'Arunachal Pradesh', short: 'AR', score: 84, level: 'Critical', rain: 118, alerts: 2, lat: 28.18, lng: 94.4, soil: 81, slope: '31°', elevation: '1,720 m', updated: '12 min ago', event: 'Minor debris flow reported in Upper Subansiri' },
  { name: 'Assam', short: 'AS', score: 43, level: 'Moderate', rain: 74, alerts: 0, lat: 26.2, lng: 92.9, soil: 61, slope: '12°', elevation: '130 m', updated: '15 min ago', event: 'No new landslide record' },
  { name: 'Meghalaya', short: 'ML', score: 67, level: 'High', rain: 102, alerts: 1, lat: 25.58, lng: 91.88, soil: 76, slope: '26°', elevation: '1,430 m', updated: '9 min ago', event: 'Road clearance monitoring, East Khasi Hills' },
  { name: 'Manipur', short: 'MN', score: 58, level: 'High', rain: 89, alerts: 0, lat: 24.66, lng: 93.91, soil: 69, slope: '23°', elevation: '920 m', updated: '17 min ago', event: 'No new landslide record' },
  { name: 'Mizoram', short: 'MZ', score: 52, level: 'Moderate', rain: 82, alerts: 0, lat: 23.16, lng: 92.94, soil: 65, slope: '21°', elevation: '1,040 m', updated: '14 min ago', event: 'No new landslide record' },
  { name: 'Nagaland', short: 'NL', score: 61, level: 'High', rain: 93, alerts: 1, lat: 26.16, lng: 94.56, soil: 72, slope: '27°', elevation: '1,180 m', updated: '11 min ago', event: 'Slope inspection recommended near Kohima' },
  { name: 'Tripura', short: 'TR', score: 31, level: 'Low', rain: 51, alerts: 0, lat: 23.94, lng: 91.98, soil: 54, slope: '9°', elevation: '55 m', updated: '19 min ago', event: 'No new landslide record' },
  { name: 'Sikkim', short: 'SK', score: 79, level: 'Critical', rain: 111, alerts: 1, lat: 27.53, lng: 88.51, soil: 79, slope: '33°', elevation: '2,150 m', updated: '8 min ago', event: 'Watch maintained for North Sikkim corridor' }
];
export const alerts = [
  { state: 'Arunachal Pradesh', location: 'Upper Subansiri', level: 'Warning', reason: '118 mm rainfall and saturated hillslope conditions', action: 'Restrict travel on vulnerable road sections.', time: '12 min ago' },
  { state: 'Sikkim', location: 'North Sikkim corridor', level: 'Watch', reason: 'Elevated slope susceptibility after intense rain', action: 'Continue field observation and community advisory.', time: '18 min ago' },
  { state: 'Meghalaya', location: 'East Khasi Hills', level: 'Watch', reason: 'Rainfall accumulation above district threshold', action: 'Inspect known cut-slope locations.', time: '24 min ago' },
  { state: 'Nagaland', location: 'Kohima periphery', level: 'Watch', reason: 'High soil moisture on steep terrain', action: 'Notify district control room.', time: '31 min ago' }
];
export const riskColor = { Low: '#10b981', Moderate: '#eab308', High: '#f97316', Critical: '#ef4444' };

export const roads = [
  { id: 'rd-sk-nh10', highway_code: 'NH-10', name: 'Siliguri-Gangtok Highway', state_code: 'SK', vulnerable_stretch_km: 42.5, status: 'RESTRICTED', elevation_m: 1650, lat: 27.25, lng: 88.48 },
  { id: 'rd-ar-nh13', highway_code: 'NH-13', name: 'Trans-Arunachal Highway (Subansiri-Siang)', state_code: 'AR', vulnerable_stretch_km: 68.0, status: 'RESTRICTED', elevation_m: 1820, lat: 28.12, lng: 94.35 },
  { id: 'rd-ml-nh6', highway_code: 'NH-6', name: 'Shillong-Silchar Arterial Corridor', state_code: 'ML', vulnerable_stretch_km: 31.0, status: 'MONITORED', elevation_m: 1350, lat: 25.48, lng: 92.15 },
  { id: 'rd-nl-nh29', highway_code: 'NH-29', name: 'Dimapur-Kohima Ghat Section', state_code: 'NL', vulnerable_stretch_km: 24.5, status: 'MONITORED', elevation_m: 1210, lat: 25.75, lng: 93.92 }
];

