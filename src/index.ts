import express from "express";
import dotenv from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { registerManusTools } from "./tools.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Initialize the root MCP Server configuration
const server = new Server(
  {
    name: "manus-image-generator",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

registerManusTools(server);

// Active network session pool tracking table to handle robust client reconnects
const activeSessions = new Map<string, SSEServerTransport>();

// Route 1: Establish persistent Server-Sent Events context channel
app.get("/sse", async (req, res) => {
  console.log("🔄 Claude client initiating Remote SSE handshake connection...");
  
  const transport = new SSEServerTransport("/messages", res);
  activeSessions.set(transport.sessionId, transport);
  
  // Clean up references when client drops connection context
  res.on("close", () => {
    console.log(`🔌 SSE session connection pool dropped: ${transport.sessionId}`);
    activeSessions.delete(transport.sessionId);
  });

  await server.connect(transport);
});

// Route 2: Receive JSON-RPC control protocol updates from client
app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = activeSessions.get(sessionId);

  if (!transport) {
    res.status(400).send(`Session allocation error: Target session '${sessionId}' is dead or unallocated.`);
    return;
  }

  // FIXED: Corrected execution method to handle incoming payload buffers natively
  await transport.handlePostMessage(req, res);
});

app.listen(port, () => {
  console.log(`🚀 Automated Manus Remote MCP Engine operational on port ${port}`);
  console.log(`📡 Public SSE Connection Hook: http://localhost:${port}/sse`);
});
