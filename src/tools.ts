import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ManusClient } from "./manus-client.js";

export function registerManusTools(server: Server) {
  const manus = new ManusClient();

  // Expose configuration layout arrays to Claude engine
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "generate_manus_image",
          description: "Generates high-fidelity custom visuals using Manus AI based on precise descriptive text inputs.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "Deep descriptive text containing subjects, framing rules, textures, and scene parameters.",
              },
              aspect_ratio: {
                type: "string",
                enum: ["1:1", "16:9", "9:16", "4:3"],
                description: "The visual dimensions profile. Defaults to square '1:1'.",
              },
              style: {
                type: "string",
                description: "Creative styling directives (e.g. realistic, photorealistic, cinematic, schematic drawing).",
              },
            },
            required: ["prompt"],
          },
        },
      ],
    };
  });

  // Handle execution calls sent down by Claude Web
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "generate_manus_image") {
      throw new Error(`Execution error: Unknown tool token reference '${request.params.name}' received.`);
    }

    const { prompt, aspect_ratio, style } = request.params.arguments as {
      prompt: string;
      aspect_ratio?: string;
      style?: string;
    };

    if (!prompt) {
      return {
        content: [{ type: "text", text: "Process error: Prompt content context string must be specified." }],
        isError: true,
      };
    }

    try {
      const generatedUrl = await manus.generateImage({ prompt, aspect_ratio, style });

      return {
        content: [
          {
            type: "text",
            text: `🎯 Manus AI Generation Complete!\n\nAccess and view your asset here:\n${generatedUrl}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Manus pipeline integration execution fault: ${error.message}` }],
        isError: true,
      };
    }
  });
}
