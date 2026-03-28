import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import SpaceEnvironment from './SpaceEnvironment';
import Earth from './Earth';
import SatelliteConstellation from './SatelliteConstellation';
import SignalBeam from './SignalBeam';
import GroundReceiver from './GroundReceiver';
import AttackEffects from './AttackEffects';

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshBasicMaterial color="#0a1628" wireframe />
    </mesh>
  );
}

const GNSSScene = React.memo(function GNSSScene({ satState }) {
  return (
    <Canvas
      camera={{ position: [0, 3, 8], fov: 50 }}
      style={{ background: '#030510' }}
      gl={{ antialias: true, alpha: false }}
    >
      <Suspense fallback={<LoadingFallback />}>
        <SpaceEnvironment attackType={satState.attackType} />
        <Earth attackType={satState.attackType} />
        <SatelliteConstellation satellites={satState.satellites} />

        {satState.satellites.map((sat) => (
          <SignalBeam
            key={sat.id}
            satellite={sat}
            attackType={satState.attackType}
          />
        ))}

        <GroundReceiver
          gnssPosition={satState.gnssPosition}
          imuPosition={satState.imuPosition}
          positionDrift={satState.positionDrift}
          attackType={satState.attackType}
        />

        <AttackEffects
          attackType={satState.attackType}
          gnssPosition={satState.gnssPosition}
        />
      </Suspense>
    </Canvas>
  );
});

export default GNSSScene;
