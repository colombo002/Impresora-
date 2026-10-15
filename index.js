const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let tiktokConnection = null;

app.get('/', (req,res) => {
  res.send(`
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body{font-family:sans-serif;text-align:center;padding:20px;background:#0f0f0f;color:#fff}
      input{font-size:20px;padding:14px;width:85%;max-width:320px;border-radius:10px;border:none;text-align:center}
      button{background:#fe2c55;color:#fff;font-weight:bold;font-size:20px;padding:14px;margin-top:10px;border:none;border-radius:10px;width:85%;max-width:320px}
      #estado{margin-top:20px;color:#ffeb3b;font-size:16px}
      #datos{border:2px dashed #fe2c55;padding:20px;margin:20px auto;border-radius:12px;max-width:320px;background:#1a1a1a;min-height:80px}
    </style>
  </head>
  <body>
    <h2>🖨️ Impresora Automatica</h2>
    <input id="user" value="tu.foto.en.vivo" />
    <br>
    <button onclick="conectar()">CONECTAR LIVE</button>
    <p id="estado">Listo</p>
    <div id="datos">Aqui aparecera la orden</div>
    
    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io();
      function conectar(){
        const u = document.getElementById('user').value.replace('@','').trim();
        document.getElementById('estado').innerText = 'Conectando a @' + u + '...';
        fetch('/conectar/'+u)
          .then(r=>r.json())
          .then(d=>{ document.getElementById('estado').innerText = d.mensaje; })
          .catch(()=>{ document.getElementById('estado').innerText = 'Error de red'; });
      }
      socket.on('nueva-orden', (data)=>{
        document.getElementById('datos').innerHTML = '<b>IMPRIMIR:</b><br><br>Cliente: '+data.nombre+'<br>Talla: <b style=font-size:32px>'+data.medida+'</b>';
      });
      socket.on('estado', (t)=>{ document.getElementById('estado').innerText = t; });
    </script>
  </body>
  </html>
  `);
});

app.get('/conectar/:username', async (req,res)=>{
  const username = req.params.username;
  try{
    if(tiktokConnection){ try{tiktokConnection.disconnect();}catch(e){} }

    const { WebcastPushConnection } = require('tiktok-live-connector');
    tiktokConnection = new WebcastPushConnection(username);

    // Si en 12 segundos no conecta, lo cortamos para que NO se quede pegado
    const conectar = tiktokConnection.connect();
    const timeout = new Promise((_,rej)=>setTimeout(()=>rej(new Error('TIMEOUT')), 12000));
    
    await Promise.race([conectar, timeout]);

    io.emit('estado', '✅ CONECTADO a @' + username);

    tiktokConnection.on('chat', data => {
      const msg = (data.comment || '').toLowerCase().trim();
      const nombre = data.nickname || data.uniqueId;
      let medida = null;
      if(msg === 's') medida = 'S';
      if(msg === 'm') medida = 'M';
      if(msg === 'l') medida = 'L';
      if(msg === 'xl') medida = 'XL';
      if(medida){
        console.log('ORDEN', nombre, medida);
        io.emit('nueva-orden', {nombre, medida});
      }
    });

    return res.json({ mensaje: '✅ Conectado a @' + username + ' - Esperando S, M, L, XL' });

  }catch(err){
    console.log('Fallo conexion:', err.message);
    const mensaje = '❌ @' + username + ' NO esta en LIVE ahora. Inicia LIVE en TikTok para conectar.';
    io.emit('estado', mensaje);
    return res.json({ mensaje });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Listo en ' + PORT));
