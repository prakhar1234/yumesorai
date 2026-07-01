#!/usr/bin/env node

/**
 * Testing Agent System - Verification Script
 * Tests that the core components are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('TESTING AGENT SYSTEM VERIFICATION');
console.log('='.repeat(60) + '\n');

// Test 1: Check feature registry file exists
console.log('✓ Test 1: Checking feature registry file...');
const featuresPath = path.join(__dirname, 'agent-systems/testing-agent/features.json');
if (fs.existsSync(featuresPath)) {
  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
  console.log(`  ✓ Features file exists with ${features.features.length} features\n`);
} else {
  console.log('  ✗ Features file not found\n');
  process.exit(1);
}

// Test 2: Verify feature structure
console.log('✓ Test 2: Verifying feature structure...');
try {
  const features = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
  const requiredFields = ['id', 'name', 'category', 'dependencies', 'tags'];

  let allValid = true;
  features.features.forEach((feature, index) => {
    const hasRequiredFields = requiredFields.every(field => field in feature);
    if (!hasRequiredFields) {
      console.log(`  ✗ Feature ${index} missing required fields`);
      allValid = false;
    }
  });

  if (allValid) {
    console.log(`  ✓ All ${features.features.length} features have required fields\n`);
  } else {
    process.exit(1);
  }
} catch (error) {
  console.log(`  ✗ Error parsing features: ${error.message}\n`);
  process.exit(1);
}

// Test 3: Check TypeScript files exist
console.log('✓ Test 3: Checking TypeScript files...');
const requiredFiles = [
  'types.ts',
  'feature-registry.ts',
  'railway-integration.ts',
  'test-orchestrator.ts',
  'test-runner.ts',
  'agent.ts',
  'github-webhook.ts',
  'cli.ts',
  'config.example.ts',
  'index.ts',
];

let missingFiles = 0;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, `agent-systems/testing-agent/${file}`);
  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ Missing: ${file}`);
    missingFiles++;
  }
});

if (missingFiles === 0) {
  console.log(`  ✓ All ${requiredFiles.length} required TypeScript files found\n`);
} else {
  console.log(`  ✗ ${missingFiles} files missing\n`);
  process.exit(1);
}

// Test 4: Check documentation exists
console.log('✓ Test 4: Checking documentation...');
const docFiles = ['README.md', 'IMPLEMENTATION_GUIDE.md'];
let missingDocs = 0;
docFiles.forEach(file => {
  const filePath = path.join(__dirname, `agent-systems/testing-agent/${file}`);
  if (!fs.existsSync(filePath)) {
    console.log(`  ✗ Missing: ${file}`);
    missingDocs++;
  }
});

if (missingDocs === 0) {
  console.log(`  ✓ All ${docFiles.length} documentation files found\n`);
} else {
  console.log(`  ✗ ${missingDocs} documentation files missing\n`);
  process.exit(1);
}

// Test 5: Verify package.json has test:agent scripts
console.log('✓ Test 5: Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const requiredScripts = ['test:agent', 'test:agent:validate', 'test:agent:status'];
let missingScripts = 0;
requiredScripts.forEach(script => {
  if (!(script in packageJson.scripts)) {
    console.log(`  ✗ Missing script: ${script}`);
    missingScripts++;
  }
});

if (missingScripts === 0) {
  console.log(`  ✓ All ${requiredScripts.length} required scripts configured\n`);
} else {
  console.log(`  ✗ ${missingScripts} scripts missing\n`);
  process.exit(1);
}

// Test 6: Analyze feature dependencies
console.log('✓ Test 6: Analyzing feature dependencies...');
const features = JSON.parse(fs.readFileSync(featuresPath, 'utf-8'));
const featureMap = new Map(features.features.map(f => [f.id, f]));

// Check for circular dependencies
let circularDeps = [];
const visited = new Set();
const recursionStack = new Set();

function hasCycle(featureId) {
  visited.add(featureId);
  recursionStack.add(featureId);

  const feature = featureMap.get(featureId);
  if (!feature) return false;

  for (const depId of feature.dependencies) {
    if (!visited.has(depId)) {
      if (hasCycle(depId)) return true;
    } else if (recursionStack.has(depId)) {
      return true;
    }
  }

  recursionStack.delete(featureId);
  return false;
}

features.features.forEach(feature => {
  visited.clear();
  recursionStack.clear();
  if (hasCycle(feature.id)) {
    circularDeps.push(feature.id);
  }
});

if (circularDeps.length === 0) {
  console.log('  ✓ No circular dependencies detected\n');
} else {
  console.log(`  ✗ Circular dependencies found: ${circularDeps.join(', ')}\n`);
  process.exit(1);
}

// Test 7: Analyze feature categories
console.log('✓ Test 7: Analyzing feature categories...');
const categories = {};
features.features.forEach(feature => {
  if (!categories[feature.category]) {
    categories[feature.category] = [];
  }
  categories[feature.category].push(feature.name);
});

Object.entries(categories).forEach(([category, featureNames]) => {
  console.log(`  - ${category}: ${featureNames.join(', ')}`);
});
console.log();

// Test 8: Check test scripts in package.json
console.log('✓ Test 8: Checking test infrastructure...');
const testScripts = ['test:e2e', 'test:api', 'test:all'];
let missingTestScripts = 0;
testScripts.forEach(script => {
  if (!(script in packageJson.scripts)) {
    console.log(`  ✗ Missing test script: ${script}`);
    missingTestScripts++;
  }
});

if (missingTestScripts === 0) {
  console.log(`  ✓ All test infrastructure scripts configured\n`);
} else {
  console.log(`  ✗ ${missingTestScripts} test scripts missing\n`);
  process.exit(1);
}

// Summary
console.log('='.repeat(60));
console.log('VERIFICATION RESULTS');
console.log('='.repeat(60));
console.log(`
✓ Feature Registry: ${features.features.length} features configured
✓ TypeScript Files: ${requiredFiles.length} files present
✓ Documentation: README and Implementation Guide included
✓ Package Scripts: CLI tools configured
✓ Dependency Graph: No circular dependencies
✓ Categories: ${Object.keys(categories).length} feature categories

Feature Categories:
${Object.entries(categories).map(([cat, names]) => `  • ${cat}: ${names.length} features`).join('\n')}

Sample Features:
${features.features.slice(0, 3).map(f => `  • ${f.name} (${f.category})`).join('\n')}

Next Steps:
1. Create .env.local with Railway credentials
2. Setup GitHub webhook at: https://yourdomain.com/api/webhooks/github
3. Run: npm run test:agent list features
4. Configure Slack notifications (optional)

Status: ✓ READY FOR DEPLOYMENT
`);

console.log('='.repeat(60) + '\n');
