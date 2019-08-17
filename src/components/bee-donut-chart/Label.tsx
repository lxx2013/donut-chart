import React from 'react';

interface Props {
  color: string;
  rightColor: string;
  text: string;
  num: number;
  percent: string;
  tooltipContent?: string;
}
export default class Label extends React.Component<Props, {}> {
  public render() {
    const { color, rightColor, text, percent, num } = this.props;
    return (
      <div className="donut-chart-label-content" style={{ color }}>
        <h2 style={{ color }}>{percent}</h2>
        <p>
          <strong>{text}</strong>
          <span style={{ backgroundColor: rightColor }}>{num}</span>
        </p>
      </div>
    );
  }
}
