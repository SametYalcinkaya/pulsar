import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Preload the model
useGLTF.preload('/models/satellite.glb');

export default function Satellite({ id, orbitRadius, orbitInclination, orbitRotation, orbitOffset, snr, isVisible, beamColor }) {
  const groupRef = useRef();
  const modelRef = useRef();
  const glowRef = useRef();
  const opacityRef = useRef(isVisible ? 1 : 0);
  const positionRef = useRef(new THREE.Vector3());

  const { scene } = useGLTF('/models/satellite.glb');

  // Clone the model for each satellite instance
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return clone;
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // Orbit calculation
    const speed = 0.15 + id * 0.008;
    const angle = orbitOffset + clock.elapsedTime * speed;
    const inclRad = (orbitInclination * Math.PI) / 180;
    const rotRad = (orbitRotation * Math.PI) / 180;

    const x = orbitRadius * Math.cos(angle);
    const y = orbitRadius * Math.sin(angle) * Math.sin(inclRad);
    const z = orbitRadius * Math.sin(angle) * Math.cos(inclRad);

    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);
    const rx = x * cosR - z * sinR;
    const rz = x * sinR + z * cosR;

    groupRef.current.position.set(rx, y, rz);
    positionRef.current.set(rx, y, rz);

    // Make satellite face Earth (look at center)
    groupRef.current.lookAt(0, 0, 0);

    // Smooth opacity transition
    const targetOpacity = isVisible ? 1 : 0;
    opacityRef.current += (targetOpacity - opacityRef.current) * 0.05;

    // Update model material opacity and color
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material.opacity = opacityRef.current;
        if (!child.material.emissive) child.material.emissive = new THREE.Color();
        if (!isVisible) {
          child.material.emissive.setRGB(0.4, 0.08, 0.08);
          child.material.emissiveIntensity = 1;
        } else {
          child.material.emissive.setRGB(beamColor[0] * 0.5, beamColor[1] * 0.5, beamColor[2] * 0.5);
          child.material.emissiveIntensity = 1.5;
        }
      }
    });

    // Glow pulse
    if (glowRef.current) {
      glowRef.current.material.opacity = opacityRef.current * 0.4;
      const pulse = 1 + Math.sin(clock.elapsedTime * 2 + id) * 0.15;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={groupRef}>
      {/* GLB satellite model */}
      <primitive
        ref={modelRef}
        object={clonedScene}
        scale={0.02}
      />

      {/* Glow halo */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial
          color={isVisible ? '#38bdf8' : '#661a1a'}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function getSatellitePosition(id, orbitRadius, orbitInclination, orbitRotation, orbitOffset, time) {
  const speed = 0.15 + id * 0.008;
  const angle = orbitOffset + time * speed;
  const inclRad = (orbitInclination * Math.PI) / 180;
  const rotRad = (orbitRotation * Math.PI) / 180;

  const x = orbitRadius * Math.cos(angle);
  const y = orbitRadius * Math.sin(angle) * Math.sin(inclRad);
  const z = orbitRadius * Math.sin(angle) * Math.cos(inclRad);

  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  return new THREE.Vector3(
    x * cosR - z * sinR,
    y,
    x * sinR + z * cosR
  );
}
