const defaultOption = {
  originXpercent: 0.5,
  originYpercent: 0.5,
  radius: 200,
  lineWidth: 10,
  stokeStyle: '#ccc',
  values: [0.4, 0.3, 0.2, 0.09, 0.01],
  colors: ['rgb(69,121,207)', 'rgb(196,73,68)', 'rgb(82,160,156)', '#ff0000', '#00ff00', '#0000ff'], //这一组颜色是在下面的基础上让主色-20或-40得到的
  highlightColors: ['rgb(99,151,247)', 'rgb(236,73,68)', 'rgb(82,180,156)'], //这一组颜色是取色器在设计图上取色得到的
  capType: 'round' || 'butt' || 'square'
};

const ROTATE_ANGLE = -90; //将坐标系逆时针旋转90度以使得后续坐标系以12点方向为起点
const START_ANGLE = -30; // 根据设计图上目测是从11点方向开始逆时针转的, 这个初始角度可以修改
/**
 * 使用 canvas api 绘制一个圆环
 * @description 默认圆心在正中间, 角度以12点钟方向为0度, 逆时针为增加度数
 * x轴指向圆心向右, y轴指向圆心向下
 */
export default class donutChartWithCanvas {
  public option: typeof defaultOption;
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  /** 鼠标 hover 的圆弧下标 */
  public hoverIndex: number = -1;
  /** 放大倍数,为了高清屏幕抗锯齿, 绘制更大的图再用宽高让它缩小 */
  public rate: number;
  /** 存放圆弧绘制数据的数组 */
  private _arcArray: Array<{ startAngle: number; endAngle: number }> = [];

  constructor(canvasId: string, option: Partial<typeof defaultOption>) {
    const canvas = (this.canvas = document.getElementById(canvasId) as HTMLCanvasElement);
    const ctx = (this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D);
    this.option = defaultOption;
    Object.assign(this.option, option);
    //下面设置 canvas 的相关属性
    const { width, height } = canvas; //获取 canvas 的 attr 上指定的宽高(与 style 的宽高不同)
    this.rate = window.devicePixelRatio ? window.devicePixelRatio * 2 : 4;
    [canvas.style.width, canvas.style.height] = [width + 'px', height + 'px'];
    [canvas.width, canvas.height] = [width * this.rate, height * this.rate];
    ctx.scale(this.rate, this.rate);
    //移动坐标系, 使得圆心在中间, 角度0从12点钟方向开始(逆时针)
    ctx.translate(this.option.originXpercent * width, this.option.originYpercent * height);
    ctx.rotate(aToR(ROTATE_ANGLE));
  }

  public init(dom: HTMLElement, callback: (x: number, y: number, hoverInde: number) => void) {
    if (callback && typeof callback !== 'function') {
      throw new Error('[donutChartWithCanvas] init() 第一个参数必须是函数或 undefined!');
    }

    //计算特殊角度
    const specialAngle =
      (Math.atan(this.option.lineWidth / 2 / this.option.radius) / Math.PI) * 180;
    console.log(specialAngle);

    //下面开始计算数据填充至 this._arcArray
    let _lastAngel = START_ANGLE;
    this.option.values.forEach((value, index) => {
      let endAngle = _lastAngel - value * 360; //用减法来逆时针旋转 , 再从区间[-720,360)映射至[0,360)区间中
      this._arcArray[index] = {
        startAngle: _lastAngel,
        endAngle: endAngle + 2 * specialAngle
      };
      _lastAngel = endAngle;
    });
    console.log(this._arcArray);
    //初始绘制
    this.render();

    //暴露鼠标移动事件给外层
    const { option } = this;
    dom.addEventListener(
      'mousemove',
      (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        let x = e.layerX - dom.offsetWidth / 2;
        let y = e.layerY - dom.offsetHeight / 2;
        let x2 = x * x;
        let y2 = y * y;
        const isBiggerThanInner = Math.sqrt(x2 + y2) > option.radius - option.lineWidth / 2;
        const isSmallerThanOuter = Math.sqrt(x2 + y2) < option.radius + option.lineWidth / 2;
        // 判断是 hover 在空白上还是 hover 在圆弧上
        if (!isBiggerThanInner || !isSmallerThanOuter) {
          //console.log('我还是纯洁的白色', e.offsetX, e.offsetY);
          if (this.hoverIndex !== -1) {
            this.hoverIndex = -1;
            this.render();
          }
          callback(e.layerX, e.layerY, -1);
        } else {
          var angle = Math.atan2(x, -y) / (Math.PI / 180); //这个 angle 角度表示以12点方向为0度, 顺时针的角度, 再加修正值
          angle = angle > 0 ? angle : 360 + angle;
          //console.log('啊我趴在圆弧上', x, y, angle);
          //计算 hoverIndex 下面用 for 循环是为了能尽早 break
          for (let i = 0; i < this._arcArray.length; i++) {
            const arc = this._arcArray[i];
            if (isBetween(angle, arc.startAngle, arc.endAngle)) {
              //发现 angle < endAngle 就可以确定鼠标浮动的 index 了
              if (i !== this.hoverIndex) {
                //如果 hoverIndex 需要改变,则执行 render
                this.hoverIndex = i;
                this.render();
              }
              callback(e.layerX, e.layerY, i);
              break;
            }
          }
        }
      },
      true
    );
  }
  /**
   * 画一个从 startAngle 至 endAngle 的圆环, 颜色为输入的 color.
   * 其它参数取自 this.option
   */
  public drawArc(startAngle: number, endAngle: number, color: string) {
    const {
      ctx,
      option: { radius, lineWidth, capType }
    } = this;
    ctx.beginPath();
    ctx.arc(0, 0, radius, aToR(startAngle), aToR(endAngle), true /** 逆时针 */);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle =
      color ||
      console.warn('圆环图输入的数据数量和输入的颜色数量不一致,请检查.默认渲染随机颜色') ||
      '#' + ((Math.random() * 0xffffff) | 0x100000).toString(16);
    ctx.lineCap = capType as CanvasLineCap;
    ctx.stroke();
    ctx.closePath();
  }
  public render() {
    //先画一层灰色底
    this.drawArc(0, 360, '#ccc');
    //绘制每个圆弧
    (this._arcArray || []).forEach((item, index) => {
      this.drawArc(
        item.startAngle,
        item.endAngle,
        this.hoverIndex === index ? this.option.highlightColors[index] : this.option.colors[index]
      );
    });
  }
}

/**
 * angleToRadian
 */
function aToR(angle: number) {
  return (angle / 180) * Math.PI;
}

/**
 * 判断角度 target 是否在角度 start 和 end 之间, start => end 的方向是逆时针.
 * 传入的 target 如果是顺时针增加的角度值那么当 target > end && target < start 时返回 true
 */
function isBetween(target: number, start: number, end: number) {
  start = angleNormalize(start);
  end = angleNormalize(end);
  if (end > start) {
    end = end - 360;
  }
  target = angleNormalize(target);
  return (target > end && target < start) || (target - 360 > end && target - 360 < start);
}
/** 将一个 [ -Infinity, +Infinity ) 的角度格式化到 [0,360) 区间中 */
const angleNormalize = (angle: number) => ((angle % 360) + 360) % 360;
