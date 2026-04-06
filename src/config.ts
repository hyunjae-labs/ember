import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG = {
  get emberDir() { return process.env.EMBER_DIR || join(homedir(), ".ember"); },
  get dbPath() { return process.env.EMBER_DB || join(homedir(), ".ember", "ember.db"); },
  embeddingModel: "Xenova/multilingual-e5-small",
  embeddingDimensions: 384,
  embeddingBatchSize: 32,
  todoSearchDefaultLimit: 10,
  todoSearchMaxLimit: 50,
} as const;
