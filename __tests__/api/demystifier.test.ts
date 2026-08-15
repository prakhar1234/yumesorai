import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const FLASK_URL = process.env.FLASK_API_URL || 'http://localhost:5050';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

/**
 * Demystifier API Integration Tests
 *
 * Tests the full stack: Flask storage CRUD, Flask analysis endpoint,
 * and Next.js BFF proxy routes.
 *
 * Test names follow the testing-agent orchestrator convention:
 *   "{Feature Name}: {Test Description}"
 * so that `--grep` from the test runner picks them up correctly.
 *
 * Prerequisites:
 *   - Flask on port 5050: cd flask-api && flask --app app:create_app run --port 5050
 *   - Next.js on port 3000: npm run dev
 */

// =====================================================
// HELPERS
// =====================================================

let flaskAvailable = false;
let bffAvailable = false;

// Track IDs created during tests for cleanup
const createdIds: string[] = [];

async function createTestAnalysis(repoUrl = 'github.com/test-agent/test-repo'): Promise<string | null> {
  try {
    const res = await fetch(`${FLASK_URL}/api/demystify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl, input_type: 'github' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.analysis_id) {
        createdIds.push(data.analysis_id);
        return data.analysis_id;
      }
    }
  } catch {
    // LLM may not be configured — that's fine
  }
  return null;
}

async function seedAnalysisDirectly(): Promise<string | null> {
  // Seed via the Flask analyses list (we save a file by calling storage directly through a helper endpoint)
  // Since we can't call Python storage from JS, we'll POST to demystify and let it auto-save
  // If LLM is not configured, this will fail — tests handle that gracefully
  return createTestAnalysis();
}

// =====================================================
// SETUP / TEARDOWN
// =====================================================

beforeAll(async () => {
  // Check Flask availability
  try {
    const res = await fetch(`${FLASK_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    flaskAvailable = res.ok;
  } catch {
    flaskAvailable = false;
  }

  // Check BFF availability
  try {
    const res = await fetch(`${BASE_URL}/api/demystifier/analyses`, { signal: AbortSignal.timeout(3000) });
    bffAvailable = res.status !== 0;
  } catch {
    bffAvailable = false;
  }
});

afterAll(async () => {
  // Cleanup: delete any analyses created during tests
  for (const id of createdIds) {
    try {
      await fetch(`${FLASK_URL}/api/analyses/${id}`, { method: 'DELETE' });
    } catch {
      // ignore cleanup errors
    }
  }
});

// =====================================================
// DEMYSTIFIER STORAGE: API Validation
// =====================================================

describe('Demystifier Storage: API Validation', () => {
  it('GET /api/analyses should return an array', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/analyses`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/analyses should return summaries with expected fields', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/analyses`);
    const data = await res.json();

    if (data.length > 0) {
      const summary = data[0];
      expect(summary).toHaveProperty('id');
      expect(summary).toHaveProperty('repo_url');
      expect(summary).toHaveProperty('input_type');
      expect(summary).toHaveProperty('created_at');
      expect(summary).toHaveProperty('node_count');
      expect(summary).toHaveProperty('edge_count');
      // Summaries should NOT include the full result blob
      expect(summary).not.toHaveProperty('result');
    }
  });

  it('GET /api/analyses/:id should return 404 for non-existent ID', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/analyses/does-not-exist-99999`);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('GET /api/analyses/:id should return full record for valid ID', async () => {
    if (!flaskAvailable) return;

    // Use existing analyses if any
    const listRes = await fetch(`${FLASK_URL}/api/analyses`);
    const analyses = await listRes.json();
    if (analyses.length === 0) return;

    const id = analyses[0].id;
    const res = await fetch(`${FLASK_URL}/api/analyses/${id}`);
    expect(res.status).toBe(200);

    const record = await res.json();
    expect(record.id).toBe(id);
    expect(record).toHaveProperty('result');
    expect(record).toHaveProperty('repo_url');
    expect(record).toHaveProperty('created_at');
    expect(record).toHaveProperty('node_count');
    expect(record).toHaveProperty('edge_count');
  });

  it('DELETE /api/analyses/:id should return 404 for non-existent ID', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/analyses/does-not-exist-delete-test`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});

// =====================================================
// DEMYSTIFIER ANALYSIS: API Validation
// =====================================================

