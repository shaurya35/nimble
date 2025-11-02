import { describe, it, expect } from "bun:test";
import { WebSocket as WSClient } from "ws";

const URL = "ws://localhost:8000";

const connect = (): Promise<WSClient> => {
  return new Promise((resolve, reject) => {
    const ws = new WSClient(URL);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
};

const send = (ws: WSClient, message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout waiting for response!"));
    }, 30000);

    ws.once("message", (data) => {
      clearTimeout(timeout);
      try {
        const response = JSON.parse(data.toString());
        resolve(response);
      } catch (error) {
        reject(error);
      }
    });

    ws.send(JSON.stringify(message));
  });
};

describe("WS Server E2E", () => {
    describe("Connection", () => {
        it("should connect to WebSocket server at port 8000", async () => {
          const ws = await connect();
          expect(ws.readyState).toBe(WSClient.OPEN);
          ws.close();
        });
    });
})
