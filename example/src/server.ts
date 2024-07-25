import type { WsMessage, WsMessageAck } from "bun-message-relay";

Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) return;
    return new Response(null, { status: 500 });
  },
  websocket: {
    message(ws, msgStr: string) {
      const wsMessage: WsMessage = JSON.parse(msgStr);

      if (wsMessage.type === "bun-message-relay:message") {
        const ack: WsMessageAck = {
          type: "bun-message-relay:ack",
          id: wsMessage.message.id,
        };
        ws.send(JSON.stringify(ack));
        console.log(`Sending acknowledgement: ${ack.id}`);
      }
    },
  },
});
