import { TeX } from '../TeX'
import { H2, H3, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw

function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

/** 用中文逗号连接的单位串 */
function U({ items }: { items: string[] }) {
  return (
    <>
      {items.map((s, i) => (
        <span key={i}>
          {i > 0 && '，'}
          <TeX>{s}</TeX>
        </span>
      ))}
    </>
  )
}

export default function InputsSummary() {
  return (
    <section>
      <H2 id="inputs">V. 输入变量总表</H2>
      <Lead>
        本章作为全文档的汇总索引，列出仿真模型所需的全部状态、外部输入和模型参数。
        由于前四章已经逐个介绍了这些量的含义，这里主要按组归类，便于查阅和与代码实现对照。
      </Lead>

      <H3 id="inputs-state">A. 完整状态向量</H3>
      <P>
        整机完整状态由刚体状态、电池状态、各电调状态和各电机状态拼接而成：
      </P>
      <TeX block>{r`x=\begin{bmatrix}x_{body}^T&x_{bat}^T&x_{esc,1}^T\cdots x_{esc,N_r}^T&x_{m,1}^T\cdots x_{m,N_r}^T\end{bmatrix}^T`}</TeX>
      <P>其中刚体状态 <X>{r`x_{body}`}</X> 已在第 II 章定义；电调和电机状态可分别写为</P>
      <TeX block>{r`x_{esc,i}=\begin{bmatrix}d_{esc,i}&T_{esc,i}\end{bmatrix}^T`}</TeX>
      <TeX block>{r`x_{m,i}=\begin{bmatrix}I_{m,i}&\omega_i\end{bmatrix}^T`}</TeX>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`x`}</X>, '整机完整状态向量'],
          [<X>{r`x_{body}`}</X>, '整机刚体状态向量'],
          [<X>{r`x_{bat}`}</X>, '电池状态向量'],
          [<X>{r`x_{esc,i}`}</X>, <>第 <X>{r`i`}</X> 个电调/功率电路状态</>],
          [<X>{r`x_{m,i}`}</X>, <>第 <X>{r`i`}</X> 个电机状态</>],
        ]}
      />

      <H3 id="inputs-external">B. 外部输入</H3>
      <P>模型外部输入包括飞行控制指令、环境条件和外部扰动。</P>
      <ParamTable
        head={['输入', '含义', '单位']}
        rows={[
          [<X>{r`p_d^n,v_d^n,a_{ff}^n`}</X>, '期望位置、速度和前馈加速度', <U items={[r`\mathrm{m}`, r`\mathrm{m/s}`, r`\mathrm{m/s^2}`]} />],
          [<X>{r`b_{x,ref}^n,\omega_d^b`}</X>, '期望航向参考方向和期望角速度', <U items={[r`-`, r`\mathrm{rad/s}`]} />],
          [<X>{r`\boldsymbol{w}^n,T_{amb}`}</X>, '地理系下风速和环境温度', <U items={[r`\mathrm{m/s}`, r`\mathrm{K}`]} />],
          [<X>{r`F_{dist}^b,M_{dist}^b`}</X>, '外部扰动力和扰动力矩', <U items={[r`\mathrm{N}`, r`\mathrm{N\,m}`]} />],
          [<X>{r`P_{aux}`}</X>, '飞控、通信和其他辅助设备功耗', <U items={[r`\mathrm{W}`]} />],
        ]}
      />

      <H3 id="inputs-params">C. 模型参数</H3>
      <P>模型参数按物理子系统分组列出，避免把几十个符号塞进一张大表。</P>

      <ParamTable
        head={['参数', '含义', '单位']}
        rows={[
          [<X>{r`m,J,g`}</X>, '整机质量、相对质心的转动惯量矩阵和重力加速度', <U items={[r`\mathrm{kg}`, r`\mathrm{kg\,m^2}`, r`\mathrm{m/s^2}`]} />],
          [<X>{r`N_c,m_j,r_j^b,R_j^b,J_j^j`}</X>, '组件数量、质量、相对质心位置、安装姿态和自身惯量', <U items={[r`-`, r`\mathrm{kg}`, r`\mathrm{m}`, r`-`, r`\mathrm{kg\,m^2}`]} />],
          [<X>{r`N_r,l,r_i^b,e_{T,i}^b`}</X>, '旋翼数量、质心到旋翼中心的机臂长度、安装位置和推力方向', <U items={[r`-`, r`\mathrm{m}`, r`\mathrm{m}`, r`-`]} />],
          [<X>{r`s_i,\chi_i`}</X>, '旋翼角动量方向符号和机体反扭矩方向符号', <U items={[r`-`]} />],
        ]}
      />

      <ParamTable
        head={['推进器参数', '含义', '单位']}
        rows={[
          [<X>{r`k_{T,i,ref},k_{Q,i,ref},\kappa_{Q,i}`}</X>, '参考空气密度下的静态推力系数、静态反扭矩系数及其比值', <U items={[r`\mathrm{N/(rad/s)^2}`, r`\mathrm{N\,m/(rad/s)^2}`, r`\mathrm{m}`]} />],
          [<X>{r`J_{rot,i},D_i,C_T(J_i),C_Q(J_i)`}</X>, '旋翼等效转动惯量、直径及来流相关气动系数', <U items={[r`\mathrm{kg\,m^2}`, r`\mathrm{m}`, r`-`, r`-`]} />],
          [<X>{r`\rho_{ref},J_{ref}`}</X>, '静态系数对应的参考空气密度和参考推进比', <U items={[r`\mathrm{kg/m^3}`, r`-`]} />],
        ]}
      />

      <ParamTable
        head={['电气参数', '含义', '单位']}
        rows={[
          [<X>{r`\begin{array}{l}N_s,Q_{nom},R_{int},R_{dyn},\tau_{bat},C_{bat},\\R_{th,bat},k_{T,bat},SOC_{min},SOC_{max},\\U_{min},U_{max},I_{bat,max}\end{array}`}</X>, '电池串联节数、容量、内阻、动态电阻、时间常数、热容、热阻、温度系数及 SOC/电压/电流边界', <U items={[r`-`, r`\mathrm{Ah}`, r`\Omega`, r`\Omega`, r`\mathrm{s}`, r`\mathrm{J/K}`, r`\mathrm{K/W}`, r`\mathrm{V/K}`, r`-`, r`-`, r`\mathrm{V}`, r`\mathrm{V}`, r`\mathrm{A}`]} />],
          [<X>{r`\begin{array}{l}\tau_{esc},R_{wire,i},R_{esc,i},\\k_{sw},f_{pwm},C_{th,esc},R_{th,esc}\end{array}`}</X>, '电调响应时间常数、线束/电调电阻、开关损耗系数、PWM 频率、电调热容和热阻', <U items={[r`\mathrm{s}`, r`\Omega`, r`\Omega`, r`-`, r`\mathrm{Hz}`, r`\mathrm{J/K}`, r`\mathrm{K/W}`]} />],
          [<X>{r`L_m,R_m,K_e,K_t,b_m`}</X>, '电机等效电感、等效电阻、反电动势系数、转矩系数、粘性阻尼系数', <U items={[r`\mathrm{H}`, r`\Omega`, r`\mathrm{V\,s/rad}`, r`\mathrm{N\,m/A}`, r`\mathrm{N\,m\,s/rad}`]} />],
        ]}
      />

      <ParamTable
        head={['环境与机体气动参数', '含义', '单位']}
        rows={[
          [<X>{r`T_0,p_0,L_{atm},R_a`}</X>, '标准大气海平面温度、海平面压强、温度递减率和气体常数', <U items={[r`\mathrm{K}`, r`\mathrm{Pa}`, r`\mathrm{K/m}`, r`\mathrm{J/(kg\,K)}`]} />],
          [<X>{r`D_{v,ref},D_{\omega,ref},C_{Dx},C_{Dy},C_{Dz},A_x,A_y,A_z,r_d^b`}</X>, '参考阻力矩阵、参考阻尼矩阵、三轴阻力系数、参考面积、阻力作用中心偏移', <U items={[r`\mathrm{N/(m/s)^2}`, r`\mathrm{N\,m/(rad/s)^2}`, r`-`, r`\mathrm{m^2}`, r`\mathrm{m}`]} />],
        ]}
      />

      <ParamTable
        head={['控制与数值参数', '含义', '单位']}
        rows={[
          [<X>{r`K_p^p,K_i^p,K_p^v,K_i^v,K_d^v,K_R,K_p^\omega,K_i^\omega,K_d^\omega,W_y,W_T,\lambda`}</X>, '位置/速度/姿态/角速度环 PID 增益、控制分配权重与惩罚系数', '由对应误差、控制输出和代价函数量纲确定'],
          [<X>{r`T_s,\epsilon_F,\epsilon_R,\epsilon_U,\epsilon_V,\epsilon_n,\epsilon_\omega,J_{min},J_{max},T_{min},T_{max}`}</X>, '采样周期、各类防止除零的小正数、推进比边界和推力边界', '与对应状态、输入和约束变量一致'],
        ]}
      />

      <Callout title="参数分组的意义">
        不要把所有参数看成一张平铺的列表。刚体与几何参数决定惯性，推进器参数决定推力/反扭矩，电气参数决定功率与动态，环境/气动参数决定外部阻力，控制参数决定闭环行为。
        调试模型时，通常按子系统分组修改，而不是全局同时调整。
      </Callout>
    </section>
  )
}
