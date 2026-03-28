import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSatellitePosition } from './Satellite';
import { latLonToVec3 } from './Earth';

const ISTANBUL = latLonToVec3(41.0082, 28.9784, 2.02);

export default function SignalBeam({ satellite, attackType }) {
  const lineRef = useRef();
  const pulseRef = useRef();
  const opacityRef = useRef(satellite.isVisible ? 1 : 0);

  const beamMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
  }, []);

  const pulseColor = useMemo(() => {
    if (!satellite.isVisible) return '#333';
    if (satellite.snr >= 35) return '#22c55e';
    if (satellite.snr >= 20) return '#f59e0b';
    return '#ef4444';
  }, [satellite.snr, satellite.isVisible]);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;

    const satPos = getSatellitePosition(
      satellite.id,
      satellite.orbitRadius,
      satellite.orbitInclination,
      satellite.orbitRotation,
      satellite.orbitOffset,
      clock.elapsedTime
    );

    // Update line geometry
    const positions = lineRef.current.geometry.attributes.position;
    positions.array[0] = satPos.x;
    positions.array[1] = satPos.y;
    positions.array[2] = satPos.z;
    positions.array[3] = ISTANBUL.x;
    positions.array[4] = ISTANBUL.y;
    positions.array[5] = ISTANBUL.z;
    positions.needsUpdate = true;

    // Smooth opacity
    const targetOpacity = satellite.isVisible ? 0.5 : 0;
    opacityRef.current += (targetOpacity - opacityRef.current) * 0.05;
    beamMaterial.opacity = opacityRef.current;

    // Set color
    const col = satellite.beamColor;
    beamMaterial.color.setRGB(col[0], col[1], col[2]);

    // Animate pulse along beam
    if (pulseRef.current && satellite.isVisible) {
      const speed = 0.8;
      const t = ((clock.elapsedTime * speed + satellite.id * 0.3) % 1);
      pulseRef.current.position.lerpVectors(satPos, ISTANBUL, t);
      pulseRef.current.material.opacity = opacityRef.current * (0.5 + Math.sin(t * Math.PI) * 0.5);
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <group>
      <line ref={lineRef} geometry={geometry} material={beamMaterial} />
      {satellite.isVisible && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial
            color={pulseColor}
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
