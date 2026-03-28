import './mockLocalStorage.ts';
import { determinismHarness } from './js/determinismHarness.ts';

async function run() {
  const isDeterministic = await determinismHarness.runHarness(3);
  if (!isDeterministic) {
    console.error("Determinism check failed.");
    process.exit(1);
  }
}

run();
