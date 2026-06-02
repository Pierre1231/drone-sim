import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

export default function InfoPanel() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-lg text-sm text-gray-600 hover:bg-gray-50 z-50"
      >
        <BookOpen size={16} /> 原理说明
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 w-[500px] max-h-[70vh] bg-white border border-gray-300 rounded-lg shadow-xl overflow-y-auto z-50">
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">原理说明</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
          <ChevronDown size={18} />
        </button>
      </div>

      <div className="p-4 space-y-4 text-sm">
        <section>
          <h4 className="font-medium text-gray-800 mb-2">四旋翼结构</h4>
          <p className="text-gray-600 mb-2">
            标准 X 型四旋翼，四个电机对称分布在机架四角。电机 1&4 顺时针旋转，电机 2&3 逆时针旋转，
            通过反扭矩平衡实现偏航控制。
          </p>
          <div className="bg-gray-50 rounded p-2 text-xs font-mono">
            {`  [2]    [1]`}<br/>
            {`    \\  /`}<br/>
            {`     CG`}<br/>
            {`    /  \\`}<br/>
            {`  [3]    [4]`}
          </div>
        </section>

        <section>
          <h4 className="font-medium text-gray-800 mb-2">坐标系定义</h4>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-t"><td className="py-1 font-mono">NED (n)</td><td className="py-1">地理坐标系：x北 y东 z下</td></tr>
              <tr className="border-t"><td className="py-1 font-mono">Body (b)</td><td className="py-1">机体坐标系：原点在质心</td></tr>
              <tr className="border-t"><td className="py-1 font-mono">Prop (pᵢ)</td><td className="py-1">第 i 个螺旋桨坐标系</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h4 className="font-medium text-gray-800 mb-2">仿真模型层次</h4>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>六自由度刚体动力学（位置/速度/姿态/角速度）</li>
            <li>电池动态模型（SOC / 极化电压 / 内阻）</li>
            <li>电机电气-机械耦合模型（RL电路 + 转子动力学）</li>
            <li>电调响应模型（占空比映射 + 输出电压）</li>
            <li>螺旋桨推进模型（推力系数随推进比变化）</li>
            <li>串级 PID 控制器（位置→速度→姿态→角速度）</li>
            <li>气动力模型（低速二次阻力）</li>
            <li>标准大气环境模型（ISA）</li>
          </ol>
        </section>

        <section>
          <h4 className="font-medium text-gray-800 mb-2">关键公式</h4>
          <div className="bg-gray-50 rounded p-2 text-xs font-mono space-y-1">
            <div>T = Cₜ(J) · ρ · n² · D⁴</div>
            <div>Q = Cᵩ(J) · ρ · n² · D⁵</div>
            <div>U_b = U_oc - I·R_int</div>
            <div>SOC[k+1] = SOC[k] - I·Tₛ/(3600·Q_nom)</div>
          </div>
        </section>
      </div>
    </div>
  )
}
