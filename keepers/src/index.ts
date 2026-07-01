import { runWatcher } from "./watcher.js";
import { runFlashLoanFiller } from "./flashLoanFiller.js";

export * from "./flashLoanFiller.js";
export * from "./liquidator.js";
export * from "./watcher.js";

if (process.argv[1] && (process.argv[1].endsWith('index.ts') || process.argv[1].endsWith('index.js'))) {
  console.log("Booting Ergo Keepers...");
  runWatcher();
  runFlashLoanFiller();
}