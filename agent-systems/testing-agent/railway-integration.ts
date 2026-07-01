/**
 * Railway Integration System
 * Monitors deployment status and provides deployment information
 */

import { RailwayDeployment, DeploymentStatus, DeploymentEvent } from './types';

interface RailwayAPI {
  projectId: string;
  environmentId: string;
  apiToken: string;
  apiBaseUrl: string;
}

interface RailwayDeploymentResponse {
  data: {
    deployments: Array<{
      id: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      staticUrl?: string;
      environment: {
        id: string;
        name: string;
      };
      deployment: {
        id: string;
        status: string;
        meta: {
          commit?: string;
          commitMessage?: string;
        };
      };
    }>;
  };
}

export class RailwayIntegration {
  private config: RailwayAPI;
  private pollInterval: number;
  private maxPollAttempts: number;
  private deploymentCache: Map<string, RailwayDeployment>;

  constructor(
    projectId: string,
    environmentId: string,
    apiToken: string,
    options?: { pollInterval?: number; maxPollAttempts?: number }
  ) {
    this.config = {
      projectId,
      environmentId,
      apiToken,
      apiBaseUrl: 'https://api.railway.app/graphql',
    };
    this.pollInterval = options?.pollInterval || 5000; // 5 seconds
    this.maxPollAttempts = options?.maxPollAttempts || 60; // 5 minutes total
    this.deploymentCache = new Map();
  }

