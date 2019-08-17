import React from 'react';

interface Props {
  number: number;
  tooltipContent?: string;
}
export default class CenterBoard extends React.Component<Props, {}> {
  public render() {
    const { number } = this.props;
    return (
      <div className="donut-chart-center-board">
        <div className="number">{number.toFixed(0)}</div>
        <div className="title">{'共计'}</div>
      </div>
    );
  }
}
