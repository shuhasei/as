import * as THREE from 'three';

const $ = id => document.getElementById(id);
const ui = {
  menu:$('menu'), game:$('gameScreen'), name:$('nameInput'), roomInput:$('roomInput'), message:$('menuMessage'),
  room:$('roomCode'), role:$('roleText'), status:$('statusText'), players:$('playerList'), start:$('startButton'),
  taskPanel:$('taskPanel'), tasks:$('taskList'), taskProgress:$('taskProgress'), actionBar:$('actionBar'),
  use:$('useButton'), report:$('reportButton'), kill:$('killButton'), sabotage:$('sabotageButton'), meeting:$('meetingButton'),
  joystick:$('joystick'), stick:$('stick'), notice:$('notice')
};

const COLORS = {red:0xe9343f,blue:0x1456d9,green:0x25a65a,pink:0xf244a8,orange:0xf58220,yellow:0xf3ce28,cyan:0x29cbd4,purple:0x7f43cf,white:0xe8eef7,lime:0x7bd93f};
const TASK_NAMES = {reactor:'リアクター調整',wires:'配線修理',scanner:'生体スキャン',cargo:'貨物整理'};
const TASK_POSITIONS = {reactor:[-8,6],wires:[7,5],scanner:[-7,-5],cargo:[7,-4]};
let socket, myId, state, scene, camera, renderer, clock, localModel;
const models = new Map();
const keys = new Set();
let joystickVector = {x:0,y:0};
let lastMoveSent = 0;
let nearest = {task:null, player:null, body:null};

function randomRoom(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('')}
function connect(room,name){
  const protocol=location.protocol==='https:'?'wss':'ws';
  socket=new WebSocket(`${protocol}//${location.host}/ws?room=${room}`);
  socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'join',name})));
  socket.addEventListener('message',e=>handleMessage(JSON.parse(e.data)));
  socket.addEventListener('close',()=>showNotice('接続が切れました'));
}
function send(type,data={}){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type,...data}))}

function handleMessage(msg){
  if(msg.type==='hello'){myId=msg.id;ui.room.textContent=msg.room;return}
  if(msg.type==='state'){state=msg.state;updateUI();syncModels();return}
  if(msg.type==='playerMoved'){const m=models.get(msg.id);if(m){m.userData.target.set(msg.x,0,msg.z);m.userData.rotation=msg.rotation}return}
  if(msg.type==='error'){showNotice(msg.message);return}
  if(msg.type==='meetingStarted'){openMeeting(msg.reason);return}
  if(msg.type==='meetingEnded'){closeDialog('meetingDialog');showNotice(msg.ejected?`${msg.ejected.name}が追放されました`:'誰も追放されませんでした');return}
  if(msg.type==='chat'){appendChat(msg.from,msg.text,msg.alive);return}
  if(msg.type==='sabotage'){showNotice(msg.sabotage.kind==='reactor'?'リアクター暴走！':'照明が停止しました');return}
  if(msg.type==='sabotageFixed'){showNotice('妨害が解除されました');return}
  if(msg.type==='gameFinished'){openResult(msg.winner);return}
}

$('createButton').onclick=()=>startJoin(randomRoom());
$('joinButton').onclick=()=>startJoin(ui.roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g,''));
function startJoin(room){if(room.length!==6){ui.message.textContent='6桁のルームコードを入力してください。';return}ui.menu.classList.add('hidden');ui.game.classList.remove('hidden');init3D();connect(room,ui.name.value)}

