import * as THREE from 'three';
const $=id=>document.getElementById(id);const ui={menu:$('menu'),game:$('gameScreen'),name:$('nameInput'),roomInput:$('roomInput'),message:$('menuMessage'),room:$('roomCode'),role:$('roleText'),status:$('statusText'),players:$('playerList'),playerCount:$('playerCount'),start:$('startButton'),settings:$('settingsButton'),taskPanel:$('taskPanel'),tasks:$('taskList'),taskProgress:$('taskProgress'),taskCounter:$('taskCounter'),actionBar:$('actionBar'),use:$('useButton'),report:$('reportButton'),kill:$('killButton'),killCooldown:$('killCooldown'),sabotage:$('sabotageButton'),meeting:$('meetingButton'),joystick:$('joystick'),stick:$('stick'),notice:$('notice'),miniMap:$('miniMap'),sabotageBanner:$('sabotageBanner'),sabotageTitle:$('sabotageTitle'),sabotageTimer:$('sabotageTimer')};
const COLORS={red:0xe9343f,blue:0x1456d9,green:0x25a65a,pink:0xf244a8,orange:0xf58220,yellow:0xf3ce28,cyan:0x29cbd4,purple:0x7f43cf,white:0xe8eef7,lime:0x7bd93f};
const MAP_VERSION='wide-map-v13-compatible';
const TASKS={reactor:['リアクター調整',-13.8,8.8],wires:['配線修理',13.8,8.8],scanner:['生体スキャン',-13.8,-8.8],cargo:['貨物整理',13.8,-8.8],fuel:['燃料補給',0,9.2],align:['航路調整',0,-9.2]};
const MAP_BOUNDS={minX:-18,maxX:18,minZ:-13,maxZ:13};
const LOCKERS=[{id:'medical',x:-15.8,z:-10.7,exitX:-14.1,exitZ:-10.7,rot:Math.PI/2},{id:'security',x:-15.8,z:2.6,exitX:-14.1,exitZ:2.6,rot:Math.PI/2},{id:'electrical',x:15.8,z:10.6,exitX:14.1,exitZ:10.6,rot:-Math.PI/2},{id:'cargo',x:15.8,z:-10.6,exitX:14.1,exitZ:-10.6,rot:-Math.PI/2}];
const SECURITY_CONSOLE={x:-13.8,z:0.2};
const EMERGENCY_BUTTON={x:0,z:.5};
// 壁は出入口を3.4～4.0m確保し、キャラクター同士がすれ違える幅にしています。
const WALLS=[
  {x:-6,z:-10.7,w:.5,d:4.6},{x:-6,z:-3.2,w:.5,d:5.0},{x:-6,z:4.2,w:.5,d:5.0},{x:-6,z:10.9,w:.5,d:3.8},
  {x:6,z:-10.7,w:.5,d:4.6},{x:6,z:-3.2,w:.5,d:5.0},{x:6,z:4.2,w:.5,d:5.0},{x:6,z:10.9,w:.5,d:3.8},
  {x:-13.2,z:-4.3,w:7.6,d:.5},{x:-5.0,z:-4.3,w:2.0,d:.5},{x:5.0,z:-4.3,w:2.0,d:.5},{x:13.2,z:-4.3,w:7.6,d:.5},
  {x:-13.2,z:4.8,w:7.6,d:.5},{x:-5.0,z:4.8,w:2.0,d:.5},{x:5.0,z:4.8,w:2.0,d:.5},{x:13.2,z:4.8,w:7.6,d:.5}
];
const SOLID_PROPS=[
  {x:-14.2,z:.2,w:1.8,d:1.8},{x:14.2,z:.2,w:1.8,d:1.8},
  {x:-13.8,z:-9.8,w:1.8,d:1.4},{x:13.8,z:-9.8,w:1.8,d:1.4},
  {x:-13.8,z:9.8,w:1.6,d:1.6},{x:13.8,z:9.8,w:1.6,d:1.6},
  {x:-15.8,z:-10.7,w:1.15,d:.9},{x:-15.8,z:2.6,w:1.15,d:.9},{x:15.8,z:10.6,w:1.15,d:.9},{x:15.8,z:-10.6,w:1.15,d:.9}
];
let socket,myId,state,scene,camera,renderer,clock,localModel,renderMode='3d',canvas2d=null,cameraMode=0,firstPersonYaw=0,nearest={task:null,player:null,body:null,locker:null,security:false,emergency:false};const models=new Map(),keys=new Set(),keyCodes=new Set();let joy={x:0,y:0},lastMove=0,noticeTimer=0;const localVelocity=new THREE.Vector2();let localTargetRotation=0,lastServerSync=0;const voicePeers=new Map();const lockerVisuals=new Map();let localVoiceStream=null,voiceStarting=false,micMuted=false,activeCallPeer=null,incomingCallPeer=null,callTimeoutId=0,incomingCallTimeoutId=0,joinTimeoutId=0,joinPending=false,gameInitialized=false,pendingRoom='',pendingName='';let runtimeHandlersInstalled=false,animationStarted=false,fallbackSwitching=false;
const randomRoom=()=>Array.from({length:6},()=>('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')[Math.floor(Math.random()*32)]).join('');
const escapeHtml=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function send(type,data={}){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type,...data}))}
function showNotice(t){ui.notice.textContent=t;ui.notice.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.notice.classList.remove('show'),2200)}
function createWebSocketUrl(room){
  if(!['http:','https:'].includes(window.location.protocol))throw new Error('このゲームはCloudflareへ公開したURLから開いてください。');
  const protocol=window.location.protocol==='https:'?'wss:':'ws:';
  const url=new URL('/ws',window.location.href);
  url.protocol=protocol;
  url.searchParams.set('room',String(room).toUpperCase());
  return url.toString();
}
function setJoinControls(disabled){
  const create=$('createButton'),join=$('joinButton');
  if(create)create.disabled=disabled;if(join)join.disabled=disabled;if(ui.roomInput)ui.roomInput.disabled=disabled;if(ui.name)ui.name.disabled=disabled;
}
function setMenuMessage(message,isError=false){if(!ui.message)return;ui.message.textContent=message||'';ui.message.classList.toggle('error',!!isError)}
function clearJoinTimeout(){if(joinTimeoutId){clearTimeout(joinTimeoutId);joinTimeoutId=0}}
function ensureGameInitialized(){
  if(gameInitialized)return;gameInitialized=true;
  try{init3D()}catch(error){
    console.error('[Hidden Crew] 3D initialization failed',error);
    try{init2DFallback(error)}catch(fallbackError){console.error('[Hidden Crew] fallback initialization failed',fallbackError);showFatalLoadError(fallbackError)}
  }
}
function finishJoin(room){
  if(!joinPending&&gameInitialized)return;
  clearJoinTimeout();joinPending=false;setJoinControls(false);setMenuMessage('');
  ui.room.textContent=room||pendingRoom||'------';ui.menu.classList.add('hidden');ui.game.classList.remove('hidden');
  ensureGameInitialized();showNotice('ルームに参加しました。');
}
function failJoin(message,closeSocket=true){
  clearJoinTimeout();joinPending=false;setJoinControls(false);setMenuMessage(message||'ルームに参加できませんでした。',true);
  ui.game.classList.add('hidden');ui.menu.classList.remove('hidden');
  const ws=socket;socket=null;if(closeSocket&&ws&&ws.readyState<2){try{ws.close(4000,'Join failed')}catch{}}
}
function connect(room,name){
  let wsUrl;
  try{wsUrl=createWebSocketUrl(room)}catch(error){failJoin(error.message,false);return}
  console.info('[Hidden Crew] WebSocket:',wsUrl);
  const ws=new WebSocket(wsUrl);socket=ws;
  ws.onopen=()=>{if(socket!==ws)return;ws.send(JSON.stringify({type:'join',name,clientVersion:MAP_VERSION,color:$('colorSelect')?.value,hat:$('hatSelect')?.value}))};
  ws.onmessage=e=>{if(socket!==ws)return;try{handle(JSON.parse(e.data))}catch(error){console.error('Invalid server message',error,e.data);if(joinPending)failJoin('サーバーから不正な応答が返りました。')}};
  ws.onclose=event=>{if(socket!==ws)return;socket=null;hangUpCall(false);clearIncomingCall(false);const detail=event.reason?`：${event.reason}`:'';if(joinPending)failJoin(`ルームへ接続できませんでした（code ${event.code}${detail}）。`,false);else showNotice(`接続が切れました（code: ${event.code}${detail}）。再読み込みしてください。`)};
  ws.onerror=error=>{console.error('WebSocket error',error);if(joinPending)setMenuMessage('サーバーへ接続できません。公開先とWorker設定を確認してください。',true)};
}
function handle(m){
  if(m.type==='hello'){
    myId=m.id;ui.room.textContent=m.room;
  }else if(m.type==='joined'){
    if(m.id)myId=m.id;finishJoin(m.room);
  }else if(m.type==='state'){
    if(m.state?.mapVersion&&m.state.mapVersion!==MAP_VERSION){console.warn('[Hidden Crew] client/server version mismatch',MAP_VERSION,m.state.mapVersion);showNotice('新旧ファイルが混在していますが、互換モードで接続しました。')}
    state=m.state;
    if(joinPending&&myId&&state.players?.some(player=>player.id===myId))finishJoin(state.room);
    ui.start.disabled=false;ui.start.textContent='ゲーム開始';updateUI();updateAdvancedUI();syncModels();
    if(activeCallPeer){const callTarget=state.players?.find(p=>p.id===activeCallPeer);if(!callTarget?.connected||!callTarget?.alive){showNotice('通話相手が退出したため通話を終了しました。');hangUpCall(false)}else updateCallUi()}
    if(state.phase==='meeting'&&document.getElementById('meetingDialog')?.open)syncVoicePeers();
  }else if(m.type==='playerMoved'){
    const o=models.get(m.id);if(o){
      o.userData.target.set(m.x,0,m.z);o.userData.rotation=m.rotation;
      if(m.id===myId){
        const correction=o.position.distanceTo(o.userData.target);
        // 通常の通信遅延はローカル描画へ反映せず、大きくずれた時だけ穏やかに補正する。
        if(correction>5){o.position.copy(o.userData.target);localVelocity.set(0,0)}
        else if(correction>1.5)o.position.lerp(o.userData.target,.16);
      }
    }
  }else if(m.type==='error'){
    ui.start.disabled=false;ui.start.textContent='ゲーム開始';if(joinPending)failJoin(m.message);else showNotice(m.message);
  }else if(m.type==='gameStarted'){ui.start.disabled=false;ui.start.textContent='ゲーム開始';showNotice(m.practiceMode?'練習モードを開始しました':'ゲームを開始しました')}
  else if(m.type==='meetingStarted')openMeeting(m.reason);
  else if(m.type==='meetingEnded'){closeDialog('meetingDialog');showNotice(m.ejected?`${m.ejected.name}が追放されました。役職は公開されません。`:'誰も追放されませんでした')}
  else if(m.type==='voiceSignal')handleVoiceSignal(m);
  else if(m.type==='voiceAudio')handleVoiceAudio(m);
  else if(m.type==='callControl')handleCallControl(m);
  else if(m.type==='chat')appendChat(m);
  else if(m.type==='sabotage')showNotice('妨害が発生しました');
  else if(m.type==='sabotageFixed')showNotice('妨害が解除されました');
  else if(m.type==='gameFinished'){hangUpCall(true);saveResult(m.winner);openResult(m.winner)}
  else if(m.type==='killEffect')flashScreen();
  else if(m.type==='abilityResult')showNotice(m.message);
}
$('createButton').onclick=()=>joinRoom(randomRoom());
$('joinButton').onclick=()=>joinRoom(ui.roomInput.value);
ui.roomInput.addEventListener('input',()=>{ui.roomInput.value=ui.roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)});
ui.roomInput.addEventListener('keydown',event=>{if(event.key==='Enter')joinRoom(ui.roomInput.value)});
function joinRoom(value){
  if(joinPending)return;
  const room=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
  const name=String(ui.name.value||'Player').replace(/[<>]/g,'').trim().slice(0,16)||'Player';
  ui.roomInput.value=room;ui.name.value=name;
  if(room.length!==6){setMenuMessage('6桁のルームコードを入力してください。',true);ui.roomInput.focus();return}
  if(socket&&socket.readyState<2){try{socket.close(1000,'Reconnect')}catch{}}
  myId=null;state=null;pendingRoom=room;pendingName=name;joinPending=true;setJoinControls(true);setMenuMessage('ルームへ接続しています…');
  joinTimeoutId=setTimeout(()=>{if(joinPending)failJoin('接続がタイムアウトしました。Cloudflareへの公開設定を確認してください。')},12000);
  connect(room,name);
}
function showFatalLoadError(error){
  const canvas=$('gameCanvas');if(canvas)canvas.style.display='none';
  let panel=$('loadErrorPanel');
  if(!panel){panel=document.createElement('div');panel.id='loadErrorPanel';panel.className='load-error-panel glass';document.getElementById('gameScreen')?.append(panel)}
  const detail=escapeHtml(error?.message||String(error||'不明なエラー'));
  panel.innerHTML=`<h2>マップを読み込めませんでした</h2><p>描画処理でエラーが発生しました。</p><p class="error-detail">${detail}</p><button id="reloadFreshButton" class="primary">最新版を読み直す</button>`;
  panel.querySelector('#reloadFreshButton').onclick=()=>{const url=new URL(location.href);url.searchParams.set('refresh',Date.now().toString());location.replace(url.toString())};
  showNotice('3Dマップの読み込みに失敗しました。最新版を読み直してください。');
}
function replaceGameCanvas(){
  const oldCanvas=$('gameCanvas');
  if(!oldCanvas)throw new Error('gameCanvas が見つかりません');
  const canvas=document.createElement('canvas');
  canvas.id='gameCanvas';
  canvas.className=oldCanvas.className;
  canvas.setAttribute('aria-label','ゲームマップ');
  oldCanvas.replaceWith(canvas);
  return canvas;
}
function installRuntimeHandlers(){
  if(runtimeHandlersInstalled)return;
  runtimeHandlersInstalled=true;
  addEventListener('resize',resize);
  addEventListener('keydown',handleKeyDown,{passive:false});
  addEventListener('keyup',handleKeyUp,{passive:false});
  addEventListener('blur',clearKeys);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys()});
  setupJoystick();
}
function startAnimationLoop(){
  if(animationStarted)return;
  animationStarted=true;
  if(!clock)clock=new THREE.Clock();
  animate();
}
function init2DFallback(originalError){
  if(renderMode==='2d'&&canvas2d)return;
  if(fallbackSwitching)return;
  fallbackSwitching=true;
  try{
    renderMode='2d';cameraMode=0;
    const cameraButton=$('cameraButton');if(cameraButton){cameraButton.disabled=true;cameraButton.textContent='軽量マップ表示';}
    // WebGLコンテキストを取得したcanvasは、そのままCanvas 2Dへ切り替えられないため置き換える。
    try{renderer?.dispose?.()}catch(error){console.warn('renderer dispose failed',error)}
    renderer=null;scene=null;camera=null;
    const canvas=replaceGameCanvas();
    canvas.style.display='block';
    canvas2d=canvas.getContext('2d',{alpha:false,desynchronized:true})||canvas.getContext('2d');
    if(!canvas2d)throw new Error('Canvas 2Dの初期化に失敗しました');
    if(!clock)clock=new THREE.Clock();else clock.getDelta();
    installRuntimeHandlers();
    resize();
    syncModels();
    startAnimationLoop();
    const panel=$('loadErrorPanel');if(panel)panel.remove();
    showNotice('3D表示を利用できないため、見える軽量マップへ切り替えました。');
    console.warn('[Hidden Crew] 2D fallback enabled:',originalError);
  }finally{
    fallbackSwitching=false;
  }
}
function makeFallbackModel(player){
  return {position:new THREE.Vector3(player.x||0,0,player.z||0),rotation:{y:player.rotation||0},visible:true,userData:{target:new THREE.Vector3(player.x||0,0,player.z||0),rotation:player.rotation||0,hidden:Boolean(player.hidden)}};
}
function draw2DMap(){
  if(!canvas2d)return;
  const canvas=$('gameCanvas'),ctx=canvas2d,w=canvas.width,h=canvas.height;
  const scale=Math.min(w/42,h/32),ox=w/2,oz=h/2;
  const sx=x=>ox+x*scale,sz=z=>oz+z*scale;
  ctx.fillStyle='#020711';ctx.fillRect(0,0,w,h);
  ctx.fillStyle='#0b2948';ctx.fillRect(sx(-18),sz(-13),36*scale,26*scale);
  ctx.strokeStyle='#245b79';ctx.lineWidth=Math.max(1,scale*.05);ctx.strokeRect(sx(-18),sz(-13),36*scale,26*scale);
  ctx.fillStyle='#14263d';
  for(const o of WALLS)ctx.fillRect(sx(o.x-o.w/2),sz(o.z-o.d/2),o.w*scale,o.d*scale);
  ctx.fillStyle='#26384b';
  for(const o of SOLID_PROPS)ctx.fillRect(sx(o.x-o.w/2),sz(o.z-o.d/2),o.w*scale,o.d*scale);
  ctx.fillStyle='#355064';ctx.beginPath();ctx.arc(sx(0),sz(.5),2.25*scale,0,Math.PI*2);ctx.fill();
  for(const [id,[name,x,z]] of Object.entries(TASKS)){
    ctx.fillStyle='#46dfff';ctx.fillRect(sx(x)-.45*scale,sz(z)-.45*scale,.9*scale,.9*scale);
    ctx.fillStyle='#dffcff';ctx.font=`${Math.max(10,scale*.38)}px sans-serif`;ctx.textAlign='center';ctx.fillText(name,sx(x),sz(z)-.65*scale);
  }
  for(const locker of LOCKERS){
    const occupied=state?.players?.some(p=>p.hidden&&p.hiddenAt===locker.id);
    ctx.fillStyle=occupied?'#ffb34d':'#3b6680';ctx.fillRect(sx(locker.x)-.55*scale,sz(locker.z)-.45*scale,1.1*scale,.9*scale);
  }
  for(const p of state?.players||[]){
    if(p.reported||p.hidden)continue;
    const model=models.get(p.id),x=model?.position?.x??p.x,z=model?.position?.z??p.z;
    const hex=(COLORS[p.color]||0xffffff).toString(16).padStart(6,'0');
    ctx.globalAlpha=p.alive?1:.35;ctx.fillStyle=`#${hex}`;ctx.beginPath();ctx.arc(sx(x),sz(z),.58*scale,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle='#ffffff';ctx.font=`bold ${Math.max(11,scale*.42)}px sans-serif`;ctx.textAlign='center';ctx.fillText(p.name,sx(x),sz(z)-.85*scale);
  }
  ctx.fillStyle='rgba(2,7,17,.75)';ctx.fillRect(10,h-40,310,30);ctx.fillStyle='#dffcff';ctx.textAlign='left';ctx.font='14px sans-serif';ctx.fillText('軽量マップ表示中（操作・機能はそのまま使えます）',20,h-20);
}
function drawMiniMap(){
  const canvas=ui.miniMap;
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  if(!ctx)return;
  const width=canvas.width,height=canvas.height,pad=10;
  const mapWidth=MAP_BOUNDS.maxX-MAP_BOUNDS.minX;
  const mapHeight=MAP_BOUNDS.maxZ-MAP_BOUNDS.minZ;
  const scale=Math.min((width-pad*2)/mapWidth,(height-pad*2)/mapHeight);
  const offsetX=(width-mapWidth*scale)/2;
  const offsetY=(height-mapHeight*scale)/2;
  const sx=x=>offsetX+(x-MAP_BOUNDS.minX)*scale;
  const sz=z=>offsetY+(z-MAP_BOUNDS.minZ)*scale;

  ctx.clearRect(0,0,width,height);
  ctx.fillStyle='rgba(2,7,17,.92)';ctx.fillRect(0,0,width,height);
  ctx.fillStyle='#0b2948';ctx.fillRect(sx(MAP_BOUNDS.minX),sz(MAP_BOUNDS.minZ),mapWidth*scale,mapHeight*scale);
  ctx.strokeStyle='#2d6f92';ctx.lineWidth=1;ctx.strokeRect(sx(MAP_BOUNDS.minX),sz(MAP_BOUNDS.minZ),mapWidth*scale,mapHeight*scale);

  ctx.fillStyle='#1b3147';
  for(const wall of WALLS)ctx.fillRect(sx(wall.x-wall.w/2),sz(wall.z-wall.d/2),wall.w*scale,wall.d*scale);
  ctx.fillStyle='#385164';
  for(const prop of SOLID_PROPS)ctx.fillRect(sx(prop.x-prop.w/2),sz(prop.z-prop.d/2),Math.max(2,prop.w*scale),Math.max(2,prop.d*scale));

  const self=me();
  if(!self)return;
  for(const player of state?.players||[]){
    if(player.reported||player.hidden)continue;
    if(player.id!==myId&&state?.phase==='playing')continue;
    const model=models.get(player.id);
    const x=model?.position?.x??player.x;
    const z=model?.position?.z??player.z;
    const color=(COLORS[player.color]||0xffffff).toString(16).padStart(6,'0');
    ctx.globalAlpha=player.alive?1:.45;
    ctx.fillStyle=`#${color}`;
    ctx.beginPath();ctx.arc(sx(x),sz(z),player.id===myId?5:3.5,0,Math.PI*2);ctx.fill();
    if(player.id===myId){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.stroke()}
  }
  ctx.globalAlpha=1;
}
function isTypingTarget(target){return target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||target?.isContentEditable}function isDown(...codes){return codes.some(code=>keyCodes.has(code))}function handleKeyDown(e){if(isTypingTarget(e.target))return;const code=e.code;const key=String(e.key||'').toLowerCase();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();keyCodes.add(code);keys.add(key);if(e.repeat)return;if(code==='KeyE')useAction();if(code==='KeyR')reportAction();if(code==='KeyQ'||code==='Space')attackAction();if(code==='KeyM')meetingAction()}function handleKeyUp(e){if(isTypingTarget(e.target))return;const code=e.code;const key=String(e.key||'').toLowerCase();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();keyCodes.delete(code);keys.delete(key)}function clearKeys(){keyCodes.clear();keys.clear();localVelocity.set(0,0);joy={x:0,y:0}}function init3D(){
  if(renderer)return;
  renderMode='3d';canvas2d=null;
  const cameraButton=$('cameraButton');if(cameraButton){cameraButton.disabled=false;cameraButton.textContent=cameraMode===0?'近い視点へ切替':cameraMode===1?'一人称視点へ切替':'見下ろし視点へ切替';}
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x020711);
  scene.fog=new THREE.FogExp2(0x020711,.018);
  camera=new THREE.PerspectiveCamera(54,Math.max(1,innerWidth)/Math.max(1,innerHeight),.06,180);
  camera.position.set(0,15,10);
  camera.lookAt(0,.8,0);
  scene.add(camera);
  const canvas=$('gameCanvas');
  if(!canvas)throw new Error('gameCanvas が見つかりません');
  canvas.style.display='block';
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',failIfMajorPerformanceCaveat:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight),false);
  renderer.setClearColor(0x020711,1);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.28;
  clock=new THREE.Clock();
  buildWorld();
  installRuntimeHandlers();
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    console.error('[Hidden Crew] WebGL context lost');
    try{init2DFallback(new Error('WebGLの描画が停止しました'))}catch(error){console.error('[Hidden Crew] WebGL recovery failed',error);showFatalLoadError(error)}
  },{once:true});
  startAnimationLoop();
  showNotice('移動: 矢印キー/WASD（画面の方向どおり）　使用: E　通報: R');
}
function buildWorld(){
  scene.add(new THREE.HemisphereLight(0xb9efff,0x101927,3.15));
  const cameraLight=new THREE.PointLight(0xc8f3ff,2.8,13,1.4);cameraLight.position.set(0,.15,.15);camera.add(cameraLight);
  const headLamp=new THREE.SpotLight(0xe4f8ff,5.2,18,Math.PI/4,.55,1.15);headLamp.position.set(0,.05,.1);headLamp.target.position.set(0,-.15,6);camera.add(headLamp);camera.add(headLamp.target);
  const sun=new THREE.DirectionalLight(0xffffff,2.7);sun.position.set(7,18,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-24;sun.shadow.camera.right=24;sun.shadow.camera.top=18;sun.shadow.camera.bottom=-18;scene.add(sun);
  const floor=new THREE.Mesh(new THREE.BoxGeometry(38,.5,28),new THREE.MeshPhysicalMaterial({color:0x0b2948,metalness:.58,roughness:.34,clearcoat:.7}));floor.position.y=-.32;floor.receiveShadow=true;scene.add(floor);
  const roomFloors=[[-12,9,11.5,7.8,0x43232c],[0,9,11.5,7.8,0x493b22],[12,9,11.5,7.8,0x253c51],[-12,.25,11.5,8.5,0x26374e],[0,.25,11.5,8.5,0x2b3547],[12,.25,11.5,8.5,0x244047],[-12,-8.65,11.5,8.2,0x203b4b],[0,-8.65,11.5,8.2,0x1e3d43],[12,-8.65,11.5,8.2,0x493824]];
  roomFloors.forEach(([x,z,w,d,color])=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,.06,d),new THREE.MeshStandardMaterial({color,metalness:.32,roughness:.52}));m.position.set(x,-.03,z);m.receiveShadow=true;scene.add(m)});
  for(let x=-17;x<=17;x+=2.5){const l=new THREE.Mesh(new THREE.BoxGeometry(.035,.025,26),new THREE.MeshBasicMaterial({color:0x20577c}));l.position.set(x,-.002,0);scene.add(l)}
  for(let z=-12;z<=12;z+=2.5){const l=new THREE.Mesh(new THREE.BoxGeometry(36,.025,.035),new THREE.MeshBasicMaterial({color:0x163d5c}));l.position.set(0,-.001,z);scene.add(l)}
  const wallMat=new THREE.MeshStandardMaterial({color:0x14263d,metalness:.76,roughness:.42});
  const trimMat=new THREE.MeshStandardMaterial({color:0x356784,metalness:.86,roughness:.24,emissive:0x071828});
  const addWall=(x,z,w,d,h=3.2)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wallMat);m.position.set(x,h/2,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);const t=new THREE.Mesh(new THREE.BoxGeometry(w+.06,.09,d+.06),trimMat);t.position.set(x,h+.04,z);scene.add(t)};
  [[0,-13.5,37,.5],[0,13.5,37,.5],[-18.5,0,.5,27],[18.5,0,.5,27]].forEach(a=>addWall(...a,4));WALLS.forEach(o=>addWall(o.x,o.z,o.w,o.d));
  const addDoor=(x,z,rot=0)=>{const g=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x31526b,metalness:.8,roughness:.28});[-1,1].forEach(side=>{const j=new THREE.Mesh(new THREE.BoxGeometry(.22,2.7,.38),mat);j.position.set(side*1.65,1.35,0);g.add(j)});const top=new THREE.Mesh(new THREE.BoxGeometry(3.55,.24,.4),mat);top.position.y=2.65;g.add(top);const glow=new THREE.Mesh(new THREE.BoxGeometry(3.05,.08,.12),new THREE.MeshBasicMaterial({color:0x4fe4ff}));glow.position.set(0,2.47,.22);g.add(glow);g.position.set(x,0,z);g.rotation.y=rot;scene.add(g)};
  [[-6,-7.9,0],[-6,.5,0],[-6,8.0,0],[6,-7.9,0],[6,.5,0],[6,8.0,0],[-9.1,-4.3,Math.PI/2],[0,-4.3,Math.PI/2],[9.1,-4.3,Math.PI/2],[-9.1,4.8,Math.PI/2],[0,4.8,Math.PI/2],[9.1,4.8,Math.PI/2]].forEach(a=>addDoor(...a));
  const addLabel=(text,x,z,rot=0)=>{const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='rgba(5,18,32,.86)';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#59dfff';ctx.lineWidth=4;ctx.strokeRect(3,3,506,90);ctx.fillStyle='#e4fbff';ctx.font='bold 36px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);const m=new THREE.Mesh(new THREE.PlaneGeometry(3.5,.65),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true}));m.position.set(x,2.5,z);m.rotation.y=rot;scene.add(m)};
  addLabel('REACTOR',-12,13.18);addLabel('CAFETERIA',0,13.18);addLabel('ELECTRICAL',12,13.18);addLabel('SECURITY',-18.18,.2,Math.PI/2);addLabel('CENTRAL HUB',0,4.45);addLabel('OXYGEN',18.18,.2,-Math.PI/2);addLabel('MEDICAL',-12,-13.18,Math.PI);addLabel('NAVIGATION',0,-13.18,Math.PI);addLabel('CARGO',12,-13.18,Math.PI);
  const addCrate=(x,z,color=0x765733)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.15,1.4),new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.7}));m.position.set(x,.57,z);m.castShadow=true;scene.add(m)};
  addCrate(12,-9.8);addCrate(14.2,-7.7,0x526779);addCrate(-14.2,-8.5,0x647383);
  const table=new THREE.Mesh(new THREE.CylinderGeometry(2.15,2.3,.72,40),new THREE.MeshStandardMaterial({color:0x355064,metalness:.75,roughness:.28}));table.position.set(0,.36,.5);table.castShadow=true;scene.add(table);const emergency=new THREE.Mesh(new THREE.CylinderGeometry(.52,.6,.25,32),new THREE.MeshStandardMaterial({color:0xd82e3c,emissive:0x5b0810}));emergency.position.set(0,.86,.5);scene.add(emergency);
  Object.entries(TASKS).forEach(([id,[,x,z]],i)=>{const g=new THREE.Group();const base=new THREE.Mesh(new THREE.BoxGeometry(1.25,1.35,.65),new THREE.MeshStandardMaterial({color:0x26384b,metalness:.72,roughness:.3}));base.position.y=.68;base.castShadow=true;g.add(base);const screen=new THREE.Mesh(new THREE.PlaneGeometry(.86,.48),new THREE.MeshBasicMaterial({color:[0x48eaff,0x73ff93,0xffcb4e][i%3]}));screen.position.set(0,.88,.331);g.add(screen);g.position.set(x,0,z);scene.add(g)});
  const addLocker=(locker)=>{const group=new THREE.Group();const shellMat=new THREE.MeshStandardMaterial({color:0x28445a,metalness:.78,roughness:.3});const darkMat=new THREE.MeshStandardMaterial({color:0x07131f,metalness:.35,roughness:.55});const shell=new THREE.Mesh(new THREE.BoxGeometry(1.15,2.55,.9),shellMat);shell.position.y=1.275;shell.castShadow=true;group.add(shell);const recess=new THREE.Mesh(new THREE.BoxGeometry(.86,2.15,.08),darkMat);recess.position.set(0,1.25,.47);group.add(recess);const doorPivot=new THREE.Group();doorPivot.position.set(-.46,0,.52);const door=new THREE.Mesh(new THREE.BoxGeometry(.9,2.18,.08),new THREE.MeshStandardMaterial({color:0x3b6680,metalness:.82,roughness:.25}));door.position.set(.45,1.25,0);door.castShadow=true;doorPivot.add(door);const handle=new THREE.Mesh(new THREE.BoxGeometry(.06,.3,.07),new THREE.MeshBasicMaterial({color:0x9cecff}));handle.position.set(.78,1.2,.07);doorPivot.add(handle);group.add(doorPivot);const lamp=new THREE.Mesh(new THREE.SphereGeometry(.08,12,8),new THREE.MeshBasicMaterial({color:0x63f4ff}));lamp.position.set(0,2.38,.53);group.add(lamp);group.position.set(locker.x,0,locker.z);group.rotation.y=locker.rot;group.userData={doorPivot,lamp,open:0,lockerId:locker.id};scene.add(group);lockerVisuals.set(locker.id,group)};LOCKERS.forEach(addLocker);
  const starGeo=new THREE.BufferGeometry(),pts=[];for(let i=0;i<1200;i++)pts.push((Math.random()-.5)*115,Math.random()*45+5,(Math.random()-.5)*115);starGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:.09})));
}
function createCrewmate(c){const group=new THREE.Group(),mat=new THREE.MeshPhysicalMaterial({color:COLORS[c]||0xffffff,roughness:.18,metalness:.04,clearcoat:1,clearcoatRoughness:.1}),body=new THREE.Mesh(new THREE.CapsuleGeometry(.62,.88,10,22),mat);body.position.y=1.05;body.scale.z=.82;body.castShadow=true;group.add(body);[-.3,.3].forEach(x=>{const l=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.35,8,16),mat);l.position.set(x,.28,0);l.castShadow=true;group.add(l)});const pack=new THREE.Mesh(new THREE.BoxGeometry(.8,.9,.34),mat);pack.position.set(0,1.02,-.62);pack.castShadow=true;group.add(pack);const rim=new THREE.Mesh(new THREE.SphereGeometry(.52,32,18),new THREE.MeshStandardMaterial({color:0x10151d,metalness:.7,roughness:.16}));rim.scale.set(1.22,.72,.34);rim.position.set(0,1.28,.55);group.add(rim);const visor=new THREE.Mesh(new THREE.SphereGeometry(.46,32,18),new THREE.MeshPhysicalMaterial({color:0xa8eaff,roughness:.05,metalness:.1,clearcoat:1,transmission:.2,transparent:true,opacity:.96}));visor.scale.set(1.2,.68,.3);visor.position.set(0,1.3,.62);group.add(visor);group.userData.target=new THREE.Vector3();group.userData.rotation=0;return group}
function syncModels(){if(!state)return;const active=new Set();for(const p of state.players){active.add(p.id);let m=models.get(p.id);const created=!m;if(created){m=renderMode==='2d'?makeFallbackModel(p):createCrewmate(p.color);models.set(p.id,m);if(renderMode==='3d')scene.add(m)}const hiddenChanged=m.userData.hidden!==Boolean(p.hidden);m.userData.hidden=Boolean(p.hidden);m.userData.target.set(p.x,0,p.z);m.userData.rotation=p.rotation;if(created||p.id===myId&&(!localModel||hiddenChanged)){m.position.set(p.x,0,p.z);m.rotation.y=p.rotation||0}m.visible=!p.reported&&!p.hidden;if(renderMode==='3d')m.traverse(o=>{if(o.material){o.material.transparent=!p.alive;o.material.opacity=p.alive?1:.28}});if(p.id===myId){localModel=m;if(!p.hidden&&collidesWithMap(m.position.x,m.position.z)){m.position.set(p.x,0,p.z);m.userData.target.copy(m.position);localVelocity.set(0,0)}}}for(const[id,m]of models)if(!active.has(id)){if(renderMode==='3d')scene.remove(m);models.delete(id)}}
function me(){return state?.players.find(p=>p.id===myId)}
function killCooldownRemainingMs(){
  const p=me();
  if(!p||p.role!=='impostor')return 0;
  const cooldownSeconds=Math.max(0,Number(state?.settings?.killCooldown)||15);
  const lastKillAt=Math.max(0,Number(p.lastKillAt)||0);
  return Math.max(0,cooldownSeconds*1000-(Date.now()-lastKillAt));
}
function canKill(){
  const p=me();
  return !!p&&state?.phase==='playing'&&p.alive&&!p.spectator&&p.role==='impostor'&&killCooldownRemainingMs()<=0;
}
function updateCooldown(){
  const remaining=killCooldownRemainingMs();
  if(ui.killCooldown)ui.killCooldown.textContent=remaining>0?`${Math.ceil(remaining/1000)}秒`:'';
  if(ui.kill&&me()?.role==='impostor')ui.kill.disabled=!canKill()||!nearest.player;
}
function updateUI(){if(!state)return;const p=me();ui.room.textContent=state.room;ui.status.textContent={lobby:'ロビー',playing:'プレイ中',meeting:'会議中',finished:'終了'}[state.phase]||state.phase;ui.role.textContent=`役職：${p?.role==='impostor'?'侵入者':p?.role==='crew'?'クルー':'---'}`;ui.playerCount.textContent=`${state.players.length}/12`;ui.players.innerHTML=state.players.map(x=>`<div class="player-row ${x.alive?'':'dead'}"><span class="dot" style="color:#${(COLORS[x.color]||0).toString(16).padStart(6,'0')};background:currentColor"></span><span class="player-name">${escapeHtml(x.name)}${x.host?' ★':''}</span>${x.id!==myId?`<button class="call-member small" data-call-id="${escapeHtml(x.id)}" ${!x.alive?'disabled':''}>📞</button>`:''}</div>`).join('');const host=state.hostId===myId;ui.start.classList.toggle('hidden',!host||state.phase!=='lobby');ui.settings.classList.toggle('hidden',!host||state.phase!=='lobby');ui.actionBar.classList.toggle('hidden',state.phase!=='playing');ui.taskPanel.classList.toggle('hidden',state.phase!=='playing'||!p);ui.kill.classList.toggle('hidden',state.phase!=='playing'||p?.role!=='impostor');ui.kill.disabled=p?.role!=='impostor'||!p?.alive||!canKill()||!nearest.player;ui.kill.title=p?.role==='impostor'?'近くのクルーを攻撃（Q / Space）':'攻撃は侵入者だけが使えます';ui.sabotage.classList.toggle('hidden',p?.role!=='impostor'||!p?.alive);ui.joystick.classList.toggle('hidden',state.phase!=='playing');if(p){const done=p.tasksDone||0,total=p.taskTotal||0;ui.taskCounter.textContent=`${done}/${total}`;ui.taskProgress.style.width=`${total?done/total*100:0}%`;ui.tasks.innerHTML=p.role!=='impostor'&&!p.spectator?(p.tasks||[]).map(t=>`<div class="task-row ${(p.completedTasks||[]).includes(t)?'done':''}"><span>${TASKS[t]?.[0]||t}</span><b>${(p.completedTasks||[]).includes(t)?'✓':'○'}</b></div>`).join(''):'<p>偽タスクを装いましょう。</p>'}updateSabotage();}
function updateSabotage(){const s=state?.sabotage;if(ui.sabotageBanner)ui.sabotageBanner.classList.toggle('hidden',!s);if(!s)return;if(ui.sabotageTitle)ui.sabotageTitle.textContent={lights:'照明停止',reactor:'リアクター暴走',comms:'通信妨害',doors:'ドア封鎖'}[s.kind]||'妨害発生';if(ui.sabotageTimer)ui.sabotageTimer.textContent=`${Math.max(0,Math.ceil((s.endsAt-Date.now())/1000))}秒`}
let animationFrameId=0;
let miniMapEnabled=true;
let animationErrorShown=false;
function animate(){
  animationFrameId=requestAnimationFrame(animate);
  try{
    if(!clock)return;
    const dt=Math.min(clock.getDelta(),.05);
    if(state?.phase==='playing'&&localModel)moveLocal(dt);
    for(const m of models.values()){
      if(m!==localModel&&m?.position&&m?.userData?.target){
        const a=1-Math.exp(-12*dt);
        m.position.lerp(m.userData.target,a);
        m.rotation.y=dampAngle(m.rotation.y,Number(m.userData.rotation||0),16,dt);
      }
    }
    updateNearest();
    if(renderMode==='3d'&&renderer&&scene&&camera){
      updateLockerVisuals(dt);
      updateCamera(dt);
      // HUD側で問題が起きても、ゲーム画面だけは先に描画して見える状態を保つ。
      renderer.render(scene,camera);
    }else if(renderMode==='2d'){
      draw2DMap();
    }
    if(miniMapEnabled){
      try{drawMiniMap()}catch(error){
        miniMapEnabled=false;
        console.error('[Hidden Crew] Mini map disabled',error);
        if(ui.miniMap)ui.miniMap.style.display='none';
        showNotice('ミニマップを停止してゲームを続行します。');
      }
    }
    updateCooldown();
    updateSabotage();
    animationErrorShown=false;
  }catch(error){
    console.error('[Hidden Crew] Animation frame error',error);
    if(!animationErrorShown){
      animationErrorShown=true;
      showNotice(`描画エラーを回避しました: ${error?.message||error}`);
    }
  }
}
function collidesWithMap(x,z,r=.62){
  if(x-r<MAP_BOUNDS.minX||x+r>MAP_BOUNDS.maxX||z-r<MAP_BOUNDS.minZ||z+r>MAP_BOUNDS.maxZ)return true;
  for(const o of [...WALLS,...SOLID_PROPS])if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return true;
  if(Math.hypot(x,z-.5)<2.05+r)return true;
  return false;
}
function dampFactor(rate,dt){return 1-Math.exp(-rate*Math.max(0,dt))}
function dampAngle(current,target,rate,dt){
  const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
  return current+delta*dampFactor(rate,dt);
}
function moveLocal(dt){
  const p=me();
  if(!p||p.hidden)return;
  if(collidesWithMap(localModel.position.x,localModel.position.z)){
    localModel.position.set(p.x,0,p.z);
    localModel.userData.target.copy(localModel.position);
    localVelocity.set(0,0);
  }

  // 俯瞰表示と軽量表示では、キーを画面の方向へ直接対応させる。
  // ↑/W=画面上、↓/S=画面下、←/A=画面左、→/D=画面右。
  const screenForward=(isDown('KeyW','ArrowUp')?1:0)-(isDown('KeyS','ArrowDown')?1:0)-joy.y;
  const screenRight=(isDown('KeyD','ArrowRight')?1:0)-(isDown('KeyA','ArrowLeft')?1:0)+joy.x;
  let inputX=screenRight;
  let inputZ=-screenForward;

  // 一人称では、正面方向に対して時計回り90度を「右」とする。
  // yaw=0（正面が+Z）のとき、D/→で+X、A/←で-Xへ正確に移動する。
  if(renderMode==='3d'&&cameraMode===2){
    const forwardX=Math.sin(firstPersonYaw),forwardZ=Math.cos(firstPersonYaw);
    const rightX=forwardZ,rightZ=-forwardX;
    inputX=forwardX*screenForward+rightX*screenRight;
    inputZ=forwardZ*screenForward+rightZ*screenRight;
  }

  const inputLen=Math.hypot(inputX,inputZ);
  if(inputLen>1){inputX/=inputLen;inputZ/=inputLen}
  const sprint=isDown('ShiftLeft','ShiftRight')?1.18:1;
  const maxSpeed=(p.alive?4.6:6.0)*(state.settings?.speed||1)*sprint;
  const moving=inputLen>.04;
  const targetVX=moving?inputX*maxSpeed:0;
  const targetVZ=moving?inputZ*maxSpeed:0;

  // 指数補間にすることで、30/60/120fpsのどれでも同じ感触で滑らかに加減速する。
  const velocityBlend=dampFactor(moving?11.5:15.5,dt);
  localVelocity.x+=(targetVX-localVelocity.x)*velocityBlend;
  localVelocity.y+=(targetVZ-localVelocity.y)*velocityBlend;
  if(!moving&&localVelocity.lengthSq()<.0004)localVelocity.set(0,0);

  // 長いフレームでも小刻みに当たり判定し、壁際の引っ掛かりやガクつきを抑える。
  let remaining=Math.min(dt,.05);
  while(remaining>0){
    const step=Math.min(remaining,1/120);
    const nx=localModel.position.x+localVelocity.x*step;
    const nz=localModel.position.z+localVelocity.y*step;
    if(!collidesWithMap(nx,localModel.position.z))localModel.position.x=nx;else localVelocity.x=0;
    if(!collidesWithMap(localModel.position.x,nz))localModel.position.z=nz;else localVelocity.y=0;
    remaining-=step;
  }

  if(cameraMode===2){
    localModel.rotation.y=firstPersonYaw;
  }else if(localVelocity.lengthSq()>.02){
    const targetRotation=Math.atan2(localVelocity.x,localVelocity.y);
    localModel.rotation.y=dampAngle(localModel.rotation.y,targetRotation,18,dt);
  }
  localModel.userData.target.copy(localModel.position);
  localModel.userData.rotation=localModel.rotation.y;
  if(performance.now()-lastMove>30){
    lastMove=performance.now();
    send('move',{x:localModel.position.x,z:localModel.position.z,rotation:localModel.rotation.y,clientTime:Date.now()});
  }
}
function clearFirstPersonDirection(yaw){
  const pos=localModel?.position;if(!pos)return yaw;
  const candidates=[yaw,yaw+Math.PI/2,yaw-Math.PI/2,yaw+Math.PI];
  let best=yaw,bestClear=-1;
  for(const angle of candidates){
    let clear=0;
    for(let d=.8;d<=5;d+=.45){
      const x=pos.x+Math.sin(angle)*d,z=pos.z+Math.cos(angle)*d;
      if(collidesWithMap(x,z,.16))break;
      clear=d;
    }
    if(clear>bestClear){bestClear=clear;best=angle}
  }
  return best;
}
function cameraPointBlocked(x,y,z,r=.18){
  // プレイヤー用の2D当たり判定をカメラへ流用すると、壁を高さ無限として扱い、
  // カメラがキャラクターの背中まで押し込まれて視界を塞いでしまう。
  if(y-r<4.05&&(x-r<MAP_BOUNDS.minX||x+r>MAP_BOUNDS.maxX||z-r<MAP_BOUNDS.minZ||z+r>MAP_BOUNDS.maxZ))return true;
  if(y-r<3.2){for(const o of WALLS)if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return true}
  if(y-r<2.05){for(const o of SOLID_PROPS)if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return true}
  if(y-r<1.35&&Math.hypot(x,z-.5)<2.05+r)return true;
  return false;
}
function getThirdPersonCameraPose(pos,mode=cameraMode){
  const wide=mode===0;
  return {
    fov:wide?54:62,
    position:new THREE.Vector3(pos.x,pos.y+(wide?14.5:10.2),pos.z+(wide?9.5:6.4)),
    target:new THREE.Vector3(pos.x,pos.y+(wide?.75:1.0),pos.z-(wide?1.8:1.15))
  };
}
function snapCameraToCurrentMode(){
  if(!camera||!localModel||cameraMode===2)return;
  const pose=getThirdPersonCameraPose(localModel.position);
  camera.fov=pose.fov;camera.near=.06;camera.updateProjectionMatrix();
  camera.position.copy(pose.position);camera.lookAt(pose.target);
}
function updateCamera(dt=.016){
  if(!camera)return;
  if(!localModel){
    camera.fov=54;camera.near=.06;camera.updateProjectionMatrix();
    const idlePosition=new THREE.Vector3(0,15,10);
    if(!Number.isFinite(camera.position.x)||!Number.isFinite(camera.position.y)||!Number.isFinite(camera.position.z))camera.position.copy(idlePosition);
    else camera.position.lerp(idlePosition,1-Math.exp(-5*Math.max(.001,dt)));
    camera.lookAt(0,.8,0);
    return;
  }

  const pos=localModel.position;
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||!Number.isFinite(pos.z)){
    const p=me();pos.set(Number(p?.x)||0,0,Number(p?.z)||0);localVelocity.set(0,0);
  }

  if(cameraMode===2){
    localModel.visible=false;
    camera.fov=74;camera.near=.045;camera.updateProjectionMatrix();
    const eye=new THREE.Vector3(pos.x,pos.y+1.72,pos.z);
    const forward=new THREE.Vector3(Math.sin(firstPersonYaw),-.035,Math.cos(firstPersonYaw)).normalize();
    camera.position.copy(eye);camera.lookAt(eye.clone().addScaledVector(forward,12));
    return;
  }

  const p=me();localModel.visible=p?!p.reported&&!p.hidden:true;
  const pose=getThirdPersonCameraPose(pos);
  camera.fov=pose.fov;camera.near=.06;camera.updateProjectionMatrix();
  const invalidCamera=!Number.isFinite(camera.position.x)||!Number.isFinite(camera.position.y)||!Number.isFinite(camera.position.z);
  if(invalidCamera||camera.position.distanceToSquared(pose.position)>900)camera.position.copy(pose.position);
  else camera.position.lerp(pose.position,1-Math.exp(-(cameraMode===0?7:10)*Math.max(.001,dt)));
  camera.lookAt(pose.target);
}

