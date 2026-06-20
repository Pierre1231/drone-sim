import { TeX } from '../TeX'
import { H2, H3, H4, H5, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw
function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

export default function ControlModel() {
  return (
    <section>
      <H2 id="control">V. 四旋翼控制模型</H2>
      <Lead>
        本章把第 IV 章建立的力与力矩模型组合成完整的刚体动力学，并在其上叠加串级控制器、控制分配与推进器动态，
        形成「期望轨迹 → 期望合力与力矩 → 各旋翼目标推力 → 电池/电调/电机/螺旋桨 → 实际力与力矩」的闭环求解链路。
      </Lead>

      <H3 id="control-kinematics">A. 刚体运动学模型</H3>
      <P>
        以质心位置 <X>{r`p^n`}</X> 和姿态旋转矩阵 <X>{r`R_b^n`}</X> 描述四旋翼刚体运动，运动学方程为
      </P>
      <TeX block>{r`\dot{p}^n=v^n`}</TeX>
      <TeX block>{r`\dot{R}_b^n=R_b^n[\omega^b]_\times`}</TeX>

      <H3 id="control-position">B. 位置动力学模型</H3>
      <P>四旋翼受到推进系统力、气动力、外部扰动力和重力作用，平动动力学方程为</P>
      <TeX block>{r`m\dot{v}^n=R_b^n\left(F_{prop}^b+F_{aero,total}^b+F_{dist}^b\right)+mg^n`}</TeX>
      <P>NED 坐标系下的重力加速度向量为</P>
      <TeX block>{r`g^n=\begin{bmatrix}0&0&g\end{bmatrix}^T`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`\dot{v}^n`}</X>, '地理系下速度变化率'],
          [<X>{r`F_{prop}^b`}</X>, '推进系统作用于整机的实际总力'],
          [<X>{r`F_{aero,total}^b`}</X>, '机体系下机体总气动力'],
          [<X>{r`F_{dist}^b`}</X>, '机体系下外部扰动力'],
          [<X>{r`g^n`}</X>, 'NED 坐标系下的重力加速度向量'],
        ]}
      />

      <H3 id="control-attitude">C. 姿态动力学模型</H3>
      <P>
        整机转动惯量矩阵 <X>{r`J`}</X> 包含各组件随刚体共同转动产生的惯量；旋翼绕自身轴高速旋转产生的附加角动量通过
        <X>{r`M_{rotor}^b`}</X> 单独计入。绕质心的转动动力学方程为
      </P>
      <TeX block>{r`J\dot{\omega}^b+\omega^b\times J\omega^b=M_{prop}^b+M_{rotor}^b+M_{aero,total}^b+M_{dist}^b`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`\dot{\omega}^b`}</X>, '机体系下角速度变化率'],
          [<X>{r`M_{prop}^b`}</X>, '推进系统实际推力和空气反扭矩产生的总力矩'],
          [<X>{r`M_{rotor}^b`}</X>, '旋翼进动与加减速产生的总惯性反作用力矩'],
          [<X>{r`M_{aero,total}^b`}</X>, '机体系下总气动力矩'],
          [<X>{r`M_{dist}^b`}</X>, '机体系下外部扰动力矩'],
        ]}
      />

      <H3 id="control-rigidbody">D. 四旋翼飞行控制刚体模型</H3>
      <P>由刚体运动学模型、位置动力学模型和姿态动力学模型组合，四旋翼飞行控制刚体模型写为</P>
      <TeX block>{r`\begin{cases}\dot{p}^n&=v^n\\m\dot{v}^n&=R_b^n\left(F_{prop}^b+F_{aero,total}^b+F_{dist}^b\right)+mg^n\\\dot{R}_b^n&=R_b^n[\omega^b]_\times\\J\dot{\omega}^b&=-\omega^b\times J\omega^b+M_{prop}^b+M_{rotor}^b+M_{aero,total}^b+M_{dist}^b\end{cases}`}</TeX>
      <P>
        姿态状态采用四元数时，以第 IV-B 节四元数运动学替换旋转矩阵积分，并由 <X>{r`R_b^n=R(q_{nb})`}</X> 参与其余方程计算。
        控制器在该刚体模型基础上生成期望合力和期望力矩。
      </P>

      <P>位置环和速度环由期望位置、速度和加速度生成地理系下的期望合力。</P>
      <TeX block>{r`e_p=p_d^n-\hat{p}^n`}</TeX>
      <TeX block>{r`v_c^n=v_d^n+K_p^pe_p+K_i^p\int_0^t e_p(\tau)\,d\tau`}</TeX>
      <TeX block>{r`e_v=v_c^n-\hat{v}^n`}</TeX>
      <TeX block>{r`a_c^n=a_{ff}^n+K_p^ve_v+K_i^v\int_0^t e_v(\tau)\,d\tau+K_d^v\dot{e}_v`}</TeX>
      <TeX block>{r`F_c^n=m(a_c^n-g^n)-\hat{F}_{aero}^n-\hat{F}_{dist}^n`}</TeX>
      <P>采用空气阻力模型进行前馈补偿时，估计阻力由机体系转换到地理系：</P>
      <TeX block>{r`\hat{F}_{aero}^n=R_b^n\hat{F}_d^b`}</TeX>
      <TeX block>{r`\hat{F}_d^b=-\hat{D}_v(\hat{\rho})\begin{bmatrix}\hat{u}_b|\hat{u}_b|\\\hat{v}_b|\hat{v}_b|\\\hat{w}_b|\hat{w}_b|\end{bmatrix}`}</TeX>
      <P>当扰动力估计器输出机体系分量时，采用</P>
      <TeX block>{r`\hat{F}_{dist}^n=R_b^n\hat{F}_{dist}^b`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`p_d^n`}</X>, '地理系下期望位置'],
          [<X>{r`\hat{p}^n`}</X>, '状态估计器输出的估计位置'],
          [<X>{r`e_p`}</X>, '位置误差'],
          [<X>{r`v_c^n`}</X>, '位置外环修正后的期望速度'],
          [<X>{r`v_d^n`}</X>, '地理系下期望速度'],
          [<X>{r`\hat{v}^n`}</X>, '估计速度'],
          [<X>{r`e_v`}</X>, '速度误差'],
          [<X>{r`K_p^p,K_i^p`}</X>, '位置环 PI 增益'],
          [<X>{r`a_c^n`}</X>, '期望加速度'],
          [<X>{r`a_{ff}^n`}</X>, '前馈加速度'],
          [<X>{r`K_p^v,K_i^v,K_d^v`}</X>, '速度环 PID 增益'],
          [<X>{r`F_c^n`}</X>, '地理系下期望合力'],
          [<X>{r`\hat{F}_{aero}^n`}</X>, '估计气动力'],
          [<X>{r`\hat{F}_d^b`}</X>, '机体系下估计空气阻力'],
          [<X>{r`\hat{\rho}`}</X>, '根据估计高度和环境参数得到的空气密度估计值'],
          [<X>{r`\hat{D}_v(\hat{\rho})`}</X>, '估计空气密度下用于控制补偿的空气阻力矩阵'],
          [<X>{r`\hat{u}_b,\hat{v}_b,\hat{w}_b`}</X>, '估计的机体系相对空气速度分量'],
          [<X>{r`\hat{F}_{dist}^n`}</X>, '估计外部扰动力'],
          [<X>{r`\hat{F}_{dist}^b`}</X>, '机体系下估计外部扰动力'],
        ]}
      />

      <P>姿态环根据期望推力方向和航向参考构造期望姿态，并输出期望控制力矩。</P>
      <TeX block>{r`b_T^n=\frac{F_c^n}{\max(\|F_c^n\|,\epsilon_F)}`}</TeX>
      <P>
        当 <X>{r`\|F_c^n\|<\epsilon_F`}</X> 时，取 <X>{r`T_c=0`}</X> 并保持上一时刻期望姿态，避免由零向量构造推力方向。
      </P>
      <P>
        由期望推力方向和期望航向构造期望姿态。该四旋翼中，合推力轴为 <X>{r`-z_b`}</X>，因此期望机体第三轴方向为
      </P>
      <TeX block>{r`b_{z,d}^n=-b_T^n`}</TeX>
      <P>
        给定期望航向参考方向 <X>{r`b_{x,ref}^n`}</X>，定义
      </P>
      <TeX block>{r`c_y^n=b_{z,d}^n\times b_{x,ref}^n`}</TeX>
      <P>
        当 <X>{r`\|c_y^n\|<\epsilon_R`}</X> 时，应选择另一个不与 <X>{r`b_{z,d}^n`}</X> 平行的航向参考方向。随后有
      </P>
      <TeX block>{r`b_{y,d}^n=\frac{c_y^n}{\|c_y^n\|}`}</TeX>
      <TeX block>{r`b_{x,d}^n=b_{y,d}^n\times b_{z,d}^n`}</TeX>
      <TeX block>{r`R_d=\begin{bmatrix}b_{x,d}^n&b_{y,d}^n&b_{z,d}^n\end{bmatrix}`}</TeX>
      <TeX block>{r`e_R=\frac{1}{2}\left[R^TR_d-R_d^TR\right]^\vee`}</TeX>
      <P>其中</P>
      <TeX block>{r`R=R_b^n`}</TeX>
      <TeX block>{r`e_\omega=\omega_d^b-\hat{\omega}^b`}</TeX>
      <TeX block>{r`\tau_c^b=K_R e_R+K_p^\omega e_\omega+K_i^\omega\int_0^t e_\omega(\tau)\,d\tau+K_d^\omega \dot{e}_\omega`}</TeX>
      <P>地理系下的期望合力转换到机体系为</P>
      <TeX block>{r`F_c^b=R_n^bF_c^n`}</TeX>
      <P>
        其中 <X>{r`F_c^b`}</X> 是上层控制器给出的期望力向量，进入推进器分配的量为其在期望推力轴上的标量分量。
      </P>
      <P>机体系下的合推力轴为固定方向：</P>
      <TeX block>{r`b_T^b=-e_z^b`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`b_T^n`}</X>, '地理系下期望推力方向'],
          [<X>{r`b_T^b`}</X>, '机体系下合推力轴方向'],
          [<X>{r`\epsilon_F`}</X>, '防止期望合力归一化除零的小正数'],
          [<X>{r`\epsilon_R`}</X>, '判断期望推力方向与航向参考方向近似平行的小正数'],
          [<X>{r`b_{x,ref}^n`}</X>, '地理系下期望航向参考方向'],
          [<X>{r`c_y^n`}</X>, '构造期望姿态时使用的中间方向向量'],
          [<X>{r`b_{x,d}^n,b_{y,d}^n,b_{z,d}^n`}</X>, '期望姿态的机体系轴方向在地理系下的表达'],
          [<X>{r`R_d`}</X>, '期望姿态旋转矩阵'],
          [<X>{r`R`}</X>, '当前姿态旋转矩阵'],
          [<X>{r`e_R`}</X>, '姿态误差'],
          [<X>{r`(\cdot)^\vee`}</X>, '反对称矩阵到向量的映射'],
          [<X>{r`\omega_d^b`}</X>, '期望角速度'],
          [<X>{r`\hat{\omega}^b`}</X>, '估计角速度'],
          [<X>{r`e_\omega`}</X>, '角速度误差'],
          [<X>{r`\tau_c^b`}</X>, '机体系下期望控制力矩'],
          [<X>{r`\int_0^t e_\omega(\tau)\,d\tau`}</X>, '角速度误差积分项'],
          [<X>{r`K_R`}</X>, '姿态误差增益'],
          [<X>{r`K_p^\omega,K_i^\omega,K_d^\omega`}</X>, '角速度环 PID 增益'],
          [<X>{r`F_c^b`}</X>, '机体系下期望合力'],
          [<X>{r`R_n^b`}</X>, '从地理系到机体系的旋转矩阵'],
        ]}
      />
      <P>控制器最终输出为</P>
      <TeX block>{r`y_c=\begin{bmatrix}T_c\\\tau_c^b\end{bmatrix}`}</TeX>
      <P>其中</P>
      <TeX block>{r`T_c=(b_T^b)^TF_c^b`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`y_c`}</X>, '控制器输出向量'],
          [<X>{r`T_c`}</X>, '期望总推力标量'],
          [<X>{r`\tau_c^b`}</X>, '机体系下期望力矩'],
        ]}
      />

      <H3 id="control-allocation">E. 控制分配模型</H3>
      <P>控制分配将期望总推力和期望三轴力矩转换为各推进单元的目标推力。定义</P>
      <TeX block>{r`y_c=\begin{bmatrix}T_c\\\tau_c^b\end{bmatrix},\qquad T^\star=\begin{bmatrix}T_1^\star&\cdots&T_{N_r}^\star\end{bmatrix}^T`}</TeX>
      <P>
        基于静态等效反扭矩比值 <X>{r`\kappa_{Q,i}`}</X>，控制分配关系为
      </P>
      <TeX block>{r`y_c=B_TT^\star`}</TeX>
      <P>
        控制分配矩阵第 <X>{r`i`}</X> 列由旋翼安装位置、推力方向和反扭矩方向确定：
      </P>
      <TeX block>{r`B_{T,i}=\begin{bmatrix}(b_T^b)^Te_{T,i}^b\\r_i^b\times e_{T,i}^b+\chi_i\kappa_{Q,i}e_{T,i}^b\end{bmatrix}`}</TeX>
      <TeX block>{r`B_T=\begin{bmatrix}B_{T,1}&\cdots&B_{T,N_r}\end{bmatrix}`}</TeX>
      <P>
        对于对称 X 构型，四个旋翼具有相同的静态反扭矩比值 <X>{r`\kappa_Q`}</X>，并令 <X>{r`a=l/\sqrt{2}`}</X>，则控制分配矩阵为
      </P>
      <TeX block>{r`B_T=\begin{bmatrix}1&1&1&1\\-a&-a&a&a\\a&-a&-a&a\\-\kappa_Q&\kappa_Q&-\kappa_Q&\kappa_Q\end{bmatrix}`}</TeX>
      <P>其中各行依次对应总推力、滚转力矩、俯仰力矩和偏航力矩。</P>
      <P>
        对于四旋翼，当 <X>{r`B_T`}</X> 为非奇异方阵且不存在执行器约束时
      </P>
      <TeX block>{r`T^\star=B_T^{-1}y_c`}</TeX>
      <P>
        对于冗余构型或一般无约束情形，当 <X>{r`B_T`}</X> 满行秩时，可使用加权伪逆：
      </P>
      <TeX block>{r`T_{uc}^\star=W_T^{-1}B_T^T\left(B_TW_T^{-1}B_T^T\right)^{-1}y_c`}</TeX>
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
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`T^\star,T_{uc}^\star`}</X>, '约束后和无约束的推进单元目标推力向量'],
          [<X>{r`B_T,B_{T,i}`}</X>, <>控制分配矩阵及其第 <X>{r`i`}</X> 列</>],
          [<X>{r`W_y`}</X>, '总推力和三轴力矩的跟踪权重矩阵'],
          [<X>{r`W_T`}</X>, '正定的推进单元使用代价权重矩阵'],
          [<X>{r`\lambda`}</X>, '目标推力变化惩罚系数'],
          [<X>{r`T_{min},T_{max}`}</X>, '推进单元目标推力下限和上限'],
          [<X>{r`T_{prev}^\star`}</X>, '上一时刻目标推力向量'],
          [<X>{r`y_{alloc},e_{alloc}`}</X>, '分配后的期望广义力和分配残差'],
          [<X>{r`y_{act},e_{act}`}</X>, '推进系统作用于刚体的实际广义力和实际跟踪误差'],
        ]}
      />

      <H3 id="control-propulsion">F. 推进器模型</H3>
      <P>推进器模型描述从电池母线、电调、电机到螺旋桨气动载荷的动态链路。</P>

      <H4 id="prop-battery">电池模型</H4>
      <H5>电池状态</H5>
      <TeX block>{r`x_{bat}=\begin{bmatrix}SOC&U_{dyn}&T_{bat}\end{bmatrix}^T`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`x_{bat}`}</X>, '电池状态向量'],
          [<X>{r`SOC`}</X>, '电池荷电状态'],
          [<X>{r`U_{dyn}`}</X>, '电池动态极化电压，大电流放电引起的附加电压损失'],
          [<X>{r`T_{bat}`}</X>, '电池温度'],
          [<X>{r`R_{int}`}</X>, <>电池等效内阻，作为 <X>{r`SOC,T_{bat}`}</X> 的慢变量参数</>],
        ]}
      />

      <H5>开路电压和端电压</H5>
      <TeX block>{r`U_{oc}=N_sU_{cell}(SOC,T_{bat})`}</TeX>
      <P>忽略温度影响时，单节电芯开路电压可拟合为</P>
      <TeX block>{r`U_{cell}(SOC)=a_0+a_1SOC+a_2SOC^2+a_3SOC^3`}</TeX>
      <P>考虑温度影响时，单节电芯开路电压为</P>
      <TeX block>{r`U_{cell}(SOC,T_{bat})=a_0+a_1SOC+a_2SOC^2+a_3SOC^3+k_{T,bat}(T_{bat}-T_{ref})`}</TeX>
      <P>端电压：</P>
      <TeX block>{r`U_b=U_{oc}-I_{bat}R_{int}-U_{dyn}`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`U_{oc}`}</X>, '电池组开路电压'],
          [<X>{r`N_s`}</X>, '电池串联节数'],
          [<X>{r`U_{cell}`}</X>, '单节电芯开路电压'],
          [<X>{r`a_0,a_1,a_2,a_3`}</X>, '放电曲线拟合系数'],
          [<X>{r`U_b`}</X>, '电池端电压，也称母线电压'],
          [<X>{r`I_{bat}`}</X>, '电池总放电电流'],
          [<X>{r`k_{T,bat}`}</X>, '电芯温度修正系数'],
          [<X>{r`T_{ref}`}</X>, '电芯温度参考值'],
        ]}
      />

      <H5>母线电流与功率闭合</H5>
      <P>电机端电功率为</P>
      <TeX block>{r`P_{m,i}=U_{m,i}I_{m,i}`}</TeX>
      <P>
        根据电调输出电压关系，第 <X>{r`i`}</X> 路推进器从电池母线吸收的功率满足
      </P>
      <TeX block>{r`U_bd_{esc,i}I_{m,i}=P_{m,i}+I_{m,i}^2(R_{wire,i}+R_{esc,i})+U_{sw,i}I_{m,i}`}</TeX>
      <P>
        基准电气模型采用非再生的电动运行区间，满足 <X>{r`I_{m,i}\ge0`}</X>。在忽略电调输入侧纹波电流的条件下，第 <X>{r`i`}</X> 路推进器的平均母线电流为
      </P>
      <TeX block>{r`I_{bat,i}=d_{esc,i}I_{m,i}`}</TeX>
      <P>若电调支持再生制动，则应使用双向功率电路模型替换该非再生假设，并同时修改电池充放电约束。</P>
      <P>考虑飞控、通信和其他辅助设备功耗后，电池总放电电流为</P>
      <TeX block>{r`I_{bat}=\sum_{i=1}^{N_r}I_{bat,i}+\frac{P_{aux}}{\max(U_b,\epsilon_U)}`}</TeX>
      <P>电池输出功率为</P>
      <TeX block>{r`P_{bat}=U_bI_{bat}`}</TeX>
      <P>
        由于端电压 <X>{r`U_b`}</X> 依赖总放电电流 <X>{r`I_{bat}`}</X>，而 <X>{r`I_{bat}`}</X> 又依赖电调占空比、电机电流和端电压，离散仿真中应对母线电压、电流与推进器状态进行同步或迭代求解。
      </P>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`P_{m,i}`}</X>, <>第 <X>{r`i`}</X> 个电机端电功率</>],
          [<X>{r`I_{bat,i}`}</X>, <>第 <X>{r`i`}</X> 路推进器从电池母线吸收的平均电流</>],
          [<X>{r`P_{aux}`}</X>, '飞控、通信和其他辅助设备的总功耗'],
          [<X>{r`\epsilon_U`}</X>, '防止低电压除零的小正数'],
          [<X>{r`P_{bat}`}</X>, '电池输出功率'],
        ]}
      />

      <H5>SOC 与功率约束</H5>
      <P>空气阻力增大时，控制器提高期望推力和目标转速，电机电流与母线电流随之增大，并通过下式加快电池荷电状态下降。</P>
      <TeX block>{r`SOC[k+1]=\operatorname{sat}\left(SOC[k]-\frac{I_{bat}[k]T_s}{3600\,Q_{nom}},SOC_{min},SOC_{max}\right)`}</TeX>
      <P>动态极化电压与温度可用一阶模型闭合：</P>
      <TeX block>{r`U_{dyn}[k+1]=e^{-T_s/\tau_{bat}}U_{dyn}[k]+\left(1-e^{-T_s/\tau_{bat}}\right)R_{dyn}I_{bat}[k]`}</TeX>
      <TeX block>{r`C_{bat}\dot{T}_{bat}=I_{bat}^2R_{int}-\frac{T_{bat}-T_{amb}}{R_{th,bat}}`}</TeX>
      <P>电池运行点应满足</P>
      <TeX block>{r`SOC_{min}\le SOC\le SOC_{max}`}</TeX>
      <TeX block>{r`U_{min}\le U_b\le U_{max}`}</TeX>
      <TeX block>{r`0\le I_{bat}\le I_{bat,max}(SOC,T_{bat})`}</TeX>
      <TeX block>{r`P_{bat}\le P_{bat,max}=U_bI_{bat,max}(SOC,T_{bat})`}</TeX>
      <P>
        当电池电压、电流、功率或荷电状态达到边界时，应收紧控制分配中的 <X>{r`T_{max}`}</X>；无法维持安全运行点时触发推进系统限功率或截止状态。
      </P>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`SOC[k]`}</X>, <>第 <X>{r`k`}</X> 时刻电池荷电状态</>],
          [<X>{r`SOC_{min},SOC_{max}`}</X>, '允许的荷电状态边界'],
          [<X>{r`T_s`}</X>, '采样周期'],
          [<X>{r`Q_{nom}`}</X>, '电池标称容量'],
          [<X>{r`\tau_{bat}`}</X>, '电池动态极化时间常数'],
          [<X>{r`R_{dyn}`}</X>, '电池动态极化等效电阻'],
          [<X>{r`C_{bat}`}</X>, '电池热容'],
          [<X>{r`R_{th,bat}`}</X>, '电池到环境的热阻'],
          [<X>{r`U_{min},U_{max}`}</X>, '允许的电池端电压边界'],
          [<X>{r`I_{bat,max}(SOC,T_{bat})`}</X>, '当前状态下允许的最大放电电流'],
          [<X>{r`P_{bat,max}`}</X>, '当前状态下允许的最大电池输出功率'],
        ]}
      />

      <H4 id="prop-esc">电调/功率电路模型</H4>
      <P>电调接收油门命令和母线电压，输出电机端电压。</P>
      <P>电调响应模型为</P>
      <TeX block>{r`\tau_{esc}\dot{d}_{esc,i}+d_{esc,i}=\operatorname{sat}(u_{esc,i}(t-t_{d,esc}),0,1)`}</TeX>
      <P>由目标转速反解油门命令，得到</P>
      <TeX block>{r`u_{esc,i}=\operatorname{sat}\left[\left(\frac{\max(\omega_{cmd,i}-\omega_{min},0)}{\max(\omega_{max}(U_b)-\omega_{min},\epsilon_\omega)}\right)^{1/\gamma},0,1\right]`}</TeX>
      <P>电机端电压为</P>
      <TeX block>{r`U_{m,i}=d_{esc,i}U_b-I_{m,i}(R_{wire,i}+R_{esc,i})-U_{sw,i}`}</TeX>
      <P>开关损耗等效压降为</P>
      <TeX block>{r`U_{sw,i}=k_{sw}f_{pwm}I_{m,i}`}</TeX>
      <P>线束损耗和电调损耗分别为</P>
      <TeX block>{r`P_{loss,wire,i}=I_{m,i}^2R_{wire,i}`}</TeX>
      <TeX block>{r`P_{loss,esc,i}=I_{m,i}^2R_{esc,i}+U_{sw,i}I_{m,i}`}</TeX>
      <P>电调热模型为</P>
      <TeX block>{r`C_{th,esc}\dot{T}_{esc,i}=P_{loss,esc,i}-\frac{T_{esc,i}-T_{amb}}{R_{th,esc}}`}</TeX>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`\tau_{esc}`}</X>, '电调响应时间常数'],
          [<X>{r`d_{esc,i}`}</X>, <>第 <X>{r`i`}</X> 个电调实际输出占空比</>],
          [<X>{r`u_{esc,i}`}</X>, <>第 <X>{r`i`}</X> 个电调油门命令</>],
          [<X>{r`t_{d,esc}`}</X>, '电调延迟'],
          [<X>{r`\omega_{min}`}</X>, '电机最小有效转速'],
          [<X>{r`\omega_{max}(U_b)`}</X>, '当前母线电压下最大可达转速'],
          [<X>{r`\epsilon_\omega`}</X>, '防止目标转速反解分母过小的正数'],
          [<X>{r`\gamma`}</X>, '油门到转速关系的非线性指数'],
          [<X>{r`U_{m,i}`}</X>, <>第 <X>{r`i`}</X> 个电机端电压</>],
          [<X>{r`R_{wire,i}`}</X>, <>第 <X>{r`i`}</X> 路线束电阻</>],
          [<X>{r`R_{esc,i}`}</X>, <>第 <X>{r`i`}</X> 个电调导通电阻</>],
          [<X>{r`U_{sw,i}`}</X>, '开关损耗等效压降'],
          [<X>{r`k_{sw}`}</X>, '开关损耗系数'],
          [<X>{r`f_{pwm}`}</X>, 'PWM 或功率开关频率'],
          [<X>{r`P_{loss,wire,i}`}</X>, <>第 <X>{r`i`}</X> 路线束损耗功率</>],
          [<X>{r`P_{loss,esc,i}`}</X>, <>第 <X>{r`i`}</X> 个电调损耗功率</>],
          [<X>{r`C_{th,esc}`}</X>, '电调热容'],
          [<X>{r`T_{esc,i}`}</X>, '电调温度'],
          [<X>{r`T_{amb}`}</X>, '环境温度'],
          [<X>{r`R_{th,esc}`}</X>, '电调到环境的热阻'],
        ]}
      />

      <H4 id="prop-motor">电机模型</H4>
      <P>电机电气方程为</P>
      <TeX block>{r`L_m\dot{I}_{m,i}=U_{m,i}-R_mI_{m,i}-K_e\omega_i`}</TeX>
      <P>电磁转矩为</P>
      <TeX block>{r`\tau_{em,i}=K_tI_{m,i}`}</TeX>
      <P>在一致的 SI 单位和理想电磁转换假设下，取</P>
      <TeX block>{r`K_t=K_e`}</TeX>
      <P>此时电机端电功率满足</P>
      <TeX block>{r`U_{m,i}I_{m,i}=\frac{d}{dt}\left(\frac{1}{2}L_mI_{m,i}^2\right)+R_mI_{m,i}^2+\tau_{em,i}\omega_i`}</TeX>
      <P>电机机械方程为</P>
      <TeX block>{r`J_{rot,i}\dot{\omega}_i=\tau_{em,i}-Q_i-b_m\omega_i-\tau_{fric,i}`}</TeX>
      <P>电机机械功率满足</P>
      <TeX block>{r`\tau_{em,i}\omega_i=\frac{d}{dt}\left(\frac{1}{2}J_{rot,i}\omega_i^2\right)+Q_i\omega_i+b_m\omega_i^2+\tau_{fric,i}\omega_i`}</TeX>
      <P>
        姿态动力学中的 <X>{r`M_{Q,i}^b+M_{acc}^b`}</X> 已反映气动反扭矩与旋翼加减速对机体的反作用，因此不再单独向机体力矩方程加入
        <X>{r`-\tau_{em,i}e_{\Omega,i}^b`}</X>。
      </P>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`L_m`}</X>, '电机等效电感'],
          [<X>{r`I_{m,i}`}</X>, <>第 <X>{r`i`}</X> 个电机电流</>],
          [<X>{r`\dot{I}_{m,i}`}</X>, '电机电流变化率'],
          [<X>{r`U_{m,i}`}</X>, '电机端电压'],
          [<X>{r`R_m`}</X>, '电机等效电阻'],
          [<X>{r`K_e`}</X>, '反电动势系数'],
          [<X>{r`\omega_i`}</X>, '电机角速度'],
          [<X>{r`\tau_{em,i}`}</X>, '电机电磁转矩'],
          [<X>{r`K_t`}</X>, '电机转矩系数'],
          [<X>{r`J_{rot,i}`}</X>, '电机和螺旋桨等效转动惯量'],
          [<X>{r`\dot{\omega}_i`}</X>, '电机角加速度'],
          [<X>{r`Q_i`}</X>, '螺旋桨气动阻力矩幅值'],
          [<X>{r`b_m`}</X>, '电机粘性阻尼系数'],
          [<X>{r`\tau_{fric,i}`}</X>, '摩擦转矩'],
        ]}
      />

      <H4 id="prop-propeller">螺旋桨模型</H4>
      <P>
        螺旋桨模型根据局部来流、实际转速和空气密度计算实际推力与反扭矩。第 <X>{r`i`}</X> 个螺旋桨中心速度为
      </P>
      <TeX block>{r`\boldsymbol{v}_i^b=\boldsymbol{v}^b+\omega^b\times r_i^b`}</TeX>
      <P>其中</P>
      <TeX block>{r`\boldsymbol{v}^b=R_n^b\boldsymbol{v}^n`}</TeX>
      <P>螺旋桨相对空气速度和轴向来流速度为</P>
      <TeX block>{r`\boldsymbol{v}_{a,i}^b=\boldsymbol{v}_i^b-R_n^b\boldsymbol{w}^n`}</TeX>
      <TeX block>{r`V_{a,i}=(e_{T,i}^b)^T\boldsymbol{v}_{a,i}^b`}</TeX>
      <P>螺旋桨转速和推进比为</P>
      <TeX block>{r`n_i=\frac{\omega_i}{2\pi}`}</TeX>
      <TeX block>{r`J_i=\operatorname{sat}\left(\frac{V_{a,i}}{\max(n_i,\epsilon_n)D_i},J_{min},J_{max}\right)`}</TeX>
      <P>
        其中 <X>{r`\epsilon_n>0`}</X> 用于避免低转速除零，<X>{r`[J_{min},J_{max}]`}</X> 为螺旋桨气动数据的有效推进比范围。实际推力、实际反扭矩幅值和螺旋桨机械功率为
      </P>
      <TeX block>{r`T_i=C_T(J_i)\rho n_i^2D_i^4`}</TeX>
      <TeX block>{r`Q_i=C_Q(J_i)\rho n_i^2D_i^5`}</TeX>
      <TeX block>{r`P_{prop,i}=2\pi n_iQ_i`}</TeX>
      <P>
        <X>{r`C_T(J_i)`}</X> 和 <X>{r`C_Q(J_i)`}</X> 由螺旋桨试验数据表或拟合模型获得。基准模型面向正常有动力飞行范围，取
        <X>{r`C_T(J_i)\ge0`}</X>、<X>{r`C_Q(J_i)\ge0`}</X>；若需要描述风车状态或反向推力，应改用带符号的螺旋桨气动数据。参考静态系数
        <X>{r`k_{T,i,ref}`}</X>、<X>{r`k_{Q,i,ref}`}</X> 及其密度修正值是该模型在 <X>{r`J_{ref}`}</X> 附近的等效参数，仅用于控制分配与目标转速反解。
      </P>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`\boldsymbol{v}_i^b`}</X>, <>第 <X>{r`i`}</X> 个螺旋桨中心在机体系下的速度</>],
          [<X>{r`\boldsymbol{v}_{a,i}^b`}</X>, <>第 <X>{r`i`}</X> 个螺旋桨相对空气速度</>],
          [<X>{r`V_{a,i}`}</X>, '轴向来流速度'],
          [<X>{r`n_i`}</X>, '螺旋桨转速，单位为转/秒'],
          [<X>{r`J_i`}</X>, '推进比'],
          [<X>{r`\epsilon_n`}</X>, '防止低转速除零的小正数'],
          [<X>{r`J_{min},J_{max}`}</X>, '螺旋桨气动数据的有效推进比边界'],
          [<X>{r`D_i`}</X>, '螺旋桨直径'],
          [<X>{r`C_T(J_i),C_Q(J_i)`}</X>, '来流相关推力系数和扭矩系数'],
          [<X>{r`\rho`}</X>, '当前空气密度'],
          [<X>{r`T_i,Q_i`}</X>, '实际推力和实际反扭矩幅值'],
          [<X>{r`P_{prop,i}`}</X>, '螺旋桨机械功率'],
        ]}
      />

      <Callout title="求解顺序提示">
        推进器链路存在代数耦合：端电压 <X>{r`U_b`}</X>、母线电流 <X>{r`I_{bat}`}</X> 与各电机电流互相依赖。
        因此每个仿真步内需对母线电压、电流与推进器状态作同步或迭代求解，再据此更新 <X>{r`SOC`}</X> 与温度等慢变量。
      </Callout>
    </section>
  )
}
