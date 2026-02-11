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
