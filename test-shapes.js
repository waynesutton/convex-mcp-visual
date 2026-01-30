#!/usr/bin/env node
// Quick test to see the actual shapes2 API response format

const deployKey = process.env.CONVEX_DEPLOY_KEY;

if (!deployKey) {
  console.error('Set CONVEX_DEPLOY_KEY environment variable');
  process.exit(1);
}

// Parse deploy key
let adminKey, deploymentUrl;
if (deployKey.includes('|')) {
  const pipeIndex = deployKey.indexOf('|');
  const prefix = deployKey.substring(0, pipeIndex);
  adminKey = deployKey.substring(pipeIndex + 1);

  if (prefix.includes(':')) {
    const colonIndex = prefix.indexOf(':');
    const deploymentName = prefix.substring(colonIndex + 1);
    deploymentUrl = `https://${deploymentName}.convex.cloud`;
  }
}

console.log('Deployment URL:', deploymentUrl);
console.log('Admin key:', adminKey ? adminKey.substring(0, 20) + '...' : 'none');

async function test() {
  const response = await fetch(`${deploymentUrl}/api/shapes2`, {
    headers: {
      'Authorization': `Convex ${adminKey}`,
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    console.error('Error:', response.status, response.statusText);
    const text = await response.text();
    console.error('Body:', text);
    return;
  }

  const shapes = await response.json();

  // Show first table's shape
  const tables = Object.keys(shapes).filter(t => !t.startsWith('_'));
  console.log('\nTables found:', tables.length);

  if (tables.length > 0) {
    const firstTable = tables[0];
    console.log(`\nRaw shape for "${firstTable}":`);
    console.log(JSON.stringify(shapes[firstTable], null, 2));
  }
}

test().catch(console.error);
