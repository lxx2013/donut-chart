// tslint:disable: no-this-assignment
// 修改为函数形式, 是为了让调薪调级的 canvas 不共享同一份 option 内存而产生冲突
const getDefaultOption = () => ({
  originXpercent: 0.5,
  originYpercent: 0.5,
  radius: 200,
  lineWidth: 25,
  values: [0.4, 0.3, 0.2, 0.09, 0.01],
  backgroundColor: '#ccc',
  labelLineColors: ['#ff0000', '#ff0000', '#ff0000'],
  colors: [
    'rgb(69,121,207)',
    'rgb(196,73,68)',
    'rgb(82,160,156)',
    '#ca8623',
    '#bda29e',
    '#546570',
    '#52d58d'
  ],
  highlightColors: [
    'rgb(99,151,247)',
    'rgb(236,73,68)',
    'rgb(82,180,156)',
    '#de9226',
    '#cfb2a8',
    '#797b7f',
    '#62e58d'
  ],
  shadowColors: ['#ccc', '#ccc', '#ccc'],
  lineCap: 'round' || 'butt',
  startAngle: 0, // 环图画蓝色圆环的起始角度,
  /** 每个 label 对应的细线终点的位置 */
  labelCenterPositions: [{ x: 72, y: 268 }, { x: 492, y: 32 }, { x: 72, y: 32 }]
});
type defaultOption = ReturnType<typeof getDefaultOption>;

const ROTATE_ANGLE = -90; // 将坐标系逆时针旋转90度以使得后续坐标系以12点方向为起点
/**
 * 使用 canvas api 绘制一个圆环
 * @description 默认圆心在正中间, 角度以12点钟方向为0度, 逆时针为增加度数
 * x轴指向圆心向右, y轴指向圆心向下
 */
export default class DonutChartWithCanvas {
  public option: defaultOption;
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  /** 鼠标 hover 的圆弧下标 */
  public hoverIndex: number = -1;
  /** 放大倍数,为了高清屏幕抗锯齿, 绘制更大的图再用宽高让它缩小 */
  public rate: number;
  /** 外界可以控制的,强行指定高亮 index(一般用于鼠标 hover 在 tooltip 上但是在圆环外时) */
  public hoverIndexImportant: number = -1;
  /** 存放圆弧绘制数据的数组 */
  private _arcArray: Array<{ startAngle: number; endAngle: number }> = [];
  private SPECIAL_ANGLE: number;
  private originX: number; // 圆心坐标
  private originY: number; // 圆心坐标
  /** 圆弧对应的细线的起始角度, 默认为圆弧的中点角度, 但在特殊情况下会向 label 方向偏移 */
  private _arcAffinityAngles: number[] = [];

  constructor(canvasId: string, option: Partial<defaultOption>, labelCenterPositions: Array<{ x: number, y: number }>) {
    const canvas = (this.canvas = document.getElementById(canvasId) as HTMLCanvasElement);
    const ctx = (this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D);
    this.option = getDefaultOption();
    Object.assign(this.option, option, { labelCenterPositions });
    // 下面设置 canvas 的相关属性
    const { width, height } = canvas; // 获取 canvas 的 attr 上指定的宽高(与 style 的宽高不同)
    this.rate = window.devicePixelRatio ? window.devicePixelRatio * 2 : 4;
    [canvas.style.width, canvas.style.height] = [width + 'px', height + 'px'];
    [canvas.width, canvas.height] = [width * this.rate, height * this.rate];
    ctx.scale(this.rate, this.rate);
    // 移动坐标系, 使得圆心在中间, 角度0从12点钟方向开始(逆时针)
    ctx.translate(
      (this.originX = this.option.originXpercent * width),
      (this.originY = this.option.originYpercent * height)
    );
    ctx.rotate(aToR(ROTATE_ANGLE));
    this.SPECIAL_ANGLE = 0;
    // 若颜色设置不恰当则打印警告
    const { values, colors, highlightColors } = this.option;
    if (values.length !== colors.length || values.length !== highlightColors.length) {
      console.warn('圆环图输入的数据数量和颜色数量不一致,请检查(默认渲染随机颜色)');
    }
  }

