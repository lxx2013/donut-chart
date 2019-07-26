import React from 'react';
import './App.css';
import DonutChart from './components/DonutChart';

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="App-header">
        <DonutChart
          width={600}
          height={600}
          values={[0.8, 0.18, 0.02]}
          tooltips={[
            <h1>I am Tooltip H1</h1>,
            <h2>Tooltip h2</h2>,
            <h3>tooltip h3</h3>,
            <h4>h4</h4>,
            <h5>h5</h5>
          ]}
        />
      </header>
    </div>
  );
};

export default App;
