import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import levelChart from './levelChart';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();

var rerender = (a: number, b: number, c: number) => {
  levelChart.originCount = a;
  levelChart.upCount = b;
  levelChart.downCount = c;
  levelChart.count = a + b + c;
  ReactDOM.render(<div />, document.getElementById('root'));
  ReactDOM.render(<App />, document.getElementById('root'));
};
Object.defineProperty(window, 'rerender', {
  value: rerender
});

var i = 98,
  j = 1,
  k = 1;
var timer = setInterval(() => {
  i--;
  j++;
  rerender(i / 100, j / 100, k / 100);
  if (j > 100 - k - 1) {
    k += 5;
    j = k + 1;
    i = 100 - k - j;
  }
  if (k > 50) {
    clearInterval(timer);
  }
}, 33);
