const $ = id => document.getElementById(id);
const screens = ['menu','lobby','game','meeting','result'];
let ws, selfId, roomCode, state, role='crew', tasks=[], currentTask=null, expected=1;
const keys = new Set();
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const taskStations = [
  {id:'wires',name:'配線修理',x:170,y:130},{id:'scan',name:'スキャン',x:810,y:130},
  {id:'fuel',name:'燃料補給',x:170,y:500},{id:'code',name:'コード入力',x:810,y:500}
];

$('create').onclick = async()=>{ const r=await fetch('/api/create-room',{method:'POST'}); const j=await r.json(); $('room').value=j.roomCode; connect(j.roomCode); };
$('join').onclick = ()=>connect($('room').value);
$('start').onclick = ()=>send({type:'start'});
$('meetingBtn').onclick = ()=>send({type:'emergency'});
$('sendChat').onclick = sendChat;
$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat()});
$('sabotageBtn').onclick = ()=>send({type:'sabotage',kind:'lights'});
$('fixBtn').onclick = ()=>send({type:'fixSabotage'});
$('rematch').onclick = ()=>send({type:'rematch'});
$('closeTask').onclick = ()=>$('taskDialog').close();

document.querySelectorAll('[data-dir]').forEach(b=>{ const d=b.dataset.dir; b.onpointerdown=()=>keys.add(d); b.onpointerup=()=>keys.delete(d); b.onpointerleave=()=>keys.delete(d); });
document.addEventListener('keydown',e=>keys.add(mapKey(e.key)));
document.addEventListener('keyup',e=>keys.delete(mapKey(e.key)));
document.querySelector('[data-vote="skip"]').onclick=()=>send({type:'vote',targetId:'skip'});

