import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export default function SpaceEnvironment({ attackType }) {
  const controlsRef = useRef();

  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });

  return (
    <>
      <ambientLight intensity={0.08} />
      <pointLight position={[10, 8, 10]} intensity={0.6} color="#e0f0ff" />
      <pointLight position={[-5, -3, -8]} intensity={0.2} color="#38bdf8" />

      <Stars
        radius={80}
        depth={60}
        count={3000}
        factor={4}
        saturation={0}
        fade
        speed={0.5}
      />

      <OrbitControls
        ref={controlsRef}
        autoRotate
        autoRotateSpeed={0.3}
        enableZoom={true}
        enablePan={false}
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={18}
      />

      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.4}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
