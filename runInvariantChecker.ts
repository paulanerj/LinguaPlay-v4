import { invariantChecker } from './js/invariantChecker.ts';

async function run() {
  const isCompliant = await invariantChecker.runCheck();
  if (!isCompliant) {
    console.error("Invariant check failed.");
    process.exit(1);
  }
}

run();
