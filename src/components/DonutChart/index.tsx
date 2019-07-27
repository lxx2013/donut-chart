import React, { ReactNode, ReactElement } from 'react';
import ReactDOM from 'react-dom';
import donutChartWithCanvas from './donutChartWithCanvas';
import './donutChart.css';

interface Props {
  /** canvas attr 宽度, 决定画布宽度 */
  width: number;
  /** canvas attr 高度, 决定画布高度 */
  height: number;
  /** 每段圆弧对应的百分比(小数), 默认值[0.33,0,33,0.33] */
  values: number[];
  /** 每段圆弧对应的常驻 label */
  labels?: ReactNode[];
  /** 每段圆弧对应的浮动 tooltip, 当鼠标浮在圆弧上时会显示 */
  tooltips?: ReactElement[];
  /** 圆弧从大到小显示的颜色, 默认值为蓝红绿 */
  colors?: string[];
  /** 圆弧连接处的样式, 默认值为圆角(round) */
  lineCap?: 'round' | 'butt';
}

/**
 * 该组件用 canvas 绘制一个环形图. 且保证在首次 render 后不再触发 rerender, 后续操作都直接操作 DOM 进行
 */
export default class DonutChart extends React.Component<Props> {
  private static defaultProps: Props = {
    width: 600,
    height: 600,
    values: [0.33, 0.33, 0.33],
    colors: ['#4f83f7', '#ec4944', '#52b49c'],
    lineCap: 'round'
  };
  /** 鼠标 hover 在其上的圆环的序号 */
  private hoverIndex: number = -1;
  public get renderLabels() {
    return (this.props.labels || []).map(label => <div className="donut-chart-label">{label}</div>);
  }
  public get renderTooltip() {
    return (this.props.tooltips || [])[this.hoverIndex];
  }
  public render() {
    const { width, height } = this.props;
    return (
      <div id="donut-chart-wrapper" style={{ width, height }}>
        <canvas id="donut-chart-canvas" width={width} height={height}>
          Your browser don't support Canvas!
        </canvas>
        {this.renderLabels}
        <div id="donut-chart-tooltip">
          <div id="donut-chart-tooltip-content" />
        </div>
      </div>
    );
  }
  public componentDidMount() {
    const values = [0.4, 0.3, 0.2, 0.05, 0.03, 0.01, 0.0099, 0.0001];
    var donut = new donutChartWithCanvas('donut-chart-canvas', {
      values,
      lineCap: 'round'
    });
    let self = this;
    const tooltipDiv = document.getElementById('donut-chart-tooltip') as HTMLElement;
    donut.init(document.getElementById('donut-chart-wrapper') as HTMLElement, function(
      x: number,
      y: number,
      hoverIndex: number
    ) {
      tooltipDiv.style.transform = `translate(${x}px,${y}px)`;
      if (hoverIndex !== -1) {
        if (self.hoverIndex !== hoverIndex) {
          self.hoverIndex = hoverIndex;
          tooltipDiv.style.opacity = '1';
          ReactDOM.render(
            <span>{values[hoverIndex] * 100 + '%'}</span> || self.renderTooltip,
            document.getElementById('donut-chart-tooltip-content')
          );
        }
      } else {
        tooltipDiv.style.opacity = '0';
        self.hoverIndex = -1;
      }
    });
  }
}
