import { TeX } from '../TeX'
import { H2, H3, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw
function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

export default function Aerodynamics() {
  return (
    <section>
      <H2 id="aero">VI. 四旋翼气动力模型</H2>
      <Lead>
        气动力模型把高度相关的大气状态、地理系风场与机体相对气流串联起来，给出随空气密度变化的机体阻力和阻尼力矩，
        最终作为 <X>{r`F_{aero,total}^b`}</X> 与 <X>{r`M_{aero,total}^b`}</X> 进入第 V 章的刚体平动与转动方程。
      </Lead>

      <H3 id="aero-environment">A. 环境模型</H3>
      <P>NED 坐标系下的高度定义为</P>
      <TeX block>{r`h=-z`}</TeX>
      <P>大气温度、压强和密度模型为</P>
      <TeX block>{r`T_{sl}=T_0+\Delta T`}</TeX>
      <TeX block>{r`T_a(h)=T_{sl}-L_{atm}h`}</TeX>
      <TeX block>{r`p_a(h)=p_0\left(\frac{T_a(h)}{T_{sl}}\right)^{\frac{g}{R_aL_{atm}}}`}</TeX>
      <TeX block>{r`\rho(h)=\frac{p_a(h)}{R_aT_a(h)}`}</TeX>
      <P>地理系下风速由稳定风、阵风、湍流和风切变叠加：</P>
      <TeX block>{r`\boldsymbol{w}^n=\boldsymbol{w}_{const}^n+\boldsymbol{w}_{gust}^n+\boldsymbol{w}_{tur}^n+\boldsymbol{w}_{shear}^n`}</TeX>
      <P>相对空气速度为</P>
      <TeX block>{r`\boldsymbol{v}_a^n=\boldsymbol{v}^n-\boldsymbol{w}^n`}</TeX>
      <TeX block>{r`\boldsymbol{v}_a^b=R_n^b\boldsymbol{v}_a^n`}</TeX>
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
        ]}
      />

      <H3 id="aero-airflow">B. 相对气流</H3>
      <P>机体系下相对空气速度分量定义为</P>
      <TeX block>{r`\boldsymbol{v}_a^b=\begin{bmatrix}u_b&v_b&w_b\end{bmatrix}^T`}</TeX>
      <P>空速、攻角和侧滑角定义为</P>
      <TeX block>{r`V_a=\|\boldsymbol{v}_a^b\|=\sqrt{u_b^2+v_b^2+w_b^2}`}</TeX>
      <TeX block>{r`\alpha=\operatorname{atan2}(w_b,u_b)`}</TeX>
      <TeX block>{r`\beta=\operatorname{atan2}\left(v_b,\sqrt{u_b^2+w_b^2}\right)`}</TeX>
      <P>
        <X>{r`\alpha`}</X> 和 <X>{r`\beta`}</X> 用于描述飞行包线并判断二次阻力模型的适用范围；基准机体阻力模型不显式依赖二者。
      </P>
      <P>
        当 <X>{r`V_a<\epsilon_V`}</X> 时，取 <X>{r`\alpha=0`}</X>、<X>{r`\beta=0`}</X>，避免在零空速附近使用不确定的气流角。
      </P>

      <H3 id="aero-drag">C. 空气阻力模型</H3>
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

      <H3 id="aero-damping">D. 气动阻尼力矩模型</H3>
      <P>令参考空气密度下的气动阻尼力矩矩阵为 <X>{r`D_{\omega,ref}`}</X>，则</P>
      <TeX block>{r`D_\omega(\rho)=\frac{\rho}{\rho_{ref}}D_{\omega,ref}`}</TeX>
      <P>
        <X>{r`D_{\omega,ref}`}</X> 取对角矩阵且各对角元素非负。
      </P>
      <P>当三个转动方向采用相同的集中阻尼力矩系数时，可简化为</P>
      <TeX block>{r`D_\omega(\rho)=C_{dm}(\rho)I`}</TeX>
      <P>机体系三轴气动阻尼力矩为</P>
      <TeX block>{r`M_d^b=-D_\omega(\rho)\begin{bmatrix}p|p|\\q|q|\\r|r|\end{bmatrix}`}</TeX>
      <P>气动阻尼耗散功率为</P>
      <TeX block>{r`P_{damp}=-(M_d^b)^T\omega^b\ge0`}</TeX>
      <P>
        <X>{r`P_{damp}`}</X> 与 <X>{r`P_{drag}`}</X> 均作为气动耗散诊断量，不直接叠加到 <X>{r`P_{bat}`}</X>；其能量影响通过控制器所需推力和力矩反映到推进系统功率中。
      </P>
      <P>
        若阻力作用中心相对质心的位置为 <X>{r`r_d^b`}</X>，空气阻力产生的力臂力矩为
      </P>
      <TeX block>{r`M_{arm}^b=r_d^b\times F_d^b`}</TeX>
      <P>进入刚体转动方程的机体总气动力矩为</P>
      <TeX block>{r`M_{aero,total}^b=M_d^b+M_{arm}^b`}</TeX>
      <P>
        当阻力作用中心近似位于质心时，取 <X>{r`M_{arm}^b=0`}</X>。
      </P>
      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`V_a,\alpha,\beta`}</X>, '空速、攻角和侧滑角'],
          [<X>{r`\epsilon_V`}</X>, '零空速附近气流角处理阈值'],
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

      <Callout title="能量自洽">
        气动耗散量 <X>{r`P_{drag}`}</X> 与 <X>{r`P_{damp}`}</X> 仅作诊断，不直接计入电池功率 <X>{r`P_{bat}`}</X>。
        它们的能量代价已经由控制器为克服阻力/阻尼而提高的推力与力矩间接体现，避免功率被重复计入。
      </Callout>
    </section>
  )
}
