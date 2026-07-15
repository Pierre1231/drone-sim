import { describe, it, expect } from 'vitest'
import { loadPyodide } from 'pyodide'
import { runSimulation, type SimConfig } from './simulation'
import { buildDocAlignedSimConfig } from './presets'
import { PythonControlMission, type PythonControlState, type PythonUpdateResult } from './pythonControlMission'

const PYTHON_RUNTIME = `
import numpy as np

class DroneState:
    def __init__(self, data):
        self.position = np.array(data['position'])
        self.velocity = np.array(data['velocity'])
        self.quaternion = np.array(data['quaternion'])
        self.angular_velocity = np.array(data['angularVelocity'])

    def __getitem__(self, key):
        return getattr(self, key)

def _make_controller(user_code):
    namespace = {}
    exec(user_code, namespace)
    Controller = namespace.get('Controller')
    if Controller is None:
        raise RuntimeError("You must define a class named 'Controller'")
    return Controller()

controller_instance = None

def _to_list(v, length=3):
    if v is None:
        return None
    return [float(v[i]) for i in range(length)]

def _update(t, state_dict):
    global controller_instance
    if controller_instance is None:
        return {'position': [0.0, 0.0, 0.0], 'velocity': [0.0, 0.0, 0.0]}

    state = DroneState(state_dict)
    result = controller_instance.update(t, state)

    if result is None:
        return {'position': [0.0, 0.0, 0.0], 'velocity': [0.0, 0.0, 0.0]}

    return {
        'position': _to_list(result.get('position'), 3),
        'velocity': _to_list(result.get('velocity'), 3),
        'acceleration': _to_list(result.get('acceleration'), 3),
        'heading': _to_list(result.get('heading'), 3),
    }
`

const DEFAULT_CODE = `import numpy as np

class Controller:
    def __init__(self):
        self.radius = 5.0
        self.speed = 2.0
        self.altitude = -5.0

    def update(self, t, state):
        omega = self.speed / self.radius
        theta = omega * t
        target_pos = np.array([
            self.radius * np.cos(theta),
            self.radius * np.sin(theta),
            self.altitude
        ])
        target_vel = np.array([
            -self.radius * omega * np.sin(theta),
            self.radius * omega * np.cos(theta),
            0.0
        ])
        target_acc = np.array([
            -omega * omega * target_pos[0],
            -omega * omega * target_pos[1],
            0.0
        ])
        return {
            'position': target_pos.tolist(),
            'velocity': target_vel.tolist(),
            'acceleration': target_acc.tolist(),
            'heading': [1.0, 0.0, 0.0],
        }
`

describe('PythonControlMission circle tracking', () => {
  it('should track the circle with the default Python controller', { timeout: 120000 }, async () => {
    const pyodide = await loadPyodide({ indexURL: './public/pyodide/' })
    await pyodide.loadPackage('numpy')
    pyodide.runPython(PYTHON_RUNTIME)
    pyodide.runPython(`
        global controller_instance
        controller_instance = _make_controller(${JSON.stringify(DEFAULT_CODE)})
    `)

    const updateFn = pyodide.globals.get('_update') as (t: number, state: PythonControlState) => unknown

    let currentState: PythonControlState | null = null
    let currentTime = 0

    const context = {
      getCurrentState: () => currentState,
      getCurrentTime: () => currentTime,
      pyodideUpdate: (t: number, state: PythonControlState): PythonUpdateResult => {
        const pyState = pyodide.toPy(state)
        const result = updateFn(t, pyState)
        ;(pyState as { destroy?: () => void }).destroy?.()
        const jsResult = (result as { toJs: (opts: { dict_converter: typeof Object.fromEntries }) => Record<string, unknown> }).toJs({ dict_converter: Object.fromEntries }) as PythonUpdateResult
        ;(result as { destroy?: () => void }).destroy?.()
        return {
          position: jsResult.position ?? [0, 0, 0],
          velocity: jsResult.velocity ?? [0, 0, 0],
          acceleration: jsResult.acceleration ?? [0, 0, 0],
          heading: jsResult.heading ?? [1, 0, 0],
        }
      },
    }

    const baseConfig = buildDocAlignedSimConfig('test-circle')
    const mission = new PythonControlMission({ context, missionType: 'circle' })
    const config: SimConfig = {
      ...baseConfig,
      maxSimTime: 10,
      mission,
      onStep: (state, time) => {
        currentState = {
          position: state.position,
          velocity: state.velocity,
          quaternion: state.quaternion,
          angularVelocity: state.angularVelocity,
        }
        currentTime = time
      },
    }

    const result = runSimulation(config)

    const p0 = result.position[0]
    const pMid = result.position[Math.floor(result.position.length / 2)]
    const pEnd = result.position[result.position.length - 1]

    console.log('setpoints every 0.1s:')
    for (let t = 0; t <= 2; t += 0.1) {
      const idx = result.time.findIndex((time) => time >= t)
      if (idx >= 0) {
        console.log(`  t=${result.time[idx].toFixed(3)} sp=${result.refPosition[idx]} pos=${result.position[idx]} vel=${result.velocity[idx]}`)
      }
    }
    console.log('t=0 pos:', p0)
    console.log('t=5 pos:', pMid)
    console.log('t=10 pos:', pEnd)

    // Circle target at t=10: [5*cos(4), 5*sin(4), -5]
    const tEnd = result.time[result.time.length - 1]
    const theta = (2 / 5) * tEnd
    const targetEnd: [number, number, number] = [5 * Math.cos(theta), 5 * Math.sin(theta), -5]
    const errEnd = Math.hypot(pEnd[0] - targetEnd[0], pEnd[1] - targetEnd[1], pEnd[2] - targetEnd[2])
    console.log('target at t=10:', targetEnd, 'error:', errEnd)

    expect(result.position.length).toBeGreaterThan(100)
    expect(errEnd).toBeLessThan(2.0)
  })
})
