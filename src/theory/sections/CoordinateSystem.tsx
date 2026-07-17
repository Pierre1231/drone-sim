import { TeX } from '../TeX'
import { H2, H3, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw
function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

export default function CoordinateSystem() {
  return (
    <section>
      <H2 id="coordinate-system">I. 坐标系与符号约定</H2>
      <Lead>
        在建立运动和动力学方程之前，先统一坐标系与符号读法。所有位置和力在三个坐标系之间转换，所有上标、下标和矩阵记号也按本节约定执行；后续章节默认遵循这些约定，不再逐处说明。
      </Lead>

      <H3 id="cs-frames">A. 坐标系定义</H3>
      <P>
        建模采用三个坐标系：地理系 <X>{r`n`}</X> 用于导航和重力方向，机体系 <X>{r`b`}</X> 用于惯量和推进力，螺旋桨系 <X>{r`p_i`}</X> 用于刻画单个旋翼的轴向来流。
      </P>
      <P>
        局部地理坐标系 <X>{r`n`}</X> 采用平地、惯性近似的 NED 坐标：
        <X>{r`x_n`}</X> 指向正北，<X>{r`y_n`}</X> 指向正东，<X>{r`z_n`}</X> 指向地心（向下）。
        机体坐标系 <X>{r`b`}</X> 的原点取在四旋翼质心，<X>{r`x_b`}</X> 指向机头，<X>{r`z_b`}</X> 沿机体下向，<X>{r`y_b`}</X> 由右手定则确定并指向机体右侧。
        第 <X>{r`i`}</X> 个螺旋桨坐标系 <X>{r`p_i`}</X> 的轴向沿该螺旋桨推力方向。
      </P>

      <H3 id="cs-notation">B. 旋转矩阵与符号约定</H3>
      <P>
        机体姿态由旋转矩阵 <X>{r`R_b^n`}</X> 描述，它把一个向量从机体系 <X>{r`b`}</X> 旋转到地理系 <X>{r`n`}</X>；其逆变换由转置给出：
      </P>
      <TeX block>{r`a^n=R_b^na^b`}</TeX>
      <TeX block>{r`R_n^b=(R_b^n)^T`}</TeX>
      <P>
        上标表示向量在哪个坐标系下表达。例如 <X>{r`p^n`}</X>、<X>{r`v^n`}</X> 是地理系下的位置与速度，<X>{r`\omega^b`}</X> 是机体系角速度。
        旋转矩阵下标 <X>{r`R_{\text{from}}^{\text{to}}`}</X> 读作「从 from 系到 to 系」。
      </P>
      <P>
        对任意向量 <X>{r`\boldsymbol{a}=[a_1,a_2,a_3]^T`}</X>，其反对称矩阵定义为
      </P>
      <TeX block>{r`[\boldsymbol{a}]_\times=\begin{bmatrix}0&-a_3&a_2\\a_3&0&-a_1\\-a_2&a_1&0\end{bmatrix}`}</TeX>
      <P>
        它满足 <X>{r`[\boldsymbol{a}]_\times\boldsymbol{b}=\boldsymbol{a}\times\boldsymbol{b}`}</X>。符号 <X>{r`(\cdot)^\vee`}</X> 表示反对称矩阵到向量的逆映射。
      </P>
      <P>
        这些记号的完整形式（如 <X>{r`R_b^n`}</X> 用欧拉角展开）将在下一章给出；这里只要求掌握读法。
      </P>

      <H3 id="cs-geometry">C. 基准四旋翼几何</H3>
      <P>
        为把通用公式写成可计算的具体形式，本章后续采用对称 X 构型作为基准。令 <X>{r`l`}</X> 为质心到每个旋翼中心的距离，并定义
      </P>
      <TeX block>{r`a=\frac{l}{\sqrt{2}}`}</TeX>
      <P>
        四个旋翼按前右、后右、后左、前左的顺序编号为 1–4，它们在机体系下的安装位置为
      </P>
      <TeX block>{r`\begin{aligned}r_1^b&=[a,a,0]^T,&r_2^b&=[-a,a,0]^T,\\r_3^b&=[-a,-a,0]^T,&r_4^b&=[a,-a,0]^T\end{aligned}`}</TeX>
      <P>
        其中 <X>{r`r_i^b`}</X> 表示第 <X>{r`i`}</X> 个旋翼中心相对质心的位置。所有旋翼推力方向均沿机体下向，即
      </P>
      <TeX block>{r`e_{T,i}^b=[0,0,-1]^T`}</TeX>
      <P>
        旋翼角动量方向符号记为 <X>{r`s_i\in\{+1,-1\}`}</X>，机体气动反扭矩方向符号记为 <X>{r`\chi_i\in\{+1,-1\}`}</X>。基准构型取
      </P>
      <TeX block>{r`s=\chi=[1,-1,1,-1]^T`}</TeX>
      <P>
        表示对角位置的旋翼同向旋转，相邻旋翼反向旋转。这一编号与方向贯穿后续控制分配矩阵的推导，请以此处为准。
      </P>

      <Callout title="阅读约定">
        全文凡上标 <X>{r`(\cdot)^n`}</X> 均指量在地理系下表达，上标 <X>{r`(\cdot)^b`}</X> 指机体系下表达；
        旋转矩阵下标 <X>{r`R_{\text{from}}^{\text{to}}`}</X> 读作「从 from 系到 to 系」。
      </Callout>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`n`}</X>, '局部地理坐标系（NED：北-东-下）'],
          [<X>{r`b`}</X>, '机体坐标系（原点在质心）'],
          [<X>{r`p_i`}</X>, <>第 <X>{r`i`}</X> 个螺旋桨坐标系，轴向沿推力方向</>],
          [<X>{r`R_b^n`}</X>, '从机体系到地理系的旋转矩阵'],
          [<X>{r`R_n^b`}</X>, <>从地理系到机体系的旋转矩阵，等于 <X>{r`R_b^n`}</X> 的转置</>],
          [<X>{r`[\cdot]_\times`}</X>, '向量对应的反对称矩阵'],
          [<X>{r`(\cdot)^\vee`}</X>, '反对称矩阵到向量的映射'],
          [<X>{r`l,a`}</X>, '质心到旋翼中心的距离及其 X 构型投影'],
          [<X>{r`r_i^b`}</X>, <>第 <X>{r`i`}</X> 个旋翼中心相对质心的位置</>],
          [<X>{r`e_{T,i}^b`}</X>, <>第 <X>{r`i`}</X> 个旋翼推力方向单位向量</>],
          [<X>{r`s_i,\chi_i`}</X>, <>第 <X>{r`i`}</X> 个旋翼角动量方向符号和反扭矩方向符号</>],
        ]}
      />
    </section>
  )
}
