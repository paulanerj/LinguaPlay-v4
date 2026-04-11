const fs = require('fs');
const data = require('cedict-json');

console.log("Total entries:", data.length);
console.log("First entry:", data[0]);
console.log("Second entry:", data[1]);
