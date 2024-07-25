import Database from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { MessageRelay } from "bun-message-relay";
import * as config from "./config";

console.time("Messages processed");

const db = new Database("./.db/messages.sqlite", {
  create: true,
  strict: true,
});

const createRelay = (wsClient: WebSocket) =>
  new MessageRelay({
    websocket: wsClient,
    database: db,
    tableName: "mq",
    pollingInterval: 500,
  });

const SERVER = `ws://localhost:${config.PORT}`;

const MESSAGES_TO_SEND = Array.from({ length: 32 }, () => [
  "Hello World!",
  "Hello World! 1",
  "Hello World! 2",
  "Hello World! 3",
  "Hello World! 4",
  "Hello World! 5",
  "Hello World! 6",
  "Hello World! 7",
  "Hello World! 8",
  "Hello World! 9",
  "What is the meaning of life?",
  "where is the bathroom?",
  "zoo",
  "kangaroo",
  "erlang",
  "elixir",
  "bun",
  "mochi",
  "typescript",
  "javascript",
  "Hello World! 7",
  "Hello World! 8",
  "Hello World! 9",
  "What is the meaning of life?",
  "where is the bathroom?",
  "zoo",
  "kangaroo",
  "erlang",
  "elixir",
  "bun",
  "mochi",
  "typescript",
  "javascript",
  "Hello World! 7",
  "Hello World! 8",
  "Hello World! 9",
  "What is the meaning of life?",
  "Hello World! 7",
  "Hello World! 8",
  "Hello World! 9",
  "What is the meaning of life?",
  "where is the bathroom?",
  "zoo",
  "kangaroo",
  "erlang",
  "elixir",
  "bun",
  "mochi",
  "typescript",
  "javascript",
]).flat();

const NAMES = Array.from({ length: 50 }, (a, i) => [
  "Alice" + i,
  "Bob" + i,
  "Charlie" + i,
  "David" + i,
  "Eve" + i,
  "Frank" + i,
  "Grace" + i,
  "Heidi" + i,
  "Ivan" + i,
  "Judy" + i,
  "Karl" + i,
  "Linda" + i,
  "Mike" + i,
  "Nancy" + i,
  "Oscar" + i,
  "Peggy" + i,
  "Quentin" + i,
  "Ruth" + i,
  "Steve" + i,
  "Trudy" + i,
  "Ursula" + i,
  "Victor" + i,
  "Wendy" + i,
  "Xavier" + i,
  "Yvonne" + i,
  "Zach" + i,
])
  .flat()
  .slice(0, config.CLIENTS_COUNT);

console.log(`Connecting ${config.CLIENTS_COUNT} WebSocket clients...`);
console.time(`All ${config.CLIENTS_COUNT} clients connected`);

var promises = [];

const clients: WebSocket[] = new Array(config.CLIENTS_COUNT);
const relays: MessageRelay[] = new Array(config.CLIENTS_COUNT);

for (let i = 0; i < config.CLIENTS_COUNT; i++) {
  clients[i] = new WebSocket(`${SERVER}?name=${NAMES[i]}`);
  relays[i] = createRelay(clients[i]);
  promises.push(
    new Promise<void>((resolve, reject) => {
      clients[i].onmessage = () => {
        resolve();
      };
    })
  );
}

await Promise.all(promises);
console.timeEnd(`All ${clients.length} clients connected`);

var received = 0;
var total = 0;
var more = false;
var remaining: number;

for (let i = 0; i < config.CLIENTS_COUNT; i++) {
  clients[i].onmessage = (event: MessageEvent) => {
    if (config.LOG_MESSAGES) console.log(event.data);
    received++;
    remaining--;

    if (remaining === 0) {
      more = true;
      remaining = total;
    }
  };
}

// each message is supposed to be received
// by each client
// so its an extra loop
for (let i = 0; i < config.CLIENTS_COUNT; i++) {
  for (let j = 0; j < MESSAGES_TO_SEND.length; j++) {
    for (let k = 0; k < config.CLIENTS_COUNT; k++) {
      total++;
    }
  }
}
remaining = total;

function restart() {
  for (let i = 0; i < config.CLIENTS_COUNT; i++) {
    for (let j = 0; j < MESSAGES_TO_SEND.length; j++) {
      relays[i].send({ id: randomUUID(), text: MESSAGES_TO_SEND[j] });
    }
  }
}

var runs: number[] = [];
setInterval(() => {
  const last = received;
  runs.push(last);
  received = 0;
  console.log(
    last,
    `messages per second (${config.CLIENTS_COUNT} clients x ${MESSAGES_TO_SEND.length} msg, min delay: ${config.DELAY}ms)`
  );

  if (runs.length >= 10) {
    console.log("10 runs");
    const sum = runs.reduce((acc, v) => acc + v, 0);
    console.timeEnd("Messages processed");
    console.log(`total: ${sum}`);
    if ("process" in globalThis) process.exit(0);
    runs.length = 0;
  }
}, 1000);

var isRestarting = false;

setInterval(() => {
  if (more && !isRestarting) {
    more = false;
    isRestarting = true;
    restart();
    isRestarting = false;
  }
}, config.DELAY);

restart();
