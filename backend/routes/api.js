const express = require("express");
const axios = require("axios");
const Product = require("../models/Product");
const router = express.Router();

// Initialize Database
router.get("/initialize", async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const transactions = response.data;
    // Clear existing data
    await Product.deleteMany({});

    const sanitizedTransactions = transactions.map((transaction) => {
      return {
        id: transaction.id || "No ID",
        title: transaction.title || "Untitled",
        price: transaction.price ? Number(transaction.price) : 0, 
        description: transaction.description || "No description",
        category: transaction.category || "Uncategorized",
        image:
          transaction.image && transaction.image.trim() !== ""
            ? transaction.image
            : "https://via.placeholder.com/150",
        sold: typeof transaction.sold === "boolean" ? transaction.sold : false, 
        dateOfSale: transaction.dateOfSale
          ? new Date(transaction.dateOfSale)
          : new Date() 
      };
    });

    await Product.insertMany(sanitizedTransactions);
    res.status(200).json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Error initializing database:", error.message); 
    res.status(500).json({ message: error.message });
  }
});

//http://localhost:5000/api/transactions?page=1&perPage=10&search=iphone&month=1
// List All Transactions
router.get("/transactions", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const perPage = Math.max(1, Math.min(Number(req.query.perPage) || 10, 100));
  const search = req.query.search || "";
  const month = Math.max(1, Math.min(Number(req.query.month) || 1, 12)); 
  const year = Number(req.query.year) || ""; // Optional year

  try {
    const query = {};

    // Filter by month irrespective of the year
    if (month) {
      query.$expr = { $eq: [{ $month: "$dateOfSale" }, month] };
    }

    // Filter by year if provided
    if (year) {
      query.$expr = {
        $and: [
          { $eq: [{ $month: "$dateOfSale" }, month] },
          { $in: [{ $year: "$dateOfSale" }, [2021, 2022]] }
        ]
      };
    } else {
      // Show results for both 2021 and 2022 by default
      query.$expr = {
        $and: [
          { $eq: [{ $month: "$dateOfSale" }, month] },
          { $in: [{ $year: "$dateOfSale" }, [2021, 2022]] }
        ]
      };
    }

    // If search is provided, add conditions to the query
    if (search.trim() !== "") {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];

      // If search is a number, use range comparison for price
      if (!isNaN(search)) {
        const searchPrice = Number(search);
        query.$or.push({
          price: {
            $gte: searchPrice - 2, 
            $lte: searchPrice + 2 
          }
        });
      }
    }

    // Fetch transactions with pagination and search
    const transactions = await Product.find(query)
      .limit(perPage) 
      .skip((page - 1) * perPage); 

    // Count total matching documents
    const total = await Product.countDocuments(query);

    // Calculate total pages
    const totalPages = Math.ceil(total / perPage);

    // Return the response with transactions and pagination info
    res
      .status(200)
      .json({ transactions, total, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// Get all transactions with pagination
router.get("/transactions/all", async (req, res) => {
  // Destructure query parameters for pagination
  const page = Math.max(1, Number(req.query.page) || 1); 
  const perPage = Math.max(1, Math.min(Number(req.query.perPage) || 10, 100));
  try {
    const transactions = await Product.find()
      .limit(perPage) 
      .skip((page - 1) * perPage); 

    // Count total matching documents
    const total = await Product.countDocuments();

    // Calculate total pages
    const totalPages = Math.ceil(total / perPage);

    // Return the response with transactions and pagination info
    res.status(200).json({ transactions, total, totalPages, currentPage: page });
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    res.status(500).json({ message: error.message });
  }
});



// Get Statistics for Selected Month
router.get("/statistics", async (req, res) => {
  const { month, year } = req.query;
  // Validate input
  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required." });
  }

  const startDate = new Date(year, month - 1, 1); // Start of the month
  const endDate = new Date(year, month, 1); // Start of the next month

  try {
    // Total sold items
    const soldItemsCount = await Product.countDocuments({
      sold: true,
      dateOfSale: { $gte: startDate, $lt: endDate }
    });

    // Total not sold items
    const notSoldItemsCount = await Product.countDocuments({
      sold: false,
      dateOfSale: { $gte: startDate, $lt: endDate }
    });

    // Total sale amount
    const totalSaleAmount = await Product.aggregate([
      {
        $match: {
          sold: true,
          dateOfSale: { $gte: startDate, $lt: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$price" } // Sum the price of sold items
        }
      }
    ]);

    const totalSale = totalSaleAmount.length > 0 ? totalSaleAmount[0].total : 0; // Handle case when no sold items

    res.status(200).json({
      totalSale,
      soldItemsCount,
      notSoldItemsCount,
      month,
      year
    });
  } catch (error) {
    console.error("Error fetching statistics:", error.message); // Log the error for debugging
    res.status(500).json({ message: error.message });
  }
});

//BarChart Data API
router.get("/bar-chart", async (req, res) => {
  const { month } = req.query;

  if (!month) {
    return res.status(400).json({ message: "Month is required" });
  }

  const selectedMonth = parseInt(month); // Ensure the month is a number

  try {
    // Find products within the selected month regardless of the year
    const products = await Product.find({
      $expr: {
        $eq: [{ $month: "$dateOfSale" }, selectedMonth]
      }
    });

    // Initialize the price ranges
    const priceRanges = {
      "0 - 100": 0,
      "101 - 200": 0,
      "201 - 300": 0,
      "301 - 400": 0,
      "401 - 500": 0,
      "501 - 600": 0,
      "601 - 700": 0,
      "701 - 800": 0,
      "801 - 900": 0,
      "901 and above": 0
    };

    // Categorize products into the price ranges
    products.forEach((product) => {
      const price = product.price;

      if (price >= 0 && price <= 100) priceRanges["0 - 100"]++;
      else if (price >= 101 && price <= 200) priceRanges["101 - 200"]++;
      else if (price >= 201 && price <= 300) priceRanges["201 - 300"]++;
      else if (price >= 301 && price <= 400) priceRanges["301 - 400"]++;
      else if (price >= 401 && price <= 500) priceRanges["401 - 500"]++;
      else if (price >= 501 && price <= 600) priceRanges["501 - 600"]++;
      else if (price >= 601 && price <= 700) priceRanges["601 - 700"]++;
      else if (price >= 701 && price <= 800) priceRanges["701 - 800"]++;
      else if (price >= 801 && price <= 900) priceRanges["801 - 900"]++;
      else if (price >= 901) priceRanges["901 and above"]++;
    });

    res.status(200).json({
      data: Object.entries(priceRanges).map(([range, count]) => ({
        range,
        count
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Not used in the frontend

// Pie Chart Data API
router.get("/categories", async (req, res) => {
  const { month, year } = req.query; // Get month and year from query parameters

  try {
    // Define the start and end dates for the selected month and year
    const startDate = new Date(year, month - 1, 1); // Month is zero-indexed
    const endDate = new Date(year, month, 1); // Start of the next month

    // Fetch products filtered by the selected month
    const products = await Product.find({
      dateOfSale: {
        $gte: startDate,
        $lt: endDate
      }
    });

    // Group by category and count items
    const categoryCount = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});

    // Format the response data
    const data = Object.entries(categoryCount).map(([category, count]) => ({
      category,
      count
    }));

    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: error.message });
  }
});

// Combined Response API
router.get("/combined", async (req, res) => {
  const { month, year } = req.query; // Get month and year from query parameters

  try {
    // Define the start and end dates for the selected month and year
    const startDate = new Date(year, month - 1, 1); // Month is zero-indexed
    const endDate = new Date(year, month, 1); // Start of the next month

    // Fetch products filtered by the selected month
    const products = await Product.find({
      dateOfSale: {
        $gte: startDate,
        $lt: endDate
      }
    });

    // Group by category and count items
    const categoryCount = products.reduce((acc, product) => {
      acc[product.category] = (acc[product.category] || 0) + 1;
      return acc;
    }, {});

    // Format the response data
    const categories = Object.entries(categoryCount).map(
      ([category, count]) => ({
        category,
        count
      })
    );

    // Calculate total sold items
    const soldItemsCount = products.filter((product) => product.sold).length;

    // Calculate total not sold items
    const notSoldItemsCount = products.filter(
      (product) => !product.sold
    ).length;

    // Calculate total sale amount
    const totalSaleAmount = products.reduce((acc, product) => {
      if (product.sold) {
        acc += product.price;
      }
      return acc;
    }, 0);

    res.status(200).json({
      categories,
      totalSaleAmount,
      soldItemsCount,
      notSoldItemsCount
    });
  } catch (error) {
    console.error("Error fetching combined data:", error);
    res.status(500).json({ message: error.message });
  }
});

// Export the router
module.exports = router;