  public init(
    dom: HTMLElement,
    callback: (x: number, y: number, hoverIndex: number, angle: number) => void
  ) {
    if (callback && typeof callback !== 'function') {
      throw new Error('[donutChartWithCanvas] init() 第一个参数必须是函数或 undefined!');
    }

    this.setArcArray(); // 以 startAngle 为0度计算各圆环角度数据
    // console.warn('_arcArray', this._arcArray);
    this.option.startAngle = computeStartAngle(this.option.values, this._arcArray); // 为最优显示效果再次设置 startAngle
    this.setArcArray(); // 重新计算圆环角度数据
    this.setAffinityAngle(); // 计算有亲和性的细线起始角度
    // 初始绘制
    this.render();

    // 暴露鼠标移动事件给外层
    const { option } = this;
    dom.addEventListener(
      'mousemove',
      (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const x = e.layerX - dom.offsetWidth / 2;
        const y = e.layerY - dom.offsetHeight / 2;
        let angle = Math.atan2(x, -y) / (Math.PI / 180); // 这个 angle 角度表示以12点方向为0度, 顺时针的角度, 再加修正值
        angle = angle > 0 ? angle : 360 + angle;
        const x2 = x * x;
        const y2 = y * y;
        const isBiggerThanInner = Math.sqrt(x2 + y2) > option.radius - option.lineWidth / 2;
        const isSmallerThanOuter = Math.sqrt(x2 + y2) < option.radius + option.lineWidth / 2;
        // 判断是 hover 在空白上还是 hover 在圆弧上
        if (isBiggerThanInner && isSmallerThanOuter) {
          // console.log('啊我趴在圆弧上', x, y, angle);

          /** 只有一个圆弧的特殊情况, 无须判断 angle 是否在 startAngle 和 endAngle 之间, 直接触发 hover */
          if (this._arcArray.length === 1) {
            this.hoverIndex = 0;
            this.render();
            callback(e.layerX, e.layerY, 0, angle);
            return
          }

          if (this.hoverIndexImportant !== -1) {
            return; /** 鼠标浮动在 tooltip 上时 mousemove 到新的圆弧上, 不触发 render */
          }
          // 计算 hoverIndex, 下面用 for 循环是为了能尽早 break
          for (let i = 0; i < this._arcArray.length; i++) {
            const arc = this._arcArray[i];
            if (isBetween(angle, arc.startAngle, arc.endAngle, this.SPECIAL_ANGLE)) {
              // 发现 angle < endAngle 就可以确定鼠标浮动的 index 了
              if (i !== this.hoverIndex) {
                // 如果 hoverIndex 需要改变,则执行 render
                this.hoverIndex = i;
                this.render();
              }
              callback(e.layerX, e.layerY, i, angle);
              break;
            }
          }
        } else {
          // console.log('我还是纯洁的白色', e.offsetX, e.offsetY);
          if (this.hoverIndexImportant !== -1) {
            this.hoverIndex = this.hoverIndexImportant;
            this.render();
          } else if (this.hoverIndex !== -1) {
            this.hoverIndex = -1;
            this.render();
          }
          callback(e.layerX, e.layerY, -1, angle);
        }
      },
      true
    );
  }
  // 计算 _arcArray
  public setArcArray() {
    /** 对只有一个数据的情况进行特殊处理, 显示效果为一整个圆圈 */
    if (this.option.values.length === 1) {
      this._arcArray = [{ startAngle: 0, endAngle: 360 }]
      return
    }
    // 如果 lineCap 是 'butt' 则无须计算圆弧边缘圆角相切
    if (this.option.lineCap === 'butt') {
      let _lastAngel = this.option.startAngle;
      this.option.values.forEach((value, index) => {
        const endAngle = _lastAngel - value * 360; // 用减法来逆时针旋转
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
       *
       * 第一版设计稿圆弧相切时, 3段圆弧的"共享长度修正量"为3个正圆的宽度
       * 第二版设计稿圆弧之间有0.5个正圆的间距, 所以该"共享长度修正量"更新为4.5个正圆的宽度
       */
      this.SPECIAL_ANGLE = rToA(Math.atan(this.option.lineWidth / 2 / this.option.radius));
      const LIMIT_ANGLE = 2 * this.SPECIAL_ANGLE;
      const PADDING_ANGLE = 0.75 * LIMIT_ANGLE; // 前面的第一个数字 n 代表圆弧和圆弧之间有n个正圆的间距
      const nums = this.option.values.length
      const totalAngleNeedToCut = (nums === 1 ? 0.7 : nums) * (LIMIT_ANGLE + PADDING_ANGLE);
      const ArcsNeedToCut = this.option.values.filter(value => value * 360 > LIMIT_ANGLE);
      const totalValue = ArcsNeedToCut.reduce((a, b) => a + b);
      // 下面开始计算数据填充至 this._arcArray
      let _lastAngel = this.option.startAngle;
      this.option.values.forEach((value, index) => {
        let endAngle = _lastAngel - value * 360; // 用减法来逆时针旋转
        if (ArcsNeedToCut.includes(value)) {
          endAngle = endAngle + (value / totalValue) * totalAngleNeedToCut; // 按比例分配"削减量"
        }
        this._arcArray[index] = {
          startAngle: _lastAngel,
          endAngle
        };
        _lastAngel = endAngle - (LIMIT_ANGLE + PADDING_ANGLE);
      });
    } else {
      throw new Error('lineCap 类型错误:' + this.option.lineCap);
    }
  }
  public setAffinityAngle() {
    const absX = Math.abs(this.originX - this.option.labelCenterPositions[0].x)
    const absY = Math.abs(this.originY - this.option.labelCenterPositions[0].y)
    /** 
     * acute angle 是锐角的意思, 指的是圆心到 label 连线的合适区域的边界值的那个锐角 
     * 如果连接 label 的细线不在[0, ACUTE_ANGLE]范围内的话就会很丑
     */
    const ACUTE_ANGLE = rToA(Math.abs(Math.atan(absX / absY)))
    const BLUR = 0.1 // 模糊值, 例如本来允许的范围是 [180,240) ,我们认为 [179.9, 240.1) 都行
    const availbleAngles = [
      { start: 180 + ACUTE_ANGLE, end: 180 - BLUR, recommend: 180 + ACUTE_ANGLE - BLUR },
      { start: ACUTE_ANGLE, end: 0 - BLUR, recommend: ACUTE_ANGLE - BLUR },
      { start: 0 - BLUR, end: -ACUTE_ANGLE, recommend: -ACUTE_ANGLE + BLUR }
    ]
    for (let i = 0; i < this._arcArray.length; i++) {
      this._arcAffinityAngles[i] = computeAvailbleAngleFrom2Interval(availbleAngles[i], this._arcArray[i])
    }
    // debugger
  }
  /**
   * 画一个从 startAngle 至 endAngle 的圆环, 颜色为输入的 color.
   * 其它参数取自 this.option
   */
  public drawArc(startAngle: number, endAngle: number, index: number) {
    const {
      ctx,
      option: { lineWidth, lineCap, shadowColors, highlightColors, colors }
    } = this;
    let radius = this.option.radius;
    let color = '';
    ctx.save();
    ctx.beginPath();

    ctx.lineWidth = lineWidth;
    if (this.hoverIndex === index) {
      ctx.shadowColor = shadowColors[index]
      color = highlightColors[index];
      ctx.shadowBlur = 18 * this.rate;
      ctx.shadowOffsetX = -4 * this.rate;
      ctx.shadowOffsetY = 4 * this.rate;
      ctx.lineWidth += 4;
      radius += 2;
    } else {
      ctx.shadowColor = 'rgba(255,255,255,0)';
      ctx.shadowBlur = 0;
      color = colors[index];
    }
    ctx.arc(0, 0, radius, aToR(startAngle), aToR(endAngle), true /** 逆时针 */);
    ctx.strokeStyle = color || '#' + ((Math.random() * 0xffffff) | 0x100000).toString(16);
    ctx.lineCap = lineCap as CanvasLineCap;

    ctx.stroke();
    ctx.restore();
    ctx.closePath();
  }
  /** 画一条连接 label 的折线 */
  public drawLineToLabel(startX: number, startY: number, angle: number, idx: number) {
    const DEFAULT_LENGTH = this.option.radius * 0.48;
    const [whiteX, whiteY] = [
      startX + 0.5 * DEFAULT_LENGTH * Math.sin(aToR(angle)),
      startY - 0.5 * DEFAULT_LENGTH * Math.cos(aToR(angle))
    ];
    const [endX, endY] = [this.option.labelCenterPositions[idx].x, this.option.labelCenterPositions[idx].y];
    const [midX, midY] = [
      whiteX + (whiteY - endY) * Math.tan(aToR(angle)),
      endY
    ];
    const { ctx } = this;
    ctx.save();
    ctx.rotate(aToR(-ROTATE_ANGLE));
    ctx.translate(-this.originX, -this.originY);
    ctx.scale(1 / this.rate, 1 / this.rate);

    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = this.option.labelLineColors[idx];
    ctx.moveTo(whiteX * this.rate, whiteY * this.rate); // 引入 whiteX 和 whiteY 来表示从圆弧到细线的一小段空白距离
    ctx.lineTo(midX * this.rate, midY * this.rate);
    ctx.lineTo(endX * this.rate, endY * this.rate);
    ctx.stroke();
    ctx.restore();
    ctx.closePath();
    return { x: endX, y: endY, angle };
  }
  public render() {
    this.ctx.clearRect(
      -this.canvas.width / 2,
      -this.canvas.height / 2,
      this.canvas.width,
      this.canvas.height
    );
    // 画 label 的细线
    this.getLabelPositions();
    // 绘制每个圆弧
    (this._arcArray || []).forEach((item, index) => {
      this.drawArc(item.startAngle, item.endAngle, index);
    });
  }
  public getLabelPositions() {
    const { option, originX, originY } = this;
    const line = option.radius + option.lineWidth / 2;
    return this._arcArray.map((item, idx) => {
      const midAngle = this._arcAffinityAngles[idx]
      const midRadian = aToR(midAngle);
      const x = originX + line * Math.sin(midRadian);
      const y = originY - line * Math.cos(midRadian);
      return this.drawLineToLabel(x, y, angleNormalize(midAngle), idx);
    });
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

/**
 * 设置最优展示效果所需的环图起始角度, 以12点钟方向为0度, 默认返回11点钟方向的 -30 度
 * @description 需求解释: 假如数据为[0.98,0.01,0.01]那么后二者的 label 会重叠在一起不好看.
 * 解决策略: 我们可以计算得到最小的两个环,然后通过旋转环图来使得这两个环分别处于12点钟方向的两侧
 */
function computeStartAngle(
  values: number[],
  _arcArray: Array<{ startAngle: number; endAngle: number }>
) {
  if (values.length === 1) {
    return 30; // 若只有1个圆弧,该圆弧会占满360度
  } else if (values.length === 2) {
    // 若只有两个圆弧, 返回第二个圆弧(次大圆弧)的中点角度
    return -(_arcArray[1].startAngle + _arcArray[1].endAngle) / 2
  }
  else {
    const angles = _arcArray.map((item, idx) => {
      const midAngle = (item.startAngle + item.endAngle) / 2;
      return midAngle;
    });
    const maxArcIndex = values.indexOf(Math.max(...values));
    /**
     * [未调级,晋级,降级]的数据若为[0.98,0.01,0.01] 则旋转约 -15度
     * 若为[0.01,0.98,0.01]则旋转约0度
     * 若为[0.01,0.01,0.98]则旋转约+15度
     */
    switch (maxArcIndex) {
      case 0:
        return -(angles[1] + angles[2]) / 2;
      case 1:
        return -(angles[0] + angles[2]) / 2;
      case 2:
        return -(angles[0] + angles[1]) / 2;
      default:
        return -30;
    }
  }
}

/**
 * 计算一个环对应的细线的角度, 默认情况是环的起始角度和 end 角度的平均值
 * @param affinityAngle 让环图的细线显示效果较好的角度区间
 * @param donutAngle 环图的一个环的起始角度和 end 角度
 */
function computeAvailbleAngleFrom2Interval(
  affinityAngle: { start: number, end: number, recommend: number },
  donutAngle: { startAngle: number, endAngle: number }
) {
  const originMidAngle = (donutAngle.startAngle + donutAngle.endAngle) / 2
  if (isBetween(affinityAngle.start, affinityAngle.end, originMidAngle, 0)) {
    return originMidAngle
  } else {
    // console.warn('type 2:', affinityAngle, donutAngle, affinityAngle.recommend)
    return affinityAngle.recommend
  }
}