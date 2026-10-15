const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
let tiktokConnection = null;
app.get('/', (req,res) => {
  res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{font-family:sans-serif;text-align:center;padding:20px;background:#111;color:#fff}input,button{font-size:18px;padding:12px;margin:10px;width:80%;max-width:300px;border-radius:8px;border:none}button{background:#ff0050;color:#fff;font-weight:bold}</style></head>
  <body><h2>🖨️ Impresora Automatica</h2><input id="user" placeholder="@usuario TikTok sin @" /><br><button onclick="conectar()">CONECTAR LIVE</button><p id="estado">Esperando...</p><div id="datos" style="margin-top:20px;font-size:20px"></div>
  <script src="/socket.io/socket.io.js"></script><script>const socket=io();function conectar(){const u=document.getElementById('user').value.replace('@','').trim();if(!u){alert('Escribe tu @');return}document.getElementById('estado').innerText='Conectando a @'+u+'...';fetch('/conectar/'+u).then(r=>r.json()).then(d=>{document.getElementById('estado').innerText=d.mensaje||'Conectado';});}socket.on('nueva-orden', (data)=>{document.getElementById('datos').innerHTML='<b>IMPRIMIENDO:</b><br>'+data.nombre+'<br>Medida: '+data.medida+'<br><small>'+new Date().toLocaleTimeString()+'</small>';});socket.on('estado', (t)=>{document.getElementById('estado').innerText=t;});</script></body></html>`);
});
app.get('/conectar/:username', async (req,res)=>{
  const username = req.params.username;
  try{
    if(tiktokConnection){tiktokConnection.disconnect(); tiktokConnection=null;}
    tiktokConnection = new WebcastPushConnection(username);
    await tiktokConnection.connect();
    io.emit('estado','✅ LIVE CONECTADO @'+username);
    tiktokConnection.on('chat', (data)=>{
      const msg = (data.comment||'').toLowerCase(); const nombre = data.nickname || data.uniqueId;
      if(msg.includes('xl')) io.emit('nueva-orden',{nombre, medida:'XL'});
      else if(msg.includes(' l ')||msg.includes('grande')) io.emit('nueva-orden',{nombre, medida:'L'});
      else if(msg.includes(' m ')||msg.includes('mediana')) io.emit('nueva-orden',{nombre, medida:'M'});
      else if(msg.includes(' s ')||msg.includes('peque')) io.emit('nueva-orden',{nombre, medida:'S'});
      else if(msg.includes('xs')) io.emit('nueva-orden',{nombre, medida:'XS'});
    });
    tiktokConnection.on('gift', (data)=>{if(!data.giftName) return; const nombre = data.nickname || data.uniqueId; io.emit('nueva-orden',{nombre, medida:data.giftName+' x'+data.repeatCount});});
    res.json({mensaje:'Conectado a @'+username});
  }catch(e){ io.emit('estado','❌ Error: '+e.message); res.json({mensaje:'Error: '+e.message});}
});
const PORT = process.env.PORT || 3000; server.listen(PORT, ()=>console.log('Corriendo '+PORT));
