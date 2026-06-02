# 四旋翼无人机参数选型与飞行仿真平台

基于完整六自由度动力学模型的无人机性能仿真网页应用。

## 技术栈

- **React 19 + TypeScript + Vite** — 前端框架
- **Tailwind CSS 4 + shadcn/ui** — UI 样式
- **Three.js + React Three Fiber** — 3D 可视化
- **ECharts** — 数据图表
- **Zustand** — 状态管理
- **Web Worker** — 后台仿真计算

## 核心功能

### 1. 部件选型
- 从型号库中选择机架、电机、螺旋桨、电池（电芯级）、电调
- 实时显示悬停时间/电流估算
- 电芯级电池配置（串数/容量/C率/内阻/重量）

### 2. 飞行仿真
- **悬停续航测试**：起飞→悬停→电量耗尽→自动降落
- **8字机动续航测试**：起飞→悬停→8字航线→电量耗尽→降落
- 完整六自由度动力学（10kHz 步长）
- 包含：电池动态、电机电气暂态、螺旋桨推进比效应、气动力、标准大气

### 3. 3D 回放
- 时间序列驱动的飞行动画
- 播放/暂停/进度条拖拽/倍速控制
- DJI 风格 HUD（时间/高度/电压/电量）
- 飞行轨迹线显示

### 4. 数据展示
- **汇总报告**：飞行时间/距离/功率/高度/速度/电量
- **图表**：电压/高度/功率/推力曲线
- **仪表盘**：条形图概览 + 悬停/最大油门对比表

### 5. 控制器自动设计
- 根据无人机物理参数自动计算串级 PID 增益
- 带宽分配：角速度 > 姿态 > 速度 > 位置

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── components/
│   ├── ConfigPanel.tsx      # 配置页 UI
│   ├── PlaybackPanel.tsx    # 3D 回放 + HUD
│   ├── DataPanel.tsx        # 数据图表 + 仪表盘
│   └── InfoPanel.tsx        # 原理说明
├── lib/
│   ├── estimation.ts        # 悬停性能估算
│   ├── dynamics.ts          # 六自由度积分器
│   ├── components.ts        # 电池/电机/电调模型
│   ├── propulsion.ts        # 螺旋桨/控制分配/PID
│   ├── aerodynamics.ts      # 标准大气/气动力
│   ├── mission.ts           # 飞行任务脚本
│   ├── controllerDesign.ts  # 控制器自动设计
│   ├── simulation.ts        # 仿真引擎串联
│   └── database.ts          # 部件数据库加载器
├── store/
│   ├── configStore.ts       # 配置状态
│   └── simStore.ts          # 仿真状态
├── types/
│   └── parts.ts             # 部件类型定义
├── database/
│   └── parts.json           # 部件数据
├── workers/
│   └── simulation.worker.ts # Web Worker
└── App.tsx                  # 主页面
```

## 数学模型

详细动力学模型见项目根目录 `拦截器数学模型.md`。

## 许可证

MIT
