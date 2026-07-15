import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  BookOpen,
  CheckCircle,
  CircleDot,
  Clock,
  Code2,
  Cpu,
  Gauge,
  Play,
  RotateCcw,
  Route,
  Square,
  Terminal,
  Timer,
  XCircle,
} from 'lucide-react'
import PlaybackPanel from '@/components/PlaybackPanel'
import { useSimStore } from '@/store/simStore'
import type { SimResult } from '@/lib/simulation'
import PythonControlWorker from '@/workers/pythonControl.worker?worker'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'

type DemoType = 'pid-hover' | 'circle' | 'astar' | 'blank'
type WorkerMissionType = 'hover' | 'circle'

type AstarObstacle = [number, number]

interface DemoPreset {
  key: DemoType
  label: string
  workerMissionType: WorkerMissionType
  simTime: number
  code: string
}

const ASTAR_START: AstarObstacle = [0, -4]
const ASTAR_GOAL: AstarObstacle = [10, 4]
const ASTAR_OBSTACLES: AstarObstacle[] = [
  [2, -5], [2, -4], [2, -2], [2, -1], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
  [4, -5], [4, -4], [4, -3], [4, -2], [4, -1], [4, 0], [4, 2], [4, 3], [4, 4], [4, 5],
  [6, -5], [6, -4], [6, -3], [6, -2], [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [8, -5], [8, -4], [8, -3], [8, -2], [8, -1], [8, 0], [8, 1], [8, 2], [8, 4], [8, 5],
  [1, 1], [1, 2], [3, -5], [3, -4], [5, 4], [5, 5], [7, -5], [7, -4], [9, 0], [9, 1], [9, 2],
]

const PYTHON_PID_HELPER = `import math

class PID:
    def __init__(self, kp, ki, kd, limit):
        self.kp = kp
        self.ki = ki
        self.kd = kd
        self.limit = limit
        self.integral = 0.0
        self.prev_error = None

    def reset(self):
        self.integral = 0.0
        self.prev_error = None

    def update(self, error, dt):
        # 标准 PID：比例 + 积分 + 微分。
        # limit 用于防止输出过大导致无人机姿态或推力饱和。
        self.integral += error * dt
        derivative = 0.0 if self.prev_error is None else (error - self.prev_error) / dt
        self.prev_error = error

        output = self.kp * error + self.ki * self.integral + self.kd * derivative
        return max(-self.limit, min(self.limit, output))

class PythonPidController:
    def __init__(self):
        # 这里的参数和网页内置动力学模型中的测试机质量一致。
        self.mass = 1.5
        self.g = 9.81
        self.last_t = None

        # 位置环 PID：输入是位置/速度误差，输出是期望加速度。
        self.pid_x = PID(0.55, 0.02, 0.75, 1.1)
        self.pid_y = PID(0.55, 0.02, 0.75, 1.1)
        self.pid_z = PID(1.20, 0.04, 1.25, 2.2)

        # 姿态环 PID：输入是期望姿态和当前姿态误差，输出是机体系力矩。
        self.pid_roll = PID(0.18, 0.00, 0.035, 0.32)
        self.pid_pitch = PID(0.18, 0.00, 0.035, 0.32)
        self.pid_yaw = PID(0.10, 0.00, 0.020, 0.12)

        self.max_tilt = 0.22
        self.max_thrust = 34.0

    def _clamp(self, value, lo, hi):
        return max(lo, min(hi, value))

    def _smoothstep(self, u):
        return u * u * (3.0 - 2.0 * u)

    def _smoothstep_d1(self, u):
        return 6.0 * u * (1.0 - u)

    def _smoothstep_d2(self, u):
        return 6.0 - 12.0 * u

    def _quat_to_euler(self, q):
        # 四元数格式为 [w, x, y, z]，与网页动力学引擎一致。
        w, x, y, z = q
        roll = math.atan2(2.0 * (w * x + y * z), 1.0 - 2.0 * (x * x + y * y))
        sinp = 2.0 * (w * y - z * x)
        pitch = math.asin(self._clamp(sinp, -1.0, 1.0))
        yaw = math.atan2(2.0 * (w * z + x * y), 1.0 - 2.0 * (y * y + z * z))
        return roll, pitch, yaw

    def pid_command(self, t, state, target_pos, target_vel=None, target_acc=None):
        # 这个函数是真正的 Python PID 控制器。
        # 它直接返回总推力 thrust 和机体系力矩 moments，不再调用网页底层级联控制器。
        if target_vel is None:
            target_vel = [0.0, 0.0, 0.0]
        if target_acc is None:
            target_acc = [0.0, 0.0, 0.0]

        dt = 0.01 if self.last_t is None else max(0.001, t - self.last_t)
        self.last_t = t

        pos = state.position
        vel = state.velocity
        roll, pitch, yaw = self._quat_to_euler(state.quaternion)

        # 位置误差。NED 坐标中 z 轴向下，所以 z=-5 表示高度 5 m。
        ex = target_pos[0] - pos[0]
        ey = target_pos[1] - pos[1]
        ez = target_pos[2] - pos[2]

        evx = target_vel[0] - vel[0]
        evy = target_vel[1] - vel[1]
        evz = target_vel[2] - vel[2]

        # 位置环输出期望加速度。
        ax_cmd = target_acc[0] + self.pid_x.update(ex, dt) + 0.45 * evx
        ay_cmd = target_acc[1] + self.pid_y.update(ey, dt) + 0.45 * evy
        az_cmd = target_acc[2] + self.pid_z.update(ez, dt) + 0.65 * evz

        ax_cmd = self._clamp(ax_cmd, -1.2, 1.2)
        ay_cmd = self._clamp(ay_cmd, -1.2, 1.2)
        az_cmd = self._clamp(az_cmd, -2.4, 2.4)

        # 小角度近似：
        #   pitch < 0 会让无人机向 +x 加速
        #   roll  > 0 会让无人机向 +y 加速
        roll_des = self._clamp(ay_cmd / self.g, -self.max_tilt, self.max_tilt)
        pitch_des = self._clamp(-ax_cmd / self.g, -self.max_tilt, self.max_tilt)
        yaw_des = 0.0

        # 姿态 PID 输出力矩，并加入角速度阻尼。
        p, q, r = state.angular_velocity
        mx = self.pid_roll.update(roll_des - roll, dt) - 0.025 * p
        my = self.pid_pitch.update(pitch_des - pitch, dt) - 0.025 * q
        mz = self.pid_yaw.update(yaw_des - yaw, dt) - 0.012 * r

        # NED 中垂向动力学近似为：az = g - thrust / mass。
        # 所以想要向上加速，即 az_cmd 为负，需要 thrust > mass*g。
        thrust = self.mass * (self.g - az_cmd)
        thrust = self._clamp(thrust, 0.0, self.max_thrust)

        return {
            "position": target_pos,
            "velocity": target_vel,
            "acceleration": target_acc,
            "thrust": thrust,
            "moments": [mx, my, mz],
        }
`

const PID_HOVER_CODE = `${PYTHON_PID_HELPER}

# PID 悬停示例
# 坐标系采用 NED：x 向前，y 向右，z 向下。
# 因此飞到 5 m 高度时，目标 z 应该写成 -5.0。
#
# 这个示例不是调用底层控制器，而是在 Python 中通过 PID 直接输出：
#   thrust  总推力
#   moments 机体系力矩 [Mx, My, Mz]
# 网页只负责电机、螺旋桨、电池和刚体动力学仿真。

class Controller(PythonPidController):
    def __init__(self):
        super().__init__()
        # 目标高度：NED 坐标中 z 为负表示向上飞。
        self.target_altitude = -5.0
        # 起飞过程持续时间，越大越平稳。
        self.takeoff_time = 4.0

    def update(self, t, state):
        # t 是当前仿真时间；state 是当前无人机真实状态。
        # 这里不直接改 state，而是根据目标点和当前状态计算 PID 控制量。
        if t < self.takeoff_time:
            u = min(max(t / self.takeoff_time, 0.0), 1.0)
            z = self.target_altitude * self._smoothstep(u)
            vz = self.target_altitude * self._smoothstep_d1(u) / self.takeoff_time
            az = self.target_altitude * self._smoothstep_d2(u) / (self.takeoff_time * self.takeoff_time)
        else:
            # 到达目标高度后，位置保持不变，速度和加速度前馈清零。
            z = self.target_altitude
            vz = 0.0
            az = 0.0

        return self.pid_command(
            t,
            state,
            target_pos=[0.0, 0.0, z],
            target_vel=[0.0, 0.0, vz],
            target_acc=[0.0, 0.0, az],
        )
`

const CIRCLE_CODE = `${PYTHON_PID_HELPER}

# 画圆示例
# 阶段：
#   1. 从地面垂直起飞到目标高度
#   2. 在目标高度短暂停稳
#   3. 平滑移动到圆轨迹起点
#   4. 逐渐加速进入圆周运动
#
# 注意：坐标系为 NED，z=-5 表示高度 5 m。

import numpy as np

class Controller(PythonPidController):
    def __init__(self):
        super().__init__()
        # 圆半径和切向速度。速度太大时控制器更难稳定跟踪。
        self.radius = 2.0
        self.speed = 0.4
        # NED 坐标下的目标高度。
        self.altitude = -5.0
        # 起飞、停稳、移动到圆起点、圆周加速的持续时间。
        self.takeoff_time = 5.0
        self.hold_time = 2.0
        self.transfer_time = 4.0
        self.speed_ramp_time = 4.0

    def _smoothstep(self, u):
        # 平滑位置插值函数。
        return u * u * (3.0 - 2.0 * u)

    def _smoothstep_d1(self, u):
        # 位置插值的一阶导数，对应速度。
        return 6.0 * u * (1.0 - u)

    def _smoothstep_d2(self, u):
        # 位置插值的二阶导数，对应加速度。
        return 6.0 - 12.0 * u

    def _smoothstep_integral(self, u):
        # smoothstep 的积分，用来让圆周角速度从 0 平滑增加。
        return u ** 3 - 0.5 * u ** 4

    def update(self, t, state):
        # 第一阶段：只改变高度，水平位置保持在原点。
        if t < self.takeoff_time:
            u = min(max(t / self.takeoff_time, 0.0), 1.0)
            z = self.altitude * self._smoothstep(u)
            vz = self.altitude * self._smoothstep_d1(u) / self.takeoff_time
            az = self.altitude * self._smoothstep_d2(u) / (self.takeoff_time * self.takeoff_time)
            return self.pid_command(
                t,
                state,
                target_pos=[0.0, 0.0, z],
                target_vel=[0.0, 0.0, vz],
                target_acc=[0.0, 0.0, az],
            )

        # 第二阶段：到达高度后短暂停稳，避免刚起飞就进入水平运动。
        if t < self.takeoff_time + self.hold_time:
            return self.pid_command(
                t,
                state,
                target_pos=[0.0, 0.0, self.altitude],
                target_vel=[0.0, 0.0, 0.0],
                target_acc=[0.0, 0.0, 0.0],
            )

        # 第三阶段：从原点平滑移动到圆的起点 [radius, 0, altitude]。
        transfer_t = t - self.takeoff_time - self.hold_time
        if transfer_t < self.transfer_time:
            u = min(max(transfer_t / self.transfer_time, 0.0), 1.0)
            s = self._smoothstep(u)
            ds = self._smoothstep_d1(u)
            dds = self._smoothstep_d2(u)
            x = self.radius * s
            vx = self.radius * ds / self.transfer_time
            ax = self.radius * dds / (self.transfer_time * self.transfer_time)
            return self.pid_command(
                t,
                state,
                target_pos=[x, 0.0, self.altitude],
                target_vel=[vx, 0.0, 0.0],
                target_acc=[ax, 0.0, 0.0],
            )

        # 第四阶段：开始画圆，先平滑增加角速度，再匀速画圆。
        circle_t = transfer_t - self.transfer_time
        omega = self.speed / self.radius
        if circle_t < self.speed_ramp_time:
            u = min(max(circle_t / self.speed_ramp_time, 0.0), 1.0)
            theta = omega * self.speed_ramp_time * self._smoothstep_integral(u)
            theta_dot = omega * self._smoothstep(u)
            theta_ddot = omega * self._smoothstep_d1(u) / self.speed_ramp_time
        else:
            theta = omega * (circle_t - 0.5 * self.speed_ramp_time)
            theta_dot = omega
            theta_ddot = 0.0

        target_pos = np.array([
            self.radius * np.cos(theta),
            self.radius * np.sin(theta),
            self.altitude,
        ])
        target_vel = np.array([
            -self.radius * theta_dot * np.sin(theta),
            self.radius * theta_dot * np.cos(theta),
            0.0,
        ])
        target_acc = np.array([
            -self.radius * theta_ddot * np.sin(theta) - self.radius * theta_dot * theta_dot * np.cos(theta),
            self.radius * theta_ddot * np.cos(theta) - self.radius * theta_dot * theta_dot * np.sin(theta),
            0.0,
        ])

        return self.pid_command(
            t,
            state,
            target_pos=target_pos.tolist(),
            target_vel=target_vel.tolist(),
            target_acc=target_acc.tolist(),
        )
`

const ASTAR_CODE = `${PYTHON_PID_HELPER}

# A* 避障飞行示例
# 这个例子先在二维网格上运行 A*，得到一条避开障碍物的路径；
# 然后把路径点转换成无人机在固定高度上的参考轨迹。
#
# 坐标系仍然是 NED：
#   x/y 是水平网格坐标
#   z=-5 表示飞行高度 5 m
#
# 你可以修改 START、GOAL 和 OBSTACLES 来设计自己的路径规划任务。

import heapq

# 搜索边界：x 从 0 到 10，y 从 -5 到 5。
X_MIN, X_MAX = 0, 10
Y_MIN, Y_MAX = -5, 5

# 起点和终点，必须在边界内，且不能被障碍物占据。
START = (0, -4)
GOAL = (10, 4)

# 障碍物网格。这里设计成多道带缺口的墙，让路径更复杂。
OBSTACLES = {
    (2, -5), (2, -4), (2, -2), (2, -1), (2, 0), (2, 1), (2, 2), (2, 3), (2, 4), (2, 5),
    (4, -5), (4, -4), (4, -3), (4, -2), (4, -1), (4, 0), (4, 2), (4, 3), (4, 4), (4, 5),
    (6, -5), (6, -4), (6, -3), (6, -2), (6, 0), (6, 1), (6, 2), (6, 3), (6, 4), (6, 5),
    (8, -5), (8, -4), (8, -3), (8, -2), (8, -1), (8, 0), (8, 1), (8, 2), (8, 4), (8, 5),
    (1, 1), (1, 2), (3, -5), (3, -4), (5, 4), (5, 5), (7, -5), (7, -4), (9, 0), (9, 1), (9, 2),
}

def is_free(cell):
    # 判断一个网格是否在边界内，并且不是障碍物。
    x, y = cell
    in_bounds = X_MIN <= x <= X_MAX and Y_MIN <= y <= Y_MAX
    return in_bounds and cell not in OBSTACLES

def heuristic(a, b):
    # 曼哈顿距离启发函数，适合上下左右四邻域移动。
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def astar(start, goal):
    # frontier 保存待扩展节点：
    #   priority = 已走代价 + 启发距离
    #   cost     = 已走代价
    #   current  = 当前网格
    frontier = [(heuristic(start, goal), 0, start)]
    came_from = {start: None}
    cost_so_far = {start: 0}
    # 只允许上下左右移动，不允许斜向穿过障碍物。
    moves = [(1, 0), (-1, 0), (0, 1), (0, -1)]

    while frontier:
        _, cost, current = heapq.heappop(frontier)
        if current == goal:
            break

        for dx, dy in moves:
            nxt = (current[0] + dx, current[1] + dy)
            if not is_free(nxt):
                continue
            new_cost = cost + 1
            if nxt not in cost_so_far or new_cost < cost_so_far[nxt]:
                cost_so_far[nxt] = new_cost
                priority = new_cost + heuristic(nxt, goal)
                heapq.heappush(frontier, (priority, new_cost, nxt))
                came_from[nxt] = current

    if goal not in came_from:
        # 如果无解，就停在起点。
        return [start]

    # 从终点反向回溯，恢复完整路径。
    path = []
    current = goal
    while current is not None:
        path.append(current)
        current = came_from[current]
    path.reverse()
    return path

class Controller(PythonPidController):
    def __init__(self):
        super().__init__()
        # 初始化时先规划好路径。飞行过程中只负责跟踪这条路径。
        self.path = astar(START, GOAL)
        self.altitude = -5.0
        # 起飞和停稳时间。
        self.takeoff_time = 5.0
        self.hold_time = 2.0
        # 每两个相邻路径点之间的飞行时间。越大越稳，越小越快。
        self.segment_time = 2.0

    def _smoothstep(self, u):
        # 用于路径点之间的平滑插值。
        return u * u * (3.0 - 2.0 * u)

    def _smoothstep_d1(self, u):
        # 插值速度。
        return 6.0 * u * (1.0 - u)

    def _smoothstep_d2(self, u):
        # 插值加速度。
        return 6.0 - 12.0 * u

    def update(self, t, state):
        # 第一阶段：从地面垂直起飞到目标高度。
        if t < self.takeoff_time:
            u = min(max(t / self.takeoff_time, 0.0), 1.0)
            z = self.altitude * self._smoothstep(u)
            vz = self.altitude * self._smoothstep_d1(u) / self.takeoff_time
            az = self.altitude * self._smoothstep_d2(u) / (self.takeoff_time * self.takeoff_time)
            return self.pid_command(
                t,
                state,
                target_pos=[START[0], START[1], z],
                target_vel=[0.0, 0.0, vz],
                target_acc=[0.0, 0.0, az],
            )

        # 第二阶段：到达高度后在起点停稳。
        if t < self.takeoff_time + self.hold_time:
            return self.pid_command(
                t,
                state,
                target_pos=[START[0], START[1], self.altitude],
                target_vel=[0.0, 0.0, 0.0],
                target_acc=[0.0, 0.0, 0.0],
            )

        if len(self.path) == 1:
            # 无路径时保持在起点。
            x, y = self.path[0]
            return self.pid_command(
                t,
                state,
                target_pos=[x, y, self.altitude],
            )

        # 第三阶段：沿 A* 路径逐段飞行。
        path_t = t - self.takeoff_time - self.hold_time
        segment = min(int(path_t / self.segment_time), len(self.path) - 2)
        u = min(max((path_t - segment * self.segment_time) / self.segment_time, 0.0), 1.0)
        x0, y0 = self.path[segment]
        x1, y1 = self.path[segment + 1]
        s = self._smoothstep(u)
        ds = self._smoothstep_d1(u)
        dds = self._smoothstep_d2(u)
        dx = x1 - x0
        dy = y1 - y0
        x = x0 + dx * s
        y = y0 + dy * s
        vx = dx * ds / self.segment_time
        vy = dy * ds / self.segment_time
        ax = dx * dds / (self.segment_time * self.segment_time)
        ay = dy * dds / (self.segment_time * self.segment_time)

        if segment == len(self.path) - 2 and u >= 1.0:
            # 到达最后一个点后，速度和加速度清零，进入定点悬停。
            vx = 0.0
            vy = 0.0
            ax = 0.0
            ay = 0.0

        return self.pid_command(
            t,
            state,
            target_pos=[x, y, self.altitude],
            target_vel=[vx, vy, 0.0],
            target_acc=[ax, ay, 0.0],
        )
`

const BLANK_CODE = `${PYTHON_PID_HELPER}

# 空白自定义模板
# 你只需要保留 Controller 类和 update 方法。
# update 每次被调用时，返回 Python PID 算出的 thrust 和 moments。
#
# state 中可以读取当前真实状态：
#   state.position
#   state.velocity
#   state.quaternion
#   state.angular_velocity
#
# 返回值中的 z 仍然采用 NED 坐标：z=-2 表示高度 2 m。

class Controller(PythonPidController):
    def __init__(self):
        super().__init__()
        # 可以在这里定义自己的参数、路径或控制状态。
        pass

    def update(self, t, state):
        # 这里给出一个最小示例：飞到高度 2 m 并悬停。
        # 你可以根据 t 和 state 计算更复杂的目标点。
        return self.pid_command(
            t,
            state,
            target_pos=[0.0, 0.0, -2.0],
            target_vel=[0.0, 0.0, 0.0],
            target_acc=[0.0, 0.0, 0.0],
        )
`

const DEMOS: DemoPreset[] = [
  { key: 'pid-hover', label: 'PID 悬停起飞', workerMissionType: 'hover', simTime: 8, code: PID_HOVER_CODE },
  { key: 'circle', label: '画圆', workerMissionType: 'circle', simTime: 24, code: CIRCLE_CODE },
  { key: 'astar', label: 'A* 避障飞行', workerMissionType: 'hover', simTime: 60, code: ASTAR_CODE },
  { key: 'blank', label: '空白自定义', workerMissionType: 'hover', simTime: 8, code: BLANK_CODE },
]

const DEMO_META: Record<DemoType, { icon: typeof Activity; meta: string }> = {
  'pid-hover': { icon: Gauge, meta: '地面起飞到定点悬停' },
  circle: { icon: CircleDot, meta: '先定高，再进入圆轨迹' },
  astar: { icon: Route, meta: '网格避障路径跟踪' },
  blank: { icon: Code2, meta: '保留控制器骨架' },
}

const DEFAULT_DEMO = DEMOS[0]
const STORAGE_KEY = 'drone-sim-python-control-code'
const STORAGE_DEMO_KEY = 'drone-sim-python-control-demo'

interface GradeResult {
  passed: boolean
  finalPositionError: number
  maxError: number
  averageError: number
  settlingTime: number | null
  message: string
}

function vectorError(a: number[], b: number[]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

function computeGrade(result: SimResult): GradeResult {
  if (result.position.length === 0 || result.refPosition.length === 0) {
    return {
      passed: false,
      finalPositionError: Infinity,
      maxError: Infinity,
      averageError: Infinity,
      settlingTime: null,
      message: '没有可评分的仿真数据。',
    }
  }

  let maxError = 0
  let totalError = 0
  let settlingTime: number | null = null
  const threshold = 0.75

  for (let i = 0; i < result.position.length; i++) {
    const error = vectorError(result.position[i], result.refPosition[i])
    totalError += error
    maxError = Math.max(maxError, error)
    if (settlingTime === null && error <= threshold) {
      settlingTime = result.time[i]
    }
  }

  const averageError = totalError / result.position.length
  const lastIndex = result.position.length - 1
  const finalPositionError = vectorError(result.position[lastIndex], result.refPosition[lastIndex])
  const passed = averageError < threshold

  return {
    passed,
    finalPositionError,
    maxError,
    averageError,
    settlingTime,
    message: passed
      ? '通过：无人机较好地跟踪了 Python 生成的参考轨迹。'
      : `未通过：平均轨迹误差 ${averageError.toFixed(2)} m。`,
  }
}

function getDemo(key: DemoType): DemoPreset {
  return DEMOS.find(demo => demo.key === key) ?? DEFAULT_DEMO
}

function getStoredDemoKey(): DemoType | null {
  const stored = localStorage.getItem(STORAGE_DEMO_KEY) as DemoType | null
  return stored && DEMOS.some(demo => demo.key === stored) ? stored : null
}

function getStoredDemo(): DemoPreset {
  const stored = getStoredDemoKey()
  return stored ? getDemo(stored) : DEFAULT_DEMO
}

function formatStatus(status: string, pyodideLoading: boolean): string {
  if (pyodideLoading) return '加载 Python'
  if (status === 'running') return '仿真运行中'
  if (status === 'complete') return '仿真完成'
  if (status === 'error') return '运行错误'
  return '就绪'
}

function resultFinalAltitude(result: SimResult | null): string {
  if (!result || result.position.length === 0) return '-'
  const z = result.position[result.position.length - 1][2]
  return `${(-z).toFixed(2)} m`
}

function resultDuration(result: SimResult | null, fallback: number): string {
  if (!result || result.time.length === 0) return `${fallback}s`
  return `${result.time[result.time.length - 1].toFixed(1)}s`
}

function gradeStatusText(grade: GradeResult | null): string {
  if (!grade) return '-'
  return grade.passed ? '通过' : '偏差较大'
}

export default function SimulationPage() {
  const [selectedDemo, setSelectedDemo] = useState<DemoType>(() => getStoredDemo().key)
  const [code, setCode] = useState(() => {
    const demo = getStoredDemo()
    return getStoredDemoKey() ? (localStorage.getItem(STORAGE_KEY) ?? demo.code) : demo.code
  })
  const [simTime, setSimTime] = useState(() => getStoredDemo().simTime)
  const [logs, setLogs] = useState<string[]>([])
  const [pyodideReady, setPyodideReady] = useState(false)
  const [pyodideLoading, setPyodideLoading] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)
  const workerRef = useRef<Worker | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)
  const autoRunRef = useRef(false)
  const { status, result, setStatus, setResult, setProgress, setError, reset } = useSimStore()

  useEffect(() => {
    const worker = new PythonControlWorker()
    workerRef.current = worker
    worker.postMessage({ type: 'init' })

    worker.onmessage = (e: MessageEvent) => {
      const { type, result: workerResult, progress, error: workerError, message, status: workerStatus } = e.data

      if (type === 'ready') {
        setPyodideReady(true)
        setPyodideLoading(false)
      }

      if (type === 'log') {
        setLogs(prev => [...prev, String(message)])
      }

      if (type === 'progress') {
        setProgress(progress)
      }

      if (type === 'status') {
        setStatus(workerStatus)
      }

      if (type === 'complete') {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        const finalElapsed = (Date.now() - startTimeRef.current) / 1000
        setElapsedTime(finalElapsed)
        setResult(workerResult as SimResult)
        setStatus('complete')
        setLogs(prev => [...prev, `仿真完成，耗时 ${finalElapsed.toFixed(1)} s。`])
      }

      if (type === 'error') {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        const finalElapsed = (Date.now() - startTimeRef.current) / 1000
        setElapsedTime(finalElapsed)
        setError(String(workerError))
        setStatus('error')
        setLogs(prev => [...prev, `ERROR (${finalElapsed.toFixed(1)} s): ${workerError}`])
      }
    }

    worker.onerror = (err) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setError(String(err.message))
      setStatus('error')
      setLogs(prev => [...prev, `WORKER ERROR: ${err.message}`])
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      worker.terminate()
      workerRef.current = null
    }
  }, [setError, setProgress, setResult, setStatus])

  const activeDemo = useMemo(() => getDemo(selectedDemo), [selectedDemo])

  const handleRun = useCallback(() => {
    if (!workerRef.current || !pyodideReady) return
    localStorage.setItem(STORAGE_KEY, code)
    localStorage.setItem(STORAGE_DEMO_KEY, activeDemo.key)
    reset()
    setLogs(['开始仿真...'])
    setElapsedTime(0)
    setStatus('running')

    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedTime((Date.now() - startTimeRef.current) / 1000)
    }, 200)

    workerRef.current.postMessage({
      type: 'start',
      code,
      missionType: activeDemo.workerMissionType,
      maxSimTime: simTime,
    })
  }, [activeDemo.key, activeDemo.workerMissionType, code, pyodideReady, reset, setStatus, simTime])

  const handleStop = useCallback(() => {
    workerRef.current?.postMessage({ type: 'cancel' })
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleReset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'cancel' })
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    reset()
    setLogs([])
    setSelectedDemo(DEFAULT_DEMO.key)
    setCode(DEFAULT_DEMO.code)
    setSimTime(DEFAULT_DEMO.simTime)
    setElapsedTime(0)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_DEMO_KEY)
  }, [reset])

  const handleDemoChange = (nextDemo: DemoType) => {
    const demo = getDemo(nextDemo)
    setSelectedDemo(demo.key)
    setCode(demo.code)
    setSimTime(demo.simTime)
    localStorage.setItem(STORAGE_KEY, demo.code)
    localStorage.setItem(STORAGE_DEMO_KEY, demo.key)
  }

  useEffect(() => {
    if (pyodideReady && status === 'idle' && !autoRunRef.current) {
      autoRunRef.current = true
      handleRun()
    }
  }, [handleRun, pyodideReady, status])

  const grade = result ? computeGrade(result) : null
  const playbackScene = selectedDemo === 'astar'
    ? { obstacles: ASTAR_OBSTACLES, start: ASTAR_START, goal: ASTAR_GOAL }
    : undefined

  return (
    <div className="page-container sim-workbench" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <section className="sim-topbar ds-fade-in">
        <div className="sim-titlebar">
          <div className="sim-mark">
            <Cpu size={21} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="sim-heading">编程仿真</h1>
            <p className="sim-subtitle">Python PID · 推力/力矩 · 动力学仿真</p>
          </div>
        </div>

        <div className="sim-topbar-modes" aria-label="任务模式">
          {DEMOS.map((demo) => {
            const Icon = DEMO_META[demo.key].icon
            return (
              <button
                key={demo.key}
                className={`sim-topbar-mode ${selectedDemo === demo.key ? 'active' : ''}`}
                type="button"
                onClick={() => handleDemoChange(demo.key)}
                disabled={status === 'running'}
                title={`${demo.label} · ${DEMO_META[demo.key].meta}`}
              >
                <Icon size={15} />
                <span>{demo.label}</span>
              </button>
            )
          })}
        </div>

        <div className="sim-actions">
          <span className={`sim-status-pill ${status}`}>
            {status === 'complete' ? <CheckCircle size={15} /> : status === 'error' ? <XCircle size={15} /> : <Activity size={15} />}
            {formatStatus(status, pyodideLoading)}
          </span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700 }}>
            <Clock size={16} />
            <input
              type="number"
              className="ds-input"
              value={simTime}
              min={1}
              max={60}
              step={1}
              onChange={e => setSimTime(Number(e.target.value))}
              disabled={status === 'running'}
              style={{ width: 76, height: 38 }}
            />
            s
          </label>
          <button className="ds-button secondary" onClick={handleReset} disabled={status === 'running'} style={{ height: 38 }}>
            <RotateCcw size={16} />
            重置
          </button>
          {status === 'running' ? (
            <button className="ds-button" onClick={handleStop} style={{ height: 38, background: 'var(--status-danger)' }}>
              <Square size={16} />
              停止
            </button>
          ) : (
            <button className="ds-button" onClick={handleRun} disabled={!pyodideReady || pyodideLoading} style={{ height: 38 }}>
              <Play size={16} />
              运行
            </button>
          )}
        </div>
      </section>

      <div className="sim-shell">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <section className="sim-panel ds-fade-in">
            <div className="sim-panel-header">
              <div>
                <h2 className="sim-panel-title"><BookOpen size={16} />Python 控制器</h2>
                <p className="sim-panel-subtitle">{activeDemo.label} · Controller.update(t, state)</p>
              </div>
              <span className="ds-chip info">NED</span>
            </div>
            <div className="sim-panel-body">
              <div className="sim-editor-frame">
                <CodeMirror
                  value={code}
                  height="520px"
                  theme={oneDark}
                  extensions={[python()]}
                  onChange={(value) => setCode(value)}
                  editable={status !== 'running'}
                  basicSetup={{
                    lineNumbers: true,
                    highlightActiveLineGutter: true,
                    highlightActiveLine: true,
                    foldGutter: false,
                  }}
                />
              </div>
            </div>
          </section>
        </div>

        <section className="sim-panel sim-viewer ds-fade-in">
          <div className="sim-panel-header">
            <div>
              <h2 className="sim-panel-title"><Activity size={16} />三维回放</h2>
              <p className="sim-panel-subtitle">实际轨迹与参考轨迹</p>
            </div>
            <span className="ds-chip info">{resultDuration(result, simTime)}</span>
          </div>
          <div className="sim-panel-body">
            <PlaybackPanel scene={playbackScene} />
          </div>
        </section>
      </div>

      <div className="sim-bottom-grid">
        <section className="sim-panel ds-fade-in">
          <div className="sim-panel-header">
            <h2 className="sim-panel-title"><Terminal size={16} />运行日志</h2>
          </div>
          <div className="sim-panel-body">
            <pre className="sim-log">{logs.length === 0 ? 'ready' : logs.join('\n')}</pre>
          </div>
        </section>

        <section className="sim-panel ds-fade-in">
          <div className="sim-panel-header">
            <h2 className="sim-panel-title">
              {grade?.passed ? <CheckCircle size={16} color="var(--status-success)" /> : <XCircle size={16} color={grade ? 'var(--status-danger)' : 'var(--text-secondary)'} />}
              任务评估
            </h2>
          </div>
          <div className="sim-panel-body">
            <div className="sim-stat-grid">
              <div className="sim-stat">
                <div className="sim-stat-label"><Timer size={13} />运行耗时</div>
                <div className="sim-stat-value">{status === 'running' ? `${elapsedTime.toFixed(1)}s` : resultDuration(result, simTime)}</div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label"><Gauge size={13} />最终高度</div>
                <div className="sim-stat-value">{resultFinalAltitude(result)}</div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label"><Route size={13} />平均/最大误差</div>
                <div className="sim-stat-value">{grade ? `${grade.averageError.toFixed(2)} / ${grade.maxError.toFixed(2)} m` : '-'}</div>
              </div>
              <div className="sim-stat">
                <div className="sim-stat-label"><CheckCircle size={13} />评分</div>
                <div className="sim-stat-value">{gradeStatusText(grade)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
