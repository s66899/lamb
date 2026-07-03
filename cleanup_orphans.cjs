const fs = require('fs');
const path = require('path');

const sessionsDir = path.join(process.env.USERPROFILE, '.openclaw', 'agents', 'main', 'sessions');
const sessionsFile = path.join(sessionsDir, 'sessions.json');

const sessionsJson = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
const referenced = new Set(Object.values(sessionsJson.sessions).map(s => s.sessionFile));

const allJsonl = fs.readdirSync(sessionsDir)
  .filter(f => f.endsWith('.jsonl'))
  .map(f => path.join(sessionsDir, f));

const orphans = allJsonl.filter(f => !referenced.has(f) && !f.includes('.deleted.'));
const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 14);

console.log(`Total .jsonl files: ${allJsonl.length}`);
console.log(`Referenced in sessions.json: ${referenced.size}`);
console.log(`Orphan files to archive: ${orphans.length}`);

orphans.forEach(f => {
  const base = path.basename(f, '.jsonl');
  const newName = path.join(sessionsDir, base + '.deleted.' + ts + '.jsonl');
  fs.renameSync(f, newName);
  console.log('Archived:', path.basename(f));
});

const deletedCount = fs.readdirSync(sessionsDir).filter(f => f.includes('.deleted.')).length;
console.log(`\nTotal archived files: ${deletedCount}`);