import type { WsMessage, WsMessageAck } from "bun-message-relay";
import * as config from "./config";

let remainingClients = config.CLIENTS_COUNT;

const server = Bun.serve<{ name: string }>({
  port: config.PORT,
  websocket: {
    open(ws) {
      ws.subscribe("room");

      remainingClients--;
      console.log(`${ws.data.name} connected (${remainingClients} remain)`);

      if (remainingClients === 0) {
        console.log("All clients connected");
        setTimeout(() => {
          console.log('Starting benchmark by sending "ready" message');
          ws.publishText("room", `ready`);
        }, 100);
      }
    },
    message(ws, msgString: string) {
      if (config.LOG_MESSAGES) console.log(msgString);

      const message: WsMessage = JSON.parse(msgString);
      const ack: WsMessageAck = {
        type: "bun-message-relay:ack",
        id: message.id,
      };

      ws.send(JSON.stringify(ack));

      const out = `${ws.data.name}: ${message.message.text}`;
      if (ws.publishText("room", out) !== out.length) {
        throw new Error("Failed to publish message");
      }
    },
    close(ws) {
      remainingClients++;
    },
    perMessageDeflate: false,
    publishToSelf: true,
  },

  fetch(req, server) {
    const options = {
      data: {
        name:
          new URL(req.url).searchParams.get("name") ||
          "Client #" + (config.CLIENTS_COUNT - remainingClients),
      },
    };

    if (server.upgrade(req, options)) return;
    return new Response("Error");
  },
});

console.log(
  `Waiting for ${remainingClients} clients to connect...\n`,
  `  http://${server.hostname}:${config.PORT}/`
);
