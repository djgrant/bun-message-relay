import type { Message } from "bun-message-relay";
import { MessageRelay } from "bun-message-relay";
import Database from "bun:sqlite";
import { randomUUID } from "node:crypto";

const socket = new WebSocket("ws://localhost:3000");

const db = new Database("./.db/messages.sqlite", {
  create: true,
  strict: true,
});

const relay = new MessageRelay({
  database: db,
  tableName: "mq",
  websocket: socket,
});

// relay a message every second, once a ws connection is open
socket.addEventListener("open", () => {
  setInterval(() => {
    const message: Message = { id: randomUUID(), text: "test message" };
    console.log(`Sending Message ${message.id}`);
    relay.send(message);
  }, 1000);
});
