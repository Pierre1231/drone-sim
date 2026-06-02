import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useRef, useEffect } from 'react'
import { useSimStore } from '@/store/simStore'
import type { SimResult } from '@/lib/simulation'

function DroneModel({ position, quaternion }: { position: [number, number, number]; quaternion: [number, number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], -position[2], position[1])
      groupRef.current.quaternion.set(quaternion[1], quaternion[3], quaternion[2], quaternion[0])
    }
  }, [position, quaternion])

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh>
        <boxGeometry args={[0.1, 0.05, 0.15]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Arms */}
      <mesh position={[0.15, 0, 0.15]}>
        <boxGeometry args={[0.3, 0.02, 0.02]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[-0.15, 0, 0.15]}>
        <boxGeometry args={[0.3, 0.02, 0.02]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[0.15, 0, -0.15]}>
        <boxGeometry args={[0.3, 0.02, 0.02]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      <mesh position={[-0.15, 0, -0.15]}>
        <boxGeometry args={[0.3, 0.02, 0.02]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      {/* Props */}
      {[[0.15, 0.15], [-0.15, 0.15], [-0.15, -0.15], [0.15, -0.15]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]}>
          <cylinderGeometry args={[0.08, 0.08, 0.005, 16]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#22c55e' : '#ef4444'} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function TrajectoryLine({ positions }: { positions: number[][] }) {
  const points = positions.map(p => [p[0], -p[2], p[1]])
  if (points.length < 2) return null

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flat())}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#3b82f6" transparent opacity={0.5} />
    </line>
  )
}

export default function PlaybackPanel() {
  const { status, result } = useSimStore()
  const frameRef = useRef(0)

  if (status === 'idle') {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>请配置参数并点击"开始仿真"</p>
      </div>
    )
  }

  if (status === 'running') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">计算中...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        <p>仿真出错</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>无仿真结果</p>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <Grid args={[20, 20]} cellSize={1} cellThickness={0.5} cellColor="#94a3b8" />
        <DroneModel
          position={result.position[0] as [number, number, number]}
          quaternion={result.quaternion[0] as [number, number, number, number]}
        />
        <TrajectoryLine positions={result.position} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}
