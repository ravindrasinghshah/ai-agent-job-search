import { NextResponse } from "next/server";
import OpenAI from "openai";
import axios, { AxiosProxyConfig } from "axios";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface JobListing {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  postedDate: string;
  platform?: string;
  id?: string;
}

interface Platform {
  name: string;
  server: string;
  searchFunction: (keyword: string) => Promise<JobListing[]>;
  isActive: boolean;
}

const platforms: Platform[] = [
  {
    name: "LinkedIn",
    server: process.env.BRIGHT_DATA_LINKEDIN_SERVER || "",
    searchFunction: searchLinkedIn,
    isActive: true,
  },
  {
    name: "Indeed",
    server: process.env.BRIGHT_DATA_INDEED_SERVER || "",
    searchFunction: searchIndeed,
    isActive: false,
  },
];

async function searchLinkedIn(keyword: string): Promise<JobListing[]> {
  // Configure proxy for LinkedIn
  // const proxyConfig: AxiosProxyConfig = {
  //   host,
  //   port: parseInt(process.env.BRIGHT_DATA_PORT || "22225"),
  //   auth: {
  //     username,
  //     password,
  //   },
  // };

  try {
    // Implementation for LinkedIn scraping

    const data = JSON.stringify([
      {
        location: "paris",
        keyword: keyword,
        country: "FR",
        time_range: "Past month",
        job_type: "Full-time",
        experience_level: "Internship",
        remote: "On-site",
        company: "",
      },
      {
        location: "New York",
        keyword: '"python developer"',
        country: "",
        time_range: "",
        job_type: "",
        experience_level: "",
        remote: "",
        company: "",
      },
    ]);

    const response = await axios.post(
      "https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lpfll7v5hcqtkxl6l&include_errors=true&type=discover_new&discover_by=keyword&limit_per_input=10",
      data,
      {
        headers: {
          Authorization: `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("response", response.data);
    if (response.data.snapshot_id == null) {
      throw new Error("No snapshot id found");
    }

    const snapshotResponse = await axios.get(
      `https://api.brightdata.com/datasets/v3/snapshot/${response.data.snapshot_id}?format=json`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BRIGHT_DATA_API_TOKEN}`,
        },
      }
    );
    console.log("snapshotResponse", snapshotResponse.data);
    // .then((response) => console.log(response.data))
    //   .catch((error) => console.error(error));

    return JSON.parse(snapshotResponse.data);
  } catch (error) {
    console.error("LinkedIn search error:", error);
    return [];
  }
}

async function searchIndeed(keyword: string): Promise<JobListing[]> {
  const host = process.env.BRIGHT_DATA_INDEED_SERVER;
  const username = process.env.BRIGHT_DATA_USERNAME;
  const password = process.env.BRIGHT_DATA_PASSWORD;

  if (!host || !username || !password) {
    throw new Error("Missing Bright Data configuration for Indeed");
  }

  // Configure proxy for Indeed
  const proxyConfig: AxiosProxyConfig = {
    host,
    port: parseInt(process.env.BRIGHT_DATA_PORT || "22225"),
    auth: {
      username,
      password,
    },
  };

  try {
    // Implementation for Indeed scraping
    const response = await axios.get(
      `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}`,
      {
        proxy: proxyConfig,
      }
    );

    // Process the response with GPT to extract relevant information
    const completion = await openai.chat.completions.create({
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content:
            "You are a job listing parser. Extract job listings from the provided HTML content, including title, company, location, salary (if available), description, and posted date. Return the data in a structured format.",
        },
        {
          role: "user",
          content: response.data,
        },
      ],
    });

    return JSON.parse(
      completion.choices[0].message.content || "[]"
    ) as JobListing[];
  } catch (error) {
    console.error("Indeed search error:", error);
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();
    console.log("Received request", keyword);

    if (!keyword) {
      return NextResponse.json(
        { error: "Keyword is required" },
        { status: 400 }
      );
    }

    // Execute all platform searches in parallel
    const searchPromises = platforms
      .filter((platform) => platform.isActive)
      .map((platform) => platform.searchFunction(keyword));
    const results = await Promise.allSettled(searchPromises);

    // Combine and process results
    const jobListings = results
      .filter(
        (result): result is PromiseFulfilledResult<JobListing[]> =>
          result.status === "fulfilled"
      )
      .flatMap((result, index) => {
        const platformName = platforms[index].name;
        return result.value.map((job: JobListing) => ({
          ...job,
          platform: platformName,
          id: `${platformName}-${Math.random().toString(36).substr(2, 9)}`,
        }));
      });

    return NextResponse.json(jobListings);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
