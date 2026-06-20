import { TeX } from '../TeX'
import { H2, H3, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw
function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

export default function Concepts() {
  return (
    <section>
      <H2 id="concepts">IV. 基本概念</H2>
      <Lead>
        本章建立后续动力学方程所依赖的基础工具：用欧拉角与四元数描述姿态，用质量、质心与转动惯量刻画刚体，
        用推力系数、反扭矩系数和旋翼陀螺力矩把单个旋翼的旋转映射为作用在机体上的力与力矩。
      </Lead>

      <H3 id="concepts-euler">A. 欧拉角</H3>
      <P>欧拉角可用于直观描述四旋翼姿态，定义为</P>
      <TeX block>{r`\Theta=\begin{bmatrix}\phi&\theta&\psi\end{bmatrix}^T`}</TeX>
      <P>
        其中 <X>{r`\phi,\theta,\psi`}</X> 分别为滚转角、俯仰角和偏航角。欧拉角运动学可写为
      </P>
      <P>
        各转角正方向遵循右手定则。在本文采用的 NED 与机体系约定下，正滚转对应右侧机臂下沉，正俯仰对应机头上仰，正偏航对应机头向右转动。
      </P>
      <TeX block>{r`\dot{\Theta}=W(\phi,\theta)\omega^b`}</TeX>
      <TeX block>{r`W(\phi,\theta)=\begin{bmatrix}1&\sin\phi\tan\theta&\cos\phi\tan\theta\\0&\cos\phi&-\sin\phi\\0&\frac{\sin\phi}{\cos\theta}&\frac{\cos\phi}{\cos\theta}\end{bmatrix}`}</TeX>

      <H3 id="concepts-quaternion">B. 旋转矩阵与四元数</H3>
      <P>
        姿态采用 ZYX 偏航-俯仰-滚转欧拉角约定，并定义 <X>{r`R_b^n`}</X> 将机体系向量转换到地理系：
      </P>
      <TeX block>{r`a^n=R_b^na^b`}</TeX>
      <P>因此</P>
      <TeX block>{r`R_b^n(\phi,\theta,\psi)=R_z(\psi)R_y(\theta)R_x(\phi)`}</TeX>
      <TeX block>{r`R_b^n=\begin{bmatrix}c_\theta c_\psi&s_\phi s_\theta c_\psi-c_\phi s_\psi&c_\phi s_\theta c_\psi+s_\phi s_\psi\\c_\theta s_\psi&s_\phi s_\theta s_\psi+c_\phi c_\psi&c_\phi s_\theta s_\psi-s_\phi c_\psi\\-s_\theta&s_\phi c_\theta&c_\phi c_\theta\end{bmatrix}`}</TeX>
      <P>
        其中 <X>{r`c_{(\cdot)}=\cos(\cdot)`}</X>，<X>{r`s_{(\cdot)}=\sin(\cdot)`}</X>。旋转矩阵满足
      </P>
      <TeX block>{r`(R_b^n)^TR_b^n=I,\qquad \det(R_b^n)=1,\qquad R_n^b=(R_b^n)^T`}</TeX>
      <P>
        欧拉角在 <X>{r`\cos\theta=0`}</X> 附近存在奇异性。因此，刚体运动学和姿态控制使用旋转矩阵，姿态状态使用标量部在前的 Hamilton 四元数
      </P>
      <TeX block>{r`q_{nb}=\begin{bmatrix}q_0&q_v^T\end{bmatrix}^T,\qquad q_v=\begin{bmatrix}q_1&q_2&q_3\end{bmatrix}^T`}</TeX>
      <P>
        该四元数与 <X>{r`R_b^n`}</X> 表示相同的机体系到地理系旋转，并满足
      </P>
      <TeX block>{r`R_b^n=R(q_{nb})=(q_0^2-q_v^Tq_v)I+2q_vq_v^T+2q_0[q_v]_\times`}</TeX>
      <P>
        在机体系角速度 <X>{r`\omega^b`}</X> 驱动下，姿态运动学为
      </P>
      <TeX block>{r`\dot{R}_b^n=R_b^n[\omega^b]_\times`}</TeX>
      <P>
        对于任意向量 <X>{r`a=[a_1,a_2,a_3]^T`}</X>，反对称矩阵定义为
      </P>
      <TeX block>{r`[a]_\times=\begin{bmatrix}0&-a_3&a_2\\a_3&0&-a_1\\-a_2&a_1&0\end{bmatrix}`}</TeX>
      <P>
        并满足 <X>{r`[a]_\times b=a\times b`}</X>。
      </P>
      <TeX block>{r`\dot{q}_0=-\frac{1}{2}q_v^T\omega^b`}</TeX>
      <TeX block>{r`\dot{q}_v=\frac{1}{2}\left(q_0I+[q_v]_\times\right)\omega^b`}</TeX>
      <P>离散更新后对四元数进行单位化：</P>
      <TeX block>{r`q_{nb}\leftarrow\frac{q_{nb}}{\|q_{nb}\|}`}</TeX>
      <P>
        <X>{r`q_{nb}`}</X> 与 <X>{r`-q_{nb}`}</X> 表示同一姿态。进行姿态误差或插值计算时，应选取与上一时刻内积非负的四元数符号，以保持表示连续。
      </P>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`R_b^n`}</X>, '从机体系到地理系的旋转矩阵'],
          [<X>{r`R_x,R_y,R_z`}</X>, '绕相应坐标轴的基本旋转矩阵'],
          [<X>{r`q_{nb}`}</X>, <>与 <X>{r`R_b^n`}</X> 对应的单位四元数，标量部在前</>],
          [<X>{r`q_0,q_v`}</X>, '四元数标量部和向量部'],
          [<X>{r`[\cdot]_\times`}</X>, '向量对应的反对称矩阵'],
        ]}
      />

      <H3 id="concepts-inertia">C. 质量、质心与转动惯量</H3>
      <TeX block>{r`m=\sum_{j=1}^{N_c}m_j`}</TeX>
      <P>
        机体坐标系 <X>{r`b`}</X> 的原点固定在整机质心。因此在机体系下：
      </P>
      <TeX block>{r`r_{cg}^b=\begin{bmatrix}0&0&0\end{bmatrix}^T`}</TeX>
      <P>组件相对质心的位置：</P>
      <TeX block>{r`r_j^b`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`r_{cg}^b`}</X>, '整机质心在机体系下的位置，因机体系原点取在质心，为零'],
          [<X>{r`r_j^b`}</X>, <>第 <X>{r`j`}</X> 个组件相对质心的位置，在机体系下表达，用于力臂和惯量计算</>],
        ]}
      />
      <TeX block>{r`J=\sum_{j=1}^{N_c}\left[R_j^bJ_j^j(R_j^b)^T+m_j\left(\|r_j^b\|^2I-r_j^b(r_j^b)^T\right)\right]`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`J`}</X>, '整机相对质心的转动惯量矩阵'],
          [<X>{r`R_j^b`}</X>, <>第 <X>{r`j`}</X> 个组件坐标系到机体系的旋转矩阵</>],
          [<X>{r`J_j^j`}</X>, <>第 <X>{r`j`}</X> 个组件在自身坐标系下的惯量矩阵</>],
          [<X>{r`I`}</X>, '三阶单位矩阵'],
        ]}
      />

      <H3 id="concepts-thrust">D. 推力系数</H3>
      <P>
        第 <X>{r`i`}</X> 个旋翼推力为
      </P>
      <TeX block>{r`T_{s,i}=k_{T,i}(\rho)\omega_i^2`}</TeX>
      <P>当前空气密度下的等效系数为</P>
      <TeX block>{r`k_{T,i}(\rho)=\frac{\rho}{\rho_{ref}}k_{T,i,ref}`}</TeX>
      <P>
        对于给定空气密度 <X>{r`\rho_{ref}`}</X> 和推进比 <X>{r`J_{ref}`}</X>，参考系数与螺旋桨气动系数的关系为
      </P>
      <TeX block>{r`k_{T,i,ref}=\frac{C_T(J_{ref})\rho_{ref}D_i^4}{(2\pi)^2}`}</TeX>
      <P>
        控制分配得到目标推力 <X>{r`T_i^\star`}</X> 后，目标转速由静态模型反解：
      </P>
      <TeX block>{r`\omega_{cmd,i}=\sqrt{\frac{T_i^\star}{k_{T,i}(\hat{\rho})}},\qquad T_i^\star\ge 0`}</TeX>
      <P>
        实际推力 <X>{r`T_i`}</X> 由推进器模型根据实际转速、空气密度和轴向来流计算。单个螺旋桨的实际推力向量及其相对质心产生的力矩为
      </P>
      <TeX block>{r`F_i^b=T_ie_{T,i}^b`}</TeX>
      <TeX block>{r`M_{T,i}^b=r_i^b\times F_i^b`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`T_{s,i}`}</X>, '静态等效推力'],
          [<X>{r`T_i^\star`}</X>, '控制分配得到的目标推力'],
          [<X>{r`T_i`}</X>, '推进器模型得到的实际推力'],
          [<X>{r`k_{T,i,ref},k_{T,i}(\rho)`}</X>, '参考密度和当前密度下的静态等效推力系数'],
          [<X>{r`\omega_i,\omega_{cmd,i}`}</X>, '实际转速和目标转速'],
          [<X>{r`J_{ref},\rho_{ref}`}</X>, '静态系数对应的参考推进比和参考空气密度'],
          [<X>{r`F_i^b,M_{T,i}^b`}</X>, '实际推力向量和推力力矩'],
        ]}
      />

      <H3 id="concepts-torque">E. 反扭矩系数</H3>
      <P>螺旋桨气动阻力在机体上产生反扭矩。控制分配采用</P>
      <TeX block>{r`Q_{s,i}=k_{Q,i}(\rho)\omega_i^2=\kappa_{Q,i}T_{s,i}`}</TeX>
      <TeX block>{r`k_{Q,i}(\rho)=\frac{\rho}{\rho_{ref}}k_{Q,i,ref}`}</TeX>
      <TeX block>{r`\kappa_{Q,i}=\frac{k_{Q,i,ref}}{k_{T,i,ref}}`}</TeX>
      <P>其中，在参考空气密度和参考推进比下，</P>
      <TeX block>{r`k_{Q,i,ref}=\frac{C_Q(J_{ref})\rho_{ref}D_i^5}{(2\pi)^2}`}</TeX>
      <P>空气对旋翼产生的气动阻力矩与旋翼角动量方向相反，因此作用于整机的实际气动反扭矩为</P>
      <TeX block>{r`M_{Q,i}^b=-Q_ie_{\Omega,i}^b=\chi_iQ_ie_{T,i}^b`}</TeX>
      <P>
        <X>{r`\chi_i\in\{+1,-1\}`}</X> 表示气动反扭矩相对推力方向的符号，并满足
      </P>
      <TeX block>{r`\chi_ie_{T,i}^b=-e_{\Omega,i}^b`}</TeX>
      <P>
        当 <X>{r`e_{T,i}^b=-e_z^b`}</X> 且 <X>{r`e_{\Omega,i}^b=s_ie_z^b`}</X> 时，有 <X>{r`\chi_i=s_i`}</X>。
      </P>
      <P>推进系统作用于整机的实际总力和总力矩为</P>
      <TeX block>{r`F_{prop}^b=\sum_{i=1}^{N_r}F_i^b`}</TeX>
      <TeX block>{r`M_{prop}^b=\sum_{i=1}^{N_r}\left(M_{T,i}^b+M_{Q,i}^b\right)`}</TeX>
      <P>静态系数用于控制分配，来流相关系数用于计算实际输出。</P>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`Q_{s,i}`}</X>, '静态等效反扭矩幅值'],
          [<X>{r`Q_i`}</X>, '推进器模型得到的实际反扭矩幅值'],
          [<X>{r`k_{Q,i,ref},k_{Q,i}(\rho)`}</X>, '参考密度和当前密度下的静态等效反扭矩系数'],
          [<X>{r`\kappa_{Q,i}`}</X>, '静态反扭矩与静态推力的比值'],
          [<X>{r`\chi_i`}</X>, '机体反扭矩方向符号'],
          [<X>{r`e_{\Omega,i}^b`}</X>, <>第 <X>{r`i`}</X> 个旋翼角动量方向单位向量</>],
          [<X>{r`M_{Q,i}^b`}</X>, '机体受到的实际反扭矩向量'],
          [<X>{r`F_{prop}^b,M_{prop}^b`}</X>, '推进系统作用于整机的实际总力和总力矩'],
        ]}
      />

      <H3 id="concepts-gyro">F. 旋翼陀螺力矩</H3>
      <P>
        旋翼与螺旋桨高速旋转时具有自旋角动量。令 <X>{r`\omega_i\ge0`}</X> 表示第 <X>{r`i`}</X> 个旋翼的转速幅值，
        <X>{r`s_i\in\{+1,-1\}`}</X> 表示其角动量相对机体系 <X>{r`z_b`}</X> 轴的方向。
      </P>
      <TeX block>{r`e_{\Omega,i}^b=s_ie_z^b`}</TeX>
      <TeX block>{r`H_r^b=\sum_{i=1}^{N_r}J_{rot,i}\omega_i e_{\Omega,i}^b`}</TeX>
      <P>对于固定安装的旋翼，旋翼角动量在机体系下的变化率为</P>
      <TeX block>{r`\left.\dot{H}_r^b\right|_b=\sum_{i=1}^{N_r}J_{rot,i}\dot{\omega}_i e_{\Omega,i}^b`}</TeX>
      <P>根据整机角动量守恒，旋翼角动量变化对机体产生的反作用力矩包括进动反作用力矩和旋翼加减速反作用力矩：</P>
      <TeX block>{r`M_{gyro}^b=-\omega^b\times H_r^b`}</TeX>
      <TeX block>{r`M_{acc}^b=-\left.\dot{H}_r^b\right|_b`}</TeX>
      <TeX block>{r`M_{rotor}^b=M_{gyro}^b+M_{acc}^b`}</TeX>
      <P>
        当所有旋翼轴均与 <X>{r`z_b`}</X> 轴平行时，
      </P>
      <TeX block>{r`H_r^b=\begin{bmatrix}0\\0\\H_z\end{bmatrix},\qquad H_z=\sum_{i=1}^{N_r}s_iJ_{rot,i}\omega_i`}</TeX>
      <P>因此</P>
      <TeX block>{r`M_{gyro}^b=\begin{bmatrix}-qH_z\\pH_z\\0\end{bmatrix}`}</TeX>
      <TeX block>{r`M_{acc}^b=\begin{bmatrix}0\\0\\-\dot{H}_z\end{bmatrix}`}</TeX>
      <P>
        反向旋转旋翼的角动量在稳态下通常近似抵消，使 <X>{r`H_z`}</X> 和进动反作用力矩较小；差动加减速时，<X>{r`M_{acc}^b`}</X> 仍可作用于偏航通道。
        <X>{r`M_{Q,i}^b`}</X> 表示空气对螺旋桨产生的外部反扭矩，<X>{r`M_{acc}^b`}</X> 表示旋翼角动量变化产生的惯性反作用。
      </P>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`s_i,e_{\Omega,i}^b`}</X>, <>第 <X>{r`i`}</X> 个旋翼角动量方向符号和单位向量</>],
          [<X>{r`H_r^b,H_z`}</X>, <>机体系下旋翼总角动量及其 <X>{r`z_b`}</X> 分量</>],
          [<X>{r`M_{gyro}^b`}</X>, '旋翼进动对机体产生的反作用力矩'],
          [<X>{r`M_{acc}^b`}</X>, '旋翼加减速对机体产生的反作用力矩'],
          [<X>{r`M_{rotor}^b`}</X>, '旋翼角动量变化对机体产生的总反作用力矩'],
        ]}
      />

      <Callout title="力矩来源辨析">
        机体偏航通道上有两类不同来源的力矩：<X>{r`M_{Q,i}^b`}</X> 来自空气对螺旋桨的外部气动反扭矩，
        <X>{r`M_{acc}^b`}</X> 来自旋翼自身角动量变化的惯性反作用。二者物理机制不同，建模时分别计入，不可混为一谈。
      </Callout>
    </section>
  )
}
