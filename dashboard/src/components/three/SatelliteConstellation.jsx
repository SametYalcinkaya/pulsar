import React from 'react';
import Satellite from './Satellite';

const SatelliteConstellation = React.memo(function SatelliteConstellation({ satellites }) {
  return (
    <group>
      {satellites.map((sat) => (
        <Satellite
          key={sat.id}
          id={sat.id}
          orbitRadius={sat.orbitRadius}
          orbitInclination={sat.orbitInclination}
          orbitRotation={sat.orbitRotation}
          orbitOffset={sat.orbitOffset}
          snr={sat.snr}
          isVisible={sat.isVisible}
          beamColor={sat.beamColor}
        />
      ))}
    </group>
  );
});

export default SatelliteConstellation;
