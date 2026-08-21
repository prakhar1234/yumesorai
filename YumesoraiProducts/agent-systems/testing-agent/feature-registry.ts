/**
 * Feature Registry System
 * Manages feature definitions, dependencies, and automatic detection
 */

import fs from 'fs';
import path from 'path';
import { Feature, FeatureRegistry } from './types';

export class FeatureRegistryManager {
  private registry: FeatureRegistry;
  private registryPath: string;
  private featureMap: Map<string, Feature>;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
    this.featureMap = new Map();
    this.registry = this.loadRegistry();
    this.buildFeatureMap();
  }

  /**
   * Load feature registry from disk
   */
  private loadRegistry(): FeatureRegistry {
    try {
      const content = fs.readFileSync(this.registryPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Return default registry if file doesn't exist
      return {
        features: this.getDefaultFeatures(),
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Build in-memory map for fast lookups
   */
  private buildFeatureMap(): void {
    this.registry.features.forEach((feature) => {
      this.featureMap.set(feature.id, feature);
    });
  }

  /**
   * Get default features based on current implementation
   */
  private getDefaultFeatures(): Feature[] {
    return [
      // Form Features
      {
        id: 'contact-form',
        name: 'Contact Form',
        description: 'Contact form for lead generation',
        category: 'form',
        apiEndpoints: ['/api/contact'],
        formPages: ['/contact'],
        dependencies: ['email-service'],
        tags: ['form', 'frontend', 'validation'],
        lastModified: new Date(),
      },
      {
        id: 'demo-form',
        name: 'Demo Booking Form',
        description: 'Demo/briefing booking form',
        category: 'form',
        apiEndpoints: ['/api/demo'],
        formPages: ['/demo'],
        dependencies: ['email-service', 'calendar-integration'],
        tags: ['form', 'frontend', 'scheduling'],
        lastModified: new Date(),
      },
      {
        id: 'assessment-form',
        name: 'Assessment Form',
        description: 'Multi-step assessment form',
        category: 'form',
        apiEndpoints: ['/api/assessment'],
        formPages: ['/assessment'],
        dependencies: ['email-service', 'hubspot-integration'],
        tags: ['form', 'frontend', 'multi-step'],
        lastModified: new Date(),
      },
      {
        id: 'risk-briefing-form',
        name: 'Risk Briefing Form',
        description: 'Risk briefing scheduling form',
        category: 'form',
        apiEndpoints: ['/api/risk-briefing'],
        formPages: ['/risk-briefing'],
        dependencies: ['email-service', 'calendar-integration'],
        tags: ['form', 'frontend'],
        lastModified: new Date(),
      },
      {
        id: 'roi-calculator',
        name: 'ROI Calculator',
        description: 'Interactive ROI calculation tool',
        category: 'form',
        apiEndpoints: ['/api/roi-calculator'],
        formPages: ['/tools/roi-calculator'],
        dependencies: ['email-service'],
        tags: ['form', 'frontend', 'calculator'],
        lastModified: new Date(),
      },
      // Service Features
      {
        id: 'email-service',
        name: 'Email Service',
        description: 'Email delivery and notifications',
        category: 'integration',
        apiEndpoints: ['/api/internal/send-bulk-email'],
        dependencies: [],
        tags: ['email', 'backend', 'infrastructure'],
        lastModified: new Date(),
      },
      {
        id: 'calendar-integration',
        name: 'Calendar Integration',
        description: 'Calendar availability and scheduling',
        category: 'integration',
        dependencies: [],
        tags: ['scheduling', 'integration'],
        lastModified: new Date(),
      },
      {
        id: 'hubspot-integration',
        name: 'HubSpot Integration',
        description: 'HubSpot CRM synchronization',
        category: 'integration',
        dependencies: [],
        tags: ['crm', 'integration'],
        lastModified: new Date(),
      },
      // API Features
      {
        id: 'form-validation',
        name: 'Form Validation',
        description: 'Server-side form validation',
        category: 'api',
        apiEndpoints: ['/api/contact', '/api/demo', '/api/assessment', '/api/risk-briefing', '/api/roi-calculator'],
        dependencies: [],
        tags: ['api', 'validation'],
        lastModified: new Date(),
      },
      {
        id: 'form-submission',
        name: 'Form Submission',
        description: 'Form submission and processing',
        category: 'api',
        apiEndpoints: ['/api/contact', '/api/demo', '/api/assessment', '/api/risk-briefing', '/api/roi-calculator'],
        dependencies: ['email-service'],
        tags: ['api', 'backend'],
        lastModified: new Date(),
      },
    ];
  }

  /**
   * Get all features
   */
  getAllFeatures(): Feature[] {
    return this.registry.features;
  }

  /**
   * Get a specific feature by ID
   */
  getFeature(featureId: string): Feature | undefined {
    return this.featureMap.get(featureId);
  }

  /**
   * Get all dependents of a feature (features that depend on this one)
   */
  getDependents(featureId: string): Feature[] {
    return this.registry.features.filter((feature) =>
      feature.dependencies.includes(featureId)
    );
  }

  /**
   * Get all dependencies of a feature (transitively)
   */
  getTransitiveDependencies(featureId: string): Feature[] {
    const dependencies: Feature[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const feature = this.featureMap.get(id);
      if (!feature) return;

      feature.dependencies.forEach((depId) => {
        const depFeature = this.featureMap.get(depId);
        if (depFeature) {
          dependencies.push(depFeature);
          visit(depId);
        }
      });
    };

    visit(featureId);
    return dependencies;
  }

  /**
   * Get all dependents of a feature (transitively)
   */
  getTransitiveDependents(featureId: string): Feature[] {
    const dependents: Feature[] = [];
    const visited = new Set<string>();

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const deps = this.getDependents(id);
      deps.forEach((dep) => {
        if (!visited.has(dep.id)) {
          dependents.push(dep);
          visit(dep.id);
        }
      });
    };

    visit(featureId);
    return dependents;
  }

  /**
   * Get features that changed based on file modifications
   */
  getAffectedFeatures(changedFiles: string[]): Feature[] {
    const affected = new Set<Feature>();

    changedFiles.forEach((file) => {
      // Check which features are affected by this file change
      this.registry.features.forEach((feature) => {
        // API endpoint changes
        if (feature.apiEndpoints) {
          feature.apiEndpoints.forEach((endpoint) => {
            const apiPath = endpoint.replace(/^\/api\//, '').replace(/\//g, '/');
            if (file.includes(`api/${apiPath}`) || file.includes(`api/[${apiPath}]`)) {
              affected.add(feature);
            }
          });
        }

        // Form page changes
        if (feature.formPages) {
          feature.formPages.forEach((page) => {
            const pagePath = page.replace(/^\//, '').replace(/\//g, '/');
            if (file.includes(pagePath) || file.includes(pagePath.replace('/', '(page)'))) {
              affected.add(feature);
            }
          });
        }

        // Generic pattern matching
        if (file.includes(feature.id.replace(/-/g, '_')) || file.includes(feature.id.replace(/-/g, '-'))) {
          affected.add(feature);
        }
      });
    });

    return Array.from(affected);
  }

  /**
   * Get features that should be tested when a feature is modified
   * Includes the feature itself + all transitive dependents
   */
  getFeaturesForTesting(modifiedFeatureId: string): Feature[] {
    const features = new Set<Feature>();

    const feature = this.featureMap.get(modifiedFeatureId);
    if (feature) {
      features.add(feature);
    }

    // Add all transitive dependents
    this.getTransitiveDependents(modifiedFeatureId).forEach((f) => features.add(f));

    return Array.from(features);
  }

  /**
   * Save registry to disk
   */
  saveRegistry(): void {
    this.registry.lastUpdated = new Date();
    fs.writeFileSync(
      this.registryPath,
      JSON.stringify(this.registry, null, 2)
    );
  }

  /**
   * Add a new feature
   */
  addFeature(feature: Feature): void {
    this.registry.features.push(feature);
    this.featureMap.set(feature.id, feature);
    this.saveRegistry();
  }

  /**
   * Update a feature
   */
  updateFeature(featureId: string, updates: Partial<Feature>): void {
    const feature = this.featureMap.get(featureId);
    if (feature) {
      Object.assign(feature, updates);
      feature.lastModified = new Date();
      this.saveRegistry();
    }
  }

  /**
   * Validate feature dependency graph (check for cycles)
   */
  validateDependencies(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (featureId: string): boolean => {
      visited.add(featureId);
      recursionStack.add(featureId);

      const feature = this.featureMap.get(featureId);
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
    };

    for (const feature of this.registry.features) {
      visited.clear();
      recursionStack.clear();

      if (hasCycle(feature.id)) {
        errors.push(`Circular dependency detected in feature: ${feature.id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
let registryInstance: FeatureRegistryManager | null = null;

export function getFeatureRegistry(registryPath?: string): FeatureRegistryManager {
  if (!registryInstance) {
    const configPath = registryPath || path.join(process.cwd(), 'agent-systems/testing-agent/features.json');
    registryInstance = new FeatureRegistryManager(configPath);
  }
  return registryInstance;
}
