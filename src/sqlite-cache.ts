import { Database } from "bun:sqlite";
import type { Statement } from "bun:sqlite";
import type { Message } from "./types";

type MessageRow = {
  id: string;
  message: string;
  updated: number;
};

const config = {
  pendingMessageLimit: 25,
  dbPragmaBusyTimeoutMs: 100,
  resendMessageAfterSeconds: 60,
};

export class SqliteCache {
  private db: Database;
  private tableName: string;
  private insertMessageQuery: Statement;
  private getPendingMessagesQuery: Statement<MessageRow, []>;
  private deleteMessageQuery: Statement;
  private deleteAllMessagesQuery: Statement;

  constructor(params: { database: Database; tableName?: string }) {
    this.db = params.database;
    this.tableName = params.tableName || "messages";

    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(`pragma busy_timeout = ${config.dbPragmaBusyTimeoutMs};`);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT NOT NULL,
        message TEXT NOT NULL,
        updated INT NOT NULL
      );
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_id ON ${this.tableName}(id);
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_updated ON ${this.tableName}(updated ASC);
    `);

    this.insertMessageQuery = this.db.query(`
      INSERT INTO ${this.tableName} (id, message, updated) 
      VALUES ($id, $message, $updated)
    `);

    this.getPendingMessagesQuery = this.db.query(`
      SELECT * FROM ${this.tableName} 
      WHERE unixepoch('now') > updated + ${config.resendMessageAfterSeconds}
      LIMIT ${config.pendingMessageLimit}
    `);

    this.deleteMessageQuery = this.db.query(`
      DELETE FROM ${this.tableName}
      WHERE id = $id
    `);

    this.deleteAllMessagesQuery = this.db.query(`
      DELETE FROM ${this.tableName}
    `);
  }

  create(message: Message) {
    this.insertMessageQuery.run({
      id: message.id,
      message: JSON.stringify(message),
      updated: Date.now() / 1000,
    });
  }

  *getPending(): Generator<Message[]> {
    const batch = this.getPendingMessagesQuery
      .all()
      .map((row) => JSON.parse(row.message));

    yield batch;

    if (batch.length === config.pendingMessageLimit) {
      return this.getPending();
    }
  }

  deleteMessage(params: { id: string }) {
    this.deleteMessageQuery.run({ id: params.id });
  }

  deleteAll() {
    this.deleteAllMessagesQuery.run();
  }
}
