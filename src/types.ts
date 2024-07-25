export type Message = { id: string } & JsonObject;

export type WsMessage = {
  type: "bun-message-relay:message";
  id: string;
  message: Message;
};

export type WsMessageAck = {
  type: "bun-message-relay:ack";
  id: string;
};

type JsonObject = { [key: string]: JsonValue };
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonArray = JsonValue[];
