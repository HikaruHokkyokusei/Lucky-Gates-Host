const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const Web3 = require('web3');
const uuidv4 = require("uuid").v4();
const angularJson = require("./angular.json");

const portNumber = process.env["PORT"];
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const outputFolder = __dirname + "/" + angularJson["projects"]["Lucky-Gates-Bot"]["architect"]["build"]["options"]["outputPath"];

httpServer.listen(portNumber, () => {
  console.log('Listening on port ' + process.env.PORT);
});

// --- SERVE MODULES --- //
app.get('*/web3.min.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/web3/dist/web3.min.js');
});

app.get('*/socket.io.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.js');
});
// --- //

// ---- SERVE STATIC FILES ---- //
app.get('*.*', express.static(outputFolder, {maxAge: '1y'}));
// --- //

// ---- SERVE APPLICATION PATHS ---- //
app.all('*', function (req, res) {
  res.status(200).sendFile(`/`, {root: outputFolder});
});
// --- //

let activeSocketConnections = 0;

io.on('connection', (socket) => {
    activeSocketConnections++;
    console.log('Socket connection made. Id : ' + socket.id + ", IP : " +  ", Active Connections : " + activeSocketConnections);

    // TODO : Handle Socket Events...

    socket.on('disconnect', () => {
        activeSocketConnections--;
        console.log('Socket connection closed. Active Connections : ' + activeSocketConnections);
    });
});
