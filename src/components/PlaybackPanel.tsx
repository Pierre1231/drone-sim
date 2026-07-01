import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { memo, useMemo, useRef, useEffect, useState } from 'react'
import { useSimStore } from '@/store/simStore'
import { Play, Pause, SkipBack, SkipForward, Package } from 'lucide-react'
import { samplePlayback } from '@/lib/playbackSampler'

const ARM_LENGTH = 0.15
const ARM_LEN = Math.sqrt(2) * ARM_LENGTH

const MOTOR_POSITIONS: [number, number, number][] = [
  [ARM_LENGTH, 0, ARM_LENGTH],
  [-ARM_LENGTH, 0, ARM_LENGTH],
  [-ARM_LENGTH, 0, -ARM_LENGTH],
  [ARM_LENGTH, 0, -ARM_LENGTH],
]

const PROP_COLORS = ['#22c55e', '#ef4444', '#22c55e', '#ef4444']

const ARM_CONFIGS = [
  { pos: [0.075, 0.005, 0.075] as [number, number, number], rot: -Math.PI / 4 },
  { pos: [-0.075, 0.005, 0.075] as [number, number, number], rot: Math.PI / 4 },
  { pos: [-0.075, 0.005, -0.075] as [number, number, number], rot: -Math.PI / 4 },
  { pos: [0.075, 0.005, -0.075] as [number, number, number], rot: Math.PI / 4 },
]

const LEG_POSITIONS: [number, number, number][] = [
  [0.12, -0.04, 0.12],
  [-0.12, -0.04, 0.12],
  [-0.12, -0.04, -0.12],
  [0.12, -0.04, -0.12],
]

const PROP_TIP_MARKERS = [
  { p: [0.08, 0.002, 0] as [number, number, number] },
  { p: [-0.08, 0.002, 0] as [number, number, number] },
  { p: [0, 0.002, 0.08] as [number, number, number] },
  { p: [0, 0.002, -0.08] as [number, number, number] },
]

function buildTrajectoryPositions(positions: number[][], maxPoints = positions.length): Float32Array {
  const pointCount = Math.min(positions.length, maxPoints)
  const data = new Float32Array(pointCount * 3)
  for (let i = 0; i < pointCount; i++) {
    const p = positions[i]
    const offset = i * 3
    data[offset] = p[0]
    data[offset + 1] = -p[2]
    data[offset + 2] = p[1]
  }
  return data
}

const DroneGeometry = memo(function DroneGeometry({
  propRefs,
  onSelectRef,
}: {
  propRefs: React.MutableRefObject<(THREE.Group | null)[]>
  onSelectRef: React.MutableRefObject<(() => void) | undefined>
}) {
  const handleSelect = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    onSelectRef.current?.()
  }

  return (
    <>
      {/* Large transparent hit target so the drone is selectable from a distance. */}
      <mesh onClick={handleSelect}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Center body */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.06, 0.03, 0.08]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Top cover, slightly raised to avoid depth fighting. */}
      <mesh position={[0, 0.035, 0]}>
        <boxGeometry args={[0.05, 0.008, 0.07]} />
        <meshStandardMaterial color="#2d2d44" polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>

      {/* Four arms */}
      {ARM_CONFIGS.map((arm, i) => (
        <mesh key={`arm-${i}`} position={arm.pos} rotation={[0, arm.rot, 0]}>
          <boxGeometry args={[ARM_LEN, 0.008, 0.008]} />
          <meshStandardMaterial color="#2d2d44" />
        </mesh>
      ))}

      {/* Four motor mounts and propellers */}
      {MOTOR_POSITIONS.map((pos, i) => (
        <group key={`motor-${i}`}>
          {/* Motor mount */}
          <mesh position={[pos[0], 0.025, pos[2]]}>
            <cylinderGeometry args={[0.018, 0.02, 0.025, 16]} />
            <meshStandardMaterial color="#4a4a6a" metalness={0.6} roughness={0.3} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
          </mesh>
          {/* Rotating propeller group */}
          <group ref={el => { propRefs.current[i] = el }} position={[pos[0], 0.04, pos[2]]}>
            {/* Blade 1 */}
            <mesh>
              <boxGeometry args={[0.18, 0.003, 0.02]} />
              <meshStandardMaterial color={PROP_COLORS[i]} transparent opacity={0.55} />
            </mesh>
            {/* Blade 2 */}
            <mesh>
              <boxGeometry args={[0.02, 0.003, 0.18]} />
              <meshStandardMaterial color={PROP_COLORS[i]} transparent opacity={0.55} />
            </mesh>
            {/* Tip markers for visual rotation direction. */}
            {PROP_TIP_MARKERS.map((t, ti) => (
              <mesh key={ti} position={t.p}>
                <sphereGeometry args={[0.006, 6, 6]} />
                <meshStandardMaterial color={PROP_COLORS[i]} />
              </mesh>
            ))}
            {/* Propeller hub */}
            <mesh>
              <sphereGeometry args={[0.014, 8, 8]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
        </group>
      ))}

      {/* Landing gear */}
      {LEG_POSITIONS.map((pos, i) => (
        <group key={`leg-${i}`}>
          {/* Strut */}
          <mesh position={[pos[0], pos[1] / 2, pos[2]]}>
            <cylinderGeometry args={[0.004, 0.004, Math.abs(pos[1]), 8]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          {/* Foot pad */}
          <mesh position={[pos[0], pos[1] - 0.01, pos[2]]}>
            <cylinderGeometry args={[0.015, 0.015, 0.004, 8]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        </group>
      ))}
    </>
  )
})

