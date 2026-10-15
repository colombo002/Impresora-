const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
let tiktokConnection = null;

app.get('/', (req,res) => {
  res.send(`
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:sans-serif;text-align:center;padding:20px;background:#0f0f0f;color:#fff}
    input{font-size:20px;padding:14px;width:85%;max-width:320px;border-radius:10px;border:none;text-align:center}
    button{background:#fe2c55;color:#fff;font-weight:bold;font-size:18px;padding:14px;margin:5px;border:none;border-radius:10px;width:85%;max-width:320px}
    #estado{margin-top:15px;color:#ffeb3b}
    #datos{border:2px dashed #fe2c55;padding:20px;margin:20px auto;border-radius:12px;max-width:320px;background:#1a1a1a;min-height:80px}
  </style></head><body>
  <h2>🖨️ Impresora Automatica</h2>
  <input id="user" value="tu.foto.en.vivo" /><br>
  <button onclick="conectar()">CONECTAR LIVE</button><br>
  <button onclick="probar()" style="background:#333;font-size:14px">🧪 PROBAR IMPRESORA (sin LIVE)</button>
  <p id="estado">Listo</p>
  <div id="datos">Aqui aparecera la orden</div>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket=io();
    function conectar(){
      const u=document.getElementById('user').value.replace('@','').trim();
      document.getElementById('estado').innerText='Conectando a @'+u+'...';
      fetch('/conectar/'+u).then(r=>r.json()).then(d=>{document.getElementById('estado').innerText=d.mensaje;});
    }
    function probar(){
      const tallas=['S','M','L','XL'];
      const t=tallas[Math.floor(Math.random()*tallas.length)];
      fetch('/test/'+t).then(r=>r.json()).then(()=>{});
    }
    socket.on('nueva-orden', (data)=>{
      document.getElementById('datos').innerHTML='<b>IMPRIMIR:</b><br><br>Cliente: '+data.nombre+'<br>Talla: <b style=font-size:40px>'+data.medida+'</b><br><br><button onclick=window.print()>🖨️ IMPRIMIR</button>';
      if(window.navigator.vibrate) navigator.vibrate(300);
    });
    socket.on('estado', (t)=>{document.getElementById('estado').innerText=t;});
  </script></body></html>`);
});

app.get('/conectar/:username', async (req,res)=>{
  try{
    if(tiktokConnection){try{tiktokConnection.disconnect();}catch(e){}}
    const { WebcastPushConnection } = require('tiktok-live-connector');
    tiktokConnection = new WebcastPushConnection(req.params.username);
    const timeout = new Promise((_,rej)=>setTimeout(()=>rej(new Error('TIMEOUT')),12000));
    await Promise.race([tiktokConnection.connect(), timeout]);
    io.emit('estado','✅ CONECTADO a @'+req.params.username);
    tiktokConnection.on('chat', data=>{
      const msg=(data.comment||'').toLowerCase().trim();
      let m=null; if(msg==='s')m='S'; if(msg==='m')m='M'; if(msg==='l')m='L'; if(msg==='xl')m='XL';
      if(m) io.emit('nueva-orden',{nombre:data.nickname||data.uniqueId, medida:m});
    });
    res.json({mensaje:'✅ Conectado a @'+req.params.username});
  }catch(e){
    const msg='❌ @'+req.params.username+' NO esta en LIVE ahora. Inicia LIVE en TikTok para conectar.';
    io.emit('estado',msg); res.json({mensaje:msg});
  }
});

// RUTA DE PRUEBA
app.get('/test/:medida', (req,res)=>{
  io.emit('nueva-orden',{nombre:'Cliente PRUEBA', medida:req.params.medida.toUpperCase()});
  res.json({ok:true, medida:req.params.medida});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log('Listo'));
