interface MysqlConfig {
  host: string;
  db: string;
  user: string;
  pass: string;
}

interface ServerConfig {
  port: number;
  host: string;
}

interface TwilioConfig {
  authToken: string;
  accountSid: string;
  endpoint: string;
}

interface VertexConfig {
  project: string;
  location: string;
  model: string;
}

export interface Config {
  mysql: MysqlConfig;
  server: ServerConfig;
  twilio: TwilioConfig;
  vertex: VertexConfig;
}

export interface TwilioMessage {
  Body: string;
}

interface GenerativeModelOptions {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
}
