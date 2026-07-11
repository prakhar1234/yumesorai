#!/usr/bin/env node
/**
 * Fetch Railway deployment logs and status
 */

const https = require('https');

const token = '99c6a40e-01f8-4fcd-8fe7-6a9342d2deac';

function makeRequest(hostname, path, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getLogs() {
  try {
    console.log('Fetching Railway project information...\n');

    // Query for projects
    const projectsQuery = {
      query: `
        query {
          projects(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `
    };

    const projectsResult = await makeRequest('api.railway.app', '/graphql', 'POST', projectsQuery);
    console.log('Projects Result:', JSON.stringify(projectsResult, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

getLogs();
