import { TeX } from '../TeX'
import { H2, H3, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw
function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

export default function Allocation() {
  return (
    <section>
      <H2 id="allocation">IV. 控制分配</H2>
      <Lead>
        上层控制器生成期望总推力与期望力矩后，控制分配把它们转换为四个旋翼各自的目标推力，再反解成目标转速交给推进器模型执行。
        本章放在推进器与气动力之后，是因为分配矩阵的每一列都直接依赖旋翼安装位置、推力方向和反扭矩方向。
      </Lead>

      <H3 id="alloc-problem">A. 控制分配问题</H3>
      <P>
        控制器最终输出为期望总推力标量和期望三轴力矩：
      </P>
      <TeX block>{r`y_c=\begin{bmatrix}T_c\\\tau_c^b\end{bmatrix}`}</TeX>
      <P>
        其中期望总推力取机体系合推力轴上的标量分量：
      </P>
      <TeX block>{r`T_c=(b_T^b)^TF_c^b`}</TeX>
      <P>
        机体系下的合推力轴为固定方向 <X>{r`b_T^b=-e_z^b`}</X>。控制分配的任务是把 <X>{r`y_c`}</X> 映射到四个旋翼的目标推力向量：
      </P>
      <TeX block>{r`T^\star=\begin{bmatrix}T_1^\star&\cdots&T_{N_r}^\star\end{bmatrix}^T`}</TeX>
      <P>它们之间的静态线性关系为</P>
      <TeX block>{r`y_c=B_TT^\star`}</TeX>
      <P>
        这里 <X>{r`B_T`}</X> 是控制分配矩阵，第 <X>{r`i`}</X> 列由第 <X>{r`i`}</X> 个旋翼的安装位置、推力方向和反扭矩方向确定。
      </P>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`y_c`}</X>, '控制器输出向量，含期望总推力和期望力矩'],
          [<X>{r`T_c`}</X>, '期望总推力标量'],
          [<X>{r`\tau_c^b`}</X>, '机体系下期望力矩'],
          [<X>{r`F_c^b`}</X>, '机体系下期望合力'],
          [<X>{r`T^\star`}</X>, '各旋翼目标推力组成的向量'],
          [<X>{r`B_T`}</X>, '控制分配矩阵'],
        ]}
      />

      <H3 id="alloc-matrix">B. 分配矩阵</H3>
      <P>
        基于静态等效反扭矩比值 <X>{r`\kappa_{Q,i}`}</X>，控制分配矩阵的第 <X>{r`i`}</X> 列为
      </P>
      <TeX block>{r`B_{T,i}=\begin{bmatrix}(b_T^b)^Te_{T,i}^b\\r_i^b\times e_{T,i}^b+\chi_i\kappa_{Q,i}e_{T,i}^b\end{bmatrix}`}</TeX>
      <TeX block>{r`B_T=\begin{bmatrix}B_{T,1}&\cdots&B_{T,N_r}\end{bmatrix}`}</TeX>
      <P>
        对于第 I 章定义的对称 X 构型，四个旋翼具有相同的静态反扭矩比值 <X>{r`\kappa_Q`}</X>，并令 <X>{r`a=l/\sqrt{2}`}</X>，则控制分配矩阵为
      </P>
      <TeX block>{r`B_T=\begin{bmatrix}1&1&1&1\\-a&-a&a&a\\a&-a&-a&a\\-\kappa_Q&\kappa_Q&-\kappa_Q&\kappa_Q\end{bmatrix}`}</TeX>
      <P>其中各行依次对应总推力、滚转力矩、俯仰力矩和偏航力矩。</P>
      <P>
        对于四旋翼，当 <X>{r`B_T`}</X> 为非奇异方阵且不存在执行器约束时，无约束解析解为
      </P>
      <TeX block>{r`T^\star=B_T^{-1}y_c`}</TeX>
      <P>
        对于冗余构型或一般无约束情形，当 <X>{r`B_T`}</X> 满行秩时，可使用加权伪逆：
      </P>
      <TeX block>{r`T_{uc}^\star=W_T^{-1}B_T^T\left(B_TW_T^{-1}B_T^T\right)^{-1}y_c`}</TeX>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`B_{T,i}`}</X>, <>控制分配矩阵第 <X>{r`i`}</X> 列</>],
          [<X>{r`\kappa_Q`}</X>, '对称 X 构型下各旋翼相同的静态反扭矩/推力比值'],
          [<X>{r`T_{uc}^\star`}</X>, '无约束目标推力向量'],
          [<X>{r`W_T`}</X>, '正定的推进单元使用代价权重矩阵'],
        ]}
      />

      <H3 id="alloc-constraints">C. 约束与优化</H3>
      <P>实际推进器存在非负推力、电池电压和最大转速约束。约束分配写为</P>
      <TeX block>{r`T^\star=\underset{T_{min}\le T\le T_{max}}{\operatorname{arg\,min}}\left\|W_y(B_TT-y_c)\right\|_2^2+\lambda\left\|W_T^{1/2}(T-T_{prev}^\star)\right\|_2^2`}</TeX>
      <P>其中，目标推力上限可由当前母线电压下的最大可达转速估计：</P>
      <TeX block>{r`T_{max,i}\approx k_{T,i}(\hat{\rho})\omega_{max}^2(U_b)`}</TeX>
      <P>目标推力边界满足</P>
      <TeX block>{r`0\le T_{min,i}\le T_i^\star\le T_{max,i}`}</TeX>
      <P>
        允许电机停转时取 <X>{r`T_{min,i}=0`}</X>；要求保持怠速时，可取 <X>{r`T_{min,i}=k_{T,i}(\hat{\rho})\omega_{min}^2`}</X>。
        <X>{r`T_{max,i}`}</X> 还应根据电机电流、温度和推进器有效工作范围进一步收紧。
      </P>
      <P>分配后的期望广义力与分配残差为</P>
      <TeX block>{r`y_{alloc}=B_TT^\star`}</TeX>
      <TeX block>{r`e_{alloc}=y_c-y_{alloc}`}</TeX>
      <P>
        当约束导致 <X>{r`e_{alloc}\ne0`}</X> 时，控制器积分项应根据该残差执行抗饱和处理。推进器模型根据
        <X>{r`T_i^\star`}</X> 生成目标转速，并输出实际 <X>{r`T_i`}</X> 和 <X>{r`Q_i`}</X>；因此实际广义力由
        <X>{r`F_{prop}^b`}</X>、<X>{r`M_{prop}^b`}</X> 和 <X>{r`M_{rotor}^b`}</X> 决定，而不是直接令其等于 <X>{r`y_{alloc}`}</X>。
      </P>
      <P>考虑旋翼惯性反作用后，推进系统作用于刚体的实际广义力为</P>
      <TeX block>{r`y_{act}=\begin{bmatrix}(b_T^b)^TF_{prop}^b\\M_{prop}^b+M_{rotor}^b\end{bmatrix}`}</TeX>
      <TeX block>{r`e_{act}=y_c-y_{act}`}</TeX>
      <P>
        <X>{r`e_{alloc}`}</X> 描述控制分配约束造成的静态误差，<X>{r`e_{act}`}</X> 还包含推进器动态、来流变化和旋翼惯性反作用造成的实际跟踪误差。
      </P>

      <Callout title="控制分配与推进器模型的边界">
        控制分配给出的是「目标推力」<X>{r`T_i^\star`}</X>，而推进器模型给出的是「实际推力」<X>{r`T_i`}</X> 和「实际反扭矩」<X>{r`Q_i`}</X>。
        二者之差来自电机/电调动态、母线电压约束、来流变化和旋翼惯性效应。不要把目标值直接当成实际值代入动力学方程。
      </Callout>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`W_y`}</X>, '总推力和三轴力矩的跟踪权重矩阵'],
          [<X>{r`\lambda`}</X>, '目标推力变化惩罚系数'],
          [<X>{r`T_{min},T_{max}`}</X>, '推进单元目标推力下限和上限'],
          [<X>{r`T_{prev}^\star`}</X>, '上一时刻目标推力向量'],
          [<X>{r`y_{alloc},e_{alloc}`}</X>, '分配后的期望广义力和分配残差'],
          [<X>{r`y_{act},e_{act}`}</X>, '推进系统作用于刚体的实际广义力和实际跟踪误差'],
        ]}
      />
    </section>
  )
}
