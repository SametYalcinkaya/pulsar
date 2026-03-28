import { useMemo } from 'react';

const ORBIT_PLANES = [
  { inclination: 55, rotation: 0, radius: 4.5 },
  { inclination: 55, rotation: 120, radius: 4.8 },
  { inclination: 55, rotation: 240, radius: 5.0 },
];

const SNR_GREEN = 35;
const SNR_YELLOW = 20;
const SNR_RED = 10;

function snrToColor(snr) {
  if (snr >= SNR_GREEN) return [0.13, 0.77, 0.37];    // #22c55e green
  if (snr >= SNR_YELLOW) return [0.96, 0.62, 0.04];   // #f59e0b yellow
  if (snr >= SNR_RED) return [0.94, 0.27, 0.27];      // #ef4444 red
  return [0.4, 0.15, 0.15];                            // dim red
}

function snrToHex(snr) {
  if (snr >= SNR_GREEN) return '#22c55e';
  if (snr >= SNR_YELLOW) return '#f59e0b';
  if (snr >= SNR_RED) return '#ef4444';
  return '#661a1a';
}

function haversineDist(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useSatelliteState(data) {
  return useMemo(() => {
    const gnss = data?.gnss || {};
    const imu = data?.imu || {};
    const ref = data?.reference || {};

    const satelliteCount = gnss.satellite_count ?? 12;
    const snrArray = gnss.snr_db || [];
    const maxSats = 12;

    const satellites = [];
    for (let i = 0; i < maxSats; i++) {
      const planeIdx = Math.floor(i / 4);
      const posInPlane = i % 4;
      const plane = ORBIT_PLANES[planeIdx];
      const snr = i < snrArray.length ? snrArray[i] : (i < satelliteCount ? 40 : 0);
      const isVisible = i < satelliteCount && snr > 5;

      satellites.push({
        id: i,
        planeIndex: planeIdx,
        positionInPlane: posInPlane,
        orbitRadius: plane.radius,
        orbitInclination: plane.inclination,
        orbitRotation: plane.rotation,
        orbitOffset: (posInPlane / 4) * Math.PI * 2,
        snr,
        isVisible,
        beamColor: snrToColor(snr),
        beamColorHex: snrToHex(snr),
      });
    }

    const gnssLat = gnss.latitude ?? 41.0082;
    const gnssLon = gnss.longitude ?? 28.9784;
    const imuLat = imu.dead_reckoning?.latitude ?? 41.0082;
    const imuLon = imu.dead_reckoning?.longitude ?? 28.9784;
    const positionDrift = haversineDist(gnssLat, gnssLon, imuLat, imuLon);

    return {
      satellites,
      satelliteCount,
      gnssPosition: { lat: gnssLat, lon: gnssLon },
      imuPosition: { lat: imuLat, lon: imuLon },
      positionDrift,
      snrMean: gnss.snr_mean ?? 40,
      gdop: gnss.gdop ?? 2.2,
      ntpOffset: Math.abs(ref.ntp_offset_ms ?? 0),
      trustScore: data?.trust_score ?? 96,
      threatLevel: data?.threat_level ?? 'SAFE',
      attackType: data?.active_attack ?? data?.attack_type ?? null,
      tick: data?.tick ?? 0,
      physicsScore: data?.physics_result?.score ?? 1,
      statsScore: data?.stats_result?.score ?? 1,
      mlAnomaly: data?.ml_result?.is_anomaly ?? false,
    };
  }, [data?.tick]);
}
