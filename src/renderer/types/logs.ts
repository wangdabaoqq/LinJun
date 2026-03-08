export interface RequestLogEntry {
  id: string;
  status: "success" | "error";
  statusCode: number;
  timestamp: string;
  time: string;
  method?: string;
  url?: string;
  provider?: string;
  model?: string;
  account?: string;
  userInput?: string;
  requestBody?: string;
}

export interface RequestLogDiagnostics {
  logDir: string;
  writablePath?: string;
  resolution: "writable_path" | "config_dir" | "auth_dir_fallback";
  status: "ok" | "directory_empty" | "unrecognized_files" | "read_error";
  error?: string;
  totalFiles: number;
  matchedFiles: number;
  parsedFiles: number;
  ignoredFiles: string[];
}

export interface RequestLogFetchResult {
  entries: RequestLogEntry[];
  diagnostics: RequestLogDiagnostics;
}
