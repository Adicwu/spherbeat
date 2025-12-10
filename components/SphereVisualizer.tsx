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
  const count = 6000; // High particle count for large scale
  
  // Create initial positions on a UNIT sphere (radius = 1)
  const { positions, originalPositions, colors, initialHues } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const origPos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const hues = new Float32Array(count);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      // Spherical coordinates
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const r = 1; // Base radius 1, we will scale the mesh

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      origPos[i * 3] = x;
      origPos[i * 3 + 1] = y;
      origPos[i * 3 + 2] = z;

      // Rich colors
      const spatialHue = (Math.sin(x * 2) + Math.cos(y * 2) + 2) / 4; 
      const hue = (spatialHue + Math.random() * 0.2) % 1;
      hues[i] = hue;
      
      color.setHSL(hue, 0.9, 0.6);
      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;
    }
    return { positions: pos, originalPositions: origPos, colors: cols, initialHues: hues };
  }, []);

  const dataArray = useMemo(() => new Uint8Array(128), []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();

    // IDLE STATE
    if (!analyser) {
        pointsRef.current.rotation.y = time * 0.05;
        pointsRef.current.rotation.z = time * 0.02;
        
        // Large idle breathing: 150 to 250
        const breathe = 200 + Math.sin(time * 0.5) * 50;
        pointsRef.current.scale.setScalar(breathe);
        
        // Color cycle
        const colorAttr = pointsRef.current.geometry.attributes.color;
        const tempColor = new THREE.Color();
        for(let i=0; i<count; i++) {
            const h = (initialHues[i] + time * 0.1) % 1;
            tempColor.setHSL(h, 0.8, 0.6);
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

    // 2. Dynamic Scale: 0 to 800 based on bass
    // We add a tiny floor (e.g., 5) to prevent 0-scale rendering artifacts, 
    // but it's effectively 0 visually at this camera distance.
    const targetScale = Math.max(5, bassNorm * 800); 
    
    // Fast attack, somewhat smooth release
    pointsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.3);

    // 3. Particle Manipulation
    const geometry = pointsRef.current.geometry;
    const positionAttr = geometry.attributes.position;
    const colorAttr = geometry.attributes.color;
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
        const ix = i * 3;
        
        // Spikes: Since global scale is huge, we keep local spikes moderate relative to radius
        let localScale = 1;
        
        if (bassNorm > 0.2) {
             const isSpike = i % 10 === 0; 
             // With a huge sphere, we don't want spikes to go off-screen too much
             // Max spike 1.5x of the radius
             const spikeMult = isSpike ? 1.5 : 1.05; 
             
             // Random flutter
             const flutter = (Math.random() - 0.5) * 0.1;
             localScale = 1 + (bassNorm * (spikeMult - 1)) + flutter;
        } else {
             // Ripple idle
             localScale = 1 + Math.sin(time * 3 + i * 0.2) * 0.02; 
        }

        positionAttr.setXYZ(
            i, 
            originalPositions[ix] * localScale,
            originalPositions[ix+1] * localScale,
            originalPositions[ix+2] * localScale
        );

        // Color
        const h = (initialHues[i] + time * 0.2 + bassNorm * 0.4) % 1;
        const s = 0.8 + bassNorm * 0.2;
        const l = 0.5 + bassNorm * 0.5; // Flash to white/bright on beats
        
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
        size={5} // Increased size for distant camera
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};

export const SphereVisualizer: React.FC<SphereVisualizerProps> = ({ analyser, isPlaying }) => {
  return (
    <div className="absolute inset-0 z-0 bg-sci-dark">
      {/* Moved camera back to Z=1200 to accommodate radius 800 */}
      <Canvas camera={{ position: [0, 0, 1200], fov: 60, far: 5000 }}>
        <color attach="background" args={['#020205']} />
        
        <ambientLight intensity={0.5} />
        <ParticleSphere analyser={isPlaying ? analyser : null} />
        
        {/* Adjusted stars to be further away */}
        <Stars radius={2000} depth={500} count={6000} factor={6} saturation={1} fade speed={1.5} />
        
        <OrbitControls enableZoom={false} enablePan={false} autoRotate={!isPlaying} autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};