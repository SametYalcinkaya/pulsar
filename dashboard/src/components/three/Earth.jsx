import { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

function latLonToVec3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function AtmosphereGlow() {
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float fresnel = 1.0 - dot(viewDir, vNormal);
          fresnel = pow(fresnel, 3.0);
          vec3 color = vec3(0.22, 0.74, 0.97);
          gl_FragColor = vec4(color, fresnel * 0.6);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    });
  }, []);

  return (
    <mesh scale={[1.08, 1.08, 1.08]}>
      <sphereGeometry args={[2, 64, 64]} />
      <primitive object={atmosphereMaterial} attach="material" />
    </mesh>
  );
}

function IstanbulMarker({ attackType }) {
  const markerRef = useRef();
  const ringRef = useRef();
  const pos = latLonToVec3(41.0082, 28.9784, 2.03);

  useFrame(({ clock }) => {
    if (markerRef.current) {
      const pulse = 0.8 + Math.sin(clock.elapsedTime * 3) * 0.2;
      markerRef.current.scale.setScalar(pulse);
    }
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2) * 0.3);
      ringRef.current.material.opacity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.15;
    }
  });

  const color = attackType ? '#ef4444' : '#38bdf8';

  return (
    <group position={pos}>
      {/* Pulsing core */}
      <group ref={markerRef}>
        <mesh>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={3}
          />
        </mesh>
      </group>
      {/* Expanding ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <pointLight color={color} intensity={0.8} distance={1.5} />
    </group>
  );
}

export default function Earth({ attackType }) {
  const earthRef = useRef();

  // Load textures
  const colorMap = useLoader(THREE.TextureLoader, '/textures/earth_color.jpg');
  const nightMap = useLoader(THREE.TextureLoader, '/textures/earth_night.jpg');

  // Configure textures
  useMemo(() => {
    [colorMap, nightMap].forEach((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
    });
  }, [colorMap, nightMap]);

  // Custom shader for day/night blending
  const earthMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: colorMap },
        nightTexture: { value: nightMap },
        sunDirection: { value: new THREE.Vector3(5, 3, 5).normalize() },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          float dotNL = dot(vNormal, sunDirection);
          float dayMix = smoothstep(-0.1, 0.3, dotNL);
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb * 1.5;
          vec3 finalColor = mix(nightColor, dayColor, dayMix);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  }, [colorMap, nightMap]);

  // Slowly rotate Earth
  useFrame(({ clock }) => {
    if (earthRef.current) {
      earthRef.current.rotation.y = clock.elapsedTime * 0.02;
    }
  });

  return (
    <group>
      {/* Textured Earth */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>

      {/* Subtle wireframe overlay */}
      <mesh>
        <sphereGeometry args={[2.008, 36, 18]} />
        <meshBasicMaterial
          color="#38bdf8"
          wireframe
          transparent
          opacity={0.03}
        />
      </mesh>

      {/* Atmosphere glow */}
      <AtmosphereGlow />

      {/* İstanbul marker */}
      <IstanbulMarker attackType={attackType} />
    </group>
  );
}

export { latLonToVec3 };