function init3D(){
  if(renderer)return;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x020711);scene.fog=new THREE.FogExp2(0x020711,.025);
  camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,120);camera.position.set(0,14,18);camera.lookAt(0,0,1);
  renderer=new THREE.WebGLRenderer({canvas:$('gameCanvas'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  clock=new THREE.Clock();buildWorld();addEventListener('resize',onResize);addEventListener('keydown',e=>keys.add(e.key.toLowerCase()));addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));setupJoystick();animate();
}
function buildWorld(){
  scene.add(new THREE.HemisphereLight(0x8dd8ff,0x07101b,2.2));const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(4,12,6);key.castShadow=true;key.shadow.mapSize.set(2048,2048);scene.add(key);
  const floorMat=new THREE.MeshPhysicalMaterial({color:0x123a67,metalness:.55,roughness:.34,clearcoat:.65});const floor=new THREE.Mesh(new THREE.BoxGeometry(25,.5,18),floorMat);floor.position.y=-.35;floor.receiveShadow=true;scene.add(floor);
  for(let x=-11;x<=11;x+=2.5){const line=new THREE.Mesh(new THREE.BoxGeometry(.035,.02,17.5),new THREE.MeshBasicMaterial({color:0x2d75a7}));line.position.set(x,-.08,.2);scene.add(line)}
  const wallMat=new THREE.MeshStandardMaterial({color:0x142238,metalness:.75,roughness:.48});
  [[0,2,-9,25,4,.6],[0,2,9,25,4,.6],[-12.5,2,0,.6,4,18],[12.5,2,0,.6,4,18]].forEach(([x,y,z,w,h,d])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m)});
  const windowFrame=new THREE.Mesh(new THREE.BoxGeometry(12,5,.3),new THREE.MeshStandardMaterial({color:0x0b192d,emissive:0x0a426a,emissiveIntensity:.7}));windowFrame.position.set(0,3.5,-8.62);scene.add(windowFrame);const glass=new THREE.Mesh(new THREE.PlaneGeometry(10.8,3.8),new THREE.MeshBasicMaterial({color:0x061225}));glass.position.set(0,3.5,-8.42);scene.add(glass);
  const stars=new THREE.BufferGeometry();const pts=[];for(let i=0;i<700;i++)pts.push((Math.random()-.5)*10.5,2+Math.random()*3.3,-8.38);stars.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:0xffffff,size:.035})));
  const planet=new THREE.Mesh(new THREE.SphereGeometry(6,64,32),new THREE.MeshStandardMaterial({color:0x4d84c5,emissive:0x102b53,roughness:.8}));planet.position.set(2,-3,-12);scene.add(planet);
  const stationMat=new THREE.MeshPhysicalMaterial({color:0x283d54,metalness:.75,roughness:.3,clearcoat:.4});Object.entries(TASK_POSITIONS).forEach(([task,[x,z]])=>{const g=new THREE.Group();const base=new THREE.Mesh(new THREE.BoxGeometry(2,1.3,1.3),stationMat);base.position.y=.65;base.castShadow=true;g.add(base);const screen=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.55),new THREE.MeshBasicMaterial({color:0x3be7ff}));screen.position.set(0,.8,.661);g.add(screen);g.position.set(x,0,z);g.userData.task=task;scene.add(g)});
  const table=new THREE.Mesh(new THREE.CylinderGeometry(2.2,2.2,.45,32),new THREE.MeshPhysicalMaterial({color:0x35475c,metalness:.65,roughness:.35}));table.position.set(0,.2,1);table.castShadow=true;scene.add(table);
  const button=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.3,32),new THREE.MeshStandardMaterial({color:0xff284d,emissive:0x6a0015,emissiveIntensity:1.2}));button.position.set(0,.55,1);scene.add(button);
}
function createCrewmate(colorName){
  const group=new THREE.Group();const mat=new THREE.MeshPhysicalMaterial({color:COLORS[colorName]||0xffffff,roughness:.2,metalness:.05,clearcoat:1,clearcoatRoughness:.12});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.62,.88,10,22),mat);body.position.y=1.05;body.scale.z=.82;body.castShadow=true;group.add(body);
  const legGeo=new THREE.CapsuleGeometry(.22,.35,8,16);[-.3,.3].forEach(x=>{const l=new THREE.Mesh(legGeo,mat);l.position.set(x,.28,0);l.castShadow=true;group.add(l)});
  const pack=new THREE.Mesh(new THREE.BoxGeometry(.8,.9,.34),mat);
  pack.scale.set(1,1,.9);pack.position.set(0,1.02,-.62);pack.castShadow=true;group.add(pack);
  const rim=new THREE.Mesh(new THREE.SphereGeometry(.52,32,18),new THREE.MeshStandardMaterial({color:0x10151d,metalness:.7,roughness:.18}));rim.scale.set(1.22,.72,.34);rim.position.set(0,1.28,.55);group.add(rim);
  const visor=new THREE.Mesh(new THREE.SphereGeometry(.46,32,18),new THREE.MeshPhysicalMaterial({color:0xa8eaff,roughness:.06,metalness:.14,clearcoat:1,transmission:.18,transparent:true,opacity:.96}));visor.scale.set(1.2,.68,.3);visor.position.set(0,1.3,.62);group.add(visor);
  const highlight=new THREE.Mesh(new THREE.SphereGeometry(.14,16,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7}));highlight.scale.set(1.8,.45,.2);highlight.position.set(-.18,1.42,.86);group.add(highlight);
  group.userData.target=new THREE.Vector3();group.userData.rotation=0;return group;
}

