export interface BoardTask {
  id: string;
  title: string;
  status: string;
  originalStatus: string;
  path: string;
  updatedAt: string;
  branch: string | null;
  commitStatus: string;
  commits: string[];
  commitDetails: BoardCommitDetail[];
  relatedFiles: string[];
  verification: unknown;
  sections: Record<string, string>;
  criteria: {
    checked: number;
    total: number;
  };
}

export interface BoardCommitDetail {
  hash: string;
  shortHash: string;
  subject: string;
  additions: number | null;
  deletions: number | null;
  filesChanged: number | null;
  files: BoardCommitFile[];
  error: string | null;
}

export interface BoardCommitFile {
  path: string;
  status: "U" | "M" | "D";
  additions: number;
  deletions: number;
}

export interface BoardModel {
  generatedAt: string;
  repoRoot: string;
  statuses: string[];
  tasks: BoardTask[];
}
