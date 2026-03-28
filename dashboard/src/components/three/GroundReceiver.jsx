import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { latLonToVec3 } from './Earth';

export default function GroundReceiver({ gnssPosition, imuPosition, positionDrift, attackType }) {
  const gnssRef = useRef();
  const imuRef = useRef();
  const lineRef = useRef();
  const gnssTargetRef = useRef(new THREE.Vector3());
  const gnssCurrentRef = useRef(new THREE.Vector3());

  const imuPos = useMemo(
    () => latLonToVec3(imuPosition.lat, imuPosition.lon, 2.025),
    [imuPosition.lat, imuPosition.lon]
  );

  const showDrift = positionDrift > 5;

  useFrame(({ clock }) => {
    // Smoothly interpolate GNSS position
    const target = latLonToVec3(gnssPosition.lat, gnssPosition.lon, 2.025);
    gnssTargetRef.current.copy(target);
    gnssCurrentRef.current.lerp(gnssTargetRef.current, 0.08);

    if (gnssRef.current) {
      gnssRef.current.position.copy(gnssCurrentRef.current);
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 4) * 0.2;
      gnssRef.current.scale.setScalar(pulse);
    }

    if (imuRef.current) {
      imuRef.current.position.copy(imuPos);
    }

    // Update drift line
    if (lineRef.current && showDrift) {
      const positions = lineRef.current.geometry.attributes.position;
      positions.array[0] = gnssCurrentRef.current.x;
      positions.array[1] = gnssCurrentRef.current.y;
      positions.array[2] = gnssCurrentRef.current.z;
      positions.array[3] = imuPos.x;
      positions.array[4] = imuPos.y;
      positions.array[5] = imuPos.z;
      positions.needsUpdate = true;
    }
  });

  const driftLineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    return geo;
  }, []);

  const driftLineMat = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: '#ef4444',
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
  }, []);

  return (
    <group>
      {/* GNSS reported position (cyan) */}
      <group ref={gnssRef}>
        <mesh>
          <ringGeometry args={[0.03, 0.05, 32]} />
          <meshBasicMaterial
            color="#38bdf8"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <pointLight color="#38bdf8" intensity={0.3} distance={0.5} />
      </group>

      {/* IMU true position (green) - only visible during drift */}
      {showDrift && (
        <group ref={imuRef}>
          <mesh>
            <ringGeometry args={[0.03, 0.05, 32]} />
            <meshBasicMaterial
              color="#22c55e"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <pointLight color="#22c55e" intensity={0.3} distance={0.5} />

          {/* IMU label */}
          <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
            <div style={{
              color: '#22c55e',
              fontSize: 10,
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.7)',
              padding: '2px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
            }}>
              IMU (Gerçek)
            </div>
          </Html>
        </group>
      )}

      {/* Drift line between GNSS and IMU */}
      {showDrift && (
        <>
          <line ref={lineRef} geometry={driftLineGeo} material={driftLineMat} />
          {/* Distance label at midpoint */}
          <Html
            position={[
              (gnssCurrentRef.current?.x || 0 + imuPos.x) / 2,
              (gnssCurrentRef.current?.y || 0 + imuPos.y) / 2 + 0.15,
              (gnssCurrentRef.current?.z || 0 + imuPos.z) / 2,
            ]}
            distanceFactor={8}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              color: '#ef4444',
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.8)',
              padding: '3px 8px',
              borderRadius: 4,
              border: '1px solid #ef4444',
              whiteSpace: 'nowrap',
            }}>
              {Math.round(positionDrift)}m sapma
            </div>
          </Html>
        </>
      )}
    </group>
  );
}
