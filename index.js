const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(require('cors')());
app.use(express.static(path.join(__dirname, 'public')));

let tiktokConnection = null;
let currentUsername = null;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('setUsername', async (username) => {
    try {
      if (tiktokConnection) tiktokConnection.disconnect();
      username = username.replace('@', '').trim();
      currentUsername = username;
      tiktokConnection = new TikTokLiveConnection(username, { enableExtendedGiftInfo: true, enableWebsocketUpgrade: true });
      await tiktokConnection.connect();
      io.emit('tiktokConnected', username);
      tiktokConnection.on(WebcastEvent.GIFT, data => { io.emit('gift', data); io.emit('print', data); });
      tiktokConnection.on(WebcastEvent.CHAT, data => io.emit('chat', data));
    } catch (err) {
      socket.emit('tiktokError', err.message);
      io.emit('tiktokDisconnected');
    }
  });
  socket.on('disconnectTikTok', () => {
    if (tiktokConnection) tiktokConnection.disconnect();
    tiktokConnection = null; currentUsername = null; io.emit('tiktokDisconnected');
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
