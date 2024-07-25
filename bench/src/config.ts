export const CLIENTS_COUNT =
  parseInt(process.env.CLIENTS_COUNT || "", 10) || 32;
export const PORT = process.env.PORT || 4001;
export const LOG_MESSAGES = process.env.LOG_MESSAGES === "1";
export const DELAY = 64;
