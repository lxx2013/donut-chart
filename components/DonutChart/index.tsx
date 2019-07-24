import React, { ReactNode } from 'react';

interface Props {
  /** canvas attr 宽度, 决定画布宽度 */
  width: number;
  /** canvas attr 高度, 决定画布高度 */
  height: number;
  /** 每段圆弧对应的常驻 label */
  labels?: ReactNode[];
  /** 每段圆弧对应的浮动 tooltip, 当鼠标浮在圆弧上时会显示 */
  tooltips?: ReactNode[];
  /** 圆弧从大到小显示的颜色, 默认值为蓝红绿 */
  colors?: string[];
  /** 圆弧连接处的样式, 默认值为圆角(round) */
  lineCap?: 'round' | 'butt' | 'square';
}
export default class DonutChart extends React.Component<Props> {
  private static defaultProps: Props = {
    width: 300,
    height: 300,
    colors: ['#4f83f7', '#ec4944', '#52b49c'],
    lineCap: 'round'
  };

  public render() {
    const { width, height } = this.props;
    return <canvas id="canvas">Your browser don't support Canvas!</canvas>;
  }
}