function updateNearest(){
  nearest={task:null,player:null,body:null,locker:null,security:false,emergency:false};
  if(!localModel||!state)return;
  const p=me();
  let best=99;
  for(const[id,[,x,z]]of Object.entries(TASKS)){const d=Math.hypot(localModel.position.x-x,localModel.position.z-z);if(d<2&&d<best){best=d;nearest.task=id}}
  best=99;
  for(const other of state.players){if(other.id===myId)continue;const d=Math.hypot(localModel.position.x-other.x,localModel.position.z-other.z);if(!other.alive&&!other.reported&&d<2.8&&d<best){best=d;nearest.body=other.id}else if(other.alive&&!other.hidden&&d<2.15&&d<best){best=d;nearest.player=other.id}}
  if(p?.hidden&&p.hiddenAt){nearest.locker=LOCKERS.find(l=>l.id===p.hiddenAt)||null}else if(!p?.hidden){nearest.locker=LOCKERS.map(l=>({...l,d:Math.hypot(localModel.position.x-l.exitX,localModel.position.z-l.exitZ)})).filter(l=>l.d<=2.0).sort((a,b)=>a.d-b.d)[0]||null}
  nearest.security=Math.hypot(localModel.position.x-SECURITY_CONSOLE.x,localModel.position.z-SECURITY_CONSOLE.z)<=2.2;
  nearest.emergency=Math.hypot(localModel.position.x-EMERGENCY_BUTTON.x,localModel.position.z-EMERGENCY_BUTTON.z)<=2.8;
  ui.use.disabled=!nearest.task;
  ui.report.disabled=!nearest.body;
  ui.kill.disabled=!nearest.player||!canKill();
  const hide=$('hideButton'),security=$('securityButton');
  if(hide){hide.disabled=!p?.alive||p?.spectator||(!p?.hidden&&!nearest.locker);hide.textContent=p?.hidden?'ロッカーから出る':'ロッカーに隠れる';hide.classList.toggle('interaction-ready',!!nearest.locker)}
  if(security){security.disabled=!nearest.security||!!p?.hidden;security.classList.toggle('interaction-ready',nearest.security)}
  if(ui.meeting){ui.meeting.disabled=!nearest.emergency||!!p?.hidden;ui.meeting.classList.toggle('interaction-ready',nearest.emergency)}
  const hint=$('interactionHint');if(hint){let text='';if(p?.hidden)text='ロッカー内：ボタンを押すと外へ出ます';else if(nearest.locker)text='ロッカーに近づきました：隠れることができます';else if(nearest.security)text='監視端末に近づきました：カメラを確認できます';else if(nearest.emergency)text='緊急ボタンに近づきました：会議を開けます';else if(nearest.task)text='端末に近づきました：使用できます';hint.textContent=text;hint.classList.toggle('show',!!text)}
}
function updateLockerVisuals(dt){const p=me();for(const locker of LOCKERS){const visual=lockerVisuals.get(locker.id);if(!visual)continue;const occupied=(state?.players||[]).some(x=>x.hidden&&x.hiddenAt===locker.id);const nearby=nearest.locker?.id===locker.id;const target=occupied?1:(nearby?.22:0);visual.userData.open+=(target-visual.userData.open)*(1-Math.exp(-10*dt));visual.userData.doorPivot.rotation.y=-visual.userData.open*1.45;visual.userData.lamp.material.color.setHex(occupied?0xffb347:nearby?0x77ff9c:0x63f4ff)}}
function useAction(){const p=me();if(!p)return;if(nearest.body&&(p.role==='doctor'||p.role==='detective')){abilityAction();return}if(!nearest.task)return;if(state.sabotage&&(['reactor','lights','comms'].includes(state.sabotage.kind))){send('fixSabotage',{station:nearest.task});return}if(p.role!=='impostor'&&!p.spectator&&(p.tasks||[]).includes(nearest.task)&&!(p.completedTasks||[]).includes(nearest.task))openTask(nearest.task);else showNotice('この端末に用事はありません')}
function reportAction(){if(nearest.body)send('report',{bodyId:nearest.body});else showNotice('近くに通報できる対象がありません')}function attackAction(){const p=me();if(!p||state?.phase!=='playing')return;if(p.role!=='impostor'){showNotice('攻撃は侵入者だけが使えます');return}if(!canKill()){showNotice('攻撃のクールダウン中です');return}if(!nearest.player){showNotice('攻撃できる相手に近づいてください');return}send('kill',{targetId:nearest.player})}function meetingAction(){if(!nearest.emergency){showNotice('中央の緊急ボタンに近づいてください');return}send('meeting')}
ui.use.onclick=useAction;ui.report.onclick=reportAction;ui.kill.onclick=attackAction;ui.meeting.onclick=meetingAction;ui.sabotage.onclick=()=>openDialog('sabotageDialog');ui.start.onclick=()=>{if(socket?.readyState!==WebSocket.OPEN){showNotice('サーバーへ接続できていません。再読み込みしてください。');return}if(state?.hostId!==myId){showNotice('ゲームを開始できるのはホストだけです。');return}ui.start.disabled=true;ui.start.textContent='開始中…';send('start');setTimeout(()=>{if(state?.phase==='lobby'){ui.start.disabled=false;ui.start.textContent='ゲーム開始'}},5000)};$('copyRoomButton').onclick=()=>navigator.clipboard.writeText(state?.room||'').then(()=>showNotice('ルームコードをコピーしました'));$('cameraButton').onclick=()=>{if(renderMode!=='3d'||!camera){showNotice('軽量マップでは見下ろし視点で固定されます。');return}cameraMode=(cameraMode+1)%3;if(cameraMode===2&&localModel){const currentYaw=Number(localModel.rotation.y);firstPersonYaw=clearFirstPersonDirection(Number.isFinite(currentYaw)?currentYaw:Math.PI);camera.position.set(localModel.position.x,localModel.position.y+1.72,localModel.position.z)}else{const p=me();if(localModel)localModel.visible=p?!p.reported&&!p.hidden:true;snapCameraToCurrentMode()}const labels=['見下ろし視点','近い視点','一人称視点'];showNotice(labels[cameraMode]);$('cameraButton').textContent=`${labels[(cameraMode+1)%3]}へ切替`};
ui.settings.onclick=()=>{const s=state.settings||{};$('settingImpostors').value=s.impostors;$('settingTasks').value=s.tasks;$('settingSpeed').value=s.speed;$('settingKillCooldown').value=s.killCooldown;$('settingMeeting').value=s.meetingTime;$('settingReveal').value=s.revealRoles?'yes':'no';openDialog('settingsDialog')};$('saveSettingsButton').onclick=()=>{send('settings',{settings:{impostors:+$('settingImpostors').value,tasks:+$('settingTasks').value,speed:+$('settingSpeed').value,killCooldown:+$('settingKillCooldown').value,meetingTime:+$('settingMeeting').value,revealRoles:$('settingReveal').value==='yes'}});closeDialog('settingsDialog')};document.querySelectorAll('[data-sabotage]').forEach(b=>b.onclick=()=>{send('sabotage',{kind:b.dataset.sabotage});closeDialog('sabotageDialog')});document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));