  /**
   * Get the latest deployment
   */
  async getLatestDeployment(): Promise<RailwayDeployment | null> {
    try {
      const query = `
        query GetDeployments($projectId: String!, $environmentId: String!) {
          deployments(
            input: {
              projectId: $projectId
              environmentId: $environmentId
              first: 1
            }
          ) {
            edges {
              node {
                id
                status
                createdAt
                updatedAt
                environment {
                  id
                  name
                }
                meta {
                  commit
                  commitMessage
                }
                staticUrl
              }
            }
          }
        }
      `;

      const response = await fetch(this.config.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          query,
          variables: {
            projectId: this.config.projectId,
            environmentId: this.config.environmentId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Railway API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      const deployments = data.data?.deployments?.edges || [];
      if (deployments.length === 0) {
        return null;
      }

      const node = deployments[0].node;
      return this.mapDeployment(node);
    } catch (error) {
      console.error('Failed to fetch latest deployment:', error);
      return null;
    }
  }

  /**
   * Poll for deployment completion with exponential backoff
   */
  async waitForDeploymentCompletion(
    deploymentId: string,
    onProgress?: (attempt: number, status: DeploymentStatus) => void
  ): Promise<{ success: boolean; deployment: RailwayDeployment | null; duration: number }> {
    const startTime = Date.now();
    let attempt = 0;
    let lastStatus: DeploymentStatus | null = null;

    while (attempt < this.maxPollAttempts) {
      try {
        const deployment = await this.getDeploymentById(deploymentId);

        if (!deployment) {
          console.error(`Deployment ${deploymentId} not found`);
          return {
            success: false,
            deployment: null,
            duration: Date.now() - startTime,
          };
        }

        const status = this.parseStatus(deployment.status);

        if (status !== lastStatus) {
          lastStatus = status;
          if (onProgress) {
            onProgress(attempt, status);
          }
          console.log(`Deployment status: ${status}`);
        }

        if (status === 'success') {
          return {
            success: true,
            deployment,
            duration: Date.now() - startTime,
          };
        }

        if (status === 'failed' || status === 'cancelled') {
          return {
            success: false,
            deployment,
            duration: Date.now() - startTime,
          };
        }

        // Wait before next poll with exponential backoff
        const backoffDelay = Math.min(
          this.pollInterval * Math.pow(1.5, Math.floor(attempt / 5)),
          30000 // Max 30 seconds
        );
        await this.sleep(backoffDelay);
        attempt++;
      } catch (error) {
        console.error(`Error checking deployment status:`, error);
        await this.sleep(this.pollInterval);
        attempt++;
      }
    }

    return {
      success: false,
      deployment: null,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Get deployment by ID
   */
  async getDeploymentById(deploymentId: string): Promise<RailwayDeployment | null> {
    // Check cache first
    if (this.deploymentCache.has(deploymentId)) {
      return this.deploymentCache.get(deploymentId) || null;
    }

    try {
      const query = `
        query GetDeployment($id: String!) {
          deployment(id: $id) {
            id
            status
            createdAt
            updatedAt
            environment {
              id
              name
            }
            meta {
              commit
              commitMessage
            }
          }
        }
      `;

      const response = await fetch(this.config.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          query,
          variables: { id: deploymentId },
        }),
      });

      if (!response.ok) {
        throw new Error(`Railway API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      const deployment = data.data?.deployment;
      if (!deployment) {
        return null;
      }

      const mapped = this.mapDeployment(deployment);
      this.deploymentCache.set(deploymentId, mapped);
      return mapped;
    } catch (error) {
      console.error(`Failed to fetch deployment ${deploymentId}:`, error);
      return null;
    }
  }

  /**
   * Get deployments by commit SHA
   */
  async getDeploymentsByCommit(commitSha: string): Promise<RailwayDeployment[]> {
    try {
      const query = `
        query GetDeploymentsByCommit($projectId: String!, $environmentId: String!) {
          deployments(
            input: {
              projectId: $projectId
              environmentId: $environmentId
              first: 10
            }
          ) {
            edges {
              node {
                id
                status
                createdAt
                updatedAt
                meta {
                  commit
                  commitMessage
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.config.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          query,
          variables: {
            projectId: this.config.projectId,
            environmentId: this.config.environmentId,
          },
        }),
      });

      const data = await response.json();
      const deployments = data.data?.deployments?.edges || [];

      return deployments
        .map((edge: any) => this.mapDeployment(edge.node))
        .filter((d: RailwayDeployment) => d.commitSha === commitSha);
    } catch (error) {
      console.error('Failed to fetch deployments by commit:', error);
      return [];
    }
  }

  /**
   * Map Railway API response to internal deployment model
   */
  private mapDeployment(node: any): RailwayDeployment {
    return {
      id: node.id,
      status: this.parseStatus(node.status),
      createdAt: new Date(node.createdAt),
      updatedAt: new Date(node.updatedAt),
      commitSha: node.meta?.commit || '',
      commitMessage: node.meta?.commitMessage || '',
      environment: this.parseEnvironment(node.environment?.name || ''),
      duration: node.updatedAt ? new Date(node.updatedAt).getTime() - new Date(node.createdAt).getTime() : 0,
      logs: '', // Logs would need separate API call
    };
  }

  /**
   * Parse deployment status
   */
  private parseStatus(status: string): DeploymentStatus {
    const statusMap: Record<string, DeploymentStatus> = {
      INITIALIZING: 'building',
      BUILD_IN_PROGRESS: 'building',
      BUILD_FAILED: 'failed',
      WAITING: 'building',
      DEPLOYING: 'deploying',
      DEPLOY_FAILED: 'failed',
      CRASHED: 'failed',
      SUCCESS: 'success',
      REMOVING: 'cancelled',
      REMOVED: 'cancelled',
    };

    return statusMap[status] || 'pending';
  }

  /**
   * Parse environment
   */
  private parseEnvironment(env: string): 'staging' | 'production' {
    return env.toLowerCase().includes('production') ? 'production' : 'staging';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if deployment is accessible
   */
  async isDeploymentAccessible(baseUrl: string, maxAttempts: number = 5): Promise<boolean> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${baseUrl}/api/internal/docs`, {
          method: 'GET',
          timeout: 5000,
        });

        if (response.ok) {
          return true;
        }
      } catch (error) {
        console.log(`Accessibility check attempt ${attempt + 1} failed, retrying...`);
        await this.sleep(2000);
      }
    }
    return false;
  }
}

export function createRailwayIntegration(
  projectId: string,
  environmentId: string,
  apiToken: string
): RailwayIntegration {
  return new RailwayIntegration(projectId, environmentId, apiToken);
}
