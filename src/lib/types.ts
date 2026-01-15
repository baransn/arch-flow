// Core types for the application

export interface GitHubRepo {
  owner: string;
  name: string;
  branch?: string;
}

export interface AnimationStep {
  step: number;
  node: string;
  message: string;
  duration: number;
  request?: string;
  response?: string;
}

export interface Flow {
  name: string;
  description: string;
  steps: AnimationStep[];
  nodes: string[];
}

export interface ArchitectureAnalysis {
  diagram: string; // Mermaid diagram syntax
  flows: Flow[];
  timestamp: number;
  repoInfo: GitHubRepo;
}

export interface AnalysisStatus {
  status: 'downloading' | 'extracting' | 'analyzing' | 'generating' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface CacheMetadata {
  repoKey: string;
  timestamp: number;
  blobUrl: string;
}
