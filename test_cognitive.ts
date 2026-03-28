import { learningMemory } from './js/learningMemory.ts';
import { cognitiveInference } from './js/cognitiveInference.ts';
import { reinforcementPlanner } from './js/reinforcementPlanner.ts';
import { timeAuthority } from './js/timeAuthority.ts';

// Mock some memory records
const now = timeAuthority.getNow();
const MS_PER_DAY = 24 * 60 * 60 * 1000;

learningMemory.recordEncounter('你好', now - 2 * MS_PER_DAY);
learningMemory.recordEncounter('你好', now - 1 * MS_PER_DAY);
learningMemory.recordEncounter('你好', now);
learningMemory.recordReview('你好', now);
learningMemory.recordSave('你好', now);

learningMemory.recordEncounter('再见', now - 10 * MS_PER_DAY);
learningMemory.recordEncounter('再见', now - 10 * MS_PER_DAY);
learningMemory.recordEncounter('再见', now - 10 * MS_PER_DAY);

learningMemory.recordEncounter('谢谢', now - 30 * MS_PER_DAY);
learningMemory.recordEncounter('谢谢', now - 30 * MS_PER_DAY);
learningMemory.recordEncounter('谢谢', now - 30 * MS_PER_DAY);
learningMemory.recordEncounter('谢谢', now - 30 * MS_PER_DAY);
learningMemory.recordEncounter('谢谢', now - 30 * MS_PER_DAY);
learningMemory.recordReview('谢谢', now - 30 * MS_PER_DAY);
learningMemory.recordReview('谢谢', now - 30 * MS_PER_DAY);

learningMemory.recordEncounter('对不起', now - 1 * MS_PER_DAY);

learningMemory.recordEncounter('没关系', now - 50 * MS_PER_DAY);
for(let i=0; i<15; i++) learningMemory.recordEncounter('没关系', now - 50 * MS_PER_DAY);
for(let i=0; i<4; i++) learningMemory.recordReview('没关系', now - 50 * MS_PER_DAY);

const profiles = cognitiveInference.deriveAllProfiles(now);
console.log("PROFILES:");
console.log(JSON.stringify(profiles, null, 2));

const candidates = reinforcementPlanner.planReinforcement(now, profiles);
console.log("CANDIDATES:");
console.log(JSON.stringify(candidates, null, 2));