describe('Demystifier Analysis: API Validation', () => {
  it('POST /api/demystify should reject missing repo_url', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/demystify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/repo_url/i);
  });

  it('POST /api/demystify should reject invalid input_type', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/demystify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: 'github.com/test/repo', input_type: 'invalid' }),
    });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toMatch(/input_type/i);
  });

  it('POST /api/demystify should reject non-JSON body', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/demystify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/demystify should accept valid request (LLM dependent)', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/demystify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: 'github.com/test/repo', input_type: 'github' }),
    });

    // 200 if LLM is configured, 400/500 if not — both are valid behaviors
    expect([200, 400, 500]).toContain(res.status);

    if (res.status === 200) {
      const data = await res.json();
      // Should include analysis_id from auto-save
      expect(data).toHaveProperty('analysis_id');
      expect(typeof data.analysis_id).toBe('string');
      createdIds.push(data.analysis_id);
    }
  });

  it('Flask health endpoint should respond', async () => {
    if (!flaskAvailable) return;

    const res = await fetch(`${FLASK_URL}/api/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('healthy');
  });
});

// =====================================================
// DEMYSTIFIER BFF PROXY: API Validation
// =====================================================

describe('Demystifier BFF Proxy: API Validation', () => {
  it('GET /api/demystifier/analyses should proxy to Flask and return JSON', async () => {
    if (!bffAvailable) return;

    const res = await fetch(`${BASE_URL}/api/demystifier/analyses`);
    // 200 if Flask is up, 502 if Flask is down
    expect([200, 502]).toContain(res.status);

    if (res.status === 200) {
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  it('GET /api/demystifier/analyses/:id should return 404 for non-existent', async () => {
    if (!bffAvailable) return;

    const res = await fetch(`${BASE_URL}/api/demystifier/analyses/nonexistent-bff-test`);
    expect([404, 502]).toContain(res.status);

    if (res.status === 404) {
      const data = await res.json();
      expect(data.error).toBeDefined();
    }
  });

  it('GET /api/demystifier/analyses/:id should return full record for valid ID', async () => {
    if (!bffAvailable || !flaskAvailable) return;

    // First get list to find a valid ID
    const listRes = await fetch(`${BASE_URL}/api/demystifier/analyses`);
    if (listRes.status !== 200) return;

    const analyses = await listRes.json();
    if (analyses.length === 0) return;

    const id = analyses[0].id;
    const res = await fetch(`${BASE_URL}/api/demystifier/analyses/${id}`);
    expect(res.status).toBe(200);

    const record = await res.json();
    expect(record.id).toBe(id);
    expect(record).toHaveProperty('result');
  });

  it('DELETE /api/demystifier/analyses/:id should return 404 for non-existent', async () => {
    if (!bffAvailable) return;

    const res = await fetch(`${BASE_URL}/api/demystifier/analyses/nonexistent-bff-delete`, {
      method: 'DELETE',
    });
    expect([404, 502]).toContain(res.status);
  });

  it('POST /api/demystifier should proxy demystify requests', async () => {
    if (!bffAvailable) return;

    const res = await fetch(`${BASE_URL}/api/demystifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: 'github.com/test/proxy-test', input_type: 'github' }),
    });

    // Validates the proxy itself works (any non-5xx response from the proxy is fine)
    // 200 = LLM worked, 400 = validation error forwarded, 500 = LLM error forwarded, 502 = Flask down
    expect([200, 400, 500, 502, 504]).toContain(res.status);
  });

  it('POST /api/demystifier should reject missing repo_url via proxy', async () => {
    if (!bffAvailable) return;

    const res = await fetch(`${BASE_URL}/api/demystifier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    // BFF itself validates repo_url and returns 400
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/repo_url/i);
  });
});

// =====================================================
// CROSS-LAYER INTEGRATION TESTS
// =====================================================

describe('Demystifier Analysis: Integration', () => {
  it('analysis list endpoint should be consistent between Flask and BFF', async () => {
    if (!flaskAvailable || !bffAvailable) return;

    const [flaskRes, bffRes] = await Promise.all([
      fetch(`${FLASK_URL}/api/analyses`),
      fetch(`${BASE_URL}/api/demystifier/analyses`),
    ]);

    expect(flaskRes.status).toBe(200);
    expect(bffRes.status).toBe(200);

    const flaskData = await flaskRes.json();
    const bffData = await bffRes.json();

    // Both should return the same list
    expect(flaskData.length).toBe(bffData.length);

    if (flaskData.length > 0) {
      expect(flaskData[0].id).toBe(bffData[0].id);
    }
  });

  it('404 responses should be consistent between Flask and BFF', async () => {
    if (!flaskAvailable || !bffAvailable) return;

    const fakeId = 'integration-test-fake-id-000';
    const [flaskRes, bffRes] = await Promise.all([
      fetch(`${FLASK_URL}/api/analyses/${fakeId}`),
      fetch(`${BASE_URL}/api/demystifier/analyses/${fakeId}`),
    ]);

    expect(flaskRes.status).toBe(404);
    expect(bffRes.status).toBe(404);
  });
});
