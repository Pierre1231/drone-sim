import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useSimStore } from '@/store/simStore'
import type { SimResult } from '@/lib/simulation'
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react'

function DroneModel({ position, quaternion }: { position: [number, number, number]; quaternion: [number, number, number, number] }) {
  const groupRef = useRef<any>(null)

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], -position[2], position[1])
      groupRef.current.quaternion.set(quaternion[1], quaternion[3], quaternion[2], quaternion[0])
    }
  }, [position, quaternion])

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.1, 0.05, 0.15]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
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
  if (positions.length < 2) return null
  const points = positions.slice(0, 1000).map(p => [p[0], -p[2], p[1]])

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
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const animRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const totalFrames = result?.time.length ?? 0

  const animate = useCallback((timestamp: number) => {
    if (!isPlaying || !result) return

    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
    const delta = (timestamp - lastTimeRef.current) * playbackSpeed / 1000
    lastTimeRef.current = timestamp

    setCurrentFrame(prev => {
      const next = prev + Math.floor(delta * 100)
      if (next >= totalFrames - 1) {
        setIsPlaying(false)
        return totalFrames - 1
      }
      return next
    })

    animRef.current = requestAnimationFrame(animate)
  }, [isPlaying, result, playbackSpeed, totalFrames])

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0
      animRef.current = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(animRef.current)
    }
    return () => cancelAnimationFrame(animRef.current)
  }, [isPlaying, animate])

  useEffect(() => {
    if (status === 'complete') {
      setCurrentFrame(0)
      setIsPlaying(false)
    }
  }, [status])

  if (status === 'idle') {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>请配置参数并点击"开始仿真"</p>
      </div>
    )
  }

  if (status === 'running') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">计算中...</p>
        </div>
      </div>
    )
  }

  if (!result || result.time.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>无仿真结果</p>
      </div>
    )
  }

  const pos = result.position[currentFrame] as [number, number, number]
  const quat = result.quaternion[currentFrame] as [number, number, number, number]
  const timeSec = result.time[currentFrame]

  return (
    <div className="h-full relative">
      {/* 3D Scene */}
      <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Grid args={[40, 40]} cellSize={1} cellThickness={0.3} cellColor="#475569" />
        <DroneModel position={pos} quaternion={quat} />
        <TrajectoryLine positions={result.position} />
        <OrbitControls />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 bg-black/60 rounded-lg p-3 text-white text-sm space-y-1">
        <div>⏱ {(timeSec / 60).toFixed(1)} min</div>
        <div>⬆ {(-pos[2]).toFixed(1)} m</div>
        <div>⚡ {result.voltage[currentFrame].toFixed(2)} V</div>
        <div>🔋 {(result.soc[currentFrame] * 100).toFixed(0)}%</div>
      </div>

      {/* Playback Controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 rounded-full px-4 py-2">
        <button onClick={() => setCurrentFrame(0)} className="text-white hover:text-blue-400">
          <SkipBack size={18} />
        </button>
        <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-blue-400">
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button onClick={() => setCurrentFrame(totalFrames - 1)} className="text-white hover:text-blue-400">
          <SkipForward size={18} />
        </button>
        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={e => { setCurrentFrame(Number(e.target.value)); setIsPlaying(false) }}
          className="w-32 mx-2"
        />
        <select
          value={playbackSpeed}
          onChange={e => setPlaybackSpeed(Number(e.target.value))}
          className="bg-transparent text-white text-xs border border-white/30 rounded px-1"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
    </div>
  )
}
