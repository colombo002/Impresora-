const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(require('cors')());
app.use(express.static(path.join(__dirname, 'public')));

let tiktokConnection = null;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('setUsername', async (username) => {
    try {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
      }
      username = username.replace('@', '').trim();
      console.log(`Conectando a @${username}`);
      
      // CON FIRMADOR PARA EVITAR ERROR 403
      tiktokConnection = new WebcastPushConnection(username, {
        enableExtendedGiftInfo: true,
        processInitialData: false,
        enableWebsocketUpgrade: true,
        requestOptions: {
          timeout: 10000
        },
        webClientOptions: {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }
      });

      const state = await tiktokConnection.connect();
      console.log(`Conectado a ${username}`, state.roomId);
      io.emit('tiktokConnected', username);

      tiktokConnection.on('chat', data => io.emit('chat', data));
      tiktokConnection.on('gift', data => { io.emit('gift', data); io.emit('print', data); });
      tiktokConnection.on('member', data => io.emit('member', data));
      tiktokConnection.on('disconnected', () => io.emit('tiktokDisconnected'));

    } catch (err) {
      console.error("ERROR DE CONEXION:", err.toString());
      // Si falla por 403, avisar que es bloqueo de IP de Render
      if(err.toString().includes('403') || err.toString().includes('SignatureError')){
        socket.emit('tiktokError', 'TikTok bloqueó la IP del servidor Render (Error 403). Solución: Usa tu PC con ngrok o un proxy. Error: ' + err.toString().substring(0, 200));
      } else {
        socket.emit('tiktokError', err.toString());
      }
      io.emit('tiktokDisconnected');
    }
  });

  socket.on('disconnectTikTok', () => {
    if (tiktokConnection) tiktokConnection.disconnect();
    tiktokConnection = null;
    io.emit('tiktokDisconnected');
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Puerto ${PORT}`));