function syncModels(){if(!state)return;const active=new Set();for(const p of state.players){active.add(p.id);let m=models.get(p.id);if(!m){m=createCrewmate(p.color);models.set(p.id,m);scene.add(m)}m.userData.target.set(p.x,0,p.z);m.userData.rotation=p.rotation;m.visible=true;m.traverse(o=>{if(o.material){o.material.transparent=!p.alive;o.material.opacity=p.alive?1:.3}});if(p.id===myId)localModel=m}for(const[id,m]of models){if(!active.has(id)){scene.remove(m);models.delete(id)}}}
function updateUI(){if(!state)return;const me=state.players.find(p=>p.id===myId);ui.room.textContent=state.room;ui.status.textContent=({lobby:'ロビー',playing:'プレイ中',meeting:'会議中',finished:'終了'})[state.phase]||state.phase;ui.role.textContent=`役職：${me?.role==='impostor'?'侵入者':me?.role==='crew'?'クルー':'---'}`;ui.players.innerHTML=state.players.map(p=>`<div class="player-row ${p.alive?'':'dead'}"><span class="dot" style="color:#${(COLORS[p.color]||0).toString(16).padStart(6,'0')};background:currentColor"></span>${escapeHtml(p.name)}${p.host?' ★':''}</div>`).join('');ui.start.classList.toggle('hidden',state.hostId!==myId||state.phase!=='lobby');ui.actionBar.classList.toggle('hidden',state.phase!=='playing');ui.taskPanel.classList.toggle('hidden',state.phase!=='playing'||!me);ui.kill.classList.toggle('hidden',me?.role!=='impostor'||!me?.alive);ui.sabotage.classList.toggle('hidden',me?.role!=='impostor'||!me?.alive);ui.joystick.classList.toggle('hidden',state.phase!=='playing');if(me){const completed=me.tasksDone||0,total=me.taskTotal||0;ui.tasks.innerHTML=(me.role==='crew'?getMyTasks(me):[]).map(t=>`<div class="task-row ${isTaskDone(t)?'done':''}"><span>${TASK_NAMES[t]}</span><span>${isTaskDone(t)?'✓':'○'}</span></div>`).join('')||'<p>侵入者は偽タスクを装えます。</p>';ui.taskProgress.style.width=`${total?completed/total*100:0}%`}}
let localCompleted=new Set();function getMyTasks(me){return me.taskTotal?Object.keys(TASK_NAMES).slice(0,me.taskTotal):[]}function isTaskDone(t){return localCompleted.has(t)}
ui.start.onclick=()=>send('start');ui.kill.onclick=()=>nearest.player&&send('kill',{targetId:nearest.player.id});ui.report.onclick=()=>nearest.body&&send('report',{bodyId:nearest.body.id});ui.meeting.onclick=()=>send('meeting');ui.sabotage.onclick=()=>$('sabotageDialog').showModal();document.querySelectorAll('[data-sabotage]').forEach(b=>b.onclick=()=>{send('sabotage',{kind:b.dataset.sabotage});closeDialog('sabotageDialog')});ui.use.onclick=()=>{if(state?.sabotage){send('fixSabotage');return}if(nearest.task)openTask(nearest.task)};

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);updateMovement(dt);for(const m of models.values()){m.position.lerp(m.userData.target,.22);m.rotation.y=THREE.MathUtils.lerp(m.rotation.y,m.userData.rotation,.22);m.position.y=Math.sin(performance.now()/220+m.position.x)*.025}if(localModel){const target=new THREE.Vector3(localModel.position.x,13,localModel.position.z+16);camera.position.lerp(target,.045);camera.lookAt(localModel.position.x,0,localModel.position.z+1)}updateNearest();renderer.render(scene,camera)}
function updateMovement(dt){const me=state?.players.find(p=>p.id===myId);if(!me||state.phase!=='playing'||!localModel)return;let dx=0,dz=0;if(keys.has('w')||keys.has('arrowup'))dz-=1;if(keys.has('s')||keys.has('arrowdown'))dz+=1;if(keys.has('a')||keys.has('arrowleft'))dx-=1;if(keys.has('d')||keys.has('arrowright'))dx+=1;dx+=joystickVector.x;dz+=joystickVector.y;const len=Math.hypot(dx,dz);if(len>.08){dx/=len;dz/=len;const speed=me.alive?4.2:6;const nx=Math.max(-11,Math.min(11,localModel.position.x+dx*speed*dt));const nz=Math.max(-7,Math.min(8,localModel.position.z+dz*speed*dt));localModel.userData.target.set(nx,0,nz);localModel.userData.rotation=Math.atan2(dx,dz);if(performance.now()-lastMoveSent>55){send('move',{x:nx,z:nz,rotation:localModel.userData.rotation});lastMoveSent=performance.now()}}}
function updateNearest(){nearest={task:null,player:null,body:null};if(!localModel||state?.phase!=='playing')return;let bestTask=2.4;for(const[task,[x,z]]of Object.entries(TASK_POSITIONS)){const d=Math.hypot(localModel.position.x-x,localModel.position.z-z);if(d<bestTask){bestTask=d;nearest.task=task}}let best=2.2;for(const p of state.players){if(p.id===myId)continue;const d=Math.hypot(localModel.position.x-p.x,localModel.position.z-p.z);if(!p.alive&&d<2.8)nearest.body=p;if(p.alive&&d<best){best=d;nearest.player=p}}ui.use.disabled=!nearest.task&&!state.sabotage;ui.report.disabled=!nearest.body;ui.kill.disabled=!nearest.player}

