const https = require('https');
const url = 'https://api.github.com/repos/s66899/lamb/actions/runs?per_page=4';
https.get(url, { headers: { 'User-Agent': 'openclaw' } }, (r) => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    const j = JSON.parse(d);
    (j.workflow_runs || []).forEach(rr => {
      console.log('#'+String(rr.run_number).padStart(3), String(rr.name||'').slice(0,40).padEnd(42), rr.head_sha.slice(0,7), '→', (rr.conclusion||rr.status||'?').padEnd(10), rr.created_at.slice(11,19));
    });
  });
});
