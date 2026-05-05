// Test cases for findPlayByScore function

function findPlayByScore(plays, a, h, q) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i];
    if (p.q === q) {
      const d = Math.abs(p.away - a) + Math.abs(p.home - h);
      if (d < bd) { bd = d; best = i; }
    }
  }
  return best;
}

// Sample play data from curry-record.js
const testPlays = [
  { q:1, time:"12:00", away:0, home:0, desc:"Jump ball" },
  { q:1, time:"11:42", away:0, home:0, desc:"Curry misses" },
  { q:1, time:"11:20", away:0, home:2, desc:"Randle hits" },
  { q:1, time:"10:55", away:2, home:2, desc:"Wiggins scores" },
  { q:1, time:"10:30", away:2, home:5, desc:"Randle three" },
  { q:1, time:"8:22", away:7, home:9, desc:"CURRY TIES RECORD" },
  { q:1, time:"5:58", away:12, home:16, desc:"CURRY BREAKS RECORD" },
  { q:1, time:"0:00", away:28, home:32, desc:"End Q1" },
  { q:2, time:"9:20", away:32, home:39, desc:"Randle three Q2" },
  { q:2, time:"8:45", away:34, home:39, desc:"Curry floater" },
  { q:2, time:"0:02", away:45, home:54, desc:"Half" },
  { q:3, time:"11:30", away:48, home:54, desc:"Curry opens half" },
  { q:3, time:"9:45", away:53, home:56, desc:"Poole three" },
  { q:3, time:"0:03", away:78, home:78, desc:"End Q3" },
  { q:4, time:"10:10", away:83, home:80, desc:"Poole three Q4" },
  { q:4, time:"0:05", away:105, home:96, desc:"FINAL" },
];

// Test cases
const tests = [
  {
    name: "Exact match - Q1 score 7-9",
    input: { away: 7, home: 9, q: 1 },
    expectedIndex: 5,
    expectedDesc: "CURRY TIES RECORD"
  },
  {
    name: "Near match - Q1 score 6-9 (off by 1)",
    input: { away: 6, home: 9, q: 1 },
    expectedIndex: 5,
    expectedDesc: "CURRY TIES RECORD"
  },
  {
    name: "Exact match - Q2 score 45-54 (halftime)",
    input: { away: 45, home: 54, q: 2 },
    expectedIndex: 10,
    expectedDesc: "Half"
  },
  {
    name: "Fuzzy match - Q3 score 50-55 (actual 48-54 or 53-56)",
    input: { away: 50, home: 55, q: 3 },
    expectedIndex: 11, // 48-54 has distance 2+1=3, 53-56 has distance 3+1=4
    expectedDesc: "Curry opens half"
  },
  {
    name: "End of Q3 - tied at 78",
    input: { away: 78, home: 78, q: 3 },
    expectedIndex: 13,
    expectedDesc: "End Q3"
  },
  {
    name: "Q4 final score 105-96",
    input: { away: 105, home: 96, q: 4 },
    expectedIndex: 15,
    expectedDesc: "FINAL"
  },
  {
    name: "Start of game Q1 0-0",
    input: { away: 0, home: 0, q: 1 },
    expectedIndex: 0, // First 0-0 play
    expectedDesc: "Jump ball"
  },
  {
    name: "Q4 early - score 83-80",
    input: { away: 83, home: 80, q: 4 },
    expectedIndex: 14,
    expectedDesc: "Poole three Q4"
  }
];

// Run tests
console.log("Testing findPlayByScore function\n");
console.log("=".repeat(60));

let passed = 0;
let failed = 0;

tests.forEach((test, i) => {
  const result = findPlayByScore(testPlays, test.input.away, test.input.home, test.input.q);
  const resultPlay = testPlays[result];
  const success = result === test.expectedIndex;

  if (success) {
    console.log(`✅ Test ${i + 1}: ${test.name}`);
    console.log(`   Input: Q${test.input.q} ${test.input.away}-${test.input.home}`);
    console.log(`   Found: [${result}] Q${resultPlay.q} ${resultPlay.away}-${resultPlay.home} "${resultPlay.desc}"\n`);
    passed++;
  } else {
    console.log(`❌ Test ${i + 1}: ${test.name}`);
    console.log(`   Input: Q${test.input.q} ${test.input.away}-${test.input.home}`);
    console.log(`   Expected: [${test.expectedIndex}] "${test.expectedDesc}"`);
    console.log(`   Got: [${result}] Q${resultPlay.q} ${resultPlay.away}-${resultPlay.home} "${resultPlay.desc}"\n`);
    failed++;
  }
});

console.log("=".repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed === 0) {
  console.log("\n🎉 All tests passed!");
  process.exit(0);
} else {
  console.log("\n⚠️  Some tests failed");
  process.exit(1);
}