function connect(code){
  roomCode=String(code).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); if(roomCode.length!==6)return status('6桁のコードを入力してください');
  ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws?room=${roomCode}`);
  ws.onopen=()=>send({type:'join',name:$('name').value}); ws.onmessage=e=>handle(JSON.parse(e.data)); ws.onerror=()=>status('接続できませんでした');
}
function send(data){ if(ws?.readyState===1)ws.send(JSON.stringify(data)); }
function status(t){$('status').textContent=t}
function show(id){screens.forEach(s=>$(s).classList.toggle('hidden',s!==id));}

function handle(m){
  if(m.type==='welcome'){selfId=m.selfId; $('roomLabel').textContent=`(${roomCode})`;}
  if(m.type==='state'){state=m; renderState();}
  if(m.type==='role'){role=m.role; tasks=m.tasks;}
  if(m.type==='meetingStarted'){show('meeting');$('meetingReason').textContent=m.reason;$('chat').innerHTML='';}
  if(m.type==='chat'){$('chat').insertAdjacentHTML('beforeend',`<div class="chatline"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`);$('chat').scrollTop=9999;}
  if(m.type==='meetingEnded'){show('game'); alert(m.ejected?`${m.ejected.name} が追放されました`:(m.tied?'同票でした':'スキップされました'));}
  if(m.type==='gameOver'){show('result');$('resultTitle').textContent=m.winner==='crew'?'クルーの勝利':'侵入者の勝利';$('resultReason').textContent=m.reason;}
  if(m.type==='error')alert(m.message);
}

function renderState(){
  if(!state)return; const me=state.players.find(p=>p.id===selfId); if(!me)return;
  if(state.phase==='lobby'){show('lobby'); $('lobbyPlayers').innerHTML=state.players.map(p=>`<p>● ${esc(p.name)} ${p.id===state.hostId?'👑':''}</p>`).join(''); $('start').style.display=selfId===state.hostId?'inline-block':'none';}
  if(state.phase==='playing'){show('game');}
  if(state.phase==='meeting'){renderVotes();}
  $('role').textContent=`役職: ${me.role==='impostor'?'侵入者':'クルー'}${me.alive?'':'（ゴースト）'}`;
  $('taskProgress').textContent=`タスク: ${me.completed}/${me.totalTasks}`;
  $('sabotage').textContent=state.sabotage?`⚠ ${state.sabotage.kind==='lights'?'照明停止':'反応炉異常'}`:'';
  $('attackBtn').style.display=me.role==='impostor'&&me.alive?'inline-block':'none';
  $('sabotageBtn').style.display=me.role==='impostor'&&me.alive?'inline-block':'none';
  $('fixBtn').style.display=state.sabotage&&me.alive?'inline-block':'none';
}
function renderVotes(){
  const alive=state.players.filter(p=>p.alive); $('votes').innerHTML=alive.map(p=>`<div class="vote"><span>${esc(p.name)}</span><button data-target="${p.id}">投票</button></div>`).join('');
  $('votes').querySelectorAll('button').forEach(b=>b.onclick=()=>send({type:'vote',targetId:b.dataset.target}));
}
function sendChat(){const text=$('chatInput').value.trim();if(text){send({type:'chat',text});$('chatInput').value='';}}

function loop(){
  if(state?.phase==='playing'){
    const me=state.players.find(p=>p.id===selfId); if(me&&me.alive){let dx=0,dy=0;if(keys.has('left'))dx--;if(keys.has('right'))dx++;if(keys.has('up'))dy--;if(keys.has('down'))dy++;if(dx||dy){const len=Math.hypot(dx,dy);send({type:'move',x:me.x+dx/len*3.4,y:me.y+dy/len*3.4});}}
    draw(); updateActions();
  }
  requestAnimationFrame(loop);
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#111827';ctx.fillRect(0,0,980,640);
  ctx.strokeStyle='#334155';ctx.lineWidth=5;[[40,60,900,160],[40,420,900,160],[380,220,220,200]].forEach(r=>ctx.strokeRect(...r));
  taskStations.forEach(t=>{ctx.fillStyle='#f59e0b';ctx.fillRect(t.x-18,t.y-18,36,36);ctx.fillStyle='white';ctx.fillText(t.name,t.x-30,t.y-25)});
  state.bodies.forEach(b=>{ctx.fillStyle='#dc2626';ctx.fillRect(b.x-20,b.y-8,40,16)});
  state.players.forEach(p=>{ctx.globalAlpha=p.alive?1:.35;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fill();ctx.fillStyle='white';ctx.fillText(p.name,p.x-25,p.y-26);});ctx.globalAlpha=1;
  if(state.sabotage?.kind==='lights'){ctx.fillStyle='#000b';ctx.fillRect(0,0,980,640);const me=state.players.find(p=>p.id===selfId);if(me){ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(me.x,me.y,110,0,Math.PI*2);ctx.fill();ctx.restore();}}
}
function updateActions(){
  const me=state.players.find(p=>p.id===selfId); if(!me)return;
  const task=taskStations.find(t=>Math.hypot(me.x-t.x,me.y-t.y)<70 && !me.completedTaskIds?.includes?.(t.id));
  $('taskBtn').disabled=!(me.alive&&me.role!=='impostor'&&task); $('taskBtn').onclick=()=>openTask(task);
  const target=state.players.find(p=>p.id!==selfId&&p.alive&&p.role!=='impostor'&&Math.hypot(me.x-p.x,me.y-p.y)<90);
  $('attackBtn').disabled=!target; $('attackBtn').onclick=()=>target&&send({type:'attack',targetId:target.id});
  const body=state.bodies.find(b=>Math.hypot(me.x-b.x,me.y-b.y)<110); $('reportBtn').disabled=!body; $('reportBtn').onclick=()=>body&&send({type:'report',bodyId:body.id});
}
function openTask(task){if(!task)return;currentTask=task;expected=1;$('taskTitle').textContent=task.name;const nums=[1,2,3,4,5,6].sort(()=>Math.random()-.5);$('taskNumbers').innerHTML=nums.map(n=>`<button data-n="${n}">${n}</button>`).join('');$('taskNumbers').querySelectorAll('button').forEach(b=>b.onclick=()=>{if(Number(b.dataset.n)===expected){b.disabled=true;expected++;if(expected===7){send({type:'task',taskId:task.id});$('taskDialog').close();}}else{expected=1;$('taskNumbers').querySelectorAll('button').forEach(x=>x.disabled=false);}});$('taskDialog').showModal();}
function mapKey(k){return ({ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down'})[k]||k;}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
loop();
