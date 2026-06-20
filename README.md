# DroneSim 四旋翼文档工况仿真

本项目是一个前端四旋翼仿真网页，当前实现严格围绕项目根目录的两份文档：

- `四旋翼数学模型.md`
- `四旋翼仿真测试用例.md`

网页提供文档工况运行、3D 回放和文档输出对比。对比面板只对测试用例文档明确给出的输出项做通过/失败判定。

## 文档工况

- B01 全链路悬停：5 m 悬停，推进系统从文档悬停平衡点初始化，运行到 SOC=20%。
- B02 水平匀速：无风、5 m 高度、沿 +x_n 方向 5 m/s 匀速飞行。
- B03 圆形轨迹 2 m/s：半径 5 m，高度 5 m。
- B03 圆形轨迹 7 m/s：半径 5 m，高度 5 m。

8 字机动不属于当前两份文档的闭环测试工况，已从 UI 和任务实现中移除。

## 技术栈

- React + TypeScript + Vite
- Three.js / React Three Fiber
- ECharts
- Zustand
- Web Worker

## 运行

```bash
npm install
npm run dev
npm test -- --run
npm run build
```

## 主要目录

```text
src/
  components/
    ConfigPanel.tsx       文档工况选择与仿真启动
    PlaybackPanel.tsx     3D 回放与时间控制
    DataPanel.tsx         文档输出对比与曲线
    ValidationPanel.tsx   独立文档验证入口
  lib/
    dynamics.ts           六自由度刚体积分
    mission.ts            B01/B02/B03 任务参考输入
    controller.ts         文档串级控制器
    propulsion.ts         螺旋桨、PID、控制分配
    components.ts         电池、电机、电调模型
    simulation.ts         全链路仿真主循环
    presets.ts            test-standard 文档参数
  workers/
    simulation.worker.ts  后台仿真
```
