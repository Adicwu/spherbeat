import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

// Extend JSX.IntrinsicElements to include React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      ambientLight: any;
      color: any;
    }
  }
}

interface SphereVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

const ParticleSphere: React.FC<{ analyser: AnalyserNode | null }> = ({ analyser }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 2000; // Reduced particle count
  
  // Generate a simple circle texture for the particles
  const circleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Create initial positions on a UNIT sphere (radius = 1)
  const { positions, originalPositions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const origPos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Spherical coordinates
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 1; // Base radius 1

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      origPos[i * 3] = x;
      origPos[i * 3 + 1] = y;
      origPos[i * 3 + 2] = z;

      // Initial color (will be overridden by frame loop)
      color.setHSL(0.6, 0.8, 0.5);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return { positions: pos, originalPositions: origPos, colors: cols };
  }, []);

  const dataArray = useMemo(() => new Uint8Array(128), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();

    // IDLE STATE
    if (!analyser) {
        pointsRef.current.rotation.y = time * 0.05;
        pointsRef.current.rotation.z = time * 0.02;
        
        // Idle breathing
        const breathe = 125 + Math.sin(time * 0.5) * 25;
        pointsRef.current.scale.setScalar(breathe);
        
        // Idle Color: Gentle Cyan/Blue pulse
        const colorAttr = pointsRef.current.geometry.attributes.color;
        const tempColor = new THREE.Color();
        const baseIdleHue = 0.55; // Cyan/Blue
        
        for(let i=0; i<count; i++) {
            // Slight variation
            const hueShift = (i % 100) * 0.0002;
            const l = 0.4 + Math.sin(time * 2 + i) * 0.1;
            tempColor.setHSL(baseIdleHue + hueShift, 0.8, l);
            colorAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
        }
        colorAttr.needsUpdate = true;
        return;
    }

    // ACTIVE STATE
    analyser.getByteFrequencyData(dataArray);

    let bass = 0;
    const bassRange = 20; 
    for (let i = 0; i < bassRange; i++) bass += dataArray[i];
    
    const bassAvg = bass / bassRange;
    const bassNorm = bassAvg / 255;

    // 1. Rotation
    pointsRef.current.rotation.y += 0.005 + bassNorm * 0.05;
    pointsRef.current.rotation.z += 0.002 + bassNorm * 0.02;

    // 2. Dynamic Scale: 0 to 500 based on bass
    const targetScale = Math.max(5, bassNorm * 500); 
    pointsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.3);

    // 3. Particle Manipulation & Global Color Shift
    const geometry = pointsRef.current.geometry;
    const positionAttr = geometry.attributes.position;
    const colorAttr = geometry.attributes.color;
    const tempColor = new THREE.Color();

    // Color Logic: 
    // Map bass intensity to Hue. 
    // Low = 0.55 (Cyan) -> High = 0.95 (Red/Magenta)
    const targetHue = 0.55 + (bassNorm * 0.4); 

    for (let i = 0; i < count; i++) {
        const ix = i * 3;
        
        // --- Position (Spikes) ---
        let localScale = 1;
        if (bassNorm > 0.2) {
             const isSpike = i % 10 === 0; 
             const spikeMult = isSpike ? 1.5 : 1.05; 
             const flutter = (Math.random() - 0.5) * 0.1;
             localScale = 1 + (bassNorm * (spikeMult - 1)) + flutter;
        } else {
             localScale = 1 + Math.sin(time * 3 + i * 0.2) * 0.02; 
        }

        positionAttr.setXYZ(
            i, 
            originalPositions[ix] * localScale,
            originalPositions[ix+1] * localScale,
            originalPositions[ix+2] * localScale
        );

        // --- Color (Unified Energy) ---
        // Slight hue variation per particle to avoid "flat" look, but mostly unified
        const hueVar = (i % 50) * 0.001; 
        const h = targetHue + hueVar;
        const s = 0.8 + bassNorm * 0.2; // Max saturation on hits
        const l = 0.4 + bassNorm * 0.6; // Get very bright/white on heavy hits
        
        tempColor.setHSL(h, s, l);
        colorAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }
    
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={positions.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        map={circleTexture}
        size={8} // Increased slightly for circle visibility
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
        depthWrite={false}
        alphaTest={0.01} // Helps with transparency
      />
    </points>
  );
};

export const SphereVisualizer: React.FC<SphereVisualizerProps> = ({ analyser, isPlaying }) => {
  return (
    <div className="absolute inset-0 z-0 bg-sci-dark">
      <Canvas camera={{ position: [0, 0, 1000], fov: 60, far: 5000 }}>
        <color attach="background" args={['#020205']} />
        
        <ambientLight intensity={0.5} />
        <ParticleSphere analyser={isPlaying ? analyser : null} />
        
        <Stars radius={2000} depth={500} count={6000} factor={6} saturation={1} fade speed={1.5} />
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={!isPlaying} autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};