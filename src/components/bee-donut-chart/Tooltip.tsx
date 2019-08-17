import React from 'react';
import { TooltipType } from './index';
interface Props {
  tooltip: TooltipType;
  highlightColor: string;
  backgroundColor: string;
  type: 'level' | 'salary';
}

export default class Tooltip extends React.Component<Props, {}> {
  public render() {
    const {
      tooltip: { title, values },
      highlightColor,
      backgroundColor,
      type
    } = this.props;
    /** 处理数据, 输入的是string,string, 用 前者,后者 分别除以二者和得到百分比  */
    const total = values.reduce((acc, cur) => acc + cur.num, 0);
    const percentify = (num: number) => Math.round((num / total) * 100 * 10) / 10 + '%';
    return (
      <div className="donut-chart-tooltip-content">
        <div className="tooltip-title">{title}</div>
        {values.map(({ desc, num }) => (
          <div className="tooltip-row" key={desc}>
            <p>
              {desc + '    '}
              <span className={type === 'salary' ? 'tooltip-wrap' : ''}>
                {num + ' ' + '人' + ' / ' + percentify(num)}
              </span>
            </p>
            <div style={{ cursor: num > 0 ? 'pointer' : 'auto' }}>
              <i style={{ width: '100%', backgroundColor }} />
              <i style={{ width: percentify(num), backgroundColor: highlightColor }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
}
