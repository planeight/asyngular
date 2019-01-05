const http = require('http');
const emtase = require('emtase');
const asyngularServer = require('asyngular-server');
const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const morgan = require('morgan');
const uuid = require('uuid');
const healthChecker = require('sc-framework-health-check');
const agcBrokerClient = require('agc-broker-client');

const ENVIRONMENT = process.env.ENV || 'dev';
const ASYNGULAR_PORT = process.env.ASYNGULAR_PORT || 8000;
const ASYNGULAR_WS_ENGINE = process.env.ASYNGULAR_WS_ENGINE || 'ws';
const ASYNGULAR_SOCKET_CHANNEL_LIMIT = Number(process.env.ASYNGULAR_SOCKET_CHANNEL_LIMIT) || 1000;

const AGC_INSTANCE_ID = uuid.v4();
const AGC_STATE_SERVER_HOST = process.env.AGC_STATE_SERVER_HOST || null;
const AGC_STATE_SERVER_PORT = process.env.AGC_STATE_SERVER_PORT || null;
const AGC_MAPPING_ENGINE = process.env.AGC_MAPPING_ENGINE || null;
const AGC_CLIENT_POOL_SIZE = process.env.AGC_CLIENT_POOL_SIZE || null;
const AGC_AUTH_KEY = process.env.AGC_AUTH_KEY || null;
const AGC_INSTANCE_IP = process.env.AGC_INSTANCE_IP || null;
const AGC_INSTANCE_IP_FAMILY = process.env.AGC_INSTANCE_IP_FAMILY || null;
const AGC_STATE_SERVER_CONNECT_TIMEOUT = Number(process.env.AGC_STATE_SERVER_CONNECT_TIMEOUT) || null;
const AGC_STATE_SERVER_ACK_TIMEOUT = Number(process.env.AGC_STATE_SERVER_ACK_TIMEOUT) || null;
const AGC_STATE_SERVER_RECONNECT_RANDOMNESS = Number(process.env.AGC_STATE_SERVER_RECONNECT_RANDOMNESS) || null;
const AGC_PUB_SUB_BATCH_DURATION = Number(process.env.AGC_PUB_SUB_BATCH_DURATION) || null;
const AGC_BROKER_RETRY_DELAY = Number(process.env.AGC_BROKER_RETRY_DELAY) || null;

let httpServer = emtase(http.createServer());
let agServer = asyngularServer.attach(httpServer);

let expressApp = express();
if (ENVIRONMENT === 'dev') {
  // Log every HTTP request. See https://github.com/expressjs/morgan for other
  // available formats.
  expressApp.use(morgan('dev'));
}
expressApp.use(serveStatic(path.resolve(__dirname, 'public')));

// Add GET /health-check express route
healthChecker.attach(agServer, expressApp);

// HTTP request handling loop.
(async () => {
  for await (let requestData of httpServer.listener('request')) {
    expressApp.apply(null, requestData);
  }
})();

// Asyngular/WebSocket connection handling loop.
(async () => {
  for await (let {socket} of agServer.listener('connection')) {
    // Handle socket connection.
  }
})();

httpServer.listen(ASYNGULAR_PORT);

console.log(
  `   ${colorText('[Active]', 32)} Asyngular worker with PID ${process.pid} is listening on port ${ASYNGULAR_PORT}`
);

function colorText(message, color) {
  if (color) {
    return `\x1b[${color}m${message}\x1b[0m`;
  }
  return message;
}

if (AGC_STATE_SERVER_HOST) {
  // Setup broker client to connect to the Asyngular cluster (AGC).
  agcBrokerClient.attach(agServer.brokerEngine, {
    instanceId: AGC_INSTANCE_ID,
    instancePort: ASYNGULAR_PORT,
    instanceIp: AGC_INSTANCE_IP,
    instanceIpFamily: AGC_INSTANCE_IP_FAMILY,
    pubSubBatchDuration: AGC_PUB_SUB_BATCH_DURATION,
    stateServerHost: AGC_STATE_SERVER_HOST,
    stateServerPort: AGC_STATE_SERVER_PORT,
    mappingEngine: AGC_MAPPING_ENGINE,
    clientPoolSize: AGC_CLIENT_POOL_SIZE,
    authKey: AGC_AUTH_KEY,
    stateServerConnectTimeout: AGC_STATE_SERVER_CONNECT_TIMEOUT,
    stateServerAckTimeout: AGC_STATE_SERVER_ACK_TIMEOUT,
    stateServerReconnectRandomness: AGC_STATE_SERVER_RECONNECT_RANDOMNESS,
    brokerRetryDelay: AGC_BROKER_RETRY_DELAY
  });
}
