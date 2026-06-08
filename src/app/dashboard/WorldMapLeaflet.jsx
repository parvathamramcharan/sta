"use client";
import { Fragment, useState, useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Globe, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import { useTheme } from '@/components/ThemeProvider';
import PropTypes from 'prop-types';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Tooltip = dynamic(() => import('react-leaflet').then(mod => mod.Tooltip), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false });
const GeoJSON = dynamic(() => import('react-leaflet').then(mod => mod.GeoJSON), { ssr: false });

function MapZoomListener({ setZoomLevel }) {
  const map = useMap();
  useEffect(() => {
    const updateZoom = () => setZoomLevel(map.getZoom());
    updateZoom();
    map.on('zoomend', updateZoom);
    return () => map.off('zoomend', updateZoom);
  }, [map, setZoomLevel]);
  return null;
}

function MapViewportListener({ setViewport }) {
  const map = useMap();

  useEffect(() => {
    const updateViewport = () => {
      const bounds = map.getBounds();
      setViewport({
        zoom: map.getZoom(),
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      });
    };

    updateViewport();
    map.on('moveend zoomend', updateViewport);
    return () => map.off('moveend zoomend', updateViewport);
  }, [map, setViewport]);

  return null;
}

function MapBoundsHelper({ ips, mode }) {
  const map = useMap();
  useEffect(() => {
    if (mode === 'reports' && ips && ips.length > 0) {
      const validIps = ips.filter(ip => ip.latitude && ip.longitude);
      if (validIps.length > 0) {
        const bounds = validIps.map(ip => [ip.latitude, ip.longitude]);
        map.fitBounds(bounds, { padding: [100, 100], maxZoom: 10 });
      }
    }
  }, [ips, mode, map]);
  return null;
}

function PcapFocusController({ focusCluster, mode }) {
  const map = useMap();

  useEffect(() => {
    if (mode !== 'pcap' || !focusCluster) return;

    const focusIps = focusCluster.focusIps || focusCluster.ips || [];
    const bounds = focusIps
      .filter(hasCoordinates)
      .map((ip) => [Number(ip.latitude), Number(ip.longitude)]);

    if (bounds.length > 1) {
      map.flyToBounds(bounds, {
        padding: [60, 60],
        maxZoom: 12,
        duration: 0.8,
        easeLinearity: 0.25
      });
      return;
    }

    map.flyTo([focusCluster.lat, focusCluster.lng], 12, {
      duration: 0.8,
      easeLinearity: 0.25
    });
  }, [focusCluster, map, mode]);

  return null;
}

function EnsureTopPane() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    try {
      if (!map.getPane('geoPane')) {
        const geo = map.createPane('geoPane');
        geo.style.zIndex = '300';
        geo.style.pointerEvents = 'auto';
      }
      if (!map.getPane('topPane')) {
        const p = map.createPane('topPane');
        p.style.zIndex = '700';
        p.style.pointerEvents = 'auto';
      }
    } catch (e) {
      // ignore
    }
  }, [map]);
  return null;
}

const DELHI_COORDS = [28.6139, 77.2090];
const GROUP_IP_PREVIEW_LIMIT = 250;
const FOCUS_IP_RENDER_LIMIT = 180;

const hasCoordinates = (ip) => {
  const lat = Number(ip.latitude);
  const lng = Number(ip.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
};

const addPreviewIp = (group, ip) => {
  if (group.ips.length < GROUP_IP_PREVIEW_LIMIT) {
    group.ips.push(ip);
  }
  if (group.focusIps.length < FOCUS_IP_RENDER_LIMIT) {
    group.focusIps.push(ip);
  }
};

const getPcapGroupStep = (zoomLevel, totalIpCount, visibleIpCount) => {
  if (totalIpCount <= 1000 && visibleIpCount <= 1000) {
    if (zoomLevel >= 9) return 0.16;
    if (zoomLevel >= 7) return 0.34;
    if (zoomLevel >= 5) return 0.8;
    if (zoomLevel >= 3) return 2.4;
    return 5;
  }

  if (totalIpCount > 10000) {
    if (zoomLevel >= 10) return 0.16;
    if (zoomLevel >= 9) return 0.24;
    if (zoomLevel >= 8) return 0.42;
    if (zoomLevel >= 7) return 0.72;
    if (zoomLevel >= 6) return 1.1;
    if (zoomLevel >= 5) return 1.8;
    return 5.5;
  }

  if (zoomLevel >= 9) return 0.22;
  if (zoomLevel >= 8) return 0.32;
  if (zoomLevel >= 7) return 0.5;
  if (zoomLevel >= 6) return 0.85;
  if (zoomLevel >= 5) return 1.35;
  if (zoomLevel >= 4) return 2.4;
  if (zoomLevel >= 3) return 4.2;
  return 7;
};

const getPcapMaxPoints = (zoomLevel, totalIpCount) => {
  if (totalIpCount > 10000) {
    if (zoomLevel >= 9) return 360;
    if (zoomLevel >= 7) return 300;
    if (zoomLevel >= 5) return 220;
    return 140;
  }

  if (totalIpCount > 3000) {
    if (zoomLevel >= 8) return 340;
    if (zoomLevel >= 6) return 280;
    return 190;
  }

  return 420;
};

const getViewportPadding = (zoomLevel) => {
  if (zoomLevel >= 9) return 0.8;
  if (zoomLevel >= 7) return 1.8;
  if (zoomLevel >= 5) return 4;
  return 0;
};

const isInsideViewport = (ip, viewport, zoomLevel) => {
  if (!viewport || zoomLevel < 5) return true;

  const pad = getViewportPadding(zoomLevel);
  const lat = Number(ip.latitude);
  const lng = Number(ip.longitude);

  return (
    lat >= viewport.south - pad &&
    lat <= viewport.north + pad &&
    lng >= viewport.west - pad &&
    lng <= viewport.east + pad
  );
};

const groupIpsByCountry = (ips) => {
  const groups = new Map();

  ips.forEach((ip) => {
    const lat = Number(ip.latitude);
    const lng = Number(ip.longitude);
    const key = ip.country || "Unknown";
    const existing = groups.get(key);

    if (existing) {
      existing.latTotal += lat;
      existing.lngTotal += lng;
      existing.count += 1;
      existing.totalPackets += ip.packet_count || 0;
      addPreviewIp(existing, ip);
      return;
    }

    groups.set(key, {
      id: `country-${key}`,
      latTotal: lat,
      lngTotal: lng,
      count: 1,
      city: key,
      country: key,
      ips: [ip],
      focusIps: [ip],
      totalPackets: ip.packet_count || 0
    });
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    lat: group.latTotal / group.count,
    lng: group.lngTotal / group.count
  }));
};

