/** 章节树：左栏导航与右栏 TOC 共用。id 与各 section 中的标题锚点一致。 */
export interface NavNode {
  id: string
  /** 短标号，如「I」「A」，用于导航树左侧标记 */
  label?: string
  title: string
  children?: NavNode[]
}

export const NAV: NavNode[] = [
  {
    id: 'coordinate-system',
    label: 'I',
    title: '坐标系与符号约定',
    children: [
      { id: 'cs-frames', label: 'A', title: '坐标系定义' },
      { id: 'cs-notation', label: 'B', title: '旋转矩阵与符号约定' },
      { id: 'cs-geometry', label: 'C', title: '基准四旋翼几何' },
    ],
  },
  {
    id: 'kinematics',
    label: 'II',
    title: '刚体运动学与基础概念',
    children: [
      { id: 'kin-state', label: 'A', title: '状态变量' },
      { id: 'kin-euler', label: 'B', title: '欧拉角与旋转矩阵' },
      { id: 'kin-quaternion', label: 'C', title: '四元数与姿态运动学' },
      { id: 'kin-rigid', label: 'D', title: '刚体运动学与动力学' },
      { id: 'kin-inertia', label: 'E', title: '质量、质心与转动惯量' },
    ],
  },
  {
    id: 'propulsion-aero',
    label: 'III',
    title: '推进器与气动力',
    children: [
      { id: 'pa-thrust', label: 'A', title: '旋翼推力模型' },
      { id: 'pa-torque', label: 'B', title: '旋翼反扭矩模型' },
      { id: 'pa-gyro', label: 'C', title: '旋翼陀螺力矩' },
      { id: 'pa-environment', label: 'D', title: '环境模型与相对气流' },
      { id: 'pa-drag', label: 'E', title: '空气阻力与气动阻尼' },
      { id: 'pa-summary', label: 'F', title: '整机力与力矩汇总' },
      { id: 'pa-dynamics', label: 'G', title: '电池、电调、电机与螺旋桨动态' },
    ],
  },
  {
    id: 'allocation',
    label: 'IV',
    title: '控制分配',
    children: [
      { id: 'alloc-problem', label: 'A', title: '控制分配问题' },
      { id: 'alloc-matrix', label: 'B', title: '分配矩阵' },
      { id: 'alloc-constraints', label: 'C', title: '约束与优化' },
    ],
  },
  {
    id: 'inputs',
    label: 'V',
    title: '输入变量总表',
    children: [
      { id: 'inputs-state', label: 'A', title: '完整状态向量' },
      { id: 'inputs-external', label: 'B', title: '外部输入' },
      { id: 'inputs-params', label: 'C', title: '模型参数' },
    ],
  },
]

/** 扁平化所有可定位锚点 id（章 + 节），按文档顺序，用于滚动监听。 */
export const ALL_SECTION_IDS: string[] = NAV.flatMap(n => [n.id, ...(n.children?.map(c => c.id) ?? [])])
