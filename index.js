const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));
app.use(require('cors')());

let tiktokConnection = null;
let currentUsername = null;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Ruta para verificar estado
app.get('/status', (req, res) => {
  res.json({ connected: !!tiktokConnection, username: currentUsername });
});

io.on('connection', (socket) => {
  console.log('Cliente impresora conectado');

  socket.on('setUsername', async (username) => {
    try {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
      }

      username = username.replace('@', '').trim();
      if (!username) return socket.emit('tiktokError', 'Usuario vacío');

      console.log(`Intentando conectar a: ${username}`);
      currentUsername = username;

      tiktokConnection = new TikTokLiveConnection(username, {
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true,
        requestPollingIntervalMs: 1000
      });

      await tiktokConnection.connect();
      console.log(`Conectado a ${username} OK`);
      io.emit('tiktokConnected', username);

      tiktokConnection.on(WebcastEvent.CHAT, data => {
        io.emit('chat', { user: data.user.uniqueId, comment: data.comment });
      });

      tiktokConnection.on(WebcastEvent.GIFT, data => {
        console.log('GIFT:', data.user.uniqueId, data.giftName);
        io.emit('gift', data);
        io.emit('print', data); // Para la impresora
      });

      tiktokConnection.on(WebcastEvent.MEMBER, data => {
        io.emit('member', data);
      });

    } catch (err) {
      console.error('Error TikTok:', err.message);
      socket.emit('tiktokError', err.message || 'No está en LIVE o bloqueado');
      io.emit('tiktokDisconnected');
    }
  });

  socket.on('disconnectTikTok', () => {
    if (tiktokConnection) {
      tiktokConnection.disconnect();
      tiktokConnection = null;
      currentUsername = null;
      io.emit('tiktokDisconnected');
      console.log('Desconectado');
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});
