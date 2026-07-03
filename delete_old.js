const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const clientId = '6c8140f527ca5a969d3331c8e9c8b4ec';
const apiKey = 'i9/ivbZri+QPAfEKQXFt7xKeapWTa1k3Q4CuEtNWod+poysGT4U99fZ50qTnNoxPOffP2w8/og==';
const KB_ID = 'TG6G4GKTGz0pNV7qdcqLc6vO6fIOP4jLVk8LOd0Lovg=';
const FILE_NAME = '羽毛球进阶教学计划-两个月课程方案.md';
const SKILL_DIR = 'C:\\Users\\Lamb\\.openclaw\\skills\\ima';

function callImaApi(apiPath, body) {
  return new Promise((resolve, reject) => {
    const opts = JSON.stringify({clientId, apiKey});
    const proc = spawn('node', [path.join(SKILL_DIR, 'ima_api.cjs'), apiPath, JSON.stringify(body), opts], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) reject(new Error(stderr || `exit ${code}`));
      else resolve(JSON.parse(stdout));
    });
  });
}

async function searchAndDeleteMedia() {
  let cursor = '';
  do {
    const resp = await callImaApi('openapi/wiki/v1/search_knowledge_base', {
      query: FILE_NAME,
      cursor,
      limit: 20
    });
    const data = resp.data;
    for (const item of data.info_list || []) {
      if (item.kb_id === KB_ID) {
        const mediaResp = await callImaApi('openapi/wiki/v1/get_media_list', {
          knowledge_base_id: KB_ID,
          cursor: '',
          limit: 50
        });
        for (const m of mediaResp.data?.info_list || []) {
          if (m.title && m.title.includes('羽毛球进阶教学计划')) {
            console.log('Deleting media:', m.media_id, m.title);
            await callImaApi('openapi/wiki/v1/delete_media', {
              media_id: m.media_id,
              knowledge_base_id: KB_ID
            });
            console.log('Deleted');
          }
        }
      }
    }
    cursor = data.next_cursor || '';
  } while (cursor);
}

async function main() {
  await searchAndDeleteMedia();
  console.log('Done cleaning old files');
}

main().catch(e => { console.error(e.message); process.exit(1); });