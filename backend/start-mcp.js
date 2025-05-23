import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

const isWin = process.platform === "win32";
const npxCmd = isWin ? "npx.cmd" : "npx";

const mcp = spawn(npxCmd, ["@brightdata/mcp"], {
  stdio: "inherit",
  env: { ...process.env },
  shell: true
});

mcp.on("close", (code) => {
  console.log(`MCP server exited with code ${code}`);
});
