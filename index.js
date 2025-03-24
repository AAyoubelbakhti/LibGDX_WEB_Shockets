const express = require('express')
const http = require('http');
const WebSocket = require('ws')
const { v4: uuidv4 } = require('uuid')
const winston = require('winston');
const app = express()
const httpServer = http.createServer(app);
const wss = new WebSocket.Server({ server: httpServer })
const port = 8888;
var clients = {};

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'positions.log' })
    ]
});

app.use(express.static('public'))
app.get('/', root);

wss.on('connection', function connection(ws) {
    var userid = uuidv4();
    logger.info(`Nueva conexión activa: ${userid}`);
    clients[userid] = { "id": userid, "ws": ws, pos: {} };
    ws.send(`Bienvenido id=${userid}`);

    ws.on('close', function close() {
        logger.info(`Cliente desconectado: ${userid}`);
        delete clients[userid];
    });

    ws.on('error', function error(err) {
        logger.error(`Error en conexión con ${userid}: ${err.message}`);
    });

    ws.on('message', function message(data) {
        try {
            var posData = JSON.parse(data);
            posData.id = userid;
            logger.info(`Mensaje recibido de ${userid}: ${JSON.stringify(posData)}`);
            broadcast(posData);
        } catch (e) {
            logger.error(`Error al decodificar el mensaje de ${userid}: ${e.message}`);
        }
    });
});

httpServer.listen(port, appListen);

function appListen() {
    logger.info(`Servidor escuchando en http://localhost:${port}`);
}

async function root(req, res) {
    res.send("Servidor WebSocket runeado.");
}


async function broadcast(obj) {
    var messageAsString = JSON.stringify(obj);
    for (var id in clients) {
        var client = clients[id];
        client.ws.send(messageAsString);
    }
}
