const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
let tiktokConn = null;

// --- PÁGINA PRINCIPAL CON LAS 2 IMPRESORAS ---
app.get('/', (req,res)=>{
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:Arial;background:#111;color:#fff}
  #top{position:sticky;top:0;background:#000;padding:10px;text-align:center;z-index:10;border-bottom:2px solid #fe2c55}
  input{padding:10px;border-radius:10px;border:none;width:180px;font-weight:bold}
  button{padding:10px 14px;border-radius:10px;border:none;font-weight:bold;cursor:pointer}
  #btnConectar{background:#fe2c55;color:#fff}
  #btnTestFisica{background:#4caf50;color:#fff}
  #btnTestDigital{background:#ff4081;color:#fff}
  #estado{font-size:13px;margin-top:6px;color:#ffeb3b}
  #tabs{display:flex;gap:5px;margin-top:10px}
  .tab{flex:1;padding:8px;background:#333;border-radius:8px;color:#fff}
  .tab.active{background:#fe2c55}
  #vistas{display:flex;height:calc(100vh - 130px)}
  .vista{flex:1;display:none;overflow:hidden;flex-direction:column}
  .vista.active{display:flex}
  #vista-fisica{background:#f5f5f5;color:#000;padding:15px;align-items:center;justify-content:center;text-align:center}
  #ordenFisica{background:#fff;border:3px dashed #000;padding:20px;border-radius:15px;min-width:280px;min-height:200px}
  #vista-digital{background:transparent;align-items:center;padding-top:10px}
  #contenedor{width:360px}
  #maquina{width:360px;height:110px;background:#fff;border-radius:25px 25px 0 0;text-align:center;box-shadow:0 4px 10px rgba(0,0,0,.3);color:#000}
  #papel{width:300px;height:60vh;background:#fff;margin:-15px auto 0;border:1px dashed #ffb6d9;padding:10px;overflow-y:auto;color:#000}
  .ticket{border-bottom:1px solid #eee;padding:8px;text-align:left;animation:caer .4s;background:#fff}
  @keyframes caer{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}
  .ticket .foto{width:40px;height:40px;border-radius:50%;float:left;margin-right:8px;object-fit:cover}
  .gift{text-align:center;background:#fff0f5;border:2px dashed #ff4081;border-radius:15px;margin:8px 0;padding:10px;animation:pop .5s}
  .gift .foto{width:80px;height:80px;border-radius:50%;border:4px solid #ff4081}
  @keyframes pop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
  @media print {.no-print{display:none} #vista-digital{display:none!important} #vista-fisica{display:flex!important}}
</style>
</head>
<body>
<div id="top" class="no-print">
  <div>
    <input id="user" value="tu.foto.en.vivo" placeholder="@usuario">
    <button id="btnConectar" onclick="conectar()">🔴 CONECTAR LIVE</button>
  </div>
  <div id="tabs">
    <button class="tab active" id="tabF" onclick="ver('fisica')">🧾 FISICA (S/M/L)</button>
    <button class="tab" id="tabD" onclick="ver('digital')">🎀 DIGITAL (Video)</button>
  </div>
  <div id="estado">Desconectado</div>
  <div style="margin-top:5px">
    <button id="btnTestFisica" onclick="testFisica()">🧪 TEST FISICA</button>
    <button id="btnTestDigital" onclick="testDigital()">🧪 TEST DIGITAL</button>
  </div>
</div>
<div id="vistas">
  <div id="vista-fisica" class="vista active">
    <div id="ordenFisica"><div style="color:#999">Aquí aparecerá la orden<br>Cuando escriban<br><b>S, M, L, XL</b></div></div>
    <button onclick="window.print()" style="margin-top:15px;background:#000;color:#fff;padding:12px 25px;border-radius:10px" class="no-print">🖨️ IMPRIMIR</button>
  </div>
  <div id="vista-digital" class="vista">
    <div id="contenedor">
      <div id="maquina"><div style="font-size:45px;padding-top:10px">👀<br><span style="font-size:14px">(>ᴗ<)</span></div></div>
      <div id="papel"><div id="lista"><div style="text-align:center;color:#aaa;margin-top:30px">Esperando LIVE...</div></div></div>
    </div>
  </div>
</div>
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket=io();
  function ver(t){document.querySelectorAll('.vista').forEach(v=>v.classList.remove('active'));document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));document.getElementById('vista-'+t).classList.add('active');document.getElementById(t==='fisica'?'tabF':'tabD').classList.add('active');}
  function conectar(){const u=document.getElementById('user').value.replace('@','').trim(); if(!u) return alert('Pon tu @'); document.getElementById('estado').innerText='Conectando a @'+u+'...'; fetch('/conectar/'+u).then(r=>r.json()).then(d=>{document.getElementById('estado').innerText=d.mensaje;});}
  function testFisica(){fetch('/test/L').then(r=>r.json());}
  function testDigital(){const n='Martinez_2011'; const img='https://i.pravatar.cc/150?img=5'; addDigital('<div class="gift"><div style="font-size:24px;color:#ff4081;font-weight:bold">¡EPA! ¡AJÁ!</div><img class="foto" src="'+img+'"><h2 style="margin:5px;color:#d81b60">'+n+'</h2><div>¡UN ABRAZO!</div><div style="background:#ff4081;color:#fff;border-radius:8px;padding:4px;margin-top:5px;display:inline-block">Envío Gift</div></div>');}
  function addDigital(html){const lista=document.getElementById('lista'); if(lista.innerText.includes('Esperando')) lista.innerHTML=''; lista.insertAdjacentHTML('afterbegin', html); if(lista.children.length>25) lista.lastChild.remove();}
  socket.on('nueva-orden', d=>{ ver('fisica'); document.getElementById('ordenFisica').innerHTML = '<div>IMPRIMIR:</div><div>Cliente: '+d.cliente+'</div><div style="font-size:60px;font-weight:bold;margin:10px">TALLA: '+d.talla+'</div><div style="font-size:12px;color:#666">'+new Date().toLocaleTimeString()+'</div>'; setTimeout(()=>window.print(), 500); });
  socket.on('chat-ticket', d=>{ ver('digital'); addDigital('<div class="ticket"><img class="foto" src="'+d.img+'"><b>'+d.name+'</b><br><span style="font-size:13px">'+d.msg+'</span><div style="clear:both"></div></div>'); });
  socket.on('gift-ticket', d=>{ ver('digital'); addDigital('<div class="gift"><div style="font-size:24px;color:#ff4081;font-weight:bold">¡EPA! ¡AJÁ!</div><img class="foto" src="'+d.img+'"><h2 style="margin:5px;color:#d81b60">'+d.name+'</h2><div style="font-size:12px">'+d.giftName+' x'+d.count+'</div><div style="background:#ff4081;color:#fff;border-radius:8px;padding:4px;margin-top:5px">¡QUE NIVEL!</div></div>'); });
  socket.on('follow-ticket', d=>{ ver('digital'); addDigital('<div class="ticket" style="border-left:4px solid #4caf50"><img class="foto" src="'+d.img+'"><b>'+d.name+'</b><br><span style="color:#4caf50">¡Te sigue! 🎉</span><div style="clear:both"></div></div>'); });
  socket.on('estado', t=>{document.getElementById('estado').innerText=t;});
</script>
</body>
</html>
  `);
});

// --- PÁGINA SOLO DIGITAL TRANSPARENTE PARA OBS ---
app.get('/digital', (req,res)=>{
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:transparent;font-family:Arial;overflow:hidden}#contenedor{width:360px;margin:0 auto}#maquina{width:360px;height:110px;background:#fff;border-radius:25px 25px 0 0;text-align:center;box-shadow:0 4px 10px rgba(0,0,0,.3)}#papel{width:300px;min-height:600px;background:#fff;margin:-15px auto 0;border:1px dashed #ffb6d9;padding:10px;overflow-y:auto}.ticket{padding:8px;animation:caer .4s;background:#fff;border-bottom:1px solid #eee}@keyframes caer{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}.ticket .foto{width:40px;height:40px;border-radius:50%;float:left;margin-right:8px}.gift{text-align:center;background:#fff0f5;border:2px dashed #ff4081;border-radius:15px;margin:8px 0;padding:10px;animation:pop .5s}.gift .foto{width:80px;height:80px;border-radius:50%;border:4px solid #ff4081}@keyframes pop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}</style></head><body><div id="contenedor"><div id="maquina"><div style="font-size:45px;padding-top:10px">👀<br><span style="font-size:14px">(>ᴗ<)</span></div></div><div id="papel"><div id="lista"><div style="text-align:center;color:#aaa;margin-top:30px">Esperando LIVE...</div></div></div></div><script src="/socket.io/socket.io.js"></script><script>const socket=io();const lista=document.getElementById('lista');function add(h){if(lista.innerText.includes('Esperando')) lista.innerHTML='';lista.insertAdjacentHTML('afterbegin',h);if(lista.children.length>25) lista.lastChild.remove();}socket.on('chat-ticket',d=>{add('<div class="ticket"><img class="foto" src="'+d.img+'"><b>'+d.name+'</b><br><span style="font-size:13px">'+d.msg+'</span><div style="clear:both"></div></div>')});socket.on('gift-ticket',d=>{add('<div class="gift"><div style="font-size:24px;color:#ff4081;font-weight:bold">¡EPA! ¡AJÁ!</div><img class="foto" src="'+d.img+'"><h2 style="margin:5px;color:#d81b60">'+d.name+'</h2><div>'+d.giftName+' x'+d.count+'</div><div style="background:#ff4081;color:#fff;border-radius:8px;padding:4px;margin-top:5px">¡QUE NIVEL!</div></div>')});socket.on('follow-ticket',d=>{add('<div class="ticket" style="border-left:4px solid #4caf50"><img class="foto" src="'+d.img+'"><b>'+d.name+'</b><br><span style="color:#4caf50">¡Te sigue!</span><div style="clear:both"></div></div>')});</script></body></html>`);
});

// --- CONEXION A TIKTOK ---
app.get('/conectar/:username', async (req,res)=>{
  const username = req.params.username;
  try{
    if(tiktokConn){ try{tiktokConn.disconnect();}catch(e){} }
    const { WebcastPushConnection } = require('tiktok-live-connector');
    tiktokConn = new WebcastPushConnection(username);
    await tiktokConn.connect();
    io.emit('estado','✅ CONECTADO a @'+username+' | Física y Digital activas');

    tiktokConn.on('chat', data=>{
      const msg = (data.comment||'').trim().toUpperCase();
      const tallas = ['S','M','L','XL','XXL'];
      if(tallas.includes(msg)){
        io.emit('nueva-orden',{cliente:data.nickname||data.uniqueId, talla:msg});
      }
      io.emit('chat-ticket',{name:data.nickname||data.uniqueId, msg:data.comment, img:data.profilePictureUrl||'https://i.pravatar.cc/100'});
    });
    tiktokConn.on('gift', data=>{
      if(data.giftType===1 && !data.repeatEnd) return;
      io.emit('gift-ticket',{name:data.nickname||data.uniqueId, img:data.profilePictureUrl, giftName:data.giftName||'Gift', count:data.repeatCount||1});
    });
    tiktokConn.on('follow', data=>{
      io.emit('follow-ticket',{name:data.nickname, img:data.profilePictureUrl});
    });
    tiktokConn.on('member', data=>{
      io.emit('chat-ticket',{name:data.nickname, msg:'¡Bienvenido a la fiesta!', img:data.profilePictureUrl});
    });
    res.json({mensaje:'✅ Conectado a @'+username});
  }catch(e){
    console.log(e);
    res.json({mensaje:'❌ @'+username+' NO está en LIVE. Inicia LIVE.'});
  }
});

app.get('/test/:talla', (req,res)=>{
  io.emit('nueva-orden',{cliente:'Cliente PRUEBA', talla:(req.params.talla||'L').toUpperCase()});
  res.json({ok:true});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log('Listo '+PORT));
