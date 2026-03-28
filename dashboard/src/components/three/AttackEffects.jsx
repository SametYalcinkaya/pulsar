import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { latLonToVec3 } from './Earth';

const ISTANBUL = latLonToVec3(41.0082, 28.9784, 2.02);

function JammingNoise() {
  const pointsRef = useRef();
  const count = 80;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 0.2 + Math.random() * 0.4;
      arr[i * 3] = ISTANBUL.x + r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = ISTANBUL.y + r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = ISTANBUL.z + r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      const offset = Math.sin(clock.elapsedTime * 3 + i) * 0.02;
      pos.array[i * 3] += offset * (Math.random() - 0.5);
      pos.array[i * 3 + 1] += offset * (Math.random() - 0.5);
      pos.array[i * 3 + 2] += offset * (Math.random() - 0.5);
    }
    pos.needsUpdate = true;
    pointsRef.current.material.opacity = 0.4 + Math.sin(clock.elapsedTime * 5) * 0.2;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ef4444"
        size={0.03}
        transparent
        opacity={0.5}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function SpoofingSource({ gnssPosition }) {
  const groupRef = useRef();
  const spoofPos = useMemo(() => {
    // Place fake source near the GNSS (spoofed) position, on ground
    return latLonToVec3(gnssPosition.lat - 0.01, gnssPosition.lon + 0.01, 2.04);
  }, [gnssPosition.lat, gnssPosition.lon]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 4) * 0.3;
      groupRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={spoofPos} ref={groupRef}>
      {/* Triangle icon for fake transmitter */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.1, 3]} />
        <meshStandardMaterial
          color="#f97316"
          emissive="#f97316"
          emissiveIntensity={2}
        />
      </mesh>
      <pointLight color="#f97316" intensity={0.5} distance={1} />

      <Html distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{
          color: '#f97316',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.8)',
          padding: '2px 8px',
          borderRadius: 4,
          border: '1px solid #f97316',
          whiteSpace: 'nowrap',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          SAHTE KAYNAK
        </div>
      </Html>
    </group>
  );
}

function MeaconingGhosts() {
  const ghostRef = useRef();

  useFrame(({ clock }) => {
    if (ghostRef.current) {
      ghostRef.current.material.opacity = 0.15 + Math.sin(clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <mesh ref={ghostRef} position={ISTANBUL}>
      <torusGeometry args={[0.25, 0.01, 8, 32]} />
      <meshBasicMaterial
        color="#f59e0b"
        transparent
        opacity={0.2}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function AttackEffects({ attackType, gnssPosition }) {
  if (!attackType) return null;

  const type = attackType.toUpperCase();

  return (
    <group>
      {(type === 'JAMMING' || type === 'COMBINED') && <JammingNoise />}
      {(type === 'SPOOFING' || type === 'COMBINED') && (
        <SpoofingSource gnssPosition={gnssPosition} />
      )}
      {type === 'MEACONING' && <MeaconingGhosts />}
    </group>
  );
}
