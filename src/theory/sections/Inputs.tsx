import { TeX } from '../TeX'
import { H2, H3, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw

/** 行内公式简写 */
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

export default function Inputs() {
  return (
    <section>
      <H2 id="inputs">I. 输入变量</H2>
      <Lead>
        四旋翼仿真模型的输入可分为三类：描述系统瞬时运行状况的<strong>状态变量</strong>、
        来自飞控指令与外部环境的<strong>外部输入</strong>，以及刻画机体物理属性的<strong>模型参数</strong>。
        本章逐一给出三类输入的定义，它们共同构成后续动力学与控制方程的全部已知量。
      </Lead>

      <H3 id="inputs-state">A. 状态变量</H3>
      <P>整机刚体状态包含位置、速度、姿态和角速度，定义为</P>
      <TeX block>{r`x_{body}=\begin{bmatrix}(p^n)^T&(v^n)^T&q_{nb}^T&(\omega^b)^T\end{bmatrix}^T`}</TeX>
      <P>其中</P>
      <TeX block>{r`p^n=\begin{bmatrix}x&y&z\end{bmatrix}^T`}</TeX>
      <TeX block>{r`v^n=\begin{bmatrix}v_N&v_E&v_D\end{bmatrix}^T`}</TeX>
      <TeX block>{r`\omega^b=\begin{bmatrix}p&q&r\end{bmatrix}^T`}</TeX>
      <P>加入电池、电调和电机状态后，总状态为</P>
      <TeX block>{r`x=\begin{bmatrix}x_{body}^T&x_{bat}^T&x_{esc,1}^T\cdots x_{esc,N_r}^T&x_{m,1}^T\cdots x_{m,N_r}^T\end{bmatrix}^T`}</TeX>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`x`}</X>, '整机完整状态向量'],
          [<X>{r`x_{body}`}</X>, '整机刚体状态向量'],
          [<X>{r`p^n`}</X>, '地理系下的位置'],
          [<X>{r`v^n`}</X>, '地理系下的速度'],
          [<X>{r`q_{nb}`}</X>, '描述机体系相对地理系姿态的单位四元数'],
          [<X>{r`\omega^b`}</X>, '机体系角速度'],
          [<X>{r`x_{bat}`}</X>, '电池状态'],
          [<X>{r`x_{esc,i}`}</X>, <>第 <X>{r`i`}</X> 个电调/功率电路状态</>],
          [<X>{r`x_{m,i}`}</X>, <>第 <X>{r`i`}</X> 个电机状态</>],
        ]}
      />

      <P>电调和电机状态可分别写为</P>
      <TeX block>{r`x_{esc,i}=\begin{bmatrix}d_{esc,i}&T_{esc,i}\end{bmatrix}^T`}</TeX>
      <TeX block>{r`x_{m,i}=\begin{bmatrix}I_{m,i}&\omega_i\end{bmatrix}^T`}</TeX>

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
      <P>刚体、几何和推进参数决定四旋翼的力与力矩映射。</P>
      <ParamTable
        head={['参数', '含义', '单位']}
        rows={[
          [<X>{r`m,J,g`}</X>, '整机质量、相对质心的转动惯量矩阵和重力加速度', <U items={[r`\mathrm{kg}`, r`\mathrm{kg\,m^2}`, r`\mathrm{m/s^2}`]} />],
          [<X>{r`N_c,m_j,r_j^b,R_j^b,J_j^j`}</X>, '组件数量、质量、相对质心位置、安装姿态和自身惯量', <U items={[r`-`, r`\mathrm{kg}`, r`\mathrm{m}`, r`-`, r`\mathrm{kg\,m^2}`]} />],
          [<X>{r`N_r,l,r_i^b,e_{T,i}^b`}</X>, '旋翼数量、质心到旋翼中心的机臂长度、安装位置和推力方向', <U items={[r`-`, r`\mathrm{m}`, r`\mathrm{m}`, r`-`]} />],
          [<X>{r`s_i,\chi_i`}</X>, '旋翼角动量方向符号和机体反扭矩方向符号', <U items={[r`-`]} />],
          [<X>{r`k_{T,i,ref},k_{Q,i,ref},\kappa_{Q,i}`}</X>, '参考空气密度下的静态推力系数、静态反扭矩系数及其比值', <U items={[r`\mathrm{N/(rad/s)^2}`, r`\mathrm{N\,m/(rad/s)^2}`, r`\mathrm{m}`]} />],
          [<X>{r`J_{rot,i},D_i,C_T(J_i),C_Q(J_i)`}</X>, '旋翼等效转动惯量、直径及来流相关气动系数', <U items={[r`\mathrm{kg\,m^2}`, r`\mathrm{m}`, r`-`, r`-`]} />],
        ]}
      />

      <P>
        基准四旋翼采用对称 X 构型。令 <X>{r`l`}</X> 表示质心到旋翼中心的距离，并定义
      </P>
      <TeX block>{r`a=\frac{l}{\sqrt{2}}`}</TeX>
      <P>旋翼按前右、后右、后左、前左的顺序编号，其安装位置为</P>
      <TeX block>{r`\begin{aligned}r_1^b&=[a,a,0]^T,&r_2^b&=[-a,a,0]^T,\\r_3^b&=[-a,-a,0]^T,&r_4^b&=[a,-a,0]^T\end{aligned}`}</TeX>
      <P>
        对于推力方向均为 <X>{r`-z_b`}</X> 的基准构型，取
      </P>
      <TeX block>{r`e_{T,i}^b=[0,0,-1]^T,\qquad s=\chi=[1,-1,1,-1]^T`}</TeX>
      <P>即对角位置的旋翼同向旋转，相邻旋翼反向旋转。</P>

      <P>电气、气动和控制参数决定推进动态、能量消耗与闭环响应。</P>
      <ParamTable
        head={['参数组', '主要参数', '典型单位']}
        rows={[
          ['电池', <X>{r`N_s,Q_{nom},R_{int},R_{dyn},\tau_{bat},C_{bat},R_{th,bat},k_{T,bat},SOC_{min},SOC_{max},U_{min},U_{max},I_{bat,max}`}</X>, <U items={[r`-`, r`\mathrm{Ah}`, r`\Omega`, r`\mathrm{s}`, r`\mathrm{J/K}`, r`\mathrm{K/W}`, r`\mathrm{V/K}`, r`\mathrm{V}`, r`\mathrm{A}`]} />],
          ['电调与电机', <X>{r`\tau_{esc},R_{wire,i},R_{esc,i},L_m,R_m,K_e,K_t,b_m`}</X>, <U items={[r`\mathrm{s}`, r`\Omega`, r`\mathrm{H}`, r`\mathrm{V\,s/rad}`, r`\mathrm{N\,m/A}`, r`\mathrm{N\,m\,s/rad}`]} />],
          ['环境与机体气动', <X>{r`T_0,p_0,L_{atm},R_a,\rho_{ref},D_{v,ref},D_{\omega,ref},C_{Dx},C_{Dy},C_{Dz},A_x,A_y,A_z,r_d^b`}</X>, <U items={[r`\mathrm{K}`, r`\mathrm{Pa}`, r`\mathrm{K/m}`, r`\mathrm{J/(kg\,K)}`, r`\mathrm{kg/m^3}`, r`\mathrm{N/(m/s)^2}`, r`\mathrm{N\,m/(rad/s)^2}`, r`-`, r`\mathrm{m^2}`, r`\mathrm{m}`]} />],
          ['控制与分配', <X>{r`K_p^p,K_i^p,K_p^v,K_i^v,K_d^v,K_R,K_p^\omega,K_i^\omega,K_d^\omega,W_y,W_T,\lambda`}</X>, '由对应误差、控制输出和代价函数量纲确定'],
          ['数值与约束', <X>{r`T_s,\epsilon_F,\epsilon_R,\epsilon_U,\epsilon_V,\epsilon_n,\epsilon_\omega,J_{min},J_{max},T_{min},T_{max}`}</X>, '与对应状态、输入和约束变量一致'],
        ]}
      />

      <Callout>
        旋翼编号 1–4 依次对应前右、后右、后左、前左；符号约定
        <X>{r`s=\chi=[1,-1,1,-1]^T`}</X> 表示对角旋翼同向、相邻旋翼反向旋转。该编号与方向贯穿后续控制分配矩阵的推导，请以此处为准。
      </Callout>
    </section>
  )
}
