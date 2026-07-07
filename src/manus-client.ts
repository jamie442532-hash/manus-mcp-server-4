import axios from "axios";

export interface ManusGenerationOptions {
  prompt: string;
  aspect_ratio?: string;
  style?: string;
}

export class ManusClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MANUS_API_KEY || "";
    this.baseUrl = "https://api.manus.ai/v1";

    if (!this.apiKey) {
      throw new Error("Initialization block failed: MANUS_API_KEY environment token is missing.");
    }
  }

  async generateImage(options: ManusGenerationOptions): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/images/generations`,
        {
          prompt: options.prompt,
          aspect_ratio: options.aspect_ratio || "1:1",
          style: options.style || "realistic",
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data?.url) {
        return response.data.url;
      }

      const taskId = response.data?.task_id;
      if (!taskId) {
        throw new Error("Manus ingestion endpoint did not deliver an asset URL or valid async tracking ID.");
      }

      return await this.pollTaskStatus(taskId);
    } catch (error: any) {
      console.error("Manus Core Engine exception caught:", error.response?.data || error.message);
      throw new Error(`Manus Gateway Rejection: ${error.response?.data?.message || error.message}`);
    }
  }

  private async pollTaskStatus(taskId: string): Promise<string> {
    const maxRetries = 45; // Enhanced fallback window to capture complex multi-layer image processing jobs
    const intervalMs = 2000;

    for (let i = 0; i < maxRetries; i++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      
      const check = await axios.get(`${this.baseUrl}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (check.data?.status === "completed" && check.data?.output_url) {
        return check.data.output_url;
      }
      if (check.data?.status === "failed") {
        throw new Error(`Manus remote worker reports failure state: ${check.data?.error_message || "Unknown error"}`);
      }
    }
    throw new Error("Compilation timeout exceeded while polling Manus infrastructure asset state.");
  }
      }
