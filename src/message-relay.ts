import type Database from "bun:sqlite";
import { SqliteCache } from "./sqlite-cache";
import type { Message, WsMessage, WsMessageAck } from "./types";

export class MessageRelay {
  private websocket: WebSocket;
  private timer: Timer;
  private cache: SqliteCache;

  constructor(params: {
    database: Database;
    tableName?: string;
    pollingInterval?: number;
    websocket: WebSocket;
  }) {
    this.cache = new SqliteCache({
      database: params.database,
      tableName: params.tableName || "messages",
    });

    this.websocket = params.websocket;

    this.websocket.addEventListener("message", this.wsAckMessageHandler);

    this.timer = setInterval(() => {
      this.processPendingMessages();
    }, params.pollingInterval || 1000);
  }

  dispose() {
    clearInterval(this.timer);
    this.websocket.removeEventListener("message", this.wsAckMessageHandler);
  }

  send(message: Message) {
    this.cache.create(message);
    this.dispatch(message);
  }

  clearAllMessages() {
    this.cache.deleteAll();
  }

  private async dispatch(message: Message) {
    try {
      const wsMessage: WsMessage = {
        type: "bun-message-relay:message",
        id: message.id,
        message,
      };
      this.websocket.send(JSON.stringify(wsMessage));
    } catch (err) {
      console.log(`Error dispatching message ${message.id}`);
      console.error(err);
    }
  }

  private wsAckMessageHandler = (event: MessageEvent) => {
    try {
      const message: WsMessageAck = JSON.parse(event.data);
      if (message.type === "bun-message-relay:ack") {
        this.cache.deleteMessage({ id: message.id });
      }
    } catch {}
  };

  private processPendingMessages() {
    const messagesIterator = this.cache.getPending();
    for (const messages of messagesIterator) {
      console.log(messages);
      for (const message of messages) {
        this.dispatch(message);
      }
    }
  }
}