const ROLE_LABELS={crew:'クルー',impostor:'侵入者',doctor:'医者',detective:'探偵',guard:'警備員',spectator:'観戦者'};
function abilityAction(){const p=me();if(!p||p.abilityUsed){showNotice('能力は使用済みです');return}if(p.role==='doctor'&&nearest.body)send('revive',{targetId:nearest.body});else if(p.role==='detective'&&nearest.body)send('inspect',{targetId:nearest.body});else if(p.role==='guard'&&nearest.player)send('protect',{targetId:nearest.player});else showNotice('能力を使える対象に近づいてください')}
function updateAdvancedUI(){const p=me(),b=$('abilityButton');if(!p||!b)return;const labels={doctor:'救助',detective:'調査',guard:'守る'};b.classList.toggle('hidden',!labels[p.role]||state.phase!=='playing');b.textContent=p.abilityUsed?`${labels[p.role]||'能力'}（使用済み）`:labels[p.role]||'能力';b.disabled=!!p.abilityUsed;b.classList.toggle('ability-ready',!p.abilityUsed&&!!labels[p.role]);ui.role.textContent=`役職：${ROLE_LABELS[p.role]||p.role}${p.spectator?'（途中参加）':''}`;$('hideButton').disabled=!p.alive||p.spectator||(!p.hidden&&!nearest.locker);$('profileSummary').textContent=profileText()}
function profileText(){const s=JSON.parse(localStorage.getItem('hiddenCrewStats')||'{"games":0,"wins":0,"tasks":0}');const title=s.wins>=10?'宇宙の英雄':s.wins>=3?'熟練クルー':s.games>=1?'新人隊員':'初参加';return `称号：${title}　対戦 ${s.games}　勝利 ${s.wins}　今日の目標：タスクを3回完了`}
function saveResult(w){const s=JSON.parse(localStorage.getItem('hiddenCrewStats')||'{"games":0,"wins":0,"tasks":0}');s.games++;const p=me();if((w==='impostor'&&p?.role==='impostor')||(w==='crew'&&p?.role!=='impostor'))s.wins++;localStorage.setItem('hiddenCrewStats',JSON.stringify(s));$('profileSummary').textContent=profileText()}
function openSecurity(){if(!state)return;const rooms=[['北西区',-18,0,4.8,13],['北東区',0,18,4.8,13],['南西区',-18,0,-13,4.8],['南東区',0,18,-13,4.8]];const root=$('securityGrid');root.innerHTML='';for(const [name,minX,maxX,minZ,maxZ] of rooms){const visible=state.players.filter(p=>p.x>=minX&&p.x<maxX&&p.z>=minZ&&p.z<maxZ&&!p.hidden);const d=document.createElement('div');d.className='security-card';d.innerHTML=`<b>${name}</b>${visible.length?visible.map(p=>escapeHtml(p.name)).join('<br>'):'異常なし'}`;root.append(d)}openDialog('securityDialog')}
$('abilityButton').onclick=abilityAction;$('hideButton').onclick=()=>{const p=me();if(p?.hidden)send('hide',{lockerId:p.hiddenAt});else if(nearest.locker)send('hide',{lockerId:nearest.locker.id});else showNotice('ロッカーの近くまで移動してください')};$('securityButton').onclick=()=>{if(!nearest.security){showNotice('SECURITYの監視端末に近づいてください');return}openSecurity()};$('tutorialButton').onclick=()=>openDialog('tutorialDialog');$('colorSelect').onchange=$('hatSelect').onchange=()=>{if(state?.phase==='lobby')send('customize',{color:$('colorSelect').value,hat:$('hatSelect').value})};
function openTask(id){$('taskTitle').textContent=TASKS[id][0];const root=$('taskGame');root.innerHTML='';if(id==='wires'){root.innerHTML='<p>1→4の順に押してください</p>';let n=1;[1,2,3,4].sort(()=>Math.random()-.5).forEach(v=>{const b=document.createElement('button');b.textContent=v;b.onclick=()=>{if(v===n){b.disabled=true;n++;if(n===5)finishTask(id)}else showNotice('順番が違います')};root.append(b)})}else if(id==='scanner'){root.innerHTML='<p>スキャン完了までボタンを押し続けてください。</p><button id="scanHold">長押し</button><div class="progress"><i id="scanBar"></i></div>';let v=0,t;const b=$('scanHold');const start=()=>{t=setInterval(()=>{v+=4;$('scanBar').style.width=v+'%';if(v>=100){clearInterval(t);finishTask(id)}},60)};const stop=()=>clearInterval(t);b.onpointerdown=start;b.onpointerup=stop;b.onpointerleave=stop}else if(id==='cargo'){root.innerHTML='<p>貨物を5回整理してください。</p><button id="cargoBtn">貨物を移動</button><b id="cargoCount">0/5</b>';let n=0;$('cargoBtn').onclick=()=>{$('cargoCount').textContent=`${++n}/5`;if(n>=5)finishTask(id)}}else if(id==='fuel'){root.innerHTML='<p>燃料メーターを満タンにしてください。</p><input id="fuelRange" type="range" min="0" max="100" value="0">';$('fuelRange').oninput=e=>{if(+e.target.value>=100)finishTask(id)}}else if(id==='align'){root.innerHTML='<p>航路を中央へ合わせてください。</p><input id="alignRange" type="range" min="0" max="100" value="10">';$('alignRange').onchange=e=>{if(Math.abs(+e.target.value-50)<7)finishTask(id);else showNotice('中央に合わせてください')}}else{root.innerHTML='<p>リアクターの波形を安定させてください。</p><button id="reactBtn">安定化</button>';$('reactBtn').onclick=()=>finishTask(id)}openDialog('taskDialog')}
function finishTask(id){const s=JSON.parse(localStorage.getItem('hiddenCrewStats')||'{"games":0,"wins":0,"tasks":0}');s.tasks=(s.tasks||0)+1;localStorage.setItem('hiddenCrewStats',JSON.stringify(s));send('taskComplete',{task:id});closeDialog('taskDialog');showNotice('タスク完了！')}
function openMeeting(reason){$('meetingReason').textContent=reason;renderVotes();openDialog('meetingDialog');setVoiceStatus('メンバー一覧の📞から個別通話できます。')}
function renderVotes(){if(!state)return;const root=$('voteList');root.innerHTML='';state.players.filter(p=>p.alive).forEach(p=>{const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>{send('vote',{targetId:p.id});disableVotes()};root.append(b)});$('skipVoteButton').onclick=()=>{send('vote',{targetId:'skip'});disableVotes()}}
function disableVotes(){document.querySelectorAll('#voteList button,#skipVoteButton').forEach(b=>b.disabled=true)}
function bindChatForm(formId,inputId){const form=$(formId),input=$(inputId);if(!form||!input)return;form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text)return;if(socket?.readyState!==WebSocket.OPEN){showNotice('チャットサーバーへ接続されていません');return}send('chat',{text});input.value='';input.focus()}}
bindChatForm('globalChatForm','globalChatInput');bindChatForm('meetingChatForm','meetingChatInput');
function appendChat(m){const phase={lobby:'ロビー',playing:'ゲーム',meeting:'会議',finished:'終了'}[m.phase]||'';for(const id of ['globalChatLog','meetingChatLog']){const log=$(id);if(!log)continue;const d=document.createElement('div');d.className='chat-line';const ghost=m.alive===false?'👻 ':'';d.innerHTML=`<span class="chat-name">${ghost}${escapeHtml(m.from)}</span><span class="chat-phase">${escapeHtml(phase)}</span><br>${escapeHtml(m.text)}`;log.append(d);log.scrollTop=log.scrollHeight}}
const chatPanel=$('globalChatPanel'),chatToggle=$('chatToggleButton');if(chatPanel&&chatToggle)chatToggle.onclick=()=>{const collapsed=chatPanel.classList.toggle('collapsed');chatToggle.textContent=collapsed?'開く':'最小化'};