const groupIpsByGrid = (ips, groupStep) => {
  const groups = new Map();

  ips.forEach((ip) => {
    const lat = Number(ip.latitude);
    const lng = Number(ip.longitude);
    const key = `${Math.floor(lat / groupStep)}:${Math.floor(lng / groupStep)}`;
    const existing = groups.get(key);

    if (existing) {
      existing.latTotal += lat;
      existing.lngTotal += lng;
      existing.count += 1;
      existing.totalPackets += ip.packet_count || 0;
      addPreviewIp(existing, ip);
      return;
    }

    groups.set(key, {
      id: `group-${key}`,
      latTotal: lat,
      lngTotal: lng,
      count: 1,
      city: ip.city || "Unknown",
      country: ip.country || "Unknown",
      ips: [ip],
      focusIps: [ip],
      totalPackets: ip.packet_count || 0
    });
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    lat: group.latTotal / group.count,
    lng: group.lngTotal / group.count
  }));
};

const buildPcapMapPoints = (ips, zoomLevel, viewport) => {
  const totalIpCount = ips.length;
  const maxPoints = getPcapMaxPoints(zoomLevel, totalIpCount);

  if (totalIpCount > 10000 && zoomLevel < 5) {
    return groupIpsByCountry(ips).slice(0, maxPoints);
  }

  const visibleIps = ips.filter((ip) => isInsideViewport(ip, viewport, zoomLevel));
  let groupStep = getPcapGroupStep(zoomLevel, totalIpCount, visibleIps.length);

  if (!groupStep) {
    const renderIps = visibleIps.slice(0, maxPoints);
    return renderIps.map((ip, idx) => ({
      id: `ip-${ip.ip || idx}`,
      lat: Number(ip.latitude),
      lng: Number(ip.longitude),
      city: ip.city || "Unknown",
      country: ip.country || "Unknown",
      ips: [ip],
      count: 1,
      totalPackets: ip.packet_count || 0
    }));
  }

  let groupedPoints = groupIpsByGrid(visibleIps, groupStep);

  while (groupedPoints.length > maxPoints) {
    groupStep *= 1.55;
    groupedPoints = groupIpsByGrid(visibleIps, groupStep);
  }

  return groupedPoints;
};

const buildFocusedPcapPoints = (ips) => {
  return ips
    .filter(hasCoordinates)
    .slice(0, FOCUS_IP_RENDER_LIMIT)
    .map((ip, idx) => ({
      id: `focus-${ip.ip || idx}`,
      lat: Number(ip.latitude),
      lng: Number(ip.longitude),
      city: ip.city || "Unknown",
      country: ip.country || "Unknown",
      ips: [ip],
      focusIps: [ip],
      count: 1,
      isFocusedReveal: true,
      totalPackets: ip.packet_count || 0
    }));
};

const getPcapPointStyle = (count) => {
  if (count >= 200) {
    return {
      marker: '#fb923c',
      halo: 'rgba(251, 146, 60, 0.14)',
      pulse: 'rgba(251, 146, 60, 0.24)',
      line: '#fb923c',
      shadow: 'rgba(194, 65, 12, 0.28)'
    };
  }

  if (count >= 10) {
    return {
      marker: '#f6d447',
      halo: 'rgba(246, 212, 71, 0.16)',
      pulse: 'rgba(246, 212, 71, 0.24)',
      line: '#c58b00',
      shadow: 'rgba(161, 98, 7, 0.24)'
    };
  }

  if (count >= 2) {
    return {
      marker: '#8dd36f',
      halo: 'rgba(141, 211, 111, 0.15)',
      pulse: 'rgba(141, 211, 111, 0.23)',
      line: '#39963f',
      shadow: 'rgba(22, 101, 52, 0.22)'
    };
  }

  return {
    marker: '#4f7fe8',
    halo: 'rgba(79, 127, 232, 0.14)',
    pulse: 'rgba(79, 127, 232, 0.22)',
    line: '#2f6bdb',
    shadow: 'rgba(37, 99, 235, 0.20)'
  };
};

const CONTINENT_LABELS = [
  { id: 'north-america', text: 'NORTH\nAMERICA', position: [47, -102], className: 'label-large' },
  { id: 'europe', text: 'EUROPE', position: [53, 15], className: 'label-large' },
  { id: 'china', text: 'CHINA', position: [35, 103], className: 'label-large' },
  { id: 'russia', text: 'RUSSIA', position: [61, 95], className: 'label-large' },
  { id: 'africa', text: 'AFRICA', position: [2, 20], className: 'label-large' },
  { id: 'south-america', text: 'SOUTH AMERICA', position: [-18, -60], className: 'label-medium' },
  { id: 'greenland', text: 'GREENLAND', position: [73, -41], className: 'label-medium' },
  { id: 'oceania', text: 'OCEANIA', position: [-13, 152], className: 'label-large' },
  { id: 'australia', text: 'AUSTRALIA', position: [-25, 134], className: 'label-large' },
];

const getPcapMarkerSize = (count, zoomLevel) => {
  const zoomBoost = zoomLevel >= 7 ? 2 : 0;
  return Math.min(34 + zoomBoost, Math.max(18, 17 + Math.log10(count) * 6));
};

const getPcapLineStyle = (count, zoomLevel) => {
  const scale = Math.min(1, Math.max(0, Math.log10(count + 1) / 3));

  return {
    trackWeight: zoomLevel >= 6 ? 2.7 : 2.2,
    trackOpacity: zoomLevel >= 6 ? 0.18 : 0.14,
    weight: zoomLevel >= 6 ? 1.45 + scale * 0.6 : 1.15 + scale * 0.45,
    opacity: zoomLevel >= 6 ? 0.5 : 0.38
  };
};

function ContinentLabels({ theme, L }) {
  if (!L) return null;

  return CONTINENT_LABELS.map((label) => {
    const icon = L.divIcon({
      html: `<div class="continent-label ${label.className}">${label.text.replace(/\n/g, '<br/>')}</div>`,
      className: 'continent-label-marker',
      iconSize: [1, 1],
      iconAnchor: [0, 0]
    });

    return (
      <Marker
        key={label.id}
        position={label.position}
        icon={icon}
        interactive={false}
      />
    );
  });
}

