import React from 'react';
import BeeDonutChart, { OnePieceDataType, TooltipType } from './components/bee-donut-chart';
import levelChart from './levelChart';
const defaultState = {
  canShow: false,
  tooltipHeight: 160
};
type State = typeof defaultState;
type defaultProps = { onChartClick?: (data: any) => void };
type Props = defaultProps;

export default class Overview extends React.Component<Props, State> {
  public readonly state: State = defaultState;
  private readonly donutColors = ['#4E83FD', '#64D258', '#fdb25c'];
  private readonly highlightColors = ['#3370ff', '#64d258', '#ff8800'];
  private readonly labelLineColors = [
    'rgba(51,112,255,0.6)',
    'rgba(100,210,88,0.6)',
    'rgba(255,136,00,0.6)'
  ];
  private readonly shadowColors = ['#BACEFD', '#B7EDB1', '#FED4A4'];
  private get clickParams() {
    return ['noAdjustLevel', 'upLevel', 'downLevel'].map(key => ({ [key]: true }));
  }
  /**  构建固定label中的数据 */
  private get labels() {
    const data = levelChart;
    const total = data.count;
    return [
      {
        text: '文字',
        num: data.originCount,
        percent: numToPercent(data.originCount / total),
        tooltipContent: '文字',
        color: '#0b296e',
        rightColor: '#3370ff'
      },
      {
        text: '文字',
        num: data.upCount,
        percent: numToPercent(data.upCount / total),
        color: '#364200',
        rightColor: '#64d258'
      },
      {
        text: '文字',
        num: data.downCount,
        percent: numToPercent(data.downCount / total),
        color: '#5c3a00',
        rightColor: '#ff8800'
      }
    ];
  }
  /** 构建浮动 tooltip 中的数据 */
  private get tooltips() {
    const data = levelChart;
    return [
      {
        title: '文字',
        values: [
          { desc: '文字', num: data.notFitAdjustOriginCount },
          { desc: '文字', num: data.fitAdjustOriginCount }
        ],
        backgroundColor: '#e1eaff',
        color: '#3370ff'
      },
      {
        title: '文字',
        values: [
          { desc: '文字', num: data.notFitAdjustUpCount },
          { desc: '文字', num: data.fitAdjustUpCount }
        ],
        backgroundColor: '#D9F5D6',
        color: '#64d258'
      },
      {
        title: '文字',
        values: [
          { desc: '文字', num: data.notFitAdjustDownCount },
          { desc: '文字', num: data.fitAdjustDownCount }
        ],
        backgroundColor: '#FEEAD2',
        color: '#ff8800'
      }
    ] as TooltipType[];
  }
  public render() {
    const count = levelChart.count;
    let pieces: OnePieceDataType[] = [
      { absoluteValue: levelChart.originCount },
      { absoluteValue: levelChart.upCount },
      { absoluteValue: levelChart.downCount }
    ].map((obj, idx: any) =>
      Object.assign(obj, {
        type: idx,
        label: this.labels[idx],
        tooltip: this.tooltips[idx],
        clickParam: this.clickParams[idx],
        donutColor: this.donutColors[idx],
        highlightColor: this.highlightColors[idx],
        labelLineColor: this.labelLineColors[idx],
        shadowColor: this.shadowColors[idx]
      })
    );
    pieces = pieces.filter(piece => piece.absoluteValue > 0); // 过滤掉非0值
    pieces = pieces.sort((p1, p2) => p2.absoluteValue - p1.absoluteValue); // 按从大到小顺序排序
    return (
      <BeeDonutChart
        type={'level'}
        total={count}
        pieces={pieces}
        onChartClick={() => console.log('chart click')}
        centerBoardContent={'文字'}
      />
    );
  }
  public componentDidMount() {}
}

function numToPercent(num: number) {
  return (Math.round(num * 100 * 10) / 10).toFixed(1) + '%';
}
