import { TeX } from '../TeX'
import { H2, H3, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw
function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

export default function Kinematics() {
  return (
    <section>
      <H2 id="kinematics">II. 刚体运动学与基础概念</H2>
      <Lead>
        本章建立描述刚体运动所需的基本工具：状态变量、姿态表示（欧拉角与四元数）、刚体运动学，以及质量与惯量的合成。
        力和力矩的具体来源先不展开，只在动力学方程中保留它们的占位；这些项将在第 III 章由推进器与气动力模型给出。
      </Lead>

      <H3 id="kin-state">A. 状态变量</H3>
      <P>
        描述整机刚体瞬时运动状况所需的最小状态包括位置、速度、姿态和角速度。把它们合并为一个状态向量：
      </P>
      <TeX block>{r`x_{body}=\begin{bmatrix}(p^n)^T&(v^n)^T&q_{nb}^T&(\omega^b)^T\end{bmatrix}^T`}</TeX>
      <P>其中四个子量分别为：</P>
      <TeX block>{r`p^n=\begin{bmatrix}x&y&z\end{bmatrix}^T`}</TeX>
      <TeX block>{r`v^n=\begin{bmatrix}v_N&v_E&v_D\end{bmatrix}^T`}</TeX>
      <TeX block>{r`\omega^b=\begin{bmatrix}p&q&r\end{bmatrix}^T`}</TeX>
      <P>
        <X>{r`p^n`}</X> 是地理系下的位置，<X>{r`v^n`}</X> 是地理系下的速度（NED 分量），
        <X>{r`q_{nb}`}</X> 是描述机体系相对地理系姿态的单位四元数，
        <X>{r`\omega^b`}</X> 是机体系角速度（注意 <X>{r`p,q,r`}</X> 在这里是角速度分量，不是位置）。
        电池、电调和电机的内部状态不属于刚体运动状态，将在第 III 章推进器模型中单独引入。
      </P>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`x_{body}`}</X>, '整机刚体状态向量'],
          [<X>{r`p^n`}</X>, '地理系下的位置'],
          [<X>{r`v^n`}</X>, '地理系下的速度'],
          [<X>{r`q_{nb}`}</X>, '描述机体系相对地理系姿态的单位四元数'],
          [<X>{r`\omega^b`}</X>, '机体系角速度'],
        ]}
      />

      <H3 id="kin-euler">B. 欧拉角与旋转矩阵</H3>
      <P>
        欧拉角可以直观描述四旋翼姿态。定义
      </P>
      <TeX block>{r`\Theta=\begin{bmatrix}\phi&\theta&\psi\end{bmatrix}^T`}</TeX>
      <P>
        其中 <X>{r`\phi`}</X>、<X>{r`\theta`}</X>、<X>{r`\psi`}</X> 分别为滚转角、俯仰角和偏航角；
        各转角正方向遵循右手定则。在本文采用的 NED 与机体系约定下，正滚转对应右侧机臂下沉，正俯仰对应机头上仰，正偏航对应机头向右转动。
      </P>
      <P>欧拉角运动学可写为</P>
      <TeX block>{r`\dot{\Theta}=W(\phi,\theta)\omega^b`}</TeX>
      <TeX block>{r`W(\phi,\theta)=\begin{bmatrix}1&\sin\phi\tan\theta&\cos\phi\tan\theta\\0&\cos\phi&-\sin\phi\\0&\frac{\sin\phi}{\cos\theta}&\frac{\cos\phi}{\cos\theta}\end{bmatrix}`}</TeX>
      <P>
        姿态采用 ZYX 偏航-俯仰-滚转欧拉角约定，并定义 <X>{r`R_b^n`}</X> 将机体系向量转换到地理系：
      </P>
      <TeX block>{r`a^n=R_b^na^b`}</TeX>
      <P>因此</P>
      <TeX block>{r`R_b^n(\phi,\theta,\psi)=R_z(\psi)R_y(\theta)R_x(\phi)`}</TeX>
      <TeX block>{r`R_b^n=\begin{bmatrix}c_\theta c_\psi&s_\phi s_\theta c_\psi-c_\phi s_\psi&c_\phi s_\theta c_\psi+s_\phi s_\psi\\c_\theta s_\psi&s_\phi s_\theta s_\psi+c_\phi c_\psi&c_\phi s_\theta s_\psi-s_\phi c_\psi\\-s_\theta&s_\phi c_\theta&c_\phi c_\theta\end{bmatrix}`}</TeX>
      <P>
        其中 <X>{r`c_{(\cdot)}=\cos(\cdot)`}</X>，<X>{r`s_{(\cdot)}=\sin(\cdot)`}</X>。旋转矩阵满足正交约束：
      </P>
      <TeX block>{r`(R_b^n)^TR_b^n=I,\qquad \det(R_b^n)=1,\qquad R_n^b=(R_b^n)^T`}</TeX>

      <Callout title="欧拉角的局限">
        欧拉角在 <X>{r`\cos\theta=0`}</X> 附近存在奇异性。因此刚体运动学和姿态控制使用旋转矩阵，姿态状态则使用四元数；欧拉角只作为人类可读的辅助表示。
      </Callout>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`\Theta`}</X>, '滚转、俯仰、偏航角组成的欧拉角向量'],
          [<X>{r`\phi,\theta,\psi`}</X>, '滚转角、俯仰角、偏航角'],
          [<X>{r`W(\phi,\theta)`}</X>, '欧拉角运动学矩阵'],
          [<X>{r`R_b^n`}</X>, '从机体系到地理系的旋转矩阵'],
          [<X>{r`R_x,R_y,R_z`}</X>, '绕相应坐标轴的基本旋转矩阵'],
        ]}
      />

      <H3 id="kin-quaternion">C. 四元数与姿态运动学</H3>
      <P>
        为避免欧拉角奇异性，姿态状态采用标量部在前的 Hamilton 四元数：
      </P>
      <TeX block>{r`q_{nb}=\begin{bmatrix}q_0&q_v^T\end{bmatrix}^T,\qquad q_v=\begin{bmatrix}q_1&q_2&q_3\end{bmatrix}^T`}</TeX>
      <P>
        该四元数与 <X>{r`R_b^n`}</X> 表示相同的机体系到地理系旋转，二者的关系为
      </P>
      <TeX block>{r`R_b^n=R(q_{nb})=(q_0^2-q_v^Tq_v)I+2q_vq_v^T+2q_0[q_v]_\times`}</TeX>
      <P>
        在机体系角速度 <X>{r`\omega^b`}</X> 驱动下，旋转矩阵形式的运动学为
      </P>
      <TeX block>{r`\dot{R}_b^n=R_b^n[\omega^b]_\times`}</TeX>
      <P>
        四元数形式的运动学为
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
          [<X>{r`q_{nb}`}</X>, <>与 <X>{r`R_b^n`}</X> 对应的单位四元数，标量部在前</>],
          [<X>{r`q_0,q_v`}</X>, '四元数标量部和向量部'],
          [<X>{r`[\cdot]_\times`}</X>, '向量对应的反对称矩阵'],
        ]}
      />

      <H3 id="kin-rigid">D. 刚体运动学与动力学</H3>
      <P>
        刚体运动学把状态变量随时间的变化率与速度和角速度联系起来。位置运动学很简单：位置的变化率就是速度；姿态运动学上一节已经给出：
      </P>
      <TeX block>{r`\dot{p}^n=v^n`}</TeX>
      <TeX block>{r`\dot{R}_b^n=R_b^n[\omega^b]_\times`}</TeX>
      <P>
        接下来需要回答：速度 <X>{r`v^n`}</X> 和角速度 <X>{r`\omega^b`}</X> 又是如何变化的？这就是刚体动力学。
        四旋翼受到推进系统力、气动力、外部扰动力和重力作用，平动动力学方程为
      </P>
      <TeX block>{r`m\dot{v}^n=R_b^n\left(F_{prop}^b+F_{aero,total}^b+F_{dist}^b\right)+mg^n`}</TeX>
      <P>
        其中 NED 坐标系下的重力加速度向量为
      </P>
      <TeX block>{r`g^n=\begin{bmatrix}0&0&g\end{bmatrix}^T`}</TeX>
      <P>
        这里 <X>{r`F_{prop}^b`}</X> 是推进系统总力，<X>{r`F_{aero,total}^b`}</X> 是机体总气动力，<X>{r`F_{dist}^b`}</X> 是外部扰动力，<X>{r`g`}</X> 是重力加速度大小。
        这些力的具体表达式将在第 III 章给出。
      </P>
      <P>
        绕质心的转动动力学方程为
      </P>
      <TeX block>{r`J\dot{\omega}^b+\omega^b\times J\omega^b=M_{prop}^b+M_{rotor}^b+M_{aero,total}^b+M_{dist}^b`}</TeX>
      <P>
        左边第一项是转动惯量矩阵 <X>{r`J`}</X> 与角加速度的乘积，第二项是陀螺耦合项；
        右边依次是推进系统产生的力矩、旋翼角动量变化带来的惯性反作用力矩、总气动力矩和外部扰动力矩。
        同样，右边各项的具体计算推迟到第 III 章。
      </P>
      <P>将运动学与动力学合并，四旋翼飞行控制刚体模型可写为</P>
      <TeX block>{r`\begin{cases}\dot{p}^n&=v^n\\m\dot{v}^n&=R_b^n\left(F_{prop}^b+F_{aero,total}^b+F_{dist}^b\right)+mg^n\\\dot{R}_b^n&=R_b^n[\omega^b]_\times\\J\dot{\omega}^b&=-\omega^b\times J\omega^b+M_{prop}^b+M_{rotor}^b+M_{aero,total}^b+M_{dist}^b\end{cases}`}</TeX>
      <P>
        若用四元数表示姿态，则以第 C 节四元数运动学替换 <X>{r`\dot{R}_b^n`}</X> 的旋转矩阵积分，并由 <X>{r`R_b^n=R(q_{nb})`}</X> 参与其余方程计算。
      </P>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`m`}</X>, '整机质量'],
          [<X>{r`g^n`}</X>, 'NED 坐标系下的重力加速度向量'],
          [<X>{r`F_{prop}^b`}</X>, '推进系统作用于整机的实际总力'],
          [<X>{r`F_{aero,total}^b`}</X>, '机体系下机体总气动力'],
          [<X>{r`F_{dist}^b`}</X>, '机体系下外部扰动力'],
          [<X>{r`J`}</X>, '整机相对质心的转动惯量矩阵'],
          [<X>{r`M_{prop}^b`}</X>, '推进系统实际推力和空气反扭矩产生的总力矩'],
          [<X>{r`M_{rotor}^b`}</X>, '旋翼进动与加减速产生的总惯性反作用力矩'],
          [<X>{r`M_{aero,total}^b`}</X>, '机体系下总气动力矩'],
          [<X>{r`M_{dist}^b`}</X>, '机体系下外部扰动力矩'],
        ]}
      />

      <H3 id="kin-inertia">E. 质量、质心与转动惯量</H3>
      <P>
        整机质量是各组件质量之和：
      </P>
      <TeX block>{r`m=\sum_{j=1}^{N_c}m_j`}</TeX>
      <P>
        机体坐标系 <X>{r`b`}</X> 的原点固定在整机质心，因此在机体系下质心位置为零：
      </P>
      <TeX block>{r`r_{cg}^b=\begin{bmatrix}0&0&0\end{bmatrix}^T`}</TeX>
      <P>
        第 <X>{r`j`}</X> 个组件相对质心的位置记为 <X>{r`r_j^b`}</X>，它既用于力臂计算，也参与惯量合成。
        整机相对质心的转动惯量矩阵由各组件自身惯量平行轴合成：
      </P>
      <TeX block>{r`J=\sum_{j=1}^{N_c}\left[R_j^bJ_j^j(R_j^b)^T+m_j\left(\|r_j^b\|^2I-r_j^b(r_j^b)^T\right)\right]`}</TeX>
      <P>
        式中 <X>{r`R_j^b`}</X> 是第 <X>{r`j`}</X> 个组件坐标系到机体系的旋转矩阵，<X>{r`J_j^j`}</X> 是该组件在自身坐标系下的惯量矩阵，<X>{r`I`}</X> 为三阶单位矩阵。
      </P>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`N_c`}</X>, '组件数量'],
          [<X>{r`m_j`}</X>, <>第 <X>{r`j`}</X> 个组件质量</>],
          [<X>{r`r_{cg}^b`}</X>, '整机质心在机体系下的位置，因机体系原点取在质心，为零'],
          [<X>{r`r_j^b`}</X>, <>第 <X>{r`j`}</X> 个组件相对质心的位置，在机体系下表达</>],
          [<X>{r`J`}</X>, '整机相对质心的转动惯量矩阵'],
          [<X>{r`R_j^b`}</X>, <>第 <X>{r`j`}</X> 个组件坐标系到机体系的旋转矩阵</>],
          [<X>{r`J_j^j`}</X>, <>第 <X>{r`j`}</X> 个组件在自身坐标系下的惯量矩阵</>],
          [<X>{r`I`}</X>, '三阶单位矩阵'],
        ]}
      />
    </section>
  )
}
