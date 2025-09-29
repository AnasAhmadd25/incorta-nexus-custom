export const config = {
  // WebSocket configuration - using Cloudflare tunnel
  websocket: {
    url: 'ws://localhost:5999',

    reconnectDelay: 3000, // milliseconds
    maxReconnectAttempts: 5
  },
  
  // Default Incorta configuration
  incorta: {
    defaultEnvUrl: 'https://testcluster-1.cloudstaging.incortalabs.com/incorta/api/v2',
    defaultTenant: 'default',
    defaultSqlxHost: 'jdbc:hive2://testcluster-1-sqlx.spark-cloudstaging.incortacloud-dev.com:443/;transportMode=http;httpPath=gc-us-central1-a-1/cliservice;ssl=true',
    defaultUsername: 'admin'
  },
  
  // File upload configuration
  fileUpload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
    allowedTypes: [
      'application/json',
      'text/plain',
      'text/csv',
      'application/csv',
      'text/xml',
      'application/xml',
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFiles: 10
  },
  
  // Chat configuration
  chat: {
    maxMessageLength: 10000,
    defaultWelcomeMessage: 'Welcome to Incorta MCP Client! Please authenticate to start chatting.',
    thinkingIndicatorDelay: 500 // milliseconds
  }
};

export default config;
