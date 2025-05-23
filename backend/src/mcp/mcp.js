import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const REQUEST_TIMEOUT = 240000; // 240 seconds in milliseconds

// Decorator equivalent for logging execution time
const logExecutionTime = (fn) => {
  return async function wrapper(...args) {
    const startTime = Date.now();
    try {
      const result = await fn.apply(this, args);
      const executionTime = (Date.now() - startTime) / 1000;
      logger.info(`${fn.name} completed in ${executionTime.toFixed(2)} seconds`);
      return result;
    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      logger.error(`${fn.name} failed after ${executionTime.toFixed(2)} seconds: ${error.message}`, { error });
      throw error;
    }
  };
};

function validateEnvVars() {
  const requiredVars = [
    'BRIGHTDATA_API_TOKEN',
    'BRIGHTDATA_GLASSDOOR_UNLOCKER_ZONE',
    'BRIGHTDATA_LINKEDIN_UNLOCKER_ZONE',
    'BRIGHTDATA_CRUNCHBASE_UNLOCKER_ZONE',
    'BRIGHTDATA_NEWS_UNLOCKER_ZONE',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
}

// Initialize MCP servers
let linkedinServer;
try {
  validateEnvVars();

  
  linkedinServer = new McpServer({
    command: 'npx',
    args: ['@brightdata/mcp'],
    env: {
      API_TOKEN: process.env.BRIGHTDATA_API_TOKEN,
      WEB_UNLOCKER_ZONE: process.env.BRIGHTDATA_LINKEDIN_UNLOCKER_ZONE,
      BROWSER_AUTH: process.env.BROWSER_AUTH_LINKEDIN || '',
    },
  });

  logger.info('Successfully initialized all MCP servers');
} catch (error) {
  logger.error('Failed to initialize MCP servers', { error });
  throw error;
}

const systemPrompt = `You are a tool-using agent connected to Bright Data's MCP server. 
You act as an OSINT investigator whose job is to evaluate companies based on public information. 
Your goal is to help users understand whether a company is reputable or potentially suspicious. 
You always use Bright Data real-time tools to search, navigate, and extract data from company profiles. 
You never guess or assume anything. 
Company name matching must be case-sensitive and exact. Do not return data for similarly named or uppercase-variant companies.
Only use the following tools during your investigation:
- \`search_engine\`
- \`scrape_as_markdown\`
- \`scrape_as_html\`
- \`scraping_browser_navigate\`
- \`scraping_browser_get_text\`
- \`scraping_browser_click\`
- \`scraping_browser_links\`
Do not invoke any other tools even if they are available.`;

const model = 'openai:gpt-4.1-mini';

/**
 * @typedef {Object} LinkedInProfile
 * @property {string} company_name
 * @property {string} description
 * @property {string} number_of_employees
 * @property {string} linkedin_url
 * @property {string} headquarters
 * @property {string|null} founded
 * @property {string} industry
 * @property {string} website
 */

/**
 * Fetches LinkedIn data for a given company
 * @param {string} companyName - The name of the company to search for
 * @returns {Promise<LinkedInProfile|null>}
 */
const fetchLinkedInData = logExecutionTime(async (companyName) => {
  logger.info(`Fetching LinkedIn data for company: ${companyName}`);
  
  const prompt = `Your task is to find the LinkedIn profile for the company '${companyName}' and extract specific structured data.

Use the \`web_data_linkedin_company_profile\` tool if available to extract the following fields:
- Company name
- Company description (short summary of what the company does)
- Number of employees (as listed on the LinkedIn profile)
- Linkedin company profile url
- Headquarters address
- Year the company was founded (if available)
- Industry or sector (e.g., 'Software', 'Healthcare')
- Company website

If the structured LinkedIn tool is unavailable or insufficient, use the following tools in order:
1. \`scraping_browser_navigate\` — to visit the LinkedIn company page
2. \`scraping_browser_get_text\` — to extract visible page text
3. \`scraping_browser_links\` and \`scraping_browser_click\` — to navigate if needed

Return ONLY a JSON object with the following keys:
{
  "company_name": str,
  "description": str,
  "number_of_employees": str,
  "linkedin_url": str,
  "headquarters": str,
  "founded": str or null,
  "industry": str,
  "website": str,
}

Do not include raw HTML, markdown, explanations, or other fields. 
If a field is missing, use null for that field. If the company cannot be found at all, return null.`;

  try {
    const result = await Promise.race([
      linkedinServer.run(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
      )
    ]);

    logger.info(`Successfully fetched LinkedIn data for ${companyName}`);
    logger.info('Result:', result);
    return result;
  } catch (error) {
    if (error.message === 'Request timeout') {
      logger.error(`LinkedIn API timeout for ${companyName}`, { error });
    } else {
      logger.error(`Unexpected error fetching LinkedIn data for ${companyName}`, { error });
    }
    return null;
  }
});

module.exports = {
  fetchLinkedInData,
  linkedinServer
};
