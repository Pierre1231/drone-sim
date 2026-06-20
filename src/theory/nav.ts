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
    id: 'inputs',
    label: 'I',
    title: '输入变量',
    children: [
      { id: 'inputs-state', label: 'A', title: '状态变量' },
      { id: 'inputs-external', label: 'B', title: '外部输入' },
      { id: 'inputs-params', label: 'C', title: '模型参数' },
    ],
  },
  {
    id: 'frames',
    label: 'II',
    title: '坐标系',
  },
  {
    id: 'notation',
    label: 'III',
    title: '符号约定',
  },
  {
    id: 'concepts',
    label: 'IV',
    title: '基本概念',
    children: [
      { id: 'concepts-euler', label: 'A', title: '欧拉角' },
      { id: 'concepts-quaternion', label: 'B', title: '旋转矩阵与四元数' },
      { id: 'concepts-inertia', label: 'C', title: '质量、质心与转动惯量' },
      { id: 'concepts-thrust', label: 'D', title: '推力系数' },
      { id: 'concepts-torque', label: 'E', title: '反扭矩系数' },
      { id: 'concepts-gyro', label: 'F', title: '旋翼陀螺力矩' },
    ],
  },
  {
    id: 'control',
    label: 'V',
    title: '四旋翼控制模型',
    children: [
      { id: 'control-kinematics', label: 'A', title: '刚体运动学模型' },
      { id: 'control-position', label: 'B', title: '位置动力学模型' },
      { id: 'control-attitude', label: 'C', title: '姿态动力学模型' },
      { id: 'control-rigidbody', label: 'D', title: '飞行控制刚体模型' },
      { id: 'control-allocation', label: 'E', title: '控制分配模型' },
      { id: 'control-propulsion', label: 'F', title: '推进器模型' },
    ],
  },
  {
    id: 'aero',
    label: 'VI',
    title: '四旋翼气动力模型',
    children: [
      { id: 'aero-environment', label: 'A', title: '环境模型' },
      { id: 'aero-airflow', label: 'B', title: '相对气流' },
      { id: 'aero-drag', label: 'C', title: '空气阻力模型' },
      { id: 'aero-damping', label: 'D', title: '气动阻尼力矩模型' },
    ],
  },
]

/** 扁平化所有可定位锚点 id（章 + 节），按文档顺序，用于滚动监听。 */
export const ALL_SECTION_IDS: string[] = NAV.flatMap(n => [n.id, ...(n.children?.map(c => c.id) ?? [])])
