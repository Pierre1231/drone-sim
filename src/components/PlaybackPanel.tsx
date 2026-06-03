import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useRef, useEffect, useState } from 'react'
import { useSimStore } from '@/store/simStore'
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
        <meshStandardMaterial color="#0f172a" />
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

function TrajectoryLine({ positions, color = '#3b82f6' }: { positions: number[][]; color?: string }) {
  if (positions.length < 2) return null
  const points = positions.slice(0, 1000).map(p => [p[0], -p[2], p[1]])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flat()), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.5} />
    </line>
  )
}

/** Dashed reference trajectory line */
function RefTrajectoryLine({ positions }: { positions: number[][] }) {
  if (positions.length < 2) return null
  const points = positions.map(p => [p[0], -p[2], p[1]])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points.flat()), 3]}
        />
      </bufferGeometry>
      <lineDashedMaterial color="#f59e0b" dashSize={0.3} gapSize={0.2} transparent opacity={0.6} />
    </line>
  )
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PlaybackPanel() {
  const { status, result } = useSimStore()
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

  const totalFrames = result?.time.length ?? 0

  // 播放循环：用 setInterval 固定 10ms 步进（对应仿真数据 100Hz），
  // 避免 requestAnimationFrame 在高刷新率显示器上 delta 过小导致无法前进
  useEffect(() => {
    if (!isPlaying || !result || totalFrames === 0) return

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const next = prev + 1
        if (next >= totalFrames - 1) {
          setIsPlaying(false)
          return totalFrames - 1
        }
        return next
      })
    }, 10 / playbackSpeed)

    return () => clearInterval(interval)
  }, [isPlaying, result, playbackSpeed, totalFrames])

  useEffect(() => {
    if (status === 'complete') {
      setCurrentFrame(0)
      setIsPlaying(false)
    }
  }, [status])

  if (status === 'idle') {
    return (
      <div style={{
        width: '100%', height: 500,
        background: 'linear-gradient(180deg, oklch(96% 0.005 250) 0%, oklch(92% 0.01 250) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 'var(--space-4)', opacity: 0.5 }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-2)' }}>等待仿真开始</h3>
          <p style={{ fontSize: 14, opacity: 0.7 }}>在上方配置区选择部件并点击"开始仿真"</p>
        </div>
      </div>
    )
  }

  if (status === 'running') {
    return (
      <div style={{
        width: '100%', height: 500,
        background: 'linear-gradient(180deg, oklch(96% 0.005 250) 0%, oklch(92% 0.01 250) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid var(--border-default)',
            borderTopColor: 'var(--accent-primary)', borderRadius: '50%',
            animation: 'spin 1s linear infinite', margin: '0 auto var(--space-4)',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>正在计算仿真...</h3>
        </div>
      </div>
    )
  }

  if (!result || result.time.length === 0) {
    return (
      <div style={{
        width: '100%', height: 500,
        background: 'linear-gradient(180deg, oklch(96% 0.005 250) 0%, oklch(92% 0.01 250) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-secondary)',
      }}>
        <p>无仿真结果</p>
      </div>
    )
  }

  const pos = result.position[currentFrame] as [number, number, number]
  const quat = result.quaternion[currentFrame] as [number, number, number, number]
  const timeSec = result.time[currentFrame]
  const totalTime = result.time[totalFrames - 1]

  return (
    <div>
      {/* 3D Scene */}
      <div style={{ position: 'relative', width: '100%', height: 500 }}>
        <Canvas camera={{ position: [8, 8, 8], fov: 50 }} style={{ background: 'linear-gradient(180deg, oklch(18% 0.02 240) 0%, oklch(12% 0.02 240) 100%)' }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Grid args={[40, 40]} cellSize={1} cellThickness={0.5} cellColor="#94a3b8" />
          <DroneModel position={pos} quaternion={quat} />
          {/* Actual trajectory (blue) */}
          <TrajectoryLine positions={result.position} />
          {/* Reference trajectory (orange dashed) */}
          {result.refPosition && <RefTrajectoryLine positions={result.refPosition} />}
          <OrbitControls zoomSpeed={0.3} />
        </Canvas>

        {/* HUD Overlay */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3)', color: 'white', fontSize: 14, lineHeight: 1.8,
        }}>
          <div>⏱ {formatTime(timeSec)} / {formatTime(totalTime)}</div>
          <div>⬆ {(-pos[2]).toFixed(1)} m</div>
          <div>⚡ {result.voltage[currentFrame].toFixed(2)} V</div>
          <div>🔋 {(result.soc[currentFrame] * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Playback Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-6)',
        background: 'oklch(98% 0.005 250)',
        borderTop: '1px solid var(--border-default)',
      }}
      >
        <button onClick={() => setCurrentFrame(0)} style={{
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: '50%',
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'oklch(92% 0.01 250)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <SkipBack size={18} />
        </button>

        <button onClick={() => setIsPlaying(!isPlaying)} style={{
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent-primary)', color: 'var(--text-inverse)',
          border: 'none', borderRadius: '50%', cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button onClick={() => setCurrentFrame(totalFrames - 1)} style={{
          width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', color: 'var(--text-primary)', border: 'none', borderRadius: '50%',
          cursor: 'pointer', transition: 'all 0.15s ease',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'oklch(92% 0.01 250)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <SkipForward size={18} />
        </button>

        <input
          type="range"
          min={0}
          max={totalFrames - 1}
          value={currentFrame}
          onChange={e => { setCurrentFrame(Number(e.target.value)); setIsPlaying(false) }}
          style={{ flex: 1, margin: '0 var(--space-2)', accentColor: 'var(--accent-primary)' }}
        />

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          color: 'var(--text-secondary)', whiteSpace: 'nowrap',
        }}>
          {formatTime(timeSec)} / {formatTime(totalTime)}
        </span>

        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          {[0.5, 1, 2, 4].map(speed => (
            <button key={speed} onClick={() => setPlaybackSpeed(speed)} style={{
              padding: 'var(--space-2) var(--space-3)', background: 'transparent',
              border: '1px solid var(--border-default)',
              color: playbackSpeed === speed ? 'var(--text-inverse)' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: 'var(--font-body)',
              backgroundColor: playbackSpeed === speed ? 'var(--accent-primary)' : 'transparent',
              borderColor: playbackSpeed === speed ? 'var(--accent-primary)' : 'var(--border-default)',
            }}
              onMouseEnter={e => { if (playbackSpeed !== speed) { e.currentTarget.style.borderColor = 'oklch(70% 0.01 250)'; e.currentTarget.style.color = 'var(--text-primary)' }}}
              onMouseLeave={e => { if (playbackSpeed !== speed) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)' }}}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
