import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export async function mcpClient() {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["@brightdata/mcp"],
    env: {
      API_TOKEN: process.env.API_TOKEN,
      WEB_UNLOCKER_ZONE: process.env.WEB_UNLOCKER_ZONE,
    },
  });

  const client = new Client({
    name: "brightdata-client",
    version: "1.0.0",
  });
  await client.connect(transport);
  return client;
}

export async function mcpServer() {
  let server = new FastMCP({
    name: "Bright Data @brightdata/mcp",
    version: "1.8.2",
  });
  server.start({
    transportType: "stdio",
    httpStream: { endpoint: "/mcp", port: 3000 },
  });
  return server;
}