const RTC_CONFIG={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']},{urls:'stun:global.stun.twilio.com:3478'}],iceCandidatePoolSize:8};
const pendingIce=new Map(),voiceSignalQueues=new Map(),remoteAudioNodes=new Map();
const RELAY_SAMPLE_RATE=16000;
let audioUnlocked=false,voiceAudioContext=null,voiceFallbackTimerId=0,voiceRelayActive=false,voiceRelayPeer=null,voiceRelaySource=null,voiceRelayProcessor=null,voiceRelaySilentGain=null,voiceRelayPlaybackAt=0,voiceRelaySequence=0,currentVoiceStatus='メンバー一覧の📞から個別通話できます。';
function setVoiceStatus(text,active=false){
  currentVoiceStatus=text||'';const el=$('voiceStatus');if(el){el.textContent=currentVoiceStatus;el.classList.toggle('active',active)}
  const help=$('callHelp');if(help)help.textContent=activeCallPeer?currentVoiceStatus:'📞を押して個別通話';
}
function clearCallTimeout(){if(callTimeoutId){clearTimeout(callTimeoutId);callTimeoutId=0}}
function armCallTimeout(peerId,ms,message){clearCallTimeout();callTimeoutId=setTimeout(()=>{if(activeCallPeer!==peerId)return;send('callControl',{targetId:peerId,action:'hangup'});showNotice(message);hangUpCall(false)},ms)}
function clearVoiceFallbackTimer(){if(voiceFallbackTimerId){clearTimeout(voiceFallbackTimerId);voiceFallbackTimerId=0}}
function peerIsConnected(peerId){const pc=voicePeers.get(peerId);return !!pc&&(['connected','completed'].includes(pc.connectionState)||['connected','completed'].includes(pc.iceConnectionState))}
function armVoiceFallback(peerId,ms=5000){clearVoiceFallbackTimer();voiceFallbackTimerId=setTimeout(()=>{if(activeCallPeer===peerId&&!peerIsConnected(peerId))startVoiceRelay(peerId,true)},ms)}
function clearIncomingCall(notify=false){if(incomingCallTimeoutId){clearTimeout(incomingCallTimeoutId);incomingCallTimeoutId=0}if(notify&&incomingCallPeer)send('callControl',{targetId:incomingCallPeer,action:'decline'});incomingCallPeer=null;closeDialog('incomingCallDialog');updateCallUi()}
function currentCallName(){return state?.players?.find(p=>p.id===activeCallPeer)?.name||'相手'}
function updateCallUi(){
  const hangup=$('hangupCallButton'),help=$('callHelp');
  if(hangup){hangup.disabled=!activeCallPeer;hangup.classList.toggle('hidden',!activeCallPeer)}
  if(help)help.textContent=activeCallPeer?(currentVoiceStatus||`📞 ${currentCallName()}と通話中`):'📞を押して個別通話';
  updateMicButton();
}
function getVoiceAudioContext(){
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return null;
  if(!voiceAudioContext||voiceAudioContext.state==='closed'){try{voiceAudioContext=new AudioContextClass({latencyHint:'interactive'})}catch{voiceAudioContext=new AudioContextClass()}}
  return voiceAudioContext;
}
async function unlockRemoteAudio(){
  audioUnlocked=true;const context=getVoiceAudioContext();
  try{if(context?.state==='suspended')await context.resume()}catch{}
  for(const audio of document.querySelectorAll('#remoteAudio audio')){const peerId=audio.id.startsWith('voice-')?audio.id.slice(6):'';if(remoteAudioNodes.has(peerId)){audio.muted=true;continue}audio.muted=false;audio.volume=1;try{await audio.play()}catch{}}
  if(activeCallPeer&&context?.state==='running'&&(voiceRelayActive||peerIsConnected(activeCallPeer)))setVoiceStatus(voiceRelayActive?'音声中継モードで接続しました。':'音声通話に接続しました。',true);
}
document.addEventListener('pointerdown',unlockRemoteAudio,{passive:true});
document.addEventListener('keydown',unlockRemoteAudio,{passive:true});
async function startVoiceChat(){
  if(!activeCallPeer){setVoiceStatus('先にメンバー一覧の📞から通話相手を選んでください。');showNotice('通話相手が選ばれていません。');updateCallUi();return false}
  if(localVoiceStream)return true;if(voiceStarting)return false;if(!navigator.mediaDevices?.getUserMedia){setVoiceStatus('音声通話にはHTTPSで開ける対応ブラウザが必要です。');showNotice('この環境ではマイクを使用できません。');return false}
  voiceStarting=true;setVoiceStatus('マイクの許可を待っています…');
  try{
    localVoiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
    micMuted=false;updateCallUi();syncVoicePeers();await unlockRemoteAudio();return true;
  }catch(error){
    console.error('Microphone permission error',error);setVoiceStatus('マイクを使用できません。ブラウザのサイト設定で許可してください。');showNotice('マイクの使用が許可されませんでした。');return false;
  }finally{voiceStarting=false}
}
function syncVoicePeers(){if(!localVoiceStream||!activeCallPeer)return;for(const id of [...voicePeers.keys()])if(id!==activeCallPeer)closeVoicePeer(id)}
function addLocalTracks(pc){
  if(!localVoiceStream)return;const added=new Set(pc.getSenders().map(sender=>sender.track?.id).filter(Boolean));
  for(const track of localVoiceStream.getAudioTracks())if(!added.has(track.id))pc.addTrack(track,localVoiceStream);
}
async function sendVoiceOffer(peerId,pc,iceRestart=false){
  if(!pc||pc.signalingState==='closed'||activeCallPeer!==peerId)return;
  try{
    if(pc.signalingState!=='stable')return;
    await pc.setLocalDescription(await pc.createOffer({offerToReceiveAudio:true,iceRestart}));
    send('voiceSignal',{targetId:peerId,signal:{description:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}}});
  }catch(error){console.error('Voice offer failed',error);armVoiceFallback(peerId,1200)}
}
function ensureVoicePeer(peerId,makeOffer=false){
  if(typeof RTCPeerConnection!=='function'){queueMicrotask(()=>startVoiceRelay(peerId,true));return null}
  let pc=voicePeers.get(peerId);
  if(pc?.signalingState==='closed'){voicePeers.delete(peerId);pc=null}
  if(pc){addLocalTracks(pc);if(makeOffer)sendVoiceOffer(peerId,pc,false);return pc}
  pc=new RTCPeerConnection(RTC_CONFIG);pc.__hiddenCrewOfferer=!!makeOffer;pc.__hiddenCrewRestarted=false;voicePeers.set(peerId,pc);addLocalTracks(pc);
  pc.onicecandidate=event=>{if(event.candidate)send('voiceSignal',{targetId:peerId,signal:{candidate:event.candidate.toJSON?.()||event.candidate}})};
  pc.ontrack=event=>{const stream=event.streams?.[0]||new MediaStream([event.track]);attachRemoteAudio(peerId,stream)};
  const updateConnection=()=>{
    const connected=peerIsConnected(peerId);
    if(connected){clearCallTimeout();clearVoiceFallbackTimer();stopVoiceRelay(false);setVoiceStatus('音声通話に接続しました。',true);updateCallUi();return}
    const failed=pc.connectionState==='failed'||pc.iceConnectionState==='failed';
    const disconnected=pc.connectionState==='disconnected'||pc.iceConnectionState==='disconnected';
    if(failed||disconnected){
      if(pc.__hiddenCrewOfferer&&!pc.__hiddenCrewRestarted&&pc.signalingState==='stable'){pc.__hiddenCrewRestarted=true;sendVoiceOffer(peerId,pc,true);armVoiceFallback(peerId,2500)}
      else armVoiceFallback(peerId,failed?500:2500);
    }
  };
  pc.onconnectionstatechange=updateConnection;pc.oniceconnectionstatechange=updateConnection;
  if(makeOffer)queueMicrotask(()=>sendVoiceOffer(peerId,pc,false));
  return pc;
}
async function processVoiceSignal(m){
  if(!m.fromId||!m.signal||activeCallPeer!==m.fromId)return;
  if(!localVoiceStream){const started=await startVoiceChat();if(!started)return}
  const pc=ensureVoicePeer(m.fromId,false);
  try{
    if(m.signal.description){
      const description=m.signal.description;
      if(description.type==='offer'&&pc.signalingState!=='stable'){try{await pc.setLocalDescription({type:'rollback'})}catch{}}
      await pc.setRemoteDescription(description);
      const queued=pendingIce.get(m.fromId)||[];pendingIce.delete(m.fromId);
      for(const candidate of queued){try{await pc.addIceCandidate(candidate)}catch(error){console.warn('Queued ICE candidate rejected',error)}}
      if(description.type==='offer'){
        addLocalTracks(pc);await pc.setLocalDescription(await pc.createAnswer());
        send('voiceSignal',{targetId:m.fromId,signal:{description:{type:pc.localDescription.type,sdp:pc.localDescription.sdp}}});
      }
    }else if(m.signal.candidate){
      if(pc.remoteDescription)await pc.addIceCandidate(m.signal.candidate);
      else{const list=pendingIce.get(m.fromId)||[];list.push(m.signal.candidate);pendingIce.set(m.fromId,list)}
    }
  }catch(error){console.error('Voice signaling failed',error);setVoiceStatus('直接接続を再試行しています…');armVoiceFallback(m.fromId,800)}
}
function handleVoiceSignal(m){
  const peerId=m.fromId;if(!peerId)return;
  const previous=voiceSignalQueues.get(peerId)||Promise.resolve();
  const next=previous.catch(()=>{}).then(()=>processVoiceSignal(m)).finally(()=>{if(voiceSignalQueues.get(peerId)===next)voiceSignalQueues.delete(peerId)});
  voiceSignalQueues.set(peerId,next);
}
function attachRemoteAudio(peerId,stream){
  let audio=document.getElementById(`voice-${peerId}`);if(!audio){audio=document.createElement('audio');audio.id=`voice-${peerId}`;audio.autoplay=true;audio.playsInline=true;audio.controls=false;audio.volume=1;$('remoteAudio').append(audio)}
  audio.srcObject=stream;const old=remoteAudioNodes.get(peerId);if(old){try{old.source.disconnect();old.gain.disconnect()}catch{}remoteAudioNodes.delete(peerId)}
  const context=getVoiceAudioContext();
  if(context){
    try{const source=context.createMediaStreamSource(stream),gain=context.createGain();gain.gain.value=1;source.connect(gain).connect(context.destination);remoteAudioNodes.set(peerId,{source,gain});audio.muted=true;if(context.state==='running')setVoiceStatus('音声通話に接続しました。',true);else setVoiceStatus('音声を再生するため画面をクリックしてください。')}catch(error){console.warn('Web Audio playback failed',error);audio.muted=false;audio.play().catch(()=>setVoiceStatus('音声を再生するため画面をクリックしてください。'))}
  }else{audio.muted=false;audio.play().then(()=>setVoiceStatus('音声通話に接続しました。',true)).catch(()=>setVoiceStatus('音声を再生するため画面をクリックしてください。'))}
}
function closeVoicePeer(peerId){
  const pc=voicePeers.get(peerId);if(pc){pc.ontrack=null;pc.onicecandidate=null;pc.onconnectionstatechange=null;pc.oniceconnectionstatechange=null;pc.close();voicePeers.delete(peerId)}
  pendingIce.delete(peerId);voiceSignalQueues.delete(peerId);const nodes=remoteAudioNodes.get(peerId);if(nodes){try{nodes.source.disconnect();nodes.gain.disconnect()}catch{}remoteAudioNodes.delete(peerId)}document.getElementById(`voice-${peerId}`)?.remove();
}
function downsampleVoice(input,inputRate,targetRate=RELAY_SAMPLE_RATE){
  if(!input?.length)return new Int16Array(0);const ratio=Math.max(1,inputRate/targetRate),length=Math.max(1,Math.floor(input.length/ratio)),output=new Int16Array(length);
  for(let i=0;i<length;i++){const start=Math.floor(i*ratio),end=Math.max(start+1,Math.min(input.length,Math.floor((i+1)*ratio)));let sum=0;for(let j=start;j<end;j++)sum+=input[j];const sample=Math.max(-1,Math.min(1,sum/(end-start)));output[i]=sample<0?sample*32768:sample*32767}
  return output;
}
function pcmToBase64(samples){const bytes=new Uint8Array(samples.buffer,samples.byteOffset,samples.byteLength);let binary='';for(let i=0;i<bytes.length;i+=4096)binary+=String.fromCharCode(...bytes.subarray(i,i+4096));return btoa(binary)}
function base64ToPcm(data){const binary=atob(data);if(!binary.length||binary.length%2)return new Int16Array(0);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new Int16Array(bytes.buffer)}
async function startVoiceRelay(peerId,notifyPeer=true){
  if(!peerId||activeCallPeer!==peerId||!localVoiceStream||peerIsConnected(peerId))return false;
  const context=getVoiceAudioContext();if(!context){setVoiceStatus('このブラウザでは音声中継を使用できません。');return false}
  try{if(context.state==='suspended')await context.resume()}catch{}
  clearCallTimeout();clearVoiceFallbackTimer();voiceRelayActive=true;voiceRelayPeer=peerId;voiceRelayPlaybackAt=0;
  if(!voiceRelayProcessor){
    try{
      voiceRelaySource=context.createMediaStreamSource(localVoiceStream);voiceRelayProcessor=context.createScriptProcessor(4096,1,1);voiceRelaySilentGain=context.createGain();voiceRelaySilentGain.gain.value=0;
      voiceRelaySource.connect(voiceRelayProcessor);voiceRelayProcessor.connect(voiceRelaySilentGain).connect(context.destination);
      voiceRelayProcessor.onaudioprocess=event=>{
        if(!voiceRelayActive||!activeCallPeer||micMuted||socket?.readyState!==WebSocket.OPEN)return;
        const track=localVoiceStream?.getAudioTracks()?.[0];if(!track?.enabled)return;
        const pcm=downsampleVoice(event.inputBuffer.getChannelData(0),event.inputBuffer.sampleRate||context.sampleRate);if(!pcm.length)return;
        send('voiceAudio',{targetId:activeCallPeer,rate:RELAY_SAMPLE_RATE,seq:++voiceRelaySequence,data:pcmToBase64(pcm)});
      };
    }catch(error){console.error('Voice relay capture failed',error);voiceRelayActive=false;setVoiceStatus('音声中継を開始できませんでした。');return false}
  }
  if(notifyPeer)send('callControl',{targetId:peerId,action:'relay'});
  setVoiceStatus(context.state==='running'?'音声中継モードで接続しました。':'画面をクリックすると音声中継を開始します。',context.state==='running');updateCallUi();return true;
}
function stopVoiceRelay(resetStatus=true){
  voiceRelayActive=false;voiceRelayPeer=null;voiceRelayPlaybackAt=0;
  if(voiceRelayProcessor){voiceRelayProcessor.onaudioprocess=null;try{voiceRelayProcessor.disconnect()}catch{}voiceRelayProcessor=null}
  if(voiceRelaySource){try{voiceRelaySource.disconnect()}catch{}voiceRelaySource=null}
  if(voiceRelaySilentGain){try{voiceRelaySilentGain.disconnect()}catch{}voiceRelaySilentGain=null}
  if(resetStatus&&activeCallPeer)setVoiceStatus('音声通話に接続中…',true);
}
async function handleVoiceAudio(m){
  if(!m.fromId||activeCallPeer!==m.fromId||peerIsConnected(m.fromId)||typeof m.data!=='string'||m.data.length>16000)return;
  if(!localVoiceStream){const started=await startVoiceChat();if(!started)return}
  if(!voiceRelayActive||voiceRelayPeer!==m.fromId)await startVoiceRelay(m.fromId,false);
  const context=getVoiceAudioContext();if(!context)return;
  try{
    const pcm=base64ToPcm(m.data);if(!pcm.length)return;const rate=Math.max(8000,Math.min(24000,Number(m.rate)||RELAY_SAMPLE_RATE));const buffer=context.createBuffer(1,pcm.length,rate),channel=buffer.getChannelData(0);
    for(let i=0;i<pcm.length;i++)channel[i]=pcm[i]/32768;
    const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);const now=context.currentTime;
    if(!voiceRelayPlaybackAt||voiceRelayPlaybackAt<now-.08||voiceRelayPlaybackAt>now+.65)voiceRelayPlaybackAt=now+.07;
    source.start(voiceRelayPlaybackAt);voiceRelayPlaybackAt+=buffer.duration;clearCallTimeout();clearVoiceFallbackTimer();setVoiceStatus(context.state==='running'?'音声中継モードで接続しました。':'音声を再生するため画面をクリックしてください。',context.state==='running');
  }catch(error){console.warn('Voice relay playback failed',error)}
}
function stopVoiceChat(){
  clearVoiceFallbackTimer();stopVoiceRelay(false);for(const id of [...voicePeers.keys()])closeVoicePeer(id);for(const track of localVoiceStream?.getTracks()||[])track.stop();localVoiceStream=null;voiceStarting=false;micMuted=false;setVoiceStatus('メンバー一覧の📞から個別通話できます。');updateCallUi();
}
function updateMicButton(){const button=$('micButton');if(!button)return;if(!activeCallPeer){button.textContent='🎙 通話相手なし';button.disabled=true;button.classList.remove('muted');return}button.disabled=false;if(!localVoiceStream){button.textContent='🎙 マイク開始';button.classList.remove('muted');return}button.textContent=micMuted?'🔇 マイクOFF':'🎙 マイクON';button.classList.toggle('muted',micMuted)}
$('micButton').onclick=async()=>{await unlockRemoteAudio();if(!activeCallPeer){showNotice('先にメンバー一覧の📞から通話相手を選んでください。');updateCallUi();return}if(!localVoiceStream){await startVoiceChat();return}micMuted=!micMuted;for(const track of localVoiceStream.getAudioTracks())track.enabled=!micMuted;updateCallUi();setVoiceStatus(micMuted?'マイクをミュートしています。':voiceRelayActive?'音声中継モードで接続しました。':'音声通話に接続しました。',!micMuted)};
async function placeCall(peerId){
  if(!peerId||peerId===myId)return;if(activeCallPeer){showNotice('先に現在の通話を終了してください。');return}
  const target=state?.players?.find(player=>player.id===peerId);if(!target?.connected){showNotice('相手は現在接続していません。');return}
  activeCallPeer=peerId;currentVoiceStatus=`${target?.name||'相手'}への通話を準備しています…`;updateCallUi();await unlockRemoteAudio();
  const started=await startVoiceChat();if(!started||!localVoiceStream){activeCallPeer=null;updateCallUi();return}
  setVoiceStatus(`${target?.name||'相手'}を呼び出しています…`,true);send('callControl',{targetId:peerId,action:'ring'});armCallTimeout(peerId,20000,'応答がないため呼び出しを終了しました。');
}
async function acceptIncomingCall(){
  if(!incomingCallPeer)return;const peer=incomingCallPeer;if(incomingCallTimeoutId){clearTimeout(incomingCallTimeoutId);incomingCallTimeoutId=0}activeCallPeer=peer;incomingCallPeer=null;closeDialog('incomingCallDialog');currentVoiceStatus='通話を準備しています…';updateCallUi();await unlockRemoteAudio();
  const started=await startVoiceChat();if(!started||!localVoiceStream){hangUpCall(false);return}send('callControl',{targetId:activeCallPeer,action:'accept'});ensureVoicePeer(activeCallPeer,false);armVoiceFallback(activeCallPeer);setVoiceStatus('音声通話に接続中…',true);
}
function declineIncomingCall(){clearIncomingCall(true)}
async function handleCallControl(m){
  const from=m.fromId,action=m.action;if(!from)return;
  if(action==='ring'){
    if(activeCallPeer||incomingCallPeer){send('callControl',{targetId:from,action:'busy'});return}
    incomingCallPeer=from;const caller=state?.players?.find(player=>player.id===from);$('incomingCallerName').textContent=`${caller?.name||'メンバー'}から着信です`;openDialog('incomingCallDialog');updateCallUi();
    if(incomingCallTimeoutId)clearTimeout(incomingCallTimeoutId);incomingCallTimeoutId=setTimeout(()=>{if(incomingCallPeer===from)clearIncomingCall(true)},20000);
  }else if(action==='accept'&&activeCallPeer===from){
    clearCallTimeout();const started=await startVoiceChat();if(started&&localVoiceStream){ensureVoicePeer(from,true);armVoiceFallback(from);setVoiceStatus('音声通話に接続中…',true);updateCallUi()}
  }else if(action==='relay'&&activeCallPeer===from){await startVoiceRelay(from,false)}
  else if(['decline','busy','unavailable'].includes(action)&&activeCallPeer===from){showNotice(action==='busy'?'相手は通話中です。':action==='unavailable'?'相手に接続できませんでした。':'通話が拒否されました。');hangUpCall(false)}
  else if(action==='hangup'&&incomingCallPeer===from){showNotice('着信がキャンセルされました。');clearIncomingCall(false)}
  else if(action==='hangup'&&activeCallPeer===from){showNotice('通話が終了しました。');hangUpCall(false)}
}
function hangUpCall(notify=true){const peer=activeCallPeer;clearCallTimeout();clearVoiceFallbackTimer();if(notify&&peer)send('callControl',{targetId:peer,action:'hangup'});activeCallPeer=null;stopVoiceChat();setVoiceStatus('メンバー一覧の📞から個別通話できます。');updateCallUi()}
ui.players.addEventListener('click',event=>{const button=event.target.closest('.call-member');if(button)placeCall(button.dataset.callId)});
$('acceptCallButton').onclick=acceptIncomingCall;$('declineCallButton').onclick=declineIncomingCall;$('hangupCallButton').onclick=()=>hangUpCall(true);
updateCallUi();
addEventListener('beforeunload',()=>{hangUpCall(false);clearIncomingCall(false)});

