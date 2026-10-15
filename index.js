const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(require('cors')());

let tiktokConnection = null;
let currentUsername = null;

app.get('/', (req, res) => {
  res.send(`
    <h2>Impresora TikTok - ONLINE</h2>
    <p>Estado: ${currentUsername ? 'Conectado a @' + currentUsername : 'Desconectado'}</p>
    <p>Usa tu panel de impresora para conectar.</p>
  `);
});

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
      
      console.log(`Conectando a: ${username}`);
      currentUsername = username;

      tiktokConnection = new TikTokLiveConnection(username, {
        enableExtendedGiftInfo: true,
        enableWebsocketUpgrade: true
      });

      await tiktokConnection.connect();
      console.log(`Conectado OK a ${username}`);
      io.emit('tiktokConnected', username);

      tiktokConnection.on(WebcastEvent.CHAT, data => {
        io.emit('chat', data);
        io.emit('print', data);
      });

      tiktokConnection.on(WebcastEvent.GIFT, data => {
        io.emit('gift', data);
        io.emit('print', data);
      });

    } catch (err) {
      console.error('Error TikTok:', err.message);
      socket.emit('tiktokError', err.message);
      io.emit('tiktokDisconnected');
    }
  });

  socket.on('disconnectTikTok', () => {
    if (tiktokConnection) {
      tiktokConnection.disconnect();
      tiktokConnection = null;
      currentUsername = null;
      io.emit('tiktokDisconnected');
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
