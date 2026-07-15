import { loadPyodide, type PyodideInterface } from 'pyodide'
import { runSimulation, type SimConfig, type SimResult } from '@/lib/simulation'
import type { PythonControlState, PythonUpdateResult } from '@/lib/pythonControlMission'
import { buildDocAlignedSimConfig } from '@/lib/presets'

// Python-side helpers and controller loader.
// The user must define a `Controller` class with an `update(self, t, state)` method
// that returns direct-control keys: thrust, moments, and optional position.
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
        'thrust': None if result.get('thrust') is None else float(result.get('thrust')),
        'moments': _to_list(result.get('moments'), 3),
    }
`

interface WorkerState {
  pyodide: PyodideInterface | null
  updateFn: ((t: number, state: PythonControlState) => unknown) | null
  currentState: PythonControlState | null
  currentTime: number
  cancelled: boolean
}

const workerState: WorkerState = {
  pyodide: null,
  updateFn: null,
  currentState: null,
  currentTime: 0,
  cancelled: false,
}

const PYTHON_CONTROL_INTERVAL = 0.01
const MAX_TOTAL_THRUST = 36
const MAX_MOMENTS: [number, number, number] = [0.35, 0.35, 0.16]

async function initPyodide(): Promise<PyodideInterface> {
  if (workerState.pyodide) return workerState.pyodide

  self.postMessage({ type: 'log', message: 'Loading Python runtime (Pyodide)...' })

  const pyodide = await loadPyodide({
    indexURL: '/pyodide/',
    stdout: (msg) => self.postMessage({ type: 'log', message: String(msg) }),
    stderr: (msg) => self.postMessage({ type: 'log', message: `stderr: ${msg}` }),
  })

  await pyodide.loadPackage('numpy')
  pyodide.runPython(PYTHON_RUNTIME)
  workerState.updateFn = pyodide.globals.get('_update') as (t: number, state: PythonControlState) => unknown

  workerState.pyodide = pyodide
  self.postMessage({ type: 'log', message: 'Python runtime ready.' })
  return pyodide
}

function loadUserCode(code: string) {
  const pyodide = workerState.pyodide
  if (!pyodide) throw new Error('Pyodide not initialized')

  pyodide.runPython(`
    global controller_instance
    controller_instance = _make_controller(${JSON.stringify(code)})
  `)
}

function pyodideUpdate(t: number, state: PythonControlState): PythonUpdateResult {
  const updateFn = workerState.updateFn
  const pyodide = workerState.pyodide
  if (!updateFn || !pyodide) {
    return {
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      acceleration: [0, 0, 0],
      heading: [1, 0, 0],
    }
  }

  // Convert the JS state into a Python dict so the Python-side DroneState can
  // subscript it with data['position'] instead of dealing with a JsProxy.
  const pyState = pyodide.toPy(state)
  const result = updateFn(t, pyState)
  ;(pyState as { destroy?: () => void }).destroy?.()

  const jsResult = (result as { toJs: (opts?: { dict_converter: typeof Object.fromEntries }) => Record<string, unknown> }).toJs({
    dict_converter: Object.fromEntries,
  }) as PythonUpdateResult
  ;(result as { destroy?: () => void }).destroy?.()

  return {
    position: jsResult.position ?? [0, 0, 0],
    velocity: jsResult.velocity ?? [0, 0, 0],
    acceleration: jsResult.acceleration ?? [0, 0, 0],
    heading: jsResult.heading ?? [1, 0, 0],
    thrust: jsResult.thrust,
    moments: jsResult.moments,
  }
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampMoments(moments: [number, number, number] | undefined): [number, number, number] {
  const source = moments ?? [0, 0, 0]
  return [
    clamp(finiteNumber(source[0], 0), -MAX_MOMENTS[0], MAX_MOMENTS[0]),
    clamp(finiteNumber(source[1], 0), -MAX_MOMENTS[1], MAX_MOMENTS[1]),
    clamp(finiteNumber(source[2], 0), -MAX_MOMENTS[2], MAX_MOMENTS[2]),
  ]
}

function groundInitialState(): NonNullable<SimConfig['initialState']> {
  return {
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    quaternion: [1, 0, 0, 0],
    angularVelocity: [0, 0, 0],
  }
}

function runPythonControlSimulation(code: string, missionType: 'hover' | 'circle', maxSimTime: number): SimResult {
  const pyodide = workerState.pyodide
  if (!pyodide) throw new Error('Pyodide not initialized')

  loadUserCode(code)

  const baseConfig = buildDocAlignedSimConfig('test-hover')
  const initialState = groundInitialState()

  workerState.currentState = null
  workerState.currentTime = 0
  workerState.cancelled = false

  void missionType
  const hoverThrust = baseConfig.droneConfig.totalWeight * 9.81
  let nextPythonUpdateTime = 0
  let lastCommand: Required<Pick<PythonUpdateResult, 'position' | 'thrust' | 'moments'>> = {
    position: [0, 0, 0],
    thrust: hoverThrust,
    moments: [0, 0, 0],
  }
  const refMission = {
    getSetpoint: () => ({
      position: lastCommand.position,
      velocity: [0, 0, 0] as [number, number, number],
      acceleration: [0, 0, 0] as [number, number, number],
      heading: [1, 0, 0] as [number, number, number],
      landing: false,
    }),
  }

  const config: SimConfig = {
    ...baseConfig,
    maxSimTime,
    missionType: 'test-hover',
    initialState,
    mission: refMission,
    directControl: (state, time) => {
      const controlState: PythonControlState = {
        position: state.position,
        velocity: state.velocity,
        quaternion: state.quaternion,
        angularVelocity: state.angularVelocity,
      }

      if (time + 1e-9 >= nextPythonUpdateTime) {
        const result = pyodideUpdate(time, controlState)
        lastCommand = {
          position: result.position ?? lastCommand.position,
          thrust: clamp(finiteNumber(result.thrust, hoverThrust), 0, MAX_TOTAL_THRUST),
          moments: clampMoments(result.moments),
        }
        nextPythonUpdateTime = time + PYTHON_CONTROL_INTERVAL
      }

      return {
        totalThrust: lastCommand.thrust,
        moments: lastCommand.moments,
        refPosition: lastCommand.position,
      }
    },
    onStep: (state, time) => {
      workerState.currentState = {
        position: state.position,
        velocity: state.velocity,
        quaternion: state.quaternion,
        angularVelocity: state.angularVelocity,
      }
      workerState.currentTime = time
    },
  }

  return runSimulation(
    config,
    (progress) => self.postMessage({ type: 'progress', progress: progress.progress }),
    () => workerState.cancelled
  )
}

self.onmessage = async (e: MessageEvent) => {
  const { type, code, missionType, maxSimTime } = e.data

  if (type === 'init') {
    try {
      await initPyodide()
      self.postMessage({ type: 'ready' })
    } catch (error) {
      self.postMessage({ type: 'error', error: String(error) })
    }
    return
  }

  if (type === 'load') {
    try {
      await initPyodide()
      if (code) loadUserCode(code)
      self.postMessage({ type: 'loaded' })
    } catch (error) {
      self.postMessage({ type: 'error', error: String(error) })
    }
    return
  }

  if (type === 'start') {
    try {
      await initPyodide()
      self.postMessage({ type: 'status', status: 'running' })
      const result = runPythonControlSimulation(code, missionType ?? 'hover', maxSimTime ?? 10)
      self.postMessage({ type: 'complete', result })
    } catch (error) {
      self.postMessage({ type: 'error', error: String(error) })
    }
    return
  }

  if (type === 'cancel') {
    workerState.cancelled = true
    return
  }
}

export {}