function openResult(w){$('resultTitle').textContent=w==='crew'?'CREW VICTORY':'INTRUDER VICTORY';$('resultText').textContent=w==='crew'?'クルーの勝利です！':'侵入者の勝利です。';$('resultPlayers').innerHTML=(state?.players||[]).map(p=>`<span class="result-pill">${escapeHtml(p.name)}</span>`).join('');$('returnLobbyButton').classList.toggle('hidden',state?.hostId!==myId);openDialog('resultDialog')}$('returnLobbyButton').onclick=()=>{send('returnLobby');closeDialog('resultDialog')};
function openDialog(id){const d=$(id);if(!d.open)d.showModal()}function closeDialog(id){const d=$(id);if(d?.open)d.close()}function flashScreen(){document.body.animate([{filter:'brightness(1)'},{filter:'brightness(2) saturate(2)'},{filter:'brightness(1)'}],{duration:450})}
function setupJoystick(){let active=false;const move=e=>{if(!active)return;const r=ui.joystick.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.min(45,Math.hypot(x,y)),a=Math.atan2(y,x);joy={x:Math.cos(a)*m/45,y:Math.sin(a)*m/45};ui.stick.style.transform=`translate(${joy.x*36}px,${joy.y*36}px)`};ui.joystick.onpointerdown=e=>{active=true;ui.joystick.setPointerCapture(e.pointerId);move(e)};ui.joystick.onpointermove=move;ui.joystick.onpointerup=()=>{active=false;joy={x:0,y:0};ui.stick.style.transform=''}}function resize(){const canvas=$('gameCanvas');if(!canvas)return;const width=Math.max(1,innerWidth),height=Math.max(1,innerHeight);if(renderMode==='2d'){const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(width*ratio));canvas.height=Math.max(1,Math.floor(height*ratio));canvas.style.width=width+'px';canvas.style.height=height+'px';return}if(!camera||!renderer)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false)}
setInterval(()=>{if(state?.phase==='meeting')$('meetingTimer').textContent=`残り ${Math.max(0,Math.ceil((state.meetingEndsAt-Date.now())/1000))}秒`},500);

