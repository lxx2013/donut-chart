const defaultOption = {
  originXpercent: 0.5,
  originYpercent: 0.5,
  radius: 200,
  lineWidth: 25,
  values: [0.4, 0.3, 0.2, 0.09, 0.01],
  backgroundColor: '#ccc',
  labelLineColor: '#ff0000',
  colors: ['rgb(69,121,207)', 'rgb(196,73,68)', 'rgb(82,160,156)', '#ca8623', '#bda29e', '#546570', '#52d58d'],
  highlightColors: ['rgb(99,151,247)', 'rgb(236,73,68)', 'rgb(82,180,156)', '#de9226', '#cfb2a8', '#797b7f', '#62e58d'],
  lineCap: 'round' || 'butt'
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
  private SPECIAL_ANGLE: number;
  private originX: number; //圆心坐标
  private originY: number; //圆心坐标

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
    ctx.translate(this.originX = this.option.originXpercent * width, this.originY = this.option.originYpercent * height);
    ctx.rotate(aToR(ROTATE_ANGLE));
    this.SPECIAL_ANGLE = 0;
    //若颜色设置不恰当则打印警告
    const { values, colors, highlightColors } = this.option;
    if (values.length !== colors.length || values.length !== highlightColors.length) {
      console.warn('圆环图输入的数据数量和颜色数量不一致,请检查(默认渲染随机颜色)');
    }
  }

  public init(dom: HTMLElement, callback: (x: number, y: number, hoverInde: number) => void) {
    if (callback && typeof callback !== 'function') {
      throw new Error('[donutChartWithCanvas] init() 第一个参数必须是函数或 undefined!');
    }
    //如果 lineCap 是 'butt' 则无须计算圆弧边缘圆角相切
    if (this.option.lineCap === 'butt') {
      let _lastAngel = START_ANGLE;
      this.option.values.forEach((value, index) => {
        let endAngle = _lastAngel - value * 360; //用减法来逆时针旋转
        this._arcArray[index] = {
          startAngle: _lastAngel,
          endAngle
        };
        _lastAngel = endAngle;
      });
    } else if (this.option.lineCap === 'round') {
      /* 计算临界角度, 低于这个角度的圆弧将不会参与"长度修正量分配"
       * 所谓"长度修正量分配", 来源是: 一段圆角圆弧的实际长度 = 原长度+2*圆角半径, 这样会导致几个圆弧相切时, 总长度大于圆的周长
       * 一个直观的做法是让每个圆弧的"原长度"缩减"2*圆角半径", 这样对长圆弧很有效, 但数据极小(显示接近正圆)无法再"削减自身长度"了
       * 因此这个"削减量"要由长圆弧们共享, 而区分一段圆弧是长圆弧还是短圆弧, 需要根据圆的"半径"和"线宽"计算出一个临界值
       */
      this.SPECIAL_ANGLE = rToA(Math.atan(this.option.lineWidth / 2 / this.option.radius));
      const LIMIT_ANGLE = 2 * this.SPECIAL_ANGLE;
      const totalAngleNeedToCut = this.option.values.length * 2 * this.SPECIAL_ANGLE;
      const ArcsNeedToCut = this.option.values.filter(value => value * 360 > LIMIT_ANGLE);
      const totalValue = ArcsNeedToCut.reduce((a, b) => a + b);
      //下面开始计算数据填充至 this._arcArray
      let _lastAngel = START_ANGLE;
      this.option.values.forEach((value, index) => {
        let endAngle = _lastAngel - value * 360; //用减法来逆时针旋转
        if (ArcsNeedToCut.includes(value)) {
          endAngle = endAngle + (value / totalValue) * totalAngleNeedToCut; //按比例分配"削减量"
        }
        this._arcArray[index] = {
          startAngle: _lastAngel,
          endAngle
        };
        _lastAngel = endAngle - 2 * this.SPECIAL_ANGLE;
      });
    } else {
      throw new Error('lineCap 类型错误:' + this.option.lineCap)
    }

    console.log('_arcArray', this._arcArray);
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
            if (isBetween(angle, arc.startAngle, arc.endAngle, this.SPECIAL_ANGLE)) {
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
      option: { radius, lineWidth, lineCap }
    } = this;
    ctx.beginPath();
    ctx.arc(0, 0, radius, aToR(startAngle), aToR(endAngle), true /** 逆时针 */);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color || '#' + ((Math.random() * 0xffffff) | 0x100000).toString(16);
    ctx.lineCap = lineCap as CanvasLineCap;
    ctx.stroke();
    ctx.closePath();
  }
  /** 画一条连接 label 的折线, 返回折线末端的 x,y,angle */
  public drawLineToLabel(startX: number, startY: number, angle: number) {
    const DEFAULT_LENGTH = this.option.radius * 0.15
    const [midX, midY] = [startX + DEFAULT_LENGTH * Math.sin(aToR(angle)), startY - DEFAULT_LENGTH * Math.cos(aToR(angle))]
    const [endX, endY] = [midX + (angle > 180 ? -1 : 1) * 2 * DEFAULT_LENGTH, midY]
    const { ctx } = this
    ctx.save()
    ctx.rotate(aToR(-ROTATE_ANGLE));
    ctx.translate(-this.originX, -this.originY);
    ctx.scale(1 / this.rate, 1 / this.rate);

    ctx.beginPath()
    ctx.lineWidth = 2
    ctx.strokeStyle = this.option.labelLineColor
    //debugger
    ctx.moveTo(startX * this.rate, startY * this.rate)
    ctx.lineTo(midX * this.rate, midY * this.rate)
    ctx.lineTo(endX * this.rate, endY * this.rate)
    //ctx.moveTo(300 * this.rate, 300 * this.rate)
    //ctx.lineTo(100, 100)
    ctx.stroke();
    ctx.restore()
    ctx.closePath()
    return { x: endX, y: endY, angle }
  }
  public render() {
    //先画一层灰色底
    this.drawArc(0, 360, this.option.backgroundColor);
    //绘制每个圆弧
    (this._arcArray || []).forEach((item, index) => {
      this.drawArc(
        item.startAngle,
        item.endAngle,
        this.hoverIndex === index ? this.option.highlightColors[index] : this.option.colors[index]
      );
    });
  }
  public getLabelPositions() {
    const { option, originX, originY } = this
    const line = option.radius + option.lineWidth / 2
    return this._arcArray.map(item => {
      const midAngle = (item.startAngle + item.endAngle) / 2
      const midRadian = aToR(midAngle)
      const x = originX + line * Math.sin(midRadian)
      const y = originY - line * Math.cos(midRadian)
      return this.drawLineToLabel(x, y, angleNormalize(midAngle))
    })
  }

}

/** angleToRadian */
function aToR(angle: number) {
  return (angle / 180) * Math.PI;
}
/** radianToAngle */
function rToA(radian: number) {
  return (radian / Math.PI) * 180;
}

/**
 * 判断角度 target 是否在角度 start 和 end 之间, start => end 的方向是逆时针.
 * 传入的 target 如果是顺时针增加的角度值那么当 target > end && target < start 时返回 true
 * 考虑的圆角的边界范围, 用SPECIAL_ANGLE来校正
 */
function isBetween(target: number, start: number, end: number, SPECIAL_ANGLE: number) {
  start = angleNormalize(start + SPECIAL_ANGLE);
  end = angleNormalize(end - SPECIAL_ANGLE);
  if (end > start) {
    end = end - 360;
  }
  target = angleNormalize(target);
  return (target > end && target < start) || (target - 360 > end && target - 360 < start);
}
/** 将一个 [ -Infinity, +Infinity ) 的角度格式化到 [0,360) 区间中 */
const angleNormalize = (angle: number) => ((angle % 360) + 360) % 360;
