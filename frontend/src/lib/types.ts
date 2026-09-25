// TypeScript mirrors of the backend API schemas. Field names match the API's snake_case.

export interface Health {
  status: string;
  database: string;
  fts5: boolean;
  llm_provider: string;
  boot_count: number;
}
