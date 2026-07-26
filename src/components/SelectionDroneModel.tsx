import { Canvas, useFrame } from '@react-three/fiber'
import { Float, OrbitControls } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

export type SelectionPartKey = 'frame' | 'motor' | 'propeller' | 'esc' | 'battery'
interface Props { activePart: SelectionPartKey; onSelect: (part: SelectionPartKey) => void }
const colors: Record<SelectionPartKey, string> = { frame: '#8ee7ff', motor: '#c5a5ff', propeller: '#92fff1', esc: '#ff9ed2', battery: '#c9f4ff' }

function Wire({ geometry, color, opacity = .6, rotation, position, scale }: { geometry: THREE.BufferGeometry; color: string; opacity?: number; rotation?: [number, number, number]; position?: [number, number, number]; scale?: [number, number, number] }) {
  return <mesh geometry={geometry} rotation={rotation} position={position} scale={scale}><meshBasicMaterial color={color} wireframe transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
}

function Part({ name, activePart, onSelect, children }: React.PropsWithChildren<{ name: SelectionPartKey; activePart: SelectionPartKey; onSelect: Props['onSelect'] }>) {
  const ref = useRef<THREE.Group>(null)
  const active = name === activePart
  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.position.y = THREE.MathUtils.damp(ref.current.position.y, active ? .62 : 0, 7, delta)
    const target = active ? 1.035 + Math.sin(state.clock.elapsedTime * 3.2) * .012 : 1
    ref.current.scale.setScalar(THREE.MathUtils.damp(ref.current.scale.x, target, 8, delta))
  })
  return <group ref={ref} onClick={e => { e.stopPropagation(); onSelect(name) }} onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = 'default' }}>{children}</group>
}

function Drone({ activePart, onSelect }: Props) {
  const g = useMemo(() => ({ arm: new THREE.BoxGeometry(3.5, .14, .34, 7, 1, 2), body: new THREE.OctahedronGeometry(1.2, 2), battery: new THREE.BoxGeometry(1.55, .62, 1.02, 5, 2, 3), motor: new THREE.CylinderGeometry(.35, .42, .46, 16, 3), prop: new THREE.BoxGeometry(2.35, .045, .22, 12, 1, 1), hub: new THREE.CylinderGeometry(.13, .13, .16, 12), esc: new THREE.BoxGeometry(.7, .18, .4, 4, 1, 2) }), [])
  const corners = [[2.25, 2.25], [-2.25, 2.25], [2.25, -2.25], [-2.25, -2.25]] as const
  return <Float speed={1.25} rotationIntensity={.08} floatIntensity={.16}><group rotation={[.08, -.62, 0]}>
    <Part name="frame" activePart={activePart} onSelect={onSelect}><Wire geometry={g.arm} color={colors.frame} rotation={[0, Math.PI / 4, 0]} /><Wire geometry={g.arm} color={colors.frame} rotation={[0, -Math.PI / 4, 0]} /><Wire geometry={g.body} color={colors.frame} opacity={activePart === 'frame' ? .95 : .56} scale={[1.15, .38, 1.15]} /></Part>
    <Part name="battery" activePart={activePart} onSelect={onSelect}><Wire geometry={g.battery} color={colors.battery} opacity={activePart === 'battery' ? 1 : .62} position={[0, .45, 0]} /></Part>
    <Part name="motor" activePart={activePart} onSelect={onSelect}>{corners.map(([x, z]) => <Wire key={`${x}-${z}`} geometry={g.motor} color={colors.motor} opacity={activePart === 'motor' ? 1 : .58} position={[x, .14, z]} />)}</Part>
    <Part name="propeller" activePart={activePart} onSelect={onSelect}>{corners.map(([x, z], i) => <group key={`${x}-${z}`} position={[x, .52, z]} rotation={[0, i % 2 ? -.28 : .28, 0]}><Wire geometry={g.prop} color={colors.propeller} opacity={activePart === 'propeller' ? 1 : .55} /><Wire geometry={g.hub} color={colors.propeller} opacity={.9} /></group>)}</Part>
    <Part name="esc" activePart={activePart} onSelect={onSelect}>{[[1.15, 1.15], [-1.15, 1.15], [1.15, -1.15], [-1.15, -1.15]].map(([x, z]) => <Wire key={`${x}-${z}`} geometry={g.esc} color={colors.esc} opacity={activePart === 'esc' ? 1 : .6} position={[x, .1, z]} rotation={[0, x * z > 0 ? Math.PI / 4 : -Math.PI / 4, 0]} />)}</Part>
  </group></Float>
}

function Dust() {
  const positions = useMemo(() => { const a = new Float32Array(540); for (let i = 0; i < a.length; i += 3) { const n = i / 3 + 1; a[i] = (Math.sin(n * 12.9898) * .5) * 12; a[i + 1] = (Math.sin(n * 78.233) * .5) * 7; a[i + 2] = (Math.sin(n * 37.719) * .5) * 6 } return a }, [])
  return <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#bcecff" size={.025} transparent opacity={.65} blending={THREE.AdditiveBlending} depthWrite={false} /></points>
}

export default function SelectionDroneModel(props: Props) {
  return <div className="selection-drone-canvas" aria-label="可交互的四旋翼无人机部件模型"><Canvas camera={{ position: [6.4, 4.8, 7.3], fov: 39 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: true }}><fog attach="fog" args={['#0a111d', 9, 17]} /><Dust /><Drone {...props} /><OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI / 3.2} maxPolarAngle={Math.PI / 2.05} autoRotate autoRotateSpeed={.32} /></Canvas><div className="selection-model-caption"><span>INTERACTIVE ASSEMBLY</span><small>拖动旋转 · 点击部件</small></div></div>
}