const COUNTRY_CENTROIDS = {
  "United States of America": [37.0902, -95.7129],
  "People's Republic of China": [35.8617, 104.1954],
  "United Kingdom of Great Britain and Northern Ireland": [55.3781, -3.4360],
  "Federal Republic of Germany": [51.1657, 10.4515],
  "Japan": [36.2048, 138.2529],
  "Kingdom of the Netherlands": [52.1326, 5.2913],
  "Republic of India": [20.5937, 78.9629],
  "French Republic": [46.2276, 2.2137],
  "Korea, Republic of": [35.9078, 127.7669],
  "Federative Republic of Brazil": [-14.2350, -51.9253],
  "Republic of Singapore": [1.3521, 103.8198],
  "Hong Kong Special Administrative Region of China": [22.3193, 114.1694],
  "Canada": [56.1304, -106.3468],
  "Russian Federation": [61.5240, 105.3188],
  "Taiwan, Province of China": [23.6978, 120.9605],
  "Socialist Republic of Viet Nam": [14.0583, 108.2772],
  "Australia": [-25.2744, 133.7751],
  "Italian Republic": [41.8719, 12.5674],
  "Republic of Indonesia": [-0.7893, 113.9213],
  "Portuguese Republic": [39.3999, -8.2245],
  "Kingdom of Thailand": [15.8700, 100.9925],
  "United Mexican States": [23.6345, -102.5528],
  "Republic of Bulgaria": [42.7339, 25.4858],
  "Kingdom of Spain": [40.4637, -3.7492],
  "Malaysia": [4.2105, 101.9758],
  "Kingdom of Sweden": [60.1282, 18.6435],
  "Republic of Türkiye": [38.9637, 35.2433],
  "Republic of South Africa": [-30.5595, 22.9375],
  "Ukraine": [48.3794, 31.1656],
  "Ireland": [53.4129, -8.2439],
  "Argentine Republic": [-38.4161, -63.6167],
  "Republic of Poland": [51.9194, 19.1451],
  "Swiss Confederation": [46.8182, 8.2275],
  "Arab Republic of Egypt": [26.8206, 30.8025],
  "Islamic Republic of Iran": [32.4279, 53.6880],
  "Romania": [45.9432, 24.9668],
  "Republic of the Philippines": [12.8797, 121.7740],
  "Islamic Republic of Pakistan": [30.3753, 69.3451],
  "Republic of Seychelles": [-4.6796, 55.4920],
  "Republic of Colombia": [4.5709, -74.2973],
  "Kingdom of Belgium": [50.5039, 4.4699],
  "Federal Republic of Nigeria": [9.0820, 8.6753],
  "Republic of Finland": [61.9241, 25.7482],
  "Bolivarian Republic of Venezuela": [6.4238, -66.5897],
  "United Arab Emirates": [23.4241, 53.8478],
  "Kingdom of Saudi Arabia": [23.8859, 45.0792],
  "Kingdom of Norway": [60.4720, 8.4689],
  "Republic of Austria": [47.5162, 14.5501],
  "Republic of Chile": [-35.6751, -71.5430],
  "State of Israel": [31.0461, 34.8516],
  "Kingdom of Morocco": [31.7917, -7.0926],
  "Czech Republic": [49.8175, 15.4730],
  "Kingdom of Denmark": [56.2639, 9.5018],
  "Republic of Tunisia": [33.8869, 9.5375],
  "People's Republic of Bangladesh": [23.6850, 90.3563],
  "Republic of Kazakhstan": [48.0196, 66.9237],
  "Republic of Kenya": [-0.0236, 37.9062],
  "Republic of Lithuania": [55.1694, 23.8813],
  "Hellenic Republic": [39.0742, 21.8243],
  "New Zealand": [-40.9006, 174.8860],
  "Hungary": [47.1625, 19.5033],
  "Greenland": [74.7333, -41.6833],
  "Republic of Palau": [7.5150, 134.5825],
  "Independent State of Papua New Guinea": [-6.3150, 143.9555],
  "Republic of Fiji": [-17.7134, 178.0650],
  "Tokelau": [-9.2002, -171.8484],
  "Republic of Peru": [-9.1900, -75.0152],
  "Republic of Belarus": [53.7098, 27.9534],
  "Republic of Uzbekistan": [41.3775, 64.5853],
  "Republic of Iraq": [33.2232, 43.6793],
  "Eastern Republic of Uruguay": [-32.5228, -55.7658],
  "Republic of Latvia": [56.8796, 24.6032],
  "Republic of Panama": [8.5380, -80.7821],
  "Republic of Serbia": [44.0165, 21.0059],
  "Dominican Republic": [18.7357, -70.1627],
  "Georgia": [42.3154, 43.3569],
  "Grand Duchy of Luxembourg": [49.8153, 6.1296],
  "Kingdom of Cambodia": [12.5657, 104.9910],
  "Republic of Slovenia": [46.1512, 14.9955],
  "Republic of Cyprus": [35.1264, 33.4299],
  "Republic of Angola": [-11.2027, 17.8739],
  "Republic of Costa Rica": [9.7489, -83.7534],
  "Slovak Republic": [48.6690, 19.6990],
  "Republic of Paraguay": [-23.4425, -58.4438],
  "Federal Democratic Republic of Ethiopia": [9.1450, 40.4897],
  "Republic of Honduras": [15.2000, -86.2419],
  "Republic of Croatia": [45.1000, 15.2000],
  "Plurinational State of Bolivia": [-16.2902, -63.5887],
  "Republic of Estonia": [58.5953, 25.0136],
  "Republic of Armenia": [40.0691, 45.0382],
  "Kyrgyz Republic": [41.2044, 74.7661],
  "Hashemite Kingdom of Jordan": [30.5852, 36.2384],
  "State of Kuwait": [29.3117, 47.4818],
  "Republic of Ghana": [7.9465, -1.0232],
  "Republic of Guatemala": [15.7835, -90.2308],
  "State of Qatar": [25.3548, 51.1839],
  "Kingdom of Swaziland": [-26.5225, 31.4659],
  "Iceland": [64.9631, -19.0208],
  "Republic of Namibia": [-22.9576, 18.4904],
  "Republic of Zimbabwe": [-19.0154, 29.1549],
  "Republic of Senegal": [14.4974, -14.4524],
  "Republic of Rwanda": [-1.9403, 29.8739],
  "United Republic of Tanzania": [-6.3690, 34.8888],
  "Democratic Socialist Republic of Sri Lanka": [7.8731, 80.7718],
  "Federal Democratic Republic of Nepal": [28.3949, 84.1240],
  "Commonwealth of Australia": [-25.2744, 133.7751],
  "Republic of Azerbaijan": [40.1431, 47.5769],
  "People's Democratic Republic of Algeria": [28.0339, 1.6596],
  "Mongolia": [46.8625, 103.8467],
  "Republic of Ecuador": [-1.8312, -78.1834],
  "Republic of Moldova": [47.4116, 28.3699],
  "State of Libya": [26.3351, 17.2283],
  "Republic of Madagascar": [-18.7669, 46.8691],
  "Republic of Malawi": [-13.2543, 34.3015],
  "Republic of Mozambique": [-18.6657, 35.5296],
  "Republic of Cameroon": [7.3697, 12.3547],
  "Republic of Cote d'Ivoire": [7.5400, -5.5471],
  "Republic of the Sudan": [12.8628, 30.2176],
  "Republic of Uganda": [1.3733, 32.2903],
  "Republic of Yemen": [15.5527, 48.5164],
  "Republic of Zambia": [-13.1339, 27.8493],
  "Sultanate of Oman": [21.5126, 55.9233],
  "Syrian Arab Republic": [34.8021, 38.9968],
  "Republic of Tajikistan": [38.8610, 71.2761],
  "Turkmenistan": [38.9697, 59.5563],
  "Republic of Lebanon": [33.8547, 35.8623],
  "Kyrgyzstan": [41.2044, 74.7661],
  "Kingdom of Bhutan": [27.5142, 90.4336],
  "Lao People's Democratic Republic": [19.8563, 102.4955],
  "Republic of the Union of Myanmar": [21.9162, 95.9560],
  "Republic of Albania": [41.1533, 20.1683],
  "Bosnia and Herzegovina": [43.9159, 17.6791],
  "Republic of North Macedonia": [41.6086, 21.7453],
  "Republic of Malta": [35.9375, 14.3754],
  "Principality of Monaco": [43.7333, 7.4167],
  "Montenegro": [42.7087, 19.3744],
  "Republic of San Marino": [43.9424, 12.4578],
  "State of the Vatican City": [41.9029, 12.4534],
  "Principality of Andorra": [42.5063, 1.5218],
  "Principality of Liechtenstein": [47.1660, 9.5554],
  "Republic of Mauritius": [-20.3484, 57.5522],
  "Solomon Islands": [-9.6457, 160.1562],
  "Vanuatu": [-15.3767, 166.9592],
  "Samoa": [-13.7590, -172.1046],
  "Kingdom of Tonga": [-21.1790, -175.1982],
  "Republic of Kiribati": [-3.3704, -168.7340],
  "Republic of the Marshall Islands": [7.1315, 171.1845],
  "Federated States of Micronesia": [7.4256, 150.5508],
  "Tuvalu": [-7.1095, 177.6493],
  "Republic of Nauru": [-0.5228, 166.9315],
  "Republic of Suriname": [3.9193, -56.0278],
  "Co-operative Republic of Guyana": [4.8604, -58.9302],
  "Republic of Trinidad and Tobago": [10.6918, -61.2225],
  "Barbados": [13.1939, -59.5432],
  "Saint Lucia": [13.9094, -60.9789],
  "Saint Vincent and the Grenadines": [12.9843, -61.2872],
  "Grenada": [12.1165, -61.6790],
  "Antigua and Barbuda": [17.0608, -61.7964],
  "Saint Kitts and Nevis": [17.3578, -62.7830],
  "Commonwealth of the Bahamas": [25.0343, -77.3963],
  "Belize": [17.1899, -88.4976],
  "Jamaica": [18.1096, -77.2975],
  "Republic of El Salvador": [13.7942, -88.8965],
  "Republic of Nicaragua": [12.8654, -85.2072],
  "Republic of Cabo Verde": [16.0020, -24.0131],
  "Republic of Guinea": [9.9456, -9.6966],
  "Republic of Guinea-Bissau": [11.8037, -15.1804],
  "Republic of Sierra Leone": [8.4606, -11.7799],
  "Republic of Liberia": [6.4281, -9.4295],
  "Republic of Benin": [9.3077, 2.3158],
  "Togolese Republic": [8.6195, 0.8248],
  "Republic of the Niger": [17.6078, 8.0817],
  "Republic of Mali": [17.5707, -3.9962],
  "Burkina Faso": [12.2383, -1.5616],
  "Republic of Chad": [15.4542, 18.7322],
  "Central African Republic": [6.6111, 20.9394],
  "Republic of Equatorial Guinea": [1.6508, 10.2679],
  "Gabonese Republic": [-0.8037, 11.6094],
  "Republic of the Congo": [-0.2280, 15.8277],
  "Democratic Republic of the Congo": [-4.0383, 21.7587],
  "State of Eritrea": [15.1794, 39.7823],
  "Republic of Djibouti": [11.8251, 42.5903],
  "Federal Republic of Somalia": [5.1521, 46.1996],
  "Republic of Burundi": [-3.3731, 29.9189],
  "Union of the Comoros": [-11.6455, 43.3333],
  "Republic of the Gambia": [13.4432, -15.3101],
  "Cook Islands": [-21.2367, -159.7777],
  "Niue": [-19.0544, -169.8672],
  "Wallis and Futuna": [-13.2970, -176.2040],
  "French Polynesia": [-17.6797, -149.4068],
  "New Caledonia": [-20.9043, 165.6180],
  "American Samoa": [-14.2710, -170.1320],
  "Guam": [13.4443, 144.7937],
  "Puerto Rico": [18.2208, -66.5901],
  "United States Virgin Islands": [18.3358, -64.8963],
  "British Virgin Islands": [18.4207, -64.6400],
  "Anguilla": [18.2206, -63.0686],
  "Montserrat": [16.7425, -62.1873],
  "Cayman Islands": [19.3133, -81.2546],
  "Turks and Caicos Islands": [21.6940, -71.7979],
  "Bermuda": [32.3078, -64.7505],
  "Saint Pierre and Miquelon": [46.8852, -56.3159],
  "Falkland Islands (Malvinas)": [-51.7963, -59.5236],
  "South Georgia and the South Sandwich Islands": [-54.4295, -36.5879],
  "Saint Helena, Ascension and Tristan da Cunha": [-15.9650, -5.7089],
  "British Indian Ocean Territory": [-6.3431, 71.8765],
  "Pitcairn": [-24.3768, -128.3242],
  "Norfolk Island": [-29.0408, 167.9547],
  "Christmas Island": [-10.4475, 105.6904],
  "Cocos (Keeling) Islands": [-12.1642, 96.8710],
  "Mayotte": [-12.8275, 45.1662],
  "Reunion": [-21.1151, 55.5364],
  "Guadeloupe": [16.2650, -61.5510],
  "Martinique": [14.6415, -61.0242],
  "French Guiana": [3.9339, -53.1258],
  "Aruba": [12.5211, -69.9683],
  "Curacao": [12.1696, -68.9900],
  "Sint Maarten (Dutch part)": [18.0425, -63.0548],
  "Bonaire, Sint Eustatius and Saba": [12.1784, -68.2385],
  "Faeroe Islands": [61.8926, -6.9118],
  "Holy See (Vatican City State)": [41.9029, 12.4534],
  "Western Sahara": [24.2155, -12.8858],
  "Palestine, State of": [31.9522, 35.2332],
  "Bouvet Island": [-54.4232, 3.3464],
  "Heard Island and McDonald Islands": [-53.0818, 73.5042],
  "French Southern Territories": [-49.2800, 69.3481],
  "United States Minor Outlying Islands": [19.2833, 166.6167],
  "Antarctica": [-75.2510, -0.0714],
};


