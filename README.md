环形图组件 for React
- [x] 鼠标浮动在一个圆弧上时显示传入的DOM
- [x] 在浮层和圆弧中间用一条细线连接
- [x] 固定 label , 通过旋转环图来避免错位

## 环图第一版需求(deprecate)
[https://i.setsuna.wang/环图第一版需求(deprecate).gif](https://i.setsuna.wang/环图第一版需求(deprecate).gif)

## 遍历数据
![2019-08-17 18.32.17.gif](https://i.loli.net/2019/08/17/gxtZjq1Goma2pQS.gif)

## antd_tab 
如果为 active 的 tab 设置 font-weight: bold 的话, 

文字变粗 `=>` inline元素 width 变宽 `=>` 容器被撑宽 `=>` **tab边界的分隔线出现抖动**
![](https://i.setsuna.wang/55BA0679-EAD2-4A65-B5B7-BFFC6610299C.gif)

## my_tab
而我实现的 tab , 通过 伪元素`:after{ content: attr(data-index); }`的方式解决了这个问题

文字变粗 `=>` inline元素 width 变宽(但未超过伪元素:after的宽度) `=>` 容器宽度不变 `=>` **tab边界的分隔线不会抖动**
![](https://i.setsuna.wang/我的项目的tab.gif)