function DroneModel({ position, quaternion, motorSpeeds, onClick }: {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  motorSpeeds?: number[]
  onClick?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const propRefs = useRef<(THREE.Group | null)[]>([null, null, null, null])
  const motorSpeedsRef = useRef(motorSpeeds)
  const onClickRef = useRef(onClick)

  useEffect(() => {
    motorSpeedsRef.current = motorSpeeds
  }, [motorSpeeds])

  useEffect(() => {
    onClickRef.current = onClick
  }, [onClick])

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], -position[2], position[1])
      groupRef.current.quaternion.set(quaternion[1], quaternion[3], quaternion[2], quaternion[0])
    }
  }, [position, quaternion])

  useFrame((_, delta) => {
    const speeds = motorSpeedsRef.current
    propRefs.current.forEach((ref, i) => {
      if (ref) {
        const rpm = speeds && speeds[i] > 0 ? speeds[i] * 0.05 : 120
        const dir = i === 1 || i === 3 ? -1 : 1 // CW motors (1,3) rotate opposite to CCW (0,2)
        ref.rotation.y += dir * (rpm * 2 * Math.PI / 60) * delta
      }
    })
  })

  return (
    <group ref={groupRef}>
      <DroneGeometry propRefs={propRefs} onSelectRef={onClickRef} />
    </group>
  )
}

const TrajectoryLine = memo(function TrajectoryLine({ positions, color = '#3b82f6' }: { positions: number[][]; color?: string }) {
  const positionArray = useMemo(() => buildTrajectoryPositions(positions, 1000), [positions])
  if (positions.length < 2) return null

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionArray, 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.5} />
    </line>
  )
})

/** Dashed reference trajectory line */
const RefTrajectoryLine = memo(function RefTrajectoryLine({ positions }: { positions: number[][] }) {
  const positionArray = useMemo(() => buildTrajectoryPositions(positions), [positions])
  if (positions.length < 2) return null

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positionArray, 3]}
        />
      </bufferGeometry>
      <lineDashedMaterial color="#f59e0b" dashSize={0.3} gapSize={0.2} transparent opacity={0.6} />
    </line>
  )
})

