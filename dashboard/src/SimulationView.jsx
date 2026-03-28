import { useSatelliteState } from './hooks/useSatelliteState';
import GNSSScene from './components/three/GNSSScene';
import HUD from './components/overlay/HUD';

export default function SimulationView({ data, connectionStatus }) {
  const satState = useSatelliteState(data);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 'calc(100vh - 70px)',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(124,210,233,0.12)',
    }}>
      <GNSSScene satState={satState} />
      <HUD satState={satState} connectionStatus={connectionStatus} />
    </div>
  );
}
