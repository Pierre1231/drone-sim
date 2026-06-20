import { TeX } from '../TeX'
import { H2, H3, H4, H5, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw
function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

export default function PropulsionAero() {
  return (
    <section>
      <H2 id="propulsion-aero">III. 推进器与气动力</H2>
      <Lead>
        本章回答「作用在四旋翼上的力和力矩从哪来」。单个旋翼产生推力和反扭矩，旋翼自身的高速旋转还带来陀螺效应；
        机体穿过空气产生阻力和阻尼力矩。把这些来源汇总，就得到进入刚体动力学方程的总力与总力矩。
      </Lead>

      <H3 id="pa-thrust">A. 旋翼推力模型</H3>
      <P>
        第 <X>{r`i`}</X> 个旋翼的静态等效推力与其转速平方成正比：
      </P>
      <TeX block>{r`T_{s,i}=k_{T,i}(\rho)\omega_i^2`}</TeX>
      <P>
        其中 <X>{r`k_{T,i}(\rho)`}</X> 是当前空气密度下的等效推力系数，由参考密度下的系数修正得到：
      </P>
      <TeX block>{r`k_{T,i}(\rho)=\frac{\rho}{\rho_{ref}}k_{T,i,ref}`}</TeX>
      <P>
        参考系数 <X>{r`k_{T,i,ref}`}</X> 与螺旋桨气动系数的关系为
      </P>
      <TeX block>{r`k_{T,i,ref}=\frac{C_T(J_{ref})\rho_{ref}D_i^4}{(2\pi)^2}`}</TeX>
      <P>
        这里 <X>{r`C_T(J_{ref})`}</X> 是参考推进比 <X>{r`J_{ref}`}</X> 处的推力系数，<X>{r`\rho_{ref}`}</X> 是参考空气密度，<X>{r`D_i`}</X> 是螺旋桨直径。
        控制分配得到目标推力 <X>{r`T_i^\star`}</X> 后，目标转速由静态模型反解：
      </P>
      <TeX block>{r`\omega_{cmd,i}=\sqrt{\frac{T_i^\star}{k_{T,i}(\hat{\rho})}},\qquad T_i^\star\ge 0`}</TeX>
      <P>
        实际推力 <X>{r`T_i`}</X> 由推进器模型根据实际转速、空气密度和轴向来流计算。
        单个螺旋桨的实际推力向量及其相对质心产生的力矩为
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

      <H3 id="pa-torque">B. 旋翼反扭矩模型</H3>
      <P>螺旋桨气动阻力在机体上产生反扭矩。控制分配采用静态等效关系：</P>
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

      <H3 id="pa-gyro">C. 旋翼陀螺力矩</H3>
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

      <Callout title="力矩来源辨析">
        机体偏航通道上有两类不同来源的力矩：<X>{r`M_{Q,i}^b`}</X> 来自空气对螺旋桨的外部气动反扭矩，
        <X>{r`M_{acc}^b`}</X> 来自旋翼自身角动量变化的惯性反作用。二者物理机制不同，建模时分别计入，不可混为一谈。
      </Callout>

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

      <H3 id="pa-environment">D. 环境模型与相对气流</H3>
      <P><X>{r`h=-z`}</X> 给出 NED 坐标系下的高度。大气温度、压强和密度随高度变化为</P>
      <TeX block>{r`T_{sl}=T_0+\Delta T`}</TeX>
      <TeX block>{r`T_a(h)=T_{sl}-L_{atm}h`}</TeX>
      <TeX block>{r`p_a(h)=p_0\left(\frac{T_a(h)}{T_{sl}}\right)^{\frac{g}{R_aL_{atm}}}`}</TeX>
      <TeX block>{r`\rho(h)=\frac{p_a(h)}{R_aT_a(h)}`}</TeX>
      <P>地理系下风速由稳定风、阵风、湍流和风切变叠加：</P>
      <TeX block>{r`\boldsymbol{w}^n=\boldsymbol{w}_{const}^n+\boldsymbol{w}_{gust}^n+\boldsymbol{w}_{tur}^n+\boldsymbol{w}_{shear}^n`}</TeX>
      <P>相对空气速度为</P>
      <TeX block>{r`\boldsymbol{v}_a^n=\boldsymbol{v}^n-\boldsymbol{w}^n`}</TeX>
      <TeX block>{r`\boldsymbol{v}_a^b=R_n^b\boldsymbol{v}_a^n`}</TeX>
      <P>机体系下相对空气速度分量定义为</P>
      <TeX block>{r`\boldsymbol{v}_a^b=\begin{bmatrix}u_b&v_b&w_b\end{bmatrix}^T`}</TeX>
      <P>空速、攻角和侧滑角定义为</P>
      <TeX block>{r`V_a=\|\boldsymbol{v}_a^b\|=\sqrt{u_b^2+v_b^2+w_b^2}`}</TeX>
      <TeX block>{r`\alpha=\operatorname{atan2}(w_b,u_b)`}</TeX>
      <TeX block>{r`\beta=\operatorname{atan2}\left(v_b,\sqrt{u_b^2+w_b^2}\right)`}</TeX>
      <P>
        <X>{r`\alpha`}</X> 和 <X>{r`\beta`}</X> 用于描述飞行包线并判断二次阻力模型的适用范围；基准机体阻力模型不显式依赖二者。
        当 <X>{r`V_a<\epsilon_V`}</X> 时，取 <X>{r`\alpha=0`}</X>、<X>{r`\beta=0`}</X>，避免在零空速附近使用不确定的气流角。
      </P>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`h`}</X>, '高度'],
          [<X>{r`T_{sl},T_a(h)`}</X>, <>当前海平面温度和高度 <X>{r`h`}</X> 处大气温度</>],
          [<X>{r`p_a(h),\rho(h)`}</X>, <>高度 <X>{r`h`}</X> 处大气压强和空气密度</>],
          [<X>{r`\boldsymbol{w}_{const}^n`}</X>, '稳定风'],
          [<X>{r`\boldsymbol{w}_{gust}^n`}</X>, '阵风'],
          [<X>{r`\boldsymbol{w}_{tur}^n`}</X>, '大气湍流'],
          [<X>{r`\boldsymbol{w}_{shear}^n`}</X>, '风切变'],
          [<X>{r`\boldsymbol{v}_a^n,\boldsymbol{v}_a^b`}</X>, '地理系和机体系下的相对空气速度'],
          [<X>{r`V_a,\alpha,\beta`}</X>, '空速、攻角和侧滑角'],
          [<X>{r`\epsilon_V`}</X>, '零空速附近气流角处理阈值'],
        ]}
      />

      <H3 id="pa-drag">E. 空气阻力与气动阻尼</H3>
      <P>
        四旋翼机体空气阻力采用机体系三轴二次阻力模型。令参考空气密度下的阻力矩阵为 <X>{r`D_{v,ref}`}</X>，则当前空气密度下
      </P>
      <TeX block>{r`D_v(\rho)=\frac{\rho}{\rho_{ref}}D_{v,ref}`}</TeX>
      <P>
        <X>{r`D_{v,ref}`}</X> 取对角矩阵且各对角元素非负，以保证逐轴二次空气阻力不向相对气流增加机械能。
      </P>
      <P>当采用无量纲阻力系数和各方向参考面积时，</P>
      <TeX block>{r`D_v(\rho)=\frac{1}{2}\rho\begin{bmatrix}C_{Dx}A_x&0&0\\0&C_{Dy}A_y&0\\0&0&C_{Dz}A_z\end{bmatrix}`}</TeX>
      <P>当机体系三个方向采用相同的集中阻力系数时，可简化为</P>
      <TeX block>{r`D_v(\rho)=C_d(\rho)I`}</TeX>
      <P>机体系下的空气阻力为</P>
      <TeX block>{r`F_d^b=-D_v(\rho)\begin{bmatrix}u_b|u_b|\\v_b|v_b|\\w_b|w_b|\end{bmatrix}`}</TeX>
      <P>进入刚体平动方程的机体总气动力为</P>
      <TeX block>{r`F_{aero,total}^b=F_d^b`}</TeX>
      <P>空气阻力耗散的机械功率为</P>
      <TeX block>{r`P_{drag}=-(F_d^b)^T\boldsymbol{v}_a^b\ge 0`}</TeX>
      <P>
        <X>{r`P_{drag}`}</X> 不作为独立负载再次叠加到电池输出功率。空气阻力提高控制器所需推力，并通过目标转速、电机电流和母线电流最终反映在 <X>{r`P_{bat}`}</X> 与 <X>{r`SOC`}</X> 中。
      </P>

      <P>令参考空气密度下的气动阻尼力矩矩阵为 <X>{r`D_{\omega,ref}`}</X>，则</P>
      <TeX block>{r`D_\omega(\rho)=\frac{\rho}{\rho_{ref}}D_{\omega,ref}`}</TeX>
      <P><X>{r`D_{\omega,ref}`}</X> 取对角矩阵且各对角元素非负。</P>
      <P>当三个转动方向采用相同的集中阻尼力矩系数时，可简化为</P>
      <TeX block>{r`D_\omega(\rho)=C_{dm}(\rho)I`}</TeX>
      <P>机体系三轴气动阻尼力矩为</P>
      <TeX block>{r`M_d^b=-D_\omega(\rho)\begin{bmatrix}p|p|\\q|q|\\r|r|\end{bmatrix}`}</TeX>
      <P>气动阻尼耗散功率为</P>
      <TeX block>{r`P_{damp}=-(M_d^b)^T\omega^b\ge0`}</TeX>
      <P>
        若阻力作用中心相对质心的位置为 <X>{r`r_d^b`}</X>，空气阻力产生的力臂力矩为
      </P>
      <TeX block>{r`M_{arm}^b=r_d^b\times F_d^b`}</TeX>
      <P>进入刚体转动方程的机体总气动力矩为</P>
      <TeX block>{r`M_{aero,total}^b=M_d^b+M_{arm}^b`}</TeX>
      <P>当阻力作用中心近似位于质心时，取 <X>{r`M_{arm}^b=0`}</X>。</P>

      <Callout title="能量自洽">
        气动耗散量 <X>{r`P_{drag}`}</X> 与 <X>{r`P_{damp}`}</X> 仅作诊断，不直接计入电池功率 <X>{r`P_{bat}`}</X>。
        它们的能量代价已经由控制器为克服阻力/阻尼而提高的推力与力矩间接体现，避免功率被重复计入。
      </Callout>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`\rho_{ref}`}</X>, '气动参数辨识对应的参考空气密度'],
          [<X>{r`D_{v,ref},D_v(\rho)`}</X>, '参考密度和当前密度下的机体阻力矩阵'],
          [<X>{r`C_{Dx},C_{Dy},C_{Dz}`}</X>, '机体系三轴无量纲阻力系数'],
          [<X>{r`A_x,A_y,A_z`}</X>, '机体系三个方向的参考迎风面积'],
          [<X>{r`C_d(\rho)`}</X>, '当前空气密度下的集中二次阻力系数'],
          [<X>{r`F_d^b,F_{aero,total}^b`}</X>, '机体空气阻力和进入平动方程的机体总气动力'],
          [<X>{r`P_{drag}`}</X>, '空气阻力耗散的机械功率'],
          [<X>{r`D_{\omega,ref},D_\omega(\rho)`}</X>, '参考密度和当前密度下的气动阻尼力矩矩阵'],
          [<X>{r`C_{dm}(\rho)`}</X>, '当前空气密度下的集中二次阻尼力矩系数'],
          [<X>{r`M_d^b,M_{arm}^b`}</X>, '气动阻尼力矩和阻力作用点偏置产生的力臂力矩'],
          [<X>{r`P_{damp}`}</X>, '气动阻尼力矩耗散的机械功率'],
          [<X>{r`r_d^b`}</X>, '阻力作用中心相对质心的位置'],
          [<X>{r`M_{aero,total}^b`}</X>, '进入转动方程的机体总气动力矩'],
        ]}
      />

      <H3 id="pa-summary">F. 整机力与力矩汇总</H3>
      <P>
        第 II 章的刚体动力学方程右边出现了若干力与力矩项，至此它们已全部定义完毕。把推进器、气动力和外部扰动汇总，
        作用于整机的总力和总力矩分别为
      </P>
      <TeX block>{r`F_{total}^b=F_{prop}^b+F_{aero,total}^b+F_{dist}^b`}</TeX>
      <TeX block>{r`M_{total}^b=M_{prop}^b+M_{rotor}^b+M_{aero,total}^b+M_{dist}^b`}</TeX>
      <P>
        代入第 II 章的平动与转动方程，得到完整的刚体动力学：
      </P>
      <TeX block>{r`m\dot{v}^n=R_b^nF_{total}^b+mg^n`}</TeX>
      <TeX block>{r`J\dot{\omega}^b=-\omega^b\times J\omega^b+M_{total}^b`}</TeX>
      <P>
        这个汇总小节是连接「单个力/力矩来源」与「刚体运动」的桥接点：读者在第 II 章看到占位项时，可以翻到此处查找每一项的具体定义。
      </P>

      <Callout title="从总力到电池功率">
        空气阻力 <X>{r`F_d^b`}</X> 和气动阻尼 <X>{r`M_d^b`}</X> 本身不直接作为电负载出现。
        它们会提高控制器所需的推力与力矩，从而抬高电机转速、电流和母线电流，最终通过第 G 节的电气链路影响电池功率 <X>{r`P_{bat}`}</X> 与荷电状态 <X>{r`SOC`}</X>。
      </Callout>

      <H3 id="pa-dynamics">G. 电池、电调、电机与螺旋桨动态</H3>
      <P>推进器模型描述从电池母线、电调、电机到螺旋桨气动载荷的动态链路。</P>

      <H4 id="pa-battery">电池模型</H4>
      <H5>电池状态</H5>
      <TeX block>{r`x_{bat}=\begin{bmatrix}SOC&U_{dyn}&T_{bat}\end{bmatrix}^T`}</TeX>
      <P>
        电池状态由荷电状态 <X>{r`SOC`}</X>、动态极化电压 <X>{r`U_{dyn}`}</X> 和电池温度 <X>{r`T_{bat}`}</X> 组成；
        <X>{r`R_{int}`}</X> 是电池等效内阻，作为 <X>{r`SOC,T_{bat}`}</X> 的慢变量参数。
      </P>

      <H5>开路电压和端电压</H5>
      <TeX block>{r`U_{oc}=N_sU_{cell}(SOC,T_{bat})`}</TeX>
      <P>忽略温度影响时，单节电芯开路电压可拟合为</P>
      <TeX block>{r`U_{cell}(SOC)=a_0+a_1SOC+a_2SOC^2+a_3SOC^3`}</TeX>
      <P>考虑温度影响时，单节电芯开路电压为</P>
      <TeX block>{r`U_{cell}(SOC,T_{bat})=a_0+a_1SOC+a_2SOC^2+a_3SOC^3+k_{T,bat}(T_{bat}-T_{ref})`}</TeX>
      <P>端电压：</P>
      <TeX block>{r`U_b=U_{oc}-I_{bat}R_{int}-U_{dyn}`}</TeX>

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

      <H4 id="pa-esc">电调 / 功率电路模型</H4>
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

      <H4 id="pa-motor">电机模型</H4>
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

      <H4 id="pa-propeller">螺旋桨模型</H4>
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

      <Callout title="求解顺序提示">
        推进器链路存在代数耦合：端电压 <X>{r`U_b`}</X>、母线电流 <X>{r`I_{bat}`}</X> 与各电机电流互相依赖。
        因此每个仿真步内需对母线电压、电流与推进器状态作同步或迭代求解，再据此更新 <X>{r`SOC`}</X> 与温度等慢变量。
      </Callout>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`x_{bat}`}</X>, '电池状态向量'],
          [<X>{r`SOC`}</X>, '电池荷电状态'],
          [<X>{r`U_{dyn}`}</X>, '电池动态极化电压，大电流放电引起的附加电压损失'],
          [<X>{r`T_{bat}`}</X>, '电池温度'],
          [<X>{r`U_{oc}`}</X>, '电池组开路电压'],
          [<X>{r`N_s`}</X>, '电池串联节数'],
          [<X>{r`U_{cell}`}</X>, '单节电芯开路电压'],
          [<X>{r`U_b`}</X>, '电池端电压，也称母线电压'],
          [<X>{r`I_{bat}`}</X>, '电池总放电电流'],
          [<X>{r`P_{bat}`}</X>, '电池输出功率'],
          [<X>{r`d_{esc,i}`}</X>, <>第 <X>{r`i`}</X> 个电调实际输出占空比</>],
          [<X>{r`u_{esc,i}`}</X>, <>第 <X>{r`i`}</X> 个电调油门命令</>],
          [<X>{r`U_{m,i}`}</X>, <>第 <X>{r`i`}</X> 个电机端电压</>],
          [<X>{r`I_{m,i}`}</X>, <>第 <X>{r`i`}</X> 个电机电流</>],
          [<X>{r`\tau_{em,i}`}</X>, '电机电磁转矩'],
          [<X>{r`J_{rot,i}`}</X>, '电机和螺旋桨等效转动惯量'],
          [<X>{r`Q_i`}</X>, '螺旋桨气动阻力矩幅值'],
          [<X>{r`n_i`}</X>, '螺旋桨转速，单位为转/秒'],
          [<X>{r`J_i`}</X>, '推进比'],
          [<X>{r`C_T(J_i),C_Q(J_i)`}</X>, '来流相关推力系数和扭矩系数'],
          [<X>{r`P_{prop,i}`}</X>, '螺旋桨机械功率'],
        ]}
      />
    </section>
  )
}
