import axios from "axios";
import OpenAI from "openai";
import { mcpClient } from "../mcp/mcp_client.js";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const platforms = [
  {
    name: "LinkedIn",
    searchFunction: searchLinkedIn,
    server: process.env.BRIGHT_DATA_LINKEDIN_SERVER,
    isActive: true,
  },
  {
    name: "Indeed",
    searchFunction: searchIndeed,
    server: process.env.BRIGHT_DATA_INDEED_SERVER,
    isActive: false,
  },
];

async function searchLinkedIn(keyword) {
  console.log("searchLinkedIn", keyword);
  const jobQuery = `Find jobs for ${keyword} on LinkedIn`;
  try {
    const client = await mcpClient();
    
    // const tools = await client.listTools();
    // console.log("tools", tools);

    const searchResult = await client.callTool({
      name: "linkedin_jobs_posting",
      arguments: {
        keyword: jobQuery,
      },
    });
    // console.log("mcpResponse", searchResult);
    const result = {
      name: "LinkedIn",
      status: "success",
      data: searchResult,
    };
    return result;
  } catch (error) {
    console.error("LinkedIn search error:", error);
    return [];
  }
}

async function searchIndeed(keyword) {
  const proxyConfig = {
    host: process.env.BRIGHT_DATA_INDEED_SERVER,
    port: parseInt(process.env.BRIGHT_DATA_PORT || "22225"),
    auth: {
      username: process.env.BRIGHT_DATA_USERNAME,
      password: process.env.BRIGHT_DATA_PASSWORD,
    },
  };

  try {
    const response = await axios.get(
      `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}`,
      {
        proxy: proxyConfig,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      }
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `You are a job listing parser. Extract job listings from the provided HTML content.
            Return a JSON array of objects with the following structure:
            {
              title: string,
              company: string,
              location: string,
              salary: string (if available),
              description: string (brief summary),
              postedDate: string (standardized format),
              url: string (full job listing URL)
            }`,
        },
        {
          role: "user",
          content: response.data,
        },
      ],
    });

    return JSON.parse(completion.choices[0].message.content || "[]");
  } catch (error) {
    console.error("Indeed search error:", error);
    return [];
  }
}

async function searchJobs(keyword) {
  try {
    const searchPromises = platforms
      .filter((platform) => platform.isActive)
      .map((platform) => platform.searchFunction(keyword));
    const results = await Promise.allSettled(searchPromises);

    console.log("results", results);

    // const jobListings = results
    //   .filter((result) => result.status === "success")
    //   .flatMap((result, index) => {
    //     const platformName = platforms[index].name;
    //     return result.data.map((job) => ({
    //       ...job,
    //       platform: platformName,
    //       id: `${platformName}-${Math.random().toString(36).substr(2, 9)}`,
    //     }));
    //   });

    return results;
  } catch (error) {
    console.error("Job search error:", error);
    throw error;
  }
}

export { searchJobs };
