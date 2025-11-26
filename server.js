// server.js
// Main Express server for Coursework

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve images
app.use("/images", express.static("images"));

// MongoDB connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

let lessonsCollection;
let ordersCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db(process.env.DB_NAME);

    lessonsCollection = db.collection("lessons");
    ordersCollection = db.collection("orders");

    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }
}
connectDB();

// Default route
app.get("/", (req, res) => {
  res.send("Backend running for CST3144 coursework!");
});

// Get all lessons
app.get("/lessons", async (req, res) => {
  try {
    const lessons = await lessonsCollection.find({}).toArray();
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch lessons" });
  }
});

// Search lessons
app.get("/lessons/search", async (req, res) => {
  try {
    const query = req.query.q || "";

    const results = await lessonsCollection
      .find({
        $or: [
          { subject: { $regex: query, $options: "i" } },
          { location: { $regex: query, $options: "i" } },
        ],
      })
      .toArray();

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

// Place order
app.post("/place-order", async (req, res) => {
  const db = client.db(process.env.DB_NAME);
  const lessonsCollection = db.collection("lessons");
  const ordersCollection = db.collection("orders");

  const order = req.body;

  try {
    for (let item of order.items) {
      await lessonsCollection.updateOne(
        { id: item.id },
        { $inc: { availableSpaces: -item.quantity } }
      );
    }

    await ordersCollection.insertOne(order);

    res.json({ message: "Order placed successfully!", success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Order failed", success: false });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
