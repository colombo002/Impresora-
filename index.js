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
      
      tiktokConnection = new WebcastPushConnection(username, {
        enableExtendedGiftInfo: true
      });

      await tiktokConnection.connect();
      console.log(`Conectado a ${username}`);
      io.emit('tiktokConnected', username);

      tiktokConnection.on('chat', data => io.emit('chat', data));
      tiktokConnection.on('gift', data => { io.emit('gift', data); io.emit('print', data); });
      tiktokConnection.on('member', data => io.emit('member', data));

    } catch (err) {
      console.error(err);
      socket.emit('tiktokError', err.toString());
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