/** Follow-camera controller with a smooth inertial spherical offset. */
function CameraController({
  followMode,
  target,
  followRef,
  orbitRef,
  followModeRef,
}: {
  followMode: boolean
  target: THREE.Vector3
  followRef: React.MutableRefObject<{ r: number; theta: number; phi: number }>
  orbitRef: React.RefObject<OrbitControlsImpl | null>
  followModeRef: React.MutableRefObject<boolean>
}) {
  const { camera, gl } = useThree()
  const currentPos = useRef(new THREE.Vector3())
  const wasFollowing = useRef(false)

  // Bind native wheel on the canvas while follow mode is active.
  useEffect(() => {
    const canvas = gl.domElement
    const onWheel = (e: WheelEvent) => {
      if (!followModeRef.current) return
      e.preventDefault()
      e.stopPropagation()
      followRef.current.r = Math.max(1, Math.min(100, followRef.current.r + e.deltaY * 0.02))
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [gl, followModeRef, followRef])

  useFrame(() => {
    if (followMode) {
      if (!wasFollowing.current) {
        // Entering follow mode: start smoothing from the current camera position.
        currentPos.current.copy(camera.position)
        wasFollowing.current = true
      }
      const { r, theta, phi } = followRef.current
      const offset = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      )
      const desired = target.clone().add(offset)
      currentPos.current.lerp(desired, 0.08)
      camera.position.copy(currentPos.current)
      camera.lookAt(target)
    } else {
      if (wasFollowing.current) {
        // Leaving follow mode: sync the OrbitControls target to avoid a jump.
        if (orbitRef.current) {
          orbitRef.current.target.copy(target)
          orbitRef.current.update()
        }
        wasFollowing.current = false
      }
    }
  })

  return null
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function PlaybackPanel() {
  const { status, result } = useSimStore()
  const [playbackTime, setPlaybackTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [followMode, setFollowMode] = useState(false)
  const totalFrames = result?.time.length ?? 0
  const playbackSample = useMemo(() => {
    if (!result || result.time.length === 0) return null
    return samplePlayback(result, playbackTime)
  }, [result, playbackTime])

  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const sceneWrapRef = useRef<HTMLDivElement>(null)
  const orbitRef = useRef<OrbitControlsImpl | null>(null)
  const followModeRef = useRef(followMode)
  useEffect(() => {
    followModeRef.current = followMode
  }, [followMode])

  // Initial offset (x=3, y=2, z=5), converted to spherical coordinates.
  const r0 = Math.sqrt(3 * 3 + 2 * 2 + 5 * 5)
  const followRef = useRef({
    r: r0,
    theta: Math.atan2(5, 3),
    phi: Math.acos(2 / r0),
  })

  // Escape exits follow mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFollowMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Wheel events are bound inside CameraController to avoid wrapper bubbling issues.

  // Playback loop driven by requestAnimationFrame.
  useEffect(() => {
    if (!isPlaying || !result || totalFrames === 0) return

    let lastTick = performance.now()
    let frameId = 0
    const tick = () => {
      const now = performance.now()
      const elapsedSec = (now - lastTick) / 1000
      lastTick = now
      setPlaybackTime(prev => {
        const end = result.time[totalFrames - 1]
        const next = prev + elapsedSec * playbackSpeed
        if (next >= end) {
          setIsPlaying(false)
          return end
        }
        return next
      })
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [isPlaying, result, playbackSpeed, totalFrames])

  // Reset local playback state when a simulation completes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (status === 'complete') {
      setPlaybackTime(0)
      setIsPlaying(false)
      setFollowMode(false)
    }
  }, [status])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (status === 'idle') {
    return (
      <div style={{
        width: '100%', height: 500,
        background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Package size={64} style={{ display: 'block', margin: '0 auto var(--space-4)', opacity: 0.5 }} strokeWidth={1.5} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-2)' }}>等待仿真开始</h3>
          <p style={{ fontSize: 14, opacity: 0.7 }}>在上方配置区选择部件并点击开始仿真</p>
        </div>
      </div>
    )
  }

  if (status === 'running') {
    return (
      <div style={{
        width: '100%', height: 500,
        background: '#ffffff',
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
        background: '#ffffff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-secondary)',
      }}>
        <p>无仿真结果</p>
      </div>
    )
  }

  if (!playbackSample) return null

  const pos = playbackSample.position
  const quat = playbackSample.quaternion
  const timeSec = playbackSample.time
  const totalTime = result.time[totalFrames - 1]

  // Drone position in Three.js world coordinates.
  const droneTarget = new THREE.Vector3(...playbackSample.threePosition)

  // Follow-mode pointer interaction.
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!followMode || e.button !== 0) return
    isDragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!followMode || !isDragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    followRef.current.theta += dx * 0.005
    followRef.current.phi -= dy * 0.005
    // Clamp phi to avoid crossing the poles.
    followRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, followRef.current.phi))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }

  return (
    <div>
      {/* 3D Scene */}
      <div
        ref={sceneWrapRef}
        style={{ position: 'relative', width: '100%', height: 500 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <Canvas
          camera={{ position: [8, 8, 8], fov: 50, near: 0.01, far: 100 }}
          gl={{ logarithmicDepthBuffer: true }}
          style={{ background: '#ffffff' }}
          onPointerMissed={() => setFollowMode(false)}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Grid args={[40, 40]} cellSize={1} cellThickness={0.5} cellColor="#94a3b8" />
          <DroneModel
            position={pos}
            quaternion={quat}
            motorSpeeds={playbackSample.motorSpeeds}
            onClick={() => setFollowMode(true)}
          />
          {/* Actual trajectory (blue) */}
          <TrajectoryLine positions={result.position} />
          {/* Reference trajectory (orange dashed) */}
          {result.refPosition && <RefTrajectoryLine positions={result.refPosition} />}
          <CameraController followMode={followMode} target={droneTarget} followRef={followRef} orbitRef={orbitRef} followModeRef={followModeRef} />
          <OrbitControls ref={orbitRef} zoomSpeed={0.3} enabled={!followMode} />
        </Canvas>

        {/* HUD Overlay */}
        <div style={{
          position: 'absolute', top: 16, left: 16,
          background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3)', color: 'white', fontSize: 14, lineHeight: 1.8,
        }}>
          <div>时间 {formatTime(timeSec)} / {formatTime(totalTime)}</div>
          <div>高度 {(-pos[2]).toFixed(1)} m</div>
          <div>电压 {playbackSample.voltage.toFixed(2)} V</div>
          <div>SOC {(playbackSample.soc * 100).toFixed(0)}%</div>
        </div>

        {followMode && (
          <div style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(59, 130, 246, 0.9)', borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-4)', color: 'white',
            fontSize: 13, fontWeight: 600, pointerEvents: 'none',
          }}>
            跟随视角模式 | 滚轮缩放 | 左键旋转 | ESC 退出
          </div>
        )}
      </div>

      {/* Playback Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-6)',
        background: '#ffffff',
        borderTop: '1px solid var(--border-default)',
      }}
      >
        <button onClick={() => { setPlaybackTime(0); setIsPlaying(false) }} style={{
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

        <button onClick={() => { setPlaybackTime(totalTime); setIsPlaying(false) }} style={{
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
          max={totalTime}
          step={Math.max(totalTime / 1000, 0.01)}
          value={playbackTime}
          onChange={e => { setPlaybackTime(Number(e.target.value)); setIsPlaying(false) }}
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
