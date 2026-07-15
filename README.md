# DroneSim 四旋翼无人机仿真平台

DroneSim 是一个基于浏览器的四旋翼无人机工程仿真平台，用于完成部件选型、控制律调参、Python 编程控制仿真、三维轨迹回放和动力学原理展示。

项目当前以 React + TypeScript + Vite 为前端基础，仿真核心在浏览器内运行；Python 控制器通过 Pyodide 在 Web Worker 中执行，并把推力/力矩指令送入内置动力学引擎。

## 功能模块

### 1. 入口页

路径：`#/`

提供项目入口和三类工作区导航：

- 选型模式
- 仿真模式
- 控制律模式

### 2. 选型模式

路径：`#/selection`

用于配置无人机部件并估算续航与功率：

- 机架、电机、螺旋桨、电调、电芯、电池节数、电池容量、起飞重量配置
- F450 标准版 / 增强版预设
- 悬停工况续航估算
- 15 m/s 高速前飞工况续航估算
- 电流、功率、推力余量、油门等指标展示
- 配置合理性告警

核心文件：

- `src/pages/SelectionPage.tsx`
- `src/lib/selectionEngine.ts`
- `src/lib/database.ts`
- `src/database/parts.json`

### 3. 编程仿真

路径：`#/simulation`

用于在网页中编写 Python 控制器，并通过内置六自由度动力学引擎运行仿真。

当前内置四种任务模式：

- `PID 悬停起飞`：从地面起飞到目标高度并悬停
- `画圆`：先到达预定高度，再进入圆轨迹
- `A* 避障飞行`：在网格障碍物中规划路径并控制飞行
- `空白自定义`：保留 Python 控制器骨架，便于自行编写任务

Python 示例代码直接实现 PID 控制器，输出：

- `thrust`：总推力
- `moments`：机体系力矩 `[Mx, My, Mz]`
- `position / velocity / acceleration`：用于参考轨迹显示和任务评估

网页侧负责：

- 加载 Pyodide
- 执行 Python 控制器
- 将推力/力矩送入动力学、推进、电池、刚体积分模型
- 三维回放实际轨迹与参考轨迹
- 展示 A* 障碍物、起点和终点
- 输出运行日志与任务评估

核心文件：

- `src/pages/SimulationPage.tsx`
- `src/workers/pythonControl.worker.ts`
- `src/lib/simulation.ts`
- `src/lib/dynamics.ts`
- `src/lib/propulsion.ts`
- `src/components/PlaybackPanel.tsx`
- `public/pyodide/`

### 4. 控制律模式

路径：

- `#/control-law`
- `#/control-law/pid`
- `#/control-law/lqr`
- `#/control-law/mpc`

用于展示和调试控制律相关内容。目前 PID 页面包含参数调节、阶跃响应和控制量曲线；LQR/MPC 页面为后续扩展入口。

核心文件：

- `src/pages/ControlLawPage.tsx`
- `src/pages/ControlLawPIDPage.tsx`
- `src/pages/ControlLawLQRPage.tsx`
- `src/pages/ControlLawMPCPage.tsx`
- `src/lib/controllerDesign.ts`
- `src/store/controllerStore.ts`

### 5. 原理说明

路径：`#/theory`

用于展示四旋翼相关理论内容，包括坐标系、运动学、推进/气动、控制分配和输入汇总等。

核心文件：

- `src/theory/TheoryPage.tsx`
- `src/theory/nav.ts`
- `src/theory/prose.tsx`
- `src/theory/sections/`

## 技术栈

- React 19
- TypeScript
- Vite
- Zustand
- Three.js / React Three Fiber / Drei
- ECharts
- CodeMirror
- Pyodide
- Vitest
- ESLint

## 项目结构

```text
src/
  components/              通用 UI 与仿真展示组件
    PlaybackPanel.tsx      三维回放、轨迹、障碍物展示
    ConfigPanel.tsx        文档工况仿真配置组件
    DataPanel.tsx          仿真数据与曲线展示
    ValidationPanel.tsx    文档验证面板

  pages/                   页面级入口
    PortalPage.tsx         首页
    SelectionPage.tsx      选型模式
    SimulationPage.tsx     Python 编程仿真
    ControlLaw*.tsx        控制律页面

  lib/                     业务逻辑与仿真核心
    simulation.ts          仿真主循环
    dynamics.ts            六自由度刚体动力学
    propulsion.ts          推进系统、控制分配、螺旋桨模型
    components.ts          电池、电机、电调等部件模型
    controller.ts          内置串级控制器
    pythonControlMission.ts Python 控制任务适配逻辑
    selectionEngine.ts     选型与续航估算
    database.ts            部件数据库读取
    routing.ts             hash 路由解析

  workers/
    pythonControl.worker.ts Python/Pyodide 控制仿真 Worker
    simulation.worker.ts    文档工况仿真 Worker

  store/                   Zustand 状态
  theory/                  原理说明页面
  database/parts.json      部件数据库

public/
  assets/                  静态图片
  pyodide/                 浏览器端 Python 运行时资源
```

## 坐标系约定

仿真采用 NED 坐标系：

- `x`：向前
- `y`：向右
- `z`：向下

因此高度 5 m 对应位置 `z = -5`。Python 示例中的目标点也遵守这一约定。

四元数格式为：

```text
[w, x, y, z]
```

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

运行测试：

```bash
npm test -- --run
```

代码检查：

```bash
npm run lint
```

## 注意事项

- `public/pyodide/` 是编程仿真所需的浏览器端 Python 运行时资源。
- Python 控制器应保留 `Controller` 类和 `update(self, t, state)` 方法。
- Python 控制器不应直接修改 `state`，而应返回推力、力矩和参考轨迹信息。
- 仿真页面的任务评估基于实际轨迹与参考轨迹的误差计算。
- A* 模式中的障碍物同时用于 Python 规划示例和三维场景展示。

## 常用开发入口

- 改仿真动力学：`src/lib/simulation.ts`、`src/lib/dynamics.ts`
- 改 Python 控制执行：`src/workers/pythonControl.worker.ts`
- 改仿真页面与示例代码：`src/pages/SimulationPage.tsx`
- 改三维回放：`src/components/PlaybackPanel.tsx`
- 改选型估算：`src/lib/selectionEngine.ts`
- 改部件数据：`src/database/parts.json`
- 改理论页面：`src/theory/sections/`
