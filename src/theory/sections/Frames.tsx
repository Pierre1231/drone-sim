import { TeX } from '../TeX'
import { H2, P, Lead, ParamTable, Callout } from '../prose'

const r = String.raw
function X({ children }: { children: string }) {
  return <TeX>{children}</TeX>
}

export default function Frames() {
  return (
    <section>
      <H2 id="frames">II. 坐标系</H2>
      <Lead>
        建模采用地理系、机体系和螺旋桨坐标系描述位置、姿态、推进力和外部作用方向。
        三个坐标系各司其职：地理系承载导航与重力，机体系承载惯量与推进力，螺旋桨坐标系刻画单个旋翼的轴向来流。
      </Lead>

      <ParamTable
        head={['坐标系', '含义']}
        rows={[
          [
            <X>{r`n`}</X>,
            <>
              局部地理坐标系，采用平地和惯性近似的 NED 坐标，<X>{r`x_n`}</X> 指北，<X>{r`y_n`}</X> 指东，<X>{r`z_n`}</X> 向下
            </>,
          ],
          [
            <X>{r`b`}</X>,
            <>
              机体坐标系，原点取在四旋翼质心，<X>{r`x_b`}</X> 指向机头，<X>{r`z_b`}</X> 沿机体下向，<X>{r`y_b`}</X> 由右手定则确定并指向机体右侧
            </>,
          ],
          [
            <X>{r`p_i`}</X>,
            <>
              第 <X>{r`i`}</X> 个螺旋桨坐标系，轴向沿该螺旋桨推力方向
            </>,
          ],
        ]}
      />

      <P>机体系到地理系的旋转矩阵：</P>
      <TeX block>{r`R_b^n`}</TeX>
      <P>地理系到机体系的旋转矩阵：</P>
      <TeX block>{r`R_n^b=(R_b^n)^T`}</TeX>

      <ParamTable
        head={['符号', '含义']}
        rows={[
          [<X>{r`R_b^n`}</X>, <>从机体系 <X>{r`b`}</X> 到地理系 <X>{r`n`}</X> 的旋转矩阵</>],
          [<X>{r`R_n^b`}</X>, <>从地理系 <X>{r`n`}</X> 到机体系 <X>{r`b`}</X> 的旋转矩阵</>],
        ]}
      />

      <H2 id="notation">III. 符号约定</H2>
      <P>
        上标表示变量的表达坐标系。<X>{r`p^n`}</X>、<X>{r`v^n`}</X> 分别表示地理系下的位置和速度，
        <X>{r`\omega^b`}</X> 表示机体系下的角速度。<X>{r`R_b^n`}</X> 表示从机体系到地理系的旋转矩阵，
        <X>{r`R_n^b=(R_b^n)^T`}</X> 表示从地理系到机体系的旋转矩阵。<X>{r`[\omega^b]_\times`}</X> 表示由角速度构造的反对称矩阵，
        <X>{r`(\cdot)^\vee`}</X> 表示反对称矩阵到向量的映射。
      </P>

      <Callout title="阅读约定">
        全文凡上标 <X>{r`(\cdot)^n`}</X> 均指量在地理系下表达，上标 <X>{r`(\cdot)^b`}</X> 指机体系下表达；
        旋转矩阵下标 <X>{r`R_{\text{from}}^{\text{to}}`}</X> 读作「从 from 系到 to 系」。后续章节默认遵循该约定，不再逐处说明。
      </Callout>
    </section>
  )
}
