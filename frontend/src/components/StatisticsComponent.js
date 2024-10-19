// /client/src/components/StatisticsComponent.js
import React, { useEffect, useState } from "react";
import "../styles/StatisticsComponent.css";
const StatisticsComponent = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [statistics, setStatistics] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/statistics?month=${month}&year=${year}`);
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }
        const data = await response.json();
        setStatistics(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchStatistics();
  }, [month, year]);

  return (
    <div className="statistics-container">
      <h2>Statistics for Selected Month</h2>
      <div>
        <label>
          Month:
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {[...Array(12).keys()].map((m) => (
              <option key={m} value={m + 1}>
                {new Date(0, m).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </label>
        <label>
            Year:
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {[...Array(5).keys()].map((y) => (
                <option key={y} value={new Date().getFullYear() - y}>
                  {new Date().getFullYear() - y}
                </option>
              ))}

            </select>
        </label>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div>
        <h3>Statistics</h3>
        <p>Total Sold Items: {statistics.soldItemsCount}</p>
        <p>Total Not Sold Items: {statistics.notSoldItemsCount}</p>
        <p>Total Sale Amount: ${statistics.totalSale?.toFixed(2) || 0}</p>
      </div>
    </div>
  );
};

export default StatisticsComponent;
