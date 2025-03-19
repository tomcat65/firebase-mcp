import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface SecurityConfig {
  allowedCollections?: string[];
  readOnly?: boolean;
  disableAuth?: boolean;
  disableStorage?: boolean;
  rateLimitWindowMs?: number;
  rateLimitMaxRequests?: number;
  logLevel?: string;
}

export interface ServerConfig {
  credentialsPath?: string;
  projectId?: string;
  databaseURL?: string;
  transport?: 'stdio' | 'sse';
  port?: number;
  security: SecurityConfig;
}

// Default configuration
const defaultConfig: ServerConfig = {
  transport: 'stdio',
  port: 3000,
  security: {
    readOnly: false,
    disableAuth: false,
    disableStorage: false,
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
    logLevel: 'info'
  }
};

// Parse command-line arguments
export function parseArgs(args: string[]): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {
    security: {}
  };

  for (let i = 0; i < args.length; i++) {
    // Credentials path
    if (args[i] === '--credentials' && i + 1 < args.length) {
      config.credentialsPath = args[i + 1];
      i++;
    } else if (args[i].startsWith('--credentials=')) {
      config.credentialsPath = args[i].split('=')[1];
    } 
    // Project ID
    else if (args[i] === '--project' && i + 1 < args.length) {
      config.projectId = args[i + 1];
      i++;
    } else if (args[i].startsWith('--project=')) {
      config.projectId = args[i].split('=')[1];
    } 
    // Database URL
    else if (args[i] === '--database-url' && i + 1 < args.length) {
      config.databaseURL = args[i + 1];
      i++;
    } else if (args[i].startsWith('--database-url=')) {
      config.databaseURL = args[i].split('=')[1];
    }
    // Transport
    else if (args[i] === '--transport' && i + 1 < args.length) {
      config.transport = args[i + 1] as 'stdio' | 'sse';
      i++;
    } else if (args[i].startsWith('--transport=')) {
      config.transport = args[i].split('=')[1] as 'stdio' | 'sse';
    }
    // Port
    else if (args[i] === '--port' && i + 1 < args.length) {
      config.port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i].startsWith('--port=')) {
      config.port = parseInt(args[i].split('=')[1], 10);
    }
    // Read-only mode
    else if (args[i] === '--read-only') {
      if (config.security) {
        config.security.readOnly = true;
      }
    }
    // Allowed collections
    else if (args[i] === '--allowed-collections' && i + 1 < args.length) {
      if (config.security) {
        config.security.allowedCollections = args[i + 1].split(',');
      }
      i++;
    } else if (args[i].startsWith('--allowed-collections=')) {
      if (config.security) {
        config.security.allowedCollections = args[i].split('=')[1].split(',');
      }
    }
    // Disable auth
    else if (args[i] === '--disable-auth') {
      if (config.security) {
        config.security.disableAuth = true;
      }
    }
    // Disable storage
    else if (args[i] === '--disable-storage') {
      if (config.security) {
        config.security.disableStorage = true;
      }
    }
  }

  return config;
}

// Load configuration from environment variables
export function loadEnvConfig(): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {
    security: {}
  };

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    config.credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (process.env.FIREBASE_PROJECT_ID) {
    config.projectId = process.env.FIREBASE_PROJECT_ID;
  }

  if (process.env.FIREBASE_DATABASE_URL) {
    config.databaseURL = process.env.FIREBASE_DATABASE_URL;
  }

  if (process.env.TRANSPORT_TYPE) {
    config.transport = process.env.TRANSPORT_TYPE as 'stdio' | 'sse';
  }

  if (process.env.PORT) {
    config.port = parseInt(process.env.PORT, 10);
  }

  if (process.env.READ_ONLY && config.security) {
    config.security.readOnly = process.env.READ_ONLY.toLowerCase() === 'true';
  }

  if (process.env.ALLOWED_COLLECTIONS && config.security) {
    config.security.allowedCollections = process.env.ALLOWED_COLLECTIONS.split(',');
  }

  if (process.env.DISABLE_AUTH && config.security) {
    config.security.disableAuth = process.env.DISABLE_AUTH.toLowerCase() === 'true';
  }

  if (process.env.DISABLE_STORAGE && config.security) {
    config.security.disableStorage = process.env.DISABLE_STORAGE.toLowerCase() === 'true';
  }

  if (process.env.RATE_LIMIT_WINDOW_MS && config.security) {
    config.security.rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
  }

  if (process.env.RATE_LIMIT_MAX_REQUESTS && config.security) {
    config.security.rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10);
  }

  if (process.env.LOG_LEVEL && config.security) {
    config.security.logLevel = process.env.LOG_LEVEL;
  }

  return config;
}

// Load configuration from JSON file
export function loadFileConfig(configPath: string): Partial<ServerConfig> {
  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(fileContent);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error loading config file: ${errorMessage}`);
  }
  return {};
}

// Merge configurations, with priority: CLI args > env vars > config file > defaults
export function getConfig(args: string[] = []): ServerConfig {
  const configPath = process.env.CONFIG_FILE || path.join(process.cwd(), 'firebase-mcp-config.json');
  
  const fileConfig = loadFileConfig(configPath);
  const envConfig = loadEnvConfig();
  const argsConfig = parseArgs(args);

  return {
    ...defaultConfig,
    ...fileConfig,
    ...envConfig,
    ...argsConfig,
    security: {
      ...defaultConfig.security,
      ...(fileConfig.security || {}),
      ...(envConfig.security || {}),
      ...(argsConfig.security || {}),
    }
  };
}
