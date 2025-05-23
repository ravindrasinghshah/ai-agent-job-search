import express from "express";
import { searchJobs } from "../services/jobSearchService.js";
import { mcpClient } from "../mcp/mcp_client.js";

const router = express.Router();

router.get("/search", async (req, res) => {
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

router.get("/list-tools", async (req, res) => {
  let client;
  try {
    console.log("Initializing client...");
    try {
      const client = await mcpClient();
      console.log("Attempting tool call...");

      const searchResult = await client.callTool({
        name: "search_engine",
        arguments: {
          query: "Bright Data company",
        },
      });
      res.json({ searchResult });
    } catch (toolError) {
      console.error("Tool call error:", toolError);
      res.status(500).json({
        error: "Tool call failed",
        details: toolError.message,
        stack: toolError.stack,
      });
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      error: "Operation failed",
      message: error.message,
      stack: error.stack,
    });
  } finally {
    if (client) {
      console.log("Closing client...");
      await client.close();
    }
  }
});
export const jobSearchRouter = router;
