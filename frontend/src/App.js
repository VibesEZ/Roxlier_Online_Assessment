/** @format */

import React from "react";
import "./App.css";
import StatisticsComponent from "./components/StatisticsComponent";
import Transactions from "./components/Transactions";
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Transaction Management System</h1>
      </header>
      <main className="App-main">
        <Transactions />
        <StatisticsComponent />
      </main>
    </div>
  );
}

export default App;
