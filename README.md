# bun-message-relay

An at-least-once local message queue for relaying messages to a central server.

Uses Bun's built-in Sqlite implementation for persistence, and websockets for delivery.

## Performance

~250,000 messages a second, over 32 websocket connections.

## Usage

```sh
bun add bun-message-relay
```

```ts
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

const message: Message = {
  id: randomUUID(),
  text: "test message",
};

relay.send(message);
```
