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
  server: ServerConfig;
  twilio: TwilioConfig;
  vertex: VertexConfig;
}

export interface TwilioMessage {
  Body: string;
}
