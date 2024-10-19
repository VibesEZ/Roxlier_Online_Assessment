import axios from "axios";
import { Chart, registerables } from "chart.js";
import React, { useCallback, useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "../styles/Transactions.css";

// Register all Chart.js components
Chart.register(...registerables);

const Transactions = () => {
  const [transactions, setTransactions] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [month, setMonth] = useState("3"); 
  const [perPage] = useState(6); // Fixed perPage to 6 As of there is no more than 10 Transactions for a single month in data base can be modified here by Simply changing the State to 10
  const [statistics, setStatistics] = useState({
    totalSale: 0,
    soldItemsCount: 0,
    notSoldItemsCount: 0,
  });
  
  const [barChartData, setBarChartData] = useState([]); // State for bar chart data

  // Fetch transactions with pagination and filters
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/transactions?page=${currentPage}&perPage=${perPage}&search=${searchTerm}&month=${month}`
      );

      if (Array.isArray(response.data.transactions)) {
        setTransactions(response.data.transactions); // Set transactions
        setTotalPages(response.data.totalPages);
        setError(null);
      } else {
        setTransactions([]); // Ensure it's an array
        setTotalPages(1); // Reset to 1 page if no transactions found
        setError("No transactions found");
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [currentPage, perPage, searchTerm, month]);

  // Fetch all transactions with pagination
  const fetchAllTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/transactions/all?page=${currentPage}&perPage=${perPage}`
      );
      setTransactions(response.data.transactions || []); // Ensure transactions is always an array
      setTotalPages(response.data.totalPages || 1); // Set totalPages from response or default to 1
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [currentPage, perPage]);

  // Fetch statistics based on month
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/statistics?month=${month}&year=${new Date().getFullYear()}`
      );
      setStatistics(response.data);
    } catch (err) {
      console.error("Error fetching statistics:", err);
    }
  }, [month]);

  // Fetch bar chart data based on month
  const fetchBarChartData = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/bar-chart?month=${month}`
      );
      setBarChartData(response.data.data); // Update state with the bar chart data
    } catch (err) {
      console.error("Error fetching bar chart data:", err);
    }
  }, [month]);

  useEffect(() => {
    fetchStatistics();
    fetchBarChartData(); // Fetch bar chart data on month change
    if (month === "") {
      fetchAllTransactions(); // Fetch all transactions when no month is selected
    } else {
      fetchTransactions(); // Fetch transactions with filters
    }
  }, [currentPage, month]); // Fetch on month or page change

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prevPage) => prevPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prevPage) => prevPage - 1);
    }
  };

  // Search and clear search functionality
  const handleSearch = () => {
    setCurrentPage(1); 
    fetchTransactions();
  };

  const handleClearSearch = () => {
    setSearchTerm(""); 
    setMonth(""); 
    setCurrentPage(1); 
    setError(null);
    fetchAllTransactions(); 
  };

  const handleMonthChange = (event) => {
    const selectedMonth = event.target.value;
    setMonth(selectedMonth);
    setCurrentPage(1); 

    if (selectedMonth === "") {
      fetchAllTransactions(); 
    } else {
      fetchStatistics();
      fetchBarChartData(); 
      fetchTransactions(); 
    }
  };

  // Loading and error handling
  if (loading) return <div className="loading">Loading...</div>;
  if (error && transactions.length === 0) {
    return (
      <div className="error-container">
        <div className="error-message">Error: {error}</div>
        <button onClick={handleClearSearch}>Return to Full List</button>
      </div>
    );
  }

  // Prepare chart data for bar chart
  const chartData = {
    labels: barChartData.map(item => item.range), 
    datasets: [
      {
        label: "Number of Products",
        data: barChartData.map(item => item.count), 
        backgroundColor: "rgba(75, 192, 192, 0.6)", 
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="transactions-container">
      <div className="controls">
        <input
          type="text"
          placeholder="Search here"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={month} onChange={handleMonthChange}>
          <option value="">Select Month</option>
          <option value="">All Items</option> 
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <button onClick={handleSearch}>Search</button>
        <button onClick={handleClearSearch}>Clear</button>
      </div>

      <table className="transactions-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Price</th>
            <th>Description</th>
            <th>Category</th>
            <th>Sold</th>
            <th>Image</th>
            <th>Date of Sale</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(transactions) && transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{transaction.title}</td>
              <td>${transaction.price.toFixed(2)}</td>
              <td>{transaction.description}</td>
              <td>{transaction.category}</td>
              <td>{transaction.sold ? "Yes" : "No"}</td>
              <td>
                {transaction.image ? (
                  <img
                    src={transaction.image}
                    alt={transaction.title}
                    style={{ width: "50px", height: "50px" }}
                  />
                ) : (
                  "No Image"
                )}
              </td>
              <td>{new Date(transaction.dateOfSale).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>


      <div className="pagination-container">
        <button onClick={handlePreviousPage} disabled={currentPage === 1}>
          Previous Page
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={handleNextPage} disabled={currentPage === totalPages}>
          Next Page
        </button>
      </div>
      <div className="chart-container">
        {/* <h2>Bar Chart Stats</h2> */}
        <Bar data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default Transactions;