function openTask(task){$('taskTitle').textContent=TASK_NAMES[task];const box=$('taskGame');box.innerHTML='';if(task==='wires'){const colors=['赤','青','黄','緑'];colors.sort(()=>Math.random()-.5).forEach(c=>{const b=document.createElement('button');b.textContent=`${c}の線を接続`;b.onclick=()=>b.classList.add('done');box.append(b)});const done=document.createElement('button');done.textContent='修理完了';done.className='primary';done.onclick=()=>finishTask(task);box.append(done)}else if(task==='scanner'){box.innerHTML='<p>スキャン中…</p><div class="progress"><i id="scanBar"></i></div>';let n=0;const timer=setInterval(()=>{n+=4;$('scanBar').style.width=n+'%';if(n>=100){clearInterval(timer);finishTask(task)}},80)}else{for(let i=1;i<=5;i++){const b=document.createElement('button');b.textContent=i;b.onclick=()=>{b.disabled=true;if([...box.querySelectorAll('button:not(:disabled)')].length===0)finishTask(task)};box.append(b)}}$('taskDialog').showModal()}
function finishTask(task){localCompleted.add(task);send('taskComplete',{task});closeDialog('taskDialog');showNotice('タスク完了！')}
function openMeeting(reason){$('meetingReason').textContent=reason;$('chatLog').innerHTML='';renderVotes();$('meetingDialog').showModal()}
function renderVotes(){if(!state)return;$('voteList').innerHTML=state.players.filter(p=>p.alive).map(p=>`<button data-vote="${p.id}">${escapeHtml(p.name)}</button>`).join('')+'<button data-vote="skip">スキップ</button>';$('voteList').querySelectorAll('button').forEach(b=>b.onclick=()=>{send('vote',{targetId:b.dataset.vote});$('voteList').querySelectorAll('button').forEach(x=>x.disabled=true)})}
$('chatForm').onsubmit=e=>{e.preventDefault();const input=$('chatInput');send('chat',{text:input.value});input.value=''};function appendChat(from,text,alive){$('chatLog').insertAdjacentHTML('beforeend',`<p class="${alive?'':'dead'}"><b>${escapeHtml(from)}:</b> ${escapeHtml(text)}</p>`)}
function openResult(winner){$('resultTitle').textContent=winner==='crew'?'クルーの勝利':'侵入者の勝利';$('resultText').textContent=winner==='crew'?'侵入者を排除、または全タスクを完了しました。':'侵入者が施設を制圧しました。';$('returnLobbyButton').classList.toggle('hidden',state?.hostId!==myId);$('resultDialog').showModal()}
$('returnLobbyButton').onclick=()=>{send('returnLobby');closeDialog('resultDialog');localCompleted.clear()};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));function closeDialog(id){const d=$(id);if(d.open)d.close()}
function showNotice(text){ui.notice.textContent=text;clearTimeout(showNotice.timer);showNotice.timer=setTimeout(()=>ui.notice.textContent='',2600)}function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function onResize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
function setupJoystick(){let active=false;const update=e=>{const r=ui.joystick.getBoundingClientRect();const p=e.touches?e.touches[0]:e;let x=p.clientX-(r.left+r.width/2),y=p.clientY-(r.top+r.height/2);const len=Math.hypot(x,y),max=36;if(len>max){x=x/len*max;y=y/len*max}ui.stick.style.transform=`translate(${x}px,${y}px)`;joystickVector={x:x/max,y:y/max}};ui.joystick.addEventListener('pointerdown',e=>{active=true;ui.joystick.setPointerCapture(e.pointerId);update(e)});ui.joystick.addEventListener('pointermove',e=>active&&update(e));const end=()=>{active=false;joystickVector={x:0,y:0};ui.stick.style.transform='translate(0,0)'};ui.joystick.addEventListener('pointerup',end);ui.joystick.addEventListener('pointercancel',end)}
