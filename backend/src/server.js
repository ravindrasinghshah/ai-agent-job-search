import "dotenv/config";
import express from "express";
import cors from "cors";
import winston from "winston";
import { jobSearchRouter } from "./routes/jobSearch.js";
import { searchJobs } from "./services/jobSearchService.js";

// Configure logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/jobs", jobSearchRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Health check endpoint
app.get("/healthcheck", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/search", async (req, res) => {
  try {
    console.log("search", req.query);
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({ error: "Keyword is required" });
    }

    const results = await searchJobs(keyword);
    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      error: "Failed to search jobs",
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
