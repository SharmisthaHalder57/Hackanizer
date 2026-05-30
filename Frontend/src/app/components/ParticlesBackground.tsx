import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function Network({ color }: { color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  
  // Create a static network of points and lines
  const { positions, linePositions } = useMemo(() => {
    const pointCount = 200;
    const maxDistance = 3.5;
    const points: THREE.Vector3[] = [];
    
    // Generate points within a sphere radius 10
    for (let i = 0; i < pointCount; i++) {
      const r = 10 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      points.push(new THREE.Vector3(x, y, z));
    }
    
    const positions = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      positions[i * 3] = points[i].x;
      positions[i * 3 + 1] = points[i].y;
      positions[i * 3 + 2] = points[i].z;
    }
    
    // Generate lines connecting close points
    const lineVertices: number[] = [];
    for (let i = 0; i < pointCount; i++) {
      for (let j = i + 1; j < pointCount; j++) {
        const dist = points[i].distanceTo(points[j]);
        if (dist < maxDistance) {
          lineVertices.push(
            points[i].x, points[i].y, points[i].z,
            points[j].x, points[j].y, points[j].z
          );
        }
      }
    }
    
    return {
      positions,
      linePositions: new Float32Array(lineVertices)
    };
  }, []);

  // Slowly rotate the entire network to give it a floating, 3D structure feel
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      groupRef.current.rotation.x = state.clock.elapsedTime * 0.025;
      // Slight vertical bobbing
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* The glowing nodes */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial 
          color={color} 
          size={0.12} 
          sizeAttenuation={true} 
          transparent 
          opacity={0.8} 
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* The neural connections */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color={color} 
          transparent 
          opacity={0.15} 
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

export function ParticlesBackground({ color = '#ffffff', className = 'fixed inset-0' }: { color?: string, className?: string }) {
  return (
    <div className={`${className} pointer-events-none z-0`}>
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        {/* Dark fog helps distant particles fade away, creating depth */}
        <fog attach="fog" args={['#030303', 8, 20]} />
        <Network color={color} />
      </Canvas>
    </div>
  );
}