$('profileSummary').textContent=profileText();

// --- Responsive HUD layout fix: prevents chat, joystick, hints and action buttons from overlapping. ---
(function installHudLayoutFix(){
  const style=document.createElement('style');
  style.id='hiddenCrewHudLayoutFix';
  style.textContent=`
    #gameScreen{overflow:hidden;isolation:isolate;background:#020711}
    #gameCanvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;display:block;background:#020711}

    #topBar{
      z-index:40;
      max-width:min(720px,calc(100vw - 420px));
    }

    #playerPanel{
      z-index:35;
      top:100px;
      left:18px;
      max-height:calc(100vh - 260px);
      overflow:auto;
    }

    #taskPanel{
      z-index:35;
      top:100px;
      right:18px;
      max-height:calc(100vh - 310px);
      overflow:auto;
    }

    #miniMap{
      z-index:30;
      right:18px !important;
      bottom:118px !important;
    }

    #actionBar{
      z-index:50;
      position:fixed !important;
      left:50% !important;
      right:auto !important;
      bottom:18px !important;
      transform:translateX(-50%);
      display:flex;
      justify-content:center;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
      width:max-content;
      max-width:calc(100vw - 520px);
      padding:10px 12px;
    }

    #actionBar.hidden{display:none !important}
    #actionBar button{white-space:nowrap;min-height:46px}

    #controlHint{
      z-index:45;
      position:fixed !important;
      left:50% !important;
      right:auto !important;
      bottom:88px !important;
      transform:translateX(-50%);
      width:max-content;
      max-width:calc(100vw - 620px);
      text-align:center;
      pointer-events:none;
    }

    #globalChatPanel{
      z-index:55;
      position:fixed !important;
      left:18px !important;
      bottom:18px !important;
      max-height:min(420px,calc(100vh - 280px));
    }

    #globalChatPanel.collapsed{
      width:205px !important;
      min-height:64px;
      max-height:64px;
      overflow:hidden;
    }

    #joystick{
      z-index:32;
      position:fixed !important;
      left:30px !important;
      bottom:118px !important;
    }

    #interactionHint{
      z-index:60;
      bottom:150px !important;
      left:50% !important;
      transform:translateX(-50%);
      max-width:min(560px,calc(100vw - 40px));
    }

    #notice{
      z-index:70;
      bottom:150px !important;
      max-width:min(620px,calc(100vw - 40px));
      text-align:center;
    }

    @media (max-width:1200px){
      #topBar{max-width:calc(100vw - 40px)}
      #actionBar{max-width:calc(100vw - 380px);gap:8px}
      #controlHint{max-width:calc(100vw - 420px)}
      #taskPanel{max-width:280px}
    }

    @media (max-width:900px){
      #playerPanel{top:88px;left:10px;max-width:220px}
      #taskPanel{top:88px;right:10px;max-width:220px}
      #miniMap{right:10px !important;bottom:150px !important;transform:scale(.85);transform-origin:bottom right}
      #actionBar{left:10px !important;right:10px !important;bottom:10px !important;transform:none;width:auto;max-width:none}
      #controlHint{display:none}
      #globalChatPanel{left:10px !important;bottom:104px !important;max-width:min(320px,calc(100vw - 20px))}
      #joystick{left:18px !important;bottom:190px !important;transform:scale(.82);transform-origin:bottom left}
    }

    @media (max-width:640px){
      #topBar{top:8px;left:8px;right:8px;max-width:none;gap:6px;flex-wrap:wrap}
      #playerPanel{top:118px;left:8px;width:190px;max-height:220px}
      #taskPanel{top:118px;right:8px;width:190px;max-height:220px}
      #miniMap{display:none}
      #globalChatPanel{bottom:142px !important}
      #joystick{bottom:220px !important}
      #actionBar{padding:8px;gap:6px}
      #actionBar button{min-height:42px;padding:8px 10px;font-size:13px}
    }
  `;
  document.head.append(style);
})();
