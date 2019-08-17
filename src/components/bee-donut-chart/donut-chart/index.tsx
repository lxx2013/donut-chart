import React, { ReactNode, ReactElement } from 'react';
import ReactDOM from 'react-dom';
import DonutChartWithCanvas from './DonutChartWithCanvas';
import CenterBoard from '../CenterBoard';
import { OnePieceDataType } from '../';

interface Props {
  type: 'level' | 'salary';
  pieces: OnePieceDataType[];
  onClick: (data: any) => void;
  onTooltipClick: (data: any, hoverIndex: number) => void;
  /** canvas attr 宽度, 决定画布宽度 */
  width: number;
  total: number;
  /** canvas attr 高度, 决定画布高度 */
  height: number;
  radius?: number;
  lineWidth?: number;
  /** 每段圆弧对应的百分比(小数), 默认值[0.33,0,33,0.33] */
  values: number[];
  /** 每段圆弧对应的常驻 label */
  labels?: ReactNode[];
  /** 每段圆弧对应的浮动 tooltip, 当鼠标浮在圆弧上时会显示 */
  tooltips?: ReactElement[];
  tooltipHeight: number;
  /** 圆弧从大到小显示的颜色, 默认值为蓝红绿 */
  colors?: string[];
  highlightColors?: string[];
  backgroundColor?: string;
  labelLineColors?: string[];
  shadowColors?: string[];
  /** 圆弧连接处的样式, 默认值为圆角(round) */
  lineCap?: 'round' | 'butt';
  centerBoardContent?: string;
}
export var donut: any;
/**
 * 该组件用 canvas 绘制一个环形图. 且保证在首次 render 后不再触发 rerender, 后续操作都直接操作 DOM 进行
 */
export default class DonutChart extends React.Component<Props> {
  public static defaultProps: Props = {
    pieces: [],
    type: 'level',
    width: 600,
    height: 600,
    total: 100,
    values: [0.33, 0.33, 0.33],
    lineCap: 'round',
    tooltipHeight: 160,
    labels: Object.keys(Array.from({ length: 8 })).map(x => 'l' + x),
    onClick: () => {},
    onTooltipClick: () => {}
  };
  /** 鼠标 hover 在其上的圆环的序号 */
  private hoverIndex: number = -1;
  /** 鼠标上一次 hover 的圆环的序号, 用于鼠标 hover 在 tooltip 上时强行指定圆环高亮 */
  private lastHoverIndex: number = -1;
  private labels: HTMLElement[] = [];

  public get renderLabels() {
    return (this.props.labels || []).map((label, index) => (
      <div className={`donut-chart-label donut-chart-label-${this.props.type}`} key={index}>
        {label}
      </div>
    ));
  }
  public get renderTooltip() {
    return (this.props.tooltips || [])[this.hoverIndex];
  }

