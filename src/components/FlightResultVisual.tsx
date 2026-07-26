import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

type FlightMode = 'hover' | 'forward'

function FlightDrone({ mode }: { mode: FlightMode }) {
  const corners = [[1.38, 1.38], [-1.38, 1.38], [1.38, -1.38], [-1.38, -1.38]] as const
  return <Float speed={mode === 'hover' ? 1.6 : .5} floatIntensity={mode === 'hover' ? .16 : .03} rotationIntensity={.025}>
    <group rotation={[mode === 'forward' ? -.2 : 0, -.5, 0]}>
      <UnifiedDroneOutline corners={corners} />
      {corners.map(([x, z], index) => <SpinningRotor key={`p-${x}-${z}`} position={[x, .2, z]} speed={(index % 2 ? -1 : 1) * (mode === 'forward' ? 22 : 14)} />)}
    </group>
  </Float>
}

function OutlineMaterial({ opacity = .82 }: { opacity?: number }) {
  return <meshBasicMaterial color="#a9efff" wireframe transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
}

function UnifiedDroneOutline({ corners }: { corners: readonly (readonly [number, number])[] }) {
  return <group>
    {/* 机身与四臂保持为同一轮廓组，不再用颜色或间距区分部件。 */}
    <mesh scale={[1.18, .3, 1.18]}><sphereGeometry args={[.77, 10, 5]} /><OutlineMaterial opacity={.9} /></mesh>
    <SimpleArmFrames corners={corners} />
    {corners.map(([x, z]) => <group key={`outline-${x}-${z}`} position={[x, 0, z]}>
      <mesh position={[0, .06, 0]}><cylinderGeometry args={[.2, .25, .28, 8, 2]} /><OutlineMaterial opacity={.86} /></mesh>
      <mesh position={[0, .2, 0]} scale={[1, .45, 1]}><sphereGeometry args={[.21, 8, 4]} /><OutlineMaterial opacity={.9} /></mesh>
    </group>)}
  </group>
}

function SimpleArmFrames({ corners }: { corners: readonly (readonly [number, number])[] }) {
  return <group>{corners.map(([x, z]) => {
    const sx = Math.sign(x)
    const sz = Math.sign(z)
    const startX = sx * .57
    const startZ = sz * .57
    const endX = x - sx * .2
    const endZ = z - sz * .2
    const dx = endX - startX
    const dz = endZ - startZ
    const length = Math.hypot(dx, dz)
    const angle = -Math.atan2(dz, dx)
    return <mesh key={`arm-${x}-${z}`} position={[(startX + endX) / 2, .015, (startZ + endZ) / 2]} rotation={[0, angle, 0]}>
      <boxGeometry args={[length, .14, .18, 3, 1, 1]} />
      <OutlineMaterial opacity={.76} />
    </mesh>
  })}</group>
}

function SpinningRotor({ position, speed }: { position: [number, number, number]; speed: number }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * speed })
  return <group ref={ref} position={position}>
    <RotorBladeOutline />
  </group>
}

function RotorBladeOutline() {
  const blade = useMemo(() => {
    const points = [
      new THREE.Vector3(-.09, 0, -.045), new THREE.Vector3(-.72, 0, -.16), new THREE.Vector3(-.87, 0, -.08),
      new THREE.Vector3(-.11, 0, .045), new THREE.Vector3(.11, 0, .045), new THREE.Vector3(.87, 0, .08),
      new THREE.Vector3(.72, 0, .16), new THREE.Vector3(.09, 0, -.045), new THREE.Vector3(-.09, 0, -.045),
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color: '#d7fbff', transparent: true, opacity: .96, blending: THREE.AdditiveBlending, depthWrite: false })
    return new THREE.Line(geometry, material)
  }, [])
  return <primitive object={blade} />
}

function SpeedLines() {
  const group = useRef<THREE.Group>(null)
  const lines = useMemo(() => Array.from({ length: 34 }, (_, i) => ({ x: (i % 9) * 1.25 - 5, y: Math.sin(i * 2.3) * 2.8, z: Math.cos(i * 1.7) * 3.2, length: .5 + (i % 5) * .24 })), [])
  useFrame((_, delta) => {
    if (!group.current) return
    for (const child of group.current.children) {
      child.position.x -= delta * 7
      if (child.position.x < -6) child.position.x = 6
    }
  })
  return <group ref={group}>{lines.map((line, i) => <mesh key={i} position={[line.x, line.y, line.z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.008, .008, line.length, 3]} /><meshBasicMaterial color="#8bdfff" transparent opacity={.42} blending={THREE.AdditiveBlending} /></mesh>)}</group>
}

export default function FlightResultVisual({ mode }: { mode: FlightMode }) {
  return <div className={`flight-result-canvas flight-result-canvas--${mode}`}><Canvas camera={{ position: [4.4, 3.2, 5.5], fov: 40 }} dpr={[1, 1.6]}><fog attach="fog" args={['#080d16', 7, 13]} />{mode === 'forward' && <SpeedLines />}<FlightDrone mode={mode} /></Canvas><span>{mode === 'hover' ? 'STABLE HOVER' : 'FORWARD FLIGHT · 15 M/S'}</span></div>
}
