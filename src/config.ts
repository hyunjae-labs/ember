import { homedir } from "node:os";
import { join } from "node:path";

const emberDir = process.env.EMBER_DIR || join(homedir(), ".ember");

export const CONFIG = {
  emberDir,
  dbPath: process.env.EMBER_DB || join(emberDir, "ember.db"),
  embeddingModel: "Xenova/multilingual-e5-small",
  embeddingDimensions: 384,
  searchDefaultLimit: 10,
  searchMaxLimit: 50,
} as const;