export function WorldMapLeaflet({ externalIps = [], onIpClick, mode = 'pcap', countryData = [], title }) {
  const { theme } = useTheme();
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [L, setL] = useState(null);
  const [indiaBorder, setIndiaBorder] = useState(null);
  const [worldCountries, setWorldCountries] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(2);
  const [viewport, setViewport] = useState(null);
  const [focusedPcapCluster, setFocusedPcapCluster] = useState(null);

  useEffect(() => {
    import('leaflet').then(leaflet => {
      setL(leaflet);
    });

    fetch('/india-border.json')
      .then(res => res.json())
      .then(data => setIndiaBorder(data))
      .catch(err => console.error('Failed to load India border:', err));

    fetch('/world-countries.json')
      .then(res => res.json())
      .then(data => setWorldCountries(data))
      .catch(err => console.error('Failed to load world countries:', err));
  }, []);

  // Keep raw valid IPs separate; PCAP mode aggregates them until a cluster is revealed.
  const validIps = useMemo(() => {
    if (mode === 'summary') return [];
    if (!externalIps.length) return [];
    return externalIps.filter(hasCoordinates);
  }, [externalIps, mode]);

  const activeFocusedPcapCluster = useMemo(() => {
    if (mode !== 'pcap' || !focusedPcapCluster) return null;
    return focusedPcapCluster;
  }, [focusedPcapCluster, mode]);

  const pcapMapPoints = useMemo(() => {
    if (mode !== 'pcap') return [];
    return buildPcapMapPoints(validIps, zoomLevel, viewport);
  }, [mode, validIps, zoomLevel, viewport]);

  const pcapLinePoints = useMemo(() => {
    if (mode !== 'pcap') return [];

    const maxLines = activeFocusedPcapCluster
      ? 28
      : (validIps.length > 10000
        ? (zoomLevel >= 8 ? 70 : 42)
        : (zoomLevel >= 8 ? 90 : 60));

    return [...pcapMapPoints]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxLines);
  }, [activeFocusedPcapCluster, mode, pcapMapPoints, validIps.length, zoomLevel]);

  const pcapMarkerItems = useMemo(() => {
    if (!L || mode !== 'pcap') return [];

    return pcapMapPoints.map((point, idx) => {
      const markerSize = point.isFocusedReveal ? 20 : getPcapMarkerSize(point.count, zoomLevel);
      const label = point.count.toLocaleString();
      const pointStyle = getPcapPointStyle(point.count);
      const jumpDelay = point.isFocusedReveal
        ? Math.min(idx * 18, 520)
        : Math.abs(Math.round(point.lat * 13 + point.lng * 7)) % 240;
      const deltaLng = DELHI_COORDS[1] - point.lng;
      const deltaLat = point.lat - DELHI_COORDS[0];
      const flyMagnitude = Math.max(Math.abs(deltaLng), Math.abs(deltaLat), 1);
      const jitterX = Math.sin(point.lat * 2.7 + point.lng) * 8;
      const jitterY = Math.cos(point.lng * 2.1 - point.lat) * 6;
      const sprinkleX = Math.round((deltaLng / flyMagnitude) * 34 + jitterX);
      const sprinkleY = Math.round((deltaLat / flyMagnitude) * 28 + jitterY);

      return {
        point,
        markerSize,
        icon: L.divIcon({
          html: `
            <div class="pcap-marker ${point.isFocusedReveal ? 'pcap-marker-focus' : ''} pcap-marker-sprinkle group" style="width: ${markerSize}px; height: ${markerSize}px; --sprinkle-x: ${sprinkleX}px; --sprinkle-y: ${sprinkleY}px; background: ${pointStyle.marker}; box-shadow: 0 0 0 4px ${pointStyle.halo}, 0 6px 14px ${pointStyle.shadow}; animation-delay: ${jumpDelay}ms;">
              <div class="pcap-sprinkle-ring" style="background: ${pointStyle.marker};"></div>
              <span style="position: relative; z-index: 2; font-size: ${point.count > 999 ? 9 : 10}px;">${label}</span>
            </div>
          `,
          className: '',
          iconSize: [markerSize, markerSize],
          iconAnchor: [markerSize / 2, markerSize / 2]
        })
      };
    });
  }, [L, mode, pcapMapPoints, zoomLevel]);

  const countryPoints = useMemo(() => {
    if (mode !== 'summary') return [];
    return countryData.map(c => ({
      ...c,
      coords: COUNTRY_CENTROIDS[c.name] || [0, 0]
    })).filter(c => c.coords[0] !== 0);
  }, [countryData, mode]);

  const indiaRenderer = useMemo(() => (L ? L.svg() : null), [L]);
  const worldRenderer = useMemo(() => (L ? L.svg() : null), [L]);

  const initialCenter = useMemo(() => {
    if (mode === 'reports' && externalIps.length > 0) {
      const validIps = externalIps.filter(ip => ip.latitude && ip.longitude);
      if (validIps.length > 0) {
        const avgLat = validIps.reduce((sum, ip) => sum + ip.latitude, 0) / validIps.length;
        const avgLng = validIps.reduce((sum, ip) => sum + ip.longitude, 0) / validIps.length;
        return [avgLat, avgLng];
      }
    }
    return [25, 20];
  }, [mode, externalIps]);

  const initialZoom = mode === 'reports' ? 8 : (mode === 'summary' ? 2 : 2.2);

  if (!L) return <div className="w-full h-full bg-slate-900 animate-pulse rounded-none" />;

  return (
    <div className="w-full h-full relative z-0 rounded-none overflow-hidden border border-theme transition-colors bg-card">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        minZoom={2}
        maxZoom={12}
        style={{ height: '100%', width: '100%', background: 'transparent' }}
        zoomControl={false}
        attributionControl={false}
        worldCopyJump={true}
        preferCanvas={true}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
      >
        {worldCountries && worldRenderer && (
          <GeoJSON
            key={`world-${theme}`}
            data={worldCountries}
            renderer={worldRenderer}
            pane="geoPane"
            style={(feature) => {
              const props = feature && feature.properties ? feature.properties : {};
              const name = (props.ADMIN || props.NAME || '').toString().toLowerCase();
              const iso = (props.ISO_A3 || props.iso_a3 || '').toString().toUpperCase();
              const isIndia = iso === 'IND' || name.includes('india');

              if (isIndia) {
                return {
                  stroke: false,
                  fillColor: theme === 'dark' ? '#233047' : '#fffdf9',
                  fillOpacity: 1,
                  smoothFactor: 0
                };
              }

              return {
                color: theme === 'dark' ? '#8ea0bb' : '#5d6573',
                weight: 0.55,
                opacity: 1,
                fillColor: theme === 'dark' ? '#233047' : '#fffdf9',
                fillOpacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
                smoothFactor: 0
              };
            }}
          />
        )}

        <ContinentLabels theme={theme} L={L} />
        <EnsureTopPane />

        <MapZoomListener setZoomLevel={setZoomLevel} />
        <MapViewportListener setViewport={setViewport} />
        <MapBoundsHelper ips={externalIps} mode={mode} />
        <PcapFocusController focusCluster={activeFocusedPcapCluster} mode={mode} />

        {indiaBorder && indiaRenderer && (
          <GeoJSON
            key={`india-border-${theme}`}
            data={indiaBorder}
            renderer={indiaRenderer}
            pane="geoPane"
            style={{
              color: theme === 'dark' ? '#e9f2fb' : '#9ea7b1',
              weight: theme === 'dark' ? 1.0 : 1.0,
              opacity: theme === 'dark' ? 0.85 : 1,
              fillOpacity: 0,
              lineCap: 'round',
              lineJoin: 'round',
              smoothFactor: 0
            }}
          />
        )}


        {mode === 'pcap' && pcapLinePoints.map((point) => {
          const pointStyle = getPcapPointStyle(point.count);
          const lineStyle = getPcapLineStyle(point.count, zoomLevel);
          const positions = [DELHI_COORDS, [point.lat, point.lng]];

          return (
            <Fragment key={`line-${point.id}`}>
              <Polyline
                pane="topPane"
                positions={positions}
                pathOptions={{
                  color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
                  weight: lineStyle.trackWeight,
                  opacity: lineStyle.trackOpacity,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
              <Polyline
                pane="topPane"
                positions={positions}
                pathOptions={{
                  color: pointStyle.line,
                  weight: lineStyle.weight,
                  opacity: lineStyle.opacity,
                  lineCap: 'round',
                  lineJoin: 'round'
                }}
              />
            </Fragment>
          );
        })}

        {mode === 'reports' && externalIps.length > 1000 ? (
          // Use clustering for reports only. PCAP maps use deterministic zoom-aware grouping.
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            disableClusteringAtZoom={12}
          >
            {validIps.map((ip, idx) => {
              const icon = L.divIcon({
                html: `
                  <div class="pcap-marker group" style="width: 24px; height: 24px;">
                    <div class="pcap-pulse"></div>
                    <span style="position: relative; z-index: 2; font-size: 10px;">1</span>
                  </div>
                `,
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });

              return (
                <Marker pane="topPane"
                  key={idx}
                  position={[ip.latitude, ip.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => setSelectedGroup({ 
                      lat: ip.latitude, 
                      lng: ip.longitude, 
                      city: ip.city || "Unknown", 
                      country: ip.country || "Unknown",
                      ips: [ip],
                      totalPackets: ip.packet_count || 0
                    })
                  }}
                >
                  <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                    <div className="p-2 text-[11px] font-bold bg-card text-foreground rounded-lg shadow-xl border border-theme">
                      <div className="text-blue-600 uppercase tracking-tighter mb-1 border-b border-theme pb-1">{ip.city || "Unknown"}</div>
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 font-black text-[9px]">IP:</span>
                          <span className="text-foreground text-[9px]">{ip.ip}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 font-black text-[9px]">Packets:</span>
                          <span className="text-foreground text-[9px]">{ip.packet_count || 1}</span>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        ) : mode === 'pcap' ? (
          pcapMarkerItems.map(({ point, markerSize, icon }) => {
            return (
              <Marker pane="topPane"
                key={point.id}
                position={[point.lat, point.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    if (point.count > 1) {
                      setFocusedPcapCluster({ ...point, timestamp: Date.now() });
                      setSelectedGroup(null);
                      return;
                    }

                    setSelectedGroup({
                      lat: point.lat,
                      lng: point.lng,
                      city: point.count === 1 ? point.city : `${point.count.toLocaleString()} IPs`,
                      country: point.country,
                      ips: point.ips,
                      count: point.count,
                      totalPackets: point.totalPackets
                    });
                  }
                }}
              >
                <Tooltip direction="top" offset={[0, -markerSize / 2]} opacity={1}>
                  <div className="p-2 text-[11px] font-bold bg-card text-foreground rounded-lg shadow-xl border border-theme">
                    <div className="text-blue-600 uppercase tracking-tighter mb-1 border-b border-theme pb-1">
                      {point.count === 1 ? (point.city || "Unknown") : `${point.count.toLocaleString()} IPs grouped here`}
                    </div>
                    <div className="flex flex-col gap-1">
                      {point.count === 1 && (
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500 font-black text-[9px]">IP:</span>
                          <span className="text-foreground text-[9px]">{point.ips[0].ip}</span>
                        </div>
                      )}
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 font-black text-[9px]">Located IPs:</span>
                        <span className="text-foreground text-[9px]">{point.count.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 font-black text-[9px]">Packets:</span>
                        <span className="text-foreground text-[9px]">{point.totalPackets.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })
        ) : (
          // Direct rendering for small report datasets (<= 1000 IPs)
          validIps.map((ip, idx) => {
            const icon = L.divIcon({
              html: `
                <div class="pcap-marker group" style="width: 24px; height: 24px;">
                  <div class="pcap-pulse"></div>
                  <span style="position: relative; z-index: 2; font-size: 10px;">1</span>
                </div>
              `,
              className: '',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            return (
              <Marker pane="topPane"
                key={idx}
                position={[ip.latitude, ip.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => setSelectedGroup({ 
                    lat: ip.latitude, 
                    lng: ip.longitude, 
                    city: ip.city || "Unknown", 
                    country: ip.country || "Unknown",
                    ips: [ip],
                    totalPackets: ip.packet_count || 0
                  })
                }}
              >
                <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                  <div className="p-2 text-[11px] font-bold bg-card text-foreground rounded-lg shadow-xl border border-theme">
                    <div className="text-blue-600 uppercase tracking-tighter mb-1 border-b border-theme pb-1">{ip.city || "Unknown"}</div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 font-black text-[9px]">IP:</span>
                        <span className="text-foreground text-[9px]">{ip.ip}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500 font-black text-[9px]">Packets:</span>
                        <span className="text-foreground text-[9px]">{ip.packet_count || 1}</span>
                      </div>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            );
          })
        )}


        {mode === 'summary' && countryPoints.map((point, idx) => {
          const dotSize = 10;
          const icon = L.divIcon({
            html: `<div class="custom-dot-marker summary-dot" style="width: ${dotSize}px; height: ${dotSize}px;"></div>`,
            className: '',
            iconSize: [dotSize, dotSize],
            iconAnchor: [dotSize / 2, dotSize / 2]
          });

          return (
            <Marker pane="topPane"
              key={`country-${idx}`}
              position={point.coords}
              icon={icon}
              eventHandlers={{
                click: () => setSelectedCountry(point)
              }}
            >
              <Tooltip direction="top" offset={[0, -dotSize / 2]} opacity={1}>
                <div className="p-2 text-[11px] font-bold bg-card text-foreground rounded-lg shadow-xl border border-theme">
                  <div className="text-indigo-600 uppercase  mb-1 border-b border-theme pb-1">{point.name}</div>
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500 font-black  text-[12px]">Total IPs</span>
                    <span className="text-foreground">{(point.count || 0).toLocaleString()}</span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}


        {mode === 'pcap' && L && (
          <Marker
            pane="topPane"
            key="center-delhi"
            position={DELHI_COORDS}
            icon={L.divIcon({
              html: `<div class="center-red-dot"></div>`,
              className: '',
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })}
            interactive={false}
          />
        )}
      </MapContainer>


      {title && (
        <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card/85 backdrop-blur-xl border border-blue-500/20 px-4 py-2 rounded-none shadow-[0_0_30px_rgba(59,130,246,0.1)] flex items-center gap-3 group transition-all duration-500"
          >
            <div className="p-2 bg-blue-500/10 rounded-none group-hover:scale-110 transition-transform duration-500">
              <MapPin size={16} className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
            </div>
            <div>
              <div className="font-bold  font-black text-foreground  group-hover:text-blue-500 transition-colors">
                {title}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-2">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
          className="bg-card/85 backdrop-blur-xl border border-blue-500/20 px-4 py-2 rounded-none shadow-[0_0_30px_rgba(59,130,246,0.1)] flex items-center gap-3 group transition-all duration-500"
        >
          <div className="p-2 bg-blue-500/10 rounded-none group-hover:scale-110 transition-transform duration-500">
            <Globe size={16} className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
          </div>
          <div>
            <div className="font-bold font-black text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none mb-1 group-hover:text-blue-400 transition-colors">
              {mode === 'summary' ? 'Total Countries' : 'Total IPs Located'}
            </div>
            <div className="text-lg font-black text-foreground tracking-tight group-hover:text-blue-500 transition-colors">
              {mode === 'summary' ? countryData.length : externalIps.length.toLocaleString()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Removed Cluster Reveal UI */}


      <AnimatePresence>
        {selectedGroup && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute top-32 right-10 z-[1001] w-96 bg-card border border-theme rounded-none shadow-2xl overflow-hidden"
          >
            <motion.div
              className="p-5 bg-blue-500/5 border-b border-theme flex items-center justify-between cursor-move group/header"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover/header:scale-110 transition-transform duration-500">
                  <MapPin size={20} className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                </div>
                <div>
                  <h4 className="text-[15px] font-black text-foreground uppercase ">{selectedGroup.city}</h4>
                  <p className="text-[10px] text-slate-500 font-black uppercase ">{selectedGroup.country}</p>
                </div>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-full transition-colors text-slate-500 group/close">
                <X size={20} className="group-hover/close:rotate-90 transition-transform" />
              </button>
            </motion.div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar p-2 bg-card">
              {selectedGroup.count > selectedGroup.ips.length && (
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-theme">
                  Showing {selectedGroup.ips.length.toLocaleString()} of {selectedGroup.count.toLocaleString()} IPs
                </div>
              )}
              <table className="w-full text-left border-separate border-spacing-y-1">
                <thead className="sticky top-0 bg-card z-10">
                  <tr>
                    <th className="px-3 py-2 text-[11px] font-black text-slate-500 ">IP Address</th>
                    <th className="px-3 py-2 text-[11px] font-black text-slate-500  text-right">Packets</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="">
                  {selectedGroup.ips.map((ip, i) => (
                    <tr key={i} className="group hover:bg-blue-500/5 transition-colors">
                      <td className="px-3 py-2.5 font-bold text-[11px] text-foreground">{ip.ip}</td>
                      <td className="px-3 py-2.5 text-right font-black text-[10px] text-blue-500">{ip.packet_count?.toLocaleString() || 1}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => onIpClick?.(ip.ip)} className="p-1.5 rounded-lg transition-all text-slate-500 hover:text-blue-600 hover:cursor-pointer">
                          <Search size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <AnimatePresence>
        {selectedCountry && (
          <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute top-32 right-10 z-[1001] w-80 bg-card border border-theme rounded-none shadow-2xl overflow-hidden p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Globe size={24} className="text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-foreground uppercase tracking-tight">{selectedCountry.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold  tracking-widest">Regional Intelligence</p>
                </div>
              </div>
              <button onClick={() => setSelectedCountry(null)} className="p-2 hover:bg-rose-500/10 hover:text-rose-500 rounded-full transition-colors text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-500/5 rounded-none border border-theme">
                <div className="text-[11px] font-black  ">Total IP count</div>
                <div className="text-lg font-black text-blue-500">{(selectedCountry.count || 0).toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-500/5 rounded-none border border-theme">
                <div className="text-[11px] font-black ">Captures seen</div>
                <div className="text-lg font-black text-foreground">{(selectedCountry.captures || 0).toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-500/5 rounded-none border border-theme">
                <div className="text-[11px] font-black  ">Packet volume</div>
                <div className="text-lg font-black text-foreground">{(selectedCountry.packets || 0).toLocaleString()}</div>
              </div>
            </div>

            
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-dot-marker {
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          transition: all 0.2s ease-out;
          cursor: pointer;
        }
        .summary-dot {
          background: #2563eb;
          width: 9px !important;
          height: 9px !important;
          box-shadow: 0 0 15px rgba(37, 99, 235, 0.4), 
                      0 0 30px rgba(37, 99, 235, 0.1);
          border: 2px solid white;
          animation: summary-scale-breathe 2s ease-in-out infinite;
        }
        @keyframes summary-scale-breathe {
          0%, 100% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 10px rgba(37, 99, 235, 0.4); }
          50% { transform: scale(1.4); opacity: 1; box-shadow: 0 0 25px rgba(37, 99, 235, 0.7), 0 0 40px rgba(37, 99, 235, 0.2); }
        }
        .custom-dot-marker:hover {
          transform: scale(3) !important;
          background: #ffffff !important;
          box-shadow: 0 0 40px rgba(37, 99, 235, 1), 0 0 80px rgba(37, 99, 235, 0.4);
          z-index: 1000 !important;
          border: 2.5px solid #2563eb;
        }
        .summary-dot:hover {
          background: #ffffff !important;
          box-shadow: 0 0 50px rgba(37, 99, 235, 1);
        }
        .center-red-dot {
          width: 12px;
          height: 12px;
          background: #ef4444;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 6px 18px rgba(239,68,68,0.28);
        }
        .continent-label-marker {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
        }
        .continent-label {
          transform: translate(-50%, -50%);
          white-space: pre-line;
          text-align: center;
          font-weight: 800;
          letter-spacing: 0.03em;
          line-height: 0.95;
          text-transform: uppercase;
          user-select: none;
          pointer-events: none;
          color: ${theme === 'dark' ? 'rgba(255,255,255,0.62)' : 'rgba(70, 90, 122, 0.85)'};
          text-shadow: ${theme === 'dark'
            ? '0 1px 0 rgba(0,0,0,0.85)'
            : '0 1px 0 rgba(255,255,255,0.65)'};
        }
        .continent-label.label-large {
          font-size: 17px;
        }
        .continent-label.label-medium {
          font-size: 14px;
          line-height: 0.92;
        }
        .continent-label.label-small {
          font-size: 11px;
          opacity: 0.82;
        }
        .pcap-marker {
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 900;
          font-size: 8px;
          text-shadow: 0 1px 2px rgba(15, 23, 42, 0.25);
          transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.2, 1), box-shadow 0.25s ease;
          cursor: pointer;
          position: relative;
          will-change: transform;
        }
        .pcap-marker-sprinkle {
          animation: pcap-marker-sprinkle 460ms cubic-bezier(0.16, 1.15, 0.28, 1) both;
        }
        .pcap-marker-focus {
          border-width: 2.5px;
          box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.12), 0 8px 18px rgba(30, 64, 175, 0.22) !important;
        }
        .pcap-marker:hover {
          transform: translateY(-6px) scale(1.16) !important;
          box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.18), 0 14px 26px rgba(37, 99, 235, 0.32) !important;
          z-index: 1000 !important;
        }
        .pcap-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #3b82f6;
          opacity: 0.4;
          animation: pcap-map-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          pointer-events: none;
          z-index: 1;
        }
        .pcap-sprinkle-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          opacity: 0;
          pointer-events: none;
          z-index: 1;
          animation: pcap-sprinkle-ring 520ms ease-out both;
        }
        @keyframes pcap-map-pulse {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes pcap-marker-sprinkle {
          0% {
            opacity: 0;
            transform: translate(var(--sprinkle-x), var(--sprinkle-y)) scale(0.32);
          }
          58% {
            opacity: 1;
            transform: translate(calc(var(--sprinkle-x) * -0.14), calc(var(--sprinkle-y) * -0.14)) scale(1.16);
          }
          78% {
            transform: translate(calc(var(--sprinkle-x) * 0.06), calc(var(--sprinkle-y) * 0.06)) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
        }
        @keyframes pcap-sprinkle-ring {
          0% {
            opacity: 0.34;
            transform: scale(0.5);
          }
          100% {
            opacity: 0;
            transform: scale(2.1);
          }
        }
        .leaflet-container {
          background: ${theme === 'dark' ? '#091224' : '#d8edf3'} !important;
        }
        .leaflet-tooltip {
          background: hsl(var(--card) / 0.7) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 12px !important;
          box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) !important;
          padding: 0 !important;
          color: hsl(var(--foreground)) !important;
          overflow: hidden;
        }
        .leaflet-grab { cursor: pointer !important; }
        .leaflet-dragging .leaflet-grab { cursor: grabbing !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border) / 0.5);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

MapZoomListener.propTypes = {
  setZoomLevel: PropTypes.func,
};

MapViewportListener.propTypes = {
  setViewport: PropTypes.func,
};

MapBoundsHelper.propTypes = {
  ips: PropTypes.array,
  mode: PropTypes.string,
};

PcapFocusController.propTypes = {
  focusCluster: PropTypes.object,
  mode: PropTypes.string,
};

WorldMapLeaflet.propTypes = {
  externalIps: PropTypes.array,
  onIpClick: PropTypes.func,
  mode: PropTypes.string,
  countryData: PropTypes.array,
  title: PropTypes.string,
};