  public render() {
    const { width, height, type, centerBoardContent } = this.props;
    return (
      <div
        id={'donut-chart-' + type}
        className="donut-chart-wrapper"
        style={{ width, height }}
        onClick={() => this.hoverIndex !== -1 && this.props.onClick(this.hoverIndex)}
      >
        <canvas
          id={`donut-chart-canvas-${type}`}
          className="donut-chart-canvas"
          width={width}
          height={height}
        >
          Your browser don't support Canvas!
        </canvas>
        {this.renderLabels}
        <div
          id={`donut-chart-tooltip-${type}`}
          className="opacity0 donut-chart-tooltip"
          onClick={e => {
            e.stopPropagation();
            this.props.onTooltipClick(e, this.lastHoverIndex);
          }}
        />
        <CenterBoard number={this.props.total} tooltipContent={centerBoardContent} />
      </div>
    );
  }
  public componentDidMount() {
    const { type, tooltipHeight } = this.props;
    const wrapper = document.getElementById(`donut-chart-${type}`) as HTMLElement;
    donut = new DonutChartWithCanvas(
      `donut-chart-canvas-${type}`,
      this.props,
      this.getLabelCenteredPositions()
    );
    const tooltipDiv = document.getElementById(`donut-chart-tooltip-${type}`) as HTMLElement;
    let timer: number;
    tooltipDiv.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      donut.hoverIndexImportant = this.lastHoverIndex;
    });
    tooltipDiv.addEventListener('mouseleave', () => {
      if (this.hoverIndex === -1) {
        tooltipDiv.classList.add('opacity0');
        timer = 0;
        donut.hoverIndexImportant = -1;
      }
    });
    wrapper.addEventListener('mouseleave', () => {
      wrapper.style.cursor = 'auto';
      tooltipDiv.classList.remove('active');
      tooltipDiv.style.visibility = 'hidden';
      this.hoverIndex = -1;
      donut.hoverIndex = -1;
      donut.render();
    });
    // window.donut = donut;
    donut.init(wrapper, (x: number, y: number, hoverIndex: number, angle: number) => {
      if (hoverIndex !== -1) {
        tooltipDiv.style.transform = `translate(${x + 40}px,${y - tooltipHeight / 2}px)`;

        if (this.hoverIndex !== hoverIndex) {
          this.lastHoverIndex = this.hoverIndex = hoverIndex;
          clearTimeout(timer);
          timer = 0;

          ReactDOM.render(
            this.renderTooltip || <span>{this.props.values[hoverIndex] * 100 + '%'}</span>,
            tooltipDiv
          );
          wrapper.style.cursor = 'pointer';
          tooltipDiv.style.visibility = 'visible';
          tooltipDiv.classList.add('active');
          tooltipDiv.classList.remove('opacity0');
          this.labels.forEach(label => label.classList.remove('active'));
          this.labels[hoverIndex].classList.add('active');
        }
      } else {
        tooltipDiv.classList.add('opacity0');
        wrapper.style.cursor = 'auto';
        if (timer === 0) {
          timer = window.setTimeout(() => {
            tooltipDiv.classList.remove('active');
            tooltipDiv.style.visibility = 'hidden';
          }, 350);
        }
        this.hoverIndex = -1;
      }
    });
  }
  public componentDidUpdate() {
    const wrapper = document.getElementById(`donut-chart-level`) as HTMLElement;
    donut = new DonutChartWithCanvas(
      `donut-chart-canvas-level`,
      this.props,
      this.getLabelCenteredPositions()
    );
    // window.donut = donut;
    donut.init(wrapper, (x: number, y: number, hoverIndex: number, angle: number) => {});
  }
  /**
   *  获取每个 label 对应的细线的终点的位置. 左边的 label 以右侧终点为准, 右边的 label 以左侧中点为准, wrapper 的左上角为0,0坐标
   */
  public getLabelCenteredPositions = () => {
    const { type } = this.props;
    const labels = (this.labels = Array.from(
      document.querySelectorAll(`.donut-chart-label-${type}`)
    ));
    const length = labels.length;
    const wrapperRect = document.querySelector(`#donut-chart-${type}`)!.getBoundingClientRect();
    const labelRects = labels.map(labelDOM => labelDOM.getBoundingClientRect());
    const res: Array<{ x: number; y: number }> = [];
    const MARGIN = 25; // 细线和文字之间的水平空白距离
    res[0] = { x: labelRects[0].width + MARGIN, y: wrapperRect.height - labelRects[0].height / 2 }; // 第1个 label, 默认放置于左下角
    if (length >= 2) {
      res[1] = { x: wrapperRect.width - labelRects[1].width - MARGIN, y: labelRects[1].height / 2 }; // 第2个 label, 默认放置于右上角
    }
    if (length >= 3) {
      res[2] = { x: labelRects[1].width + MARGIN, y: labelRects[1].height / 2 }; // 第3个 label, 默认放置于左上角
    }
    return res;
  };
}
