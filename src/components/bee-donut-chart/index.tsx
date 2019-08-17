import React from 'react';
import DonutChart from './donut-chart';
import Tooltip from './Tooltip';
import Label from './Label';
export { donut } from './donut-chart';

export interface TooltipType {
  title: string;
  values: Array<{ desc: string; num: number }>;
  backgroundColor: string;
  color: string;
}
export interface OnePieceDataType {
  /** 绝对人数,例如 100人 中的 60人  */
  absoluteValue: number;
  /** 该组数据类型, 0:未调级/未调薪, 1:晋级/涨薪, 2:降级/降薪 */
  type: 0 | 1 | 2;
  /** label 部分的文字, 可能是中文或英文 */
  label: {
    text: string;
    percent: string;
    num: number;
    tooltipContent?: string;
    color: string;
    rightColor: string;
  };
  clickParam: { [key: string]: boolean };
  tooltip: TooltipType;
  donutColor: string;
  highlightColor: string;
  labelLineColor: string;
  shadowColor: string;
}

const defaultState = {
  values: [0.8, 0.18, 0.02],
  canShow: false,
  tooltipHeight: 160
};

type State = typeof defaultState;
type defaultProps = {
  type: 'level' | 'salary';
  total: number;
  pieces: OnePieceDataType[];
  centerBoardContent?: string;
  onChartClick: (data: any) => void;
};

class BeeDonutChart extends React.Component<defaultProps, State> {
  public readonly state: State = defaultState;

  public get renderLabels() {
    const { pieces } = this.props;
    return pieces.map(({ label, type }, idx) => (
      <div
        key={type}
        onClick={() => {
          this.handleClick(idx, this.props.type);
        }}
      >
        <Label
          color={label.color}
          rightColor={label.rightColor}
          text={label.text}
          num={label.num}
          percent={label.percent}
          tooltipContent={label.tooltipContent}
        />
      </div>
    ));
  }
  public get getTooltips() {
    return this.props.pieces.map(({ tooltip, type }) => (
      <div key={type}>
        <Tooltip
          tooltip={tooltip}
          highlightColor={tooltip.color}
          backgroundColor={tooltip.backgroundColor}
          type={this.props.type}
        />
      </div>
    ));
  }
  public componentDidMount() {
    const { pieces } = this.props;
    let { total } = this.props;
    /**
     * 下面数字用于计算tooltip相关的偏移量, 配合 css 的样式来设置
     */
    const TOOLTIP_WRAPPER_PADDING = 40; /** tooltip 容器的 padding */
    const ONE_TIP_HEIGHT = 60; /** 根据 css 样式获取这个高度 */
    const rowNums = pieces[0].tooltip.values.length;
    const tooltipHeight = rowNums * ONE_TIP_HEIGHT + 2 * TOOLTIP_WRAPPER_PADDING;
    /** 规范化 values(数值=>小数,小于1%的计为0.001,完全等于0的数据已在父组件过滤掉) */
    let values = pieces.map(piece => piece.absoluteValue);
    values = values.map(num => (num / total > 0.01 ? num / total : num > 0 ? 0.001 : 0));
    total = values.reduce((a, b) => a + b);
    values = values.map(num => num / total);
    this.setState({ values, tooltipHeight, canShow: true });
  }
  public render() {
    const { values, tooltipHeight } = this.state;
    const { type, total, centerBoardContent, pieces } = this.props;
    /**  最极端的宽度表现就是英文模式且第二个数据为"未调级/未调薪" */
    const minWidth = pieces[1] && pieces[1].type === 0 ? 730 : 670;
    return (
      <div className="bee-donut-chart" style={{ minWidth }}>
        {this.state.canShow && (
          <DonutChart
            type={this.props.type}
            width={564}
            height={300}
            values={values}
            radius={75}
            pieces={pieces}
            backgroundColor="rgba(255,255,255,0)"
            colors={pieces.map(piece => piece.donutColor)}
            highlightColors={pieces.map(piece => piece.highlightColor)}
            labelLineColors={pieces.map(piece => piece.labelLineColor)}
            shadowColors={pieces.map(piece => piece.labelLineColor)}
            lineWidth={8}
            onClick={hoverIndex => {
              this.handleClick(hoverIndex, type);
            }}
            onTooltipClick={this.handleTooltipClick}
            labels={this.renderLabels}
            tooltips={this.getTooltips}
            tooltipHeight={tooltipHeight}
            total={total}
            centerBoardContent={centerBoardContent}
          />
        )}
      </div>
    );
  }
  public handleClick = (hoverIndex: number, type?: string) => {
    const param = this.props.pieces[hoverIndex].clickParam;
    if (hoverIndex !== -1) {
      this.props.onChartClick(param);
    }
  };
  public handleTooltipClick = (e: MouseEvent, hoverIndex: number) => {
    const { type, pieces } = this.props;
    /** 1. 初始化, 计算用户点击的条状图的序号, 从上至下为0,1,2 */
    const rows = document.querySelectorAll(`#donut-chart-tooltip-${type} .tooltip-row`);
    const clickRow = (e.target as HTMLElement).parentNode!.parentNode as HTMLElement;
    const clickIndex = Array.from(rows).indexOf(clickRow);
    if (clickIndex === -1) return; // 当未点击到条状图而是点击到其它区域时, 直接返回

    /** 2. 计算用户点击的条状图的数据, 如果是0则不触发数据下钻 */
    const num = pieces[hoverIndex].tooltip.values[clickIndex].num;
    if (num === 0) {
      return;
    }
    /** 3. 点击的条状图数据不是0 , 触发数据下钻 */
    const param = this.props.pieces[hoverIndex].clickParam;
    if (this.props.type === 'salary') {
      // 初始化 param
      if (clickIndex === 0) {
        Object.assign(param, { upLevel: true });
      } else if (clickIndex === 1) {
        Object.assign(param, { noAdjustLevel: true });
      } else {
        Object.assign(param, { downLevel: true });
      }
    } else {
      // 初始化 param
      if (clickIndex === 0) {
        Object.assign(param, { reportNotFitLevelAdjust: true });
      } else {
        Object.assign(param, { reportFitLevelAdjust: true });
      }
    }
    this.props.onChartClick(param);
  };
}

export default BeeDonutChart;
