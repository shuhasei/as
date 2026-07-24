import * as THREE from 'three';
const $=id=>document.getElementById(id);const ui={menu:$('menu'),game:$('gameScreen'),name:$('nameInput'),roomInput:$('roomInput'),message:$('menuMessage'),room:$('roomCode'),role:$('roleText'),status:$('statusText'),players:$('playerList'),playerCount:$('playerCount'),start:$('startButton'),settings:$('settingsButton'),taskPanel:$('taskPanel'),tasks:$('taskList'),taskProgress:$('taskProgress'),taskCounter:$('taskCounter'),actionBar:$('actionBar'),use:$('useButton'),report:$('reportButton'),kill:$('killButton'),killCooldown:$('killCooldown'),sabotage:$('sabotageButton'),meeting:$('meetingButton'),joystick:$('joystick'),stick:$('stick'),notice:$('notice'),miniMap:$('miniMap'),sabotageBanner:$('sabotageBanner'),sabotageTitle:$('sabotageTitle'),sabotageTimer:$('sabotageTimer')};
const COLORS={red:0xe9343f,blue:0x1456d9,green:0x25a65a,pink:0xf244a8,orange:0xf58220,yellow:0xf3ce28,cyan:0x29cbd4,purple:0x7f43cf,white:0xe8eef7,lime:0x7bd93f};
const MAP_VERSION='wide-map-v11-first-person-fix';
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
let socket,myId,state,scene,camera,renderer,clock,localModel,renderMode='3d',canvas2d=null,cameraMode=2,firstPersonYaw=0,nearest={task:null,player:null,body:null,locker:null,security:false,emergency:false};const models=new Map(),keys=new Set(),keyCodes=new Set();let joy={x:0,y:0},lastMove=0,noticeTimer=0;const localVelocity=new THREE.Vector2();let lastServerSync=0;const voicePeers=new Map();const lockerVisuals=new Map();let localVoiceStream=null,voiceStarting=false,micMuted=false,activeCallPeer=null,incomingCallPeer=null;
const randomRoom=()=>Array.from({length:6},()=>('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')[Math.floor(Math.random()*32)]).join('');
const escapeHtml=s=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function send(type,data={}){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type,...data}))}
function showNotice(t){ui.notice.textContent=t;ui.notice.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>ui.notice.classList.remove('show'),2200)}
function createWebSocketUrl(room){
  const protocol=window.location.protocol==='https:'?'wss:':'ws:';
  const url=new URL('/ws',window.location.origin);
  url.protocol=protocol;
  url.searchParams.set('room',String(room).toUpperCase());
  return url.toString();
}
function connect(room,name){
  const wsUrl=createWebSocketUrl(room);
  console.info('[Hidden Crew] WebSocket:',wsUrl);
  socket=new WebSocket(wsUrl);
  socket.onopen=()=>send('join',{name,clientVersion:MAP_VERSION,color:$('colorSelect')?.value,hat:$('hatSelect')?.value});
  socket.onmessage=e=>{try{handle(JSON.parse(e.data))}catch(error){console.error('Invalid server message',error,e.data)}};
  socket.onclose=(event)=>showNotice(`接続が切れました（code: ${event.code}${event.reason ? ` / ${event.reason}` : ''}）。再読み込みしてください。`);
  socket.onerror=error=>{console.error('WebSocket error',error);showNotice('WebSocket接続に失敗しました。Cloudflareのログを確認してください。')};
}
function handle(m){if(m.type==='hello'){myId=m.id;ui.room.textContent=m.room}else if(m.type==='state'){if(m.state?.mapVersion&&m.state.mapVersion!==MAP_VERSION){showNotice('マップ版が一致しません。全端末でCtrl+Shift+Rを押してください。');return}state=m.state;ui.start.disabled=false;ui.start.textContent='ゲーム開始';updateUI();updateAdvancedUI();syncModels();if(state.phase==='meeting'&&document.getElementById('meetingDialog')?.open)syncVoicePeers()}else if(m.type==='playerMoved'){const o=models.get(m.id);if(o){o.userData.target.set(m.x,0,m.z);o.userData.rotation=m.rotation;if(m.id===myId&&o.position.distanceTo(o.userData.target)>.9)o.position.lerp(o.userData.target,.35)}}else if(m.type==='error'){ui.start.disabled=false;ui.start.textContent='ゲーム開始';showNotice(m.message)}else if(m.type==='gameStarted'){ui.start.disabled=false;ui.start.textContent='ゲーム開始';showNotice(m.practiceMode?'練習モードを開始しました':'ゲームを開始しました')}else if(m.type==='meetingStarted')openMeeting(m.reason);else if(m.type==='meetingEnded'){closeDialog('meetingDialog');showNotice(m.ejected?`${m.ejected.name}が追放されました。役職は公開されません。`:'誰も追放されませんでした')}else if(m.type==='voiceSignal')handleVoiceSignal(m);else if(m.type==='callControl')handleCallControl(m);else if(m.type==='chat')appendChat(m);else if(m.type==='sabotage')showNotice('妨害が発生しました');else if(m.type==='sabotageFixed')showNotice('妨害が解除されました');else if(m.type==='gameFinished'){hangUpCall(true);saveResult(m.winner);openResult(m.winner)}else if(m.type==='killEffect')flashScreen();else if(m.type==='abilityResult')showNotice(m.message);}
$('createButton').onclick=()=>joinRoom(randomRoom());$('joinButton').onclick=()=>joinRoom(ui.roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g,''));
function joinRoom(room){
  if(room.length!==6){ui.message.textContent='6桁のルームコードを入力してください。';return}
  ui.menu.classList.add('hidden');
  ui.game.classList.remove('hidden');
  // 3D描画で問題が起きても、ルーム接続まで止めない。
  connect(room,ui.name.value);
  requestAnimationFrame(()=>{
    try{init3D()}catch(error){
      console.error('[Hidden Crew] 3D initialization failed',error);
      try{init2DFallback(error)}catch(fallbackError){
        console.error('[Hidden Crew] fallback initialization failed',fallbackError);
        showFatalLoadError(fallbackError);
      }
    }
  });
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
function init2DFallback(originalError){
  renderMode='2d';
  // WebGLコンテキストを一度取得したcanvasは、同じ要素で2Dへ切り替えられない。
  // 必ず新しいcanvas要素へ置き換えてからCanvas 2Dを初期化する。
  try{renderer?.dispose?.()}catch(error){console.warn('renderer dispose failed',error)}
  renderer=null;scene=null;camera=null;
  const canvas=replaceGameCanvas();
  canvas.style.display='block';
  canvas2d=canvas.getContext('2d',{alpha:false,desynchronized:true})||canvas.getContext('2d');
  if(!canvas2d)throw new Error('Canvas 2Dの初期化に失敗しました');
  clock=new THREE.Clock();
  resize();
  addEventListener('resize',resize);
  addEventListener('keydown',handleKeyDown,{passive:false});
  addEventListener('keyup',handleKeyUp,{passive:false});
  addEventListener('blur',clearKeys);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys()});
  setupJoystick();
  syncModels();
  animate();
  const panel=$('loadErrorPanel');if(panel)panel.remove();
  showNotice('3D表示を利用できないため、軽量マップで開始しました。');
  console.warn('[Hidden Crew] 2D fallback enabled:',originalError);
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
function isTypingTarget(target){return target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||target?.isContentEditable}function isDown(...codes){return codes.some(code=>keyCodes.has(code))}function handleKeyDown(e){if(isTypingTarget(e.target))return;const code=e.code;const key=String(e.key||'').toLowerCase();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();keyCodes.add(code);keys.add(key);if(e.repeat)return;if(code==='KeyE')useAction();if(code==='KeyR')reportAction();if(code==='KeyQ'||code==='Space')attackAction();if(code==='KeyM')meetingAction()}function handleKeyUp(e){if(isTypingTarget(e.target))return;const code=e.code;const key=String(e.key||'').toLowerCase();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();keyCodes.delete(code);keys.delete(key)}function clearKeys(){keyCodes.clear();keys.clear();localVelocity.set(0,0);joy={x:0,y:0}}function init3D(){if(renderer)return;scene=new THREE.Scene();scene.background=new THREE.Color(0x020711);scene.fog=new THREE.FogExp2(0x020711,.026);camera=new THREE.PerspectiveCamera(74,innerWidth/innerHeight,.01,160);scene.add(camera);const canvas=$('gameCanvas');if(!canvas)throw new Error('gameCanvas が見つかりません');renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',failIfMajorPerformanceCaveat:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;clock=new THREE.Clock();buildWorld();addEventListener('resize',resize);addEventListener('keydown',handleKeyDown,{passive:false});addEventListener('keyup',handleKeyUp,{passive:false});addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys()});setupJoystick();animate();showNotice('移動: 矢印キー/WASD　攻撃: Q/Space　使用: E　通報: R')}
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
function syncModels(){if(!state)return;const active=new Set();for(const p of state.players){active.add(p.id);let m=models.get(p.id);const created=!m;if(created){m=renderMode==='2d'?makeFallbackModel(p):createCrewmate(p.color);models.set(p.id,m);if(renderMode==='3d')scene.add(m)}const hiddenChanged=m.userData.hidden!==Boolean(p.hidden);m.userData.hidden=Boolean(p.hidden);m.userData.target.set(p.x,0,p.z);m.userData.rotation=p.rotation;if(created||p.id===myId&&(!localModel||hiddenChanged)){m.position.set(p.x,0,p.z);m.rotation.y=p.rotation||0}m.visible=!p.reported&&!p.hidden;if(renderMode==='3d')m.traverse(o=>{if(o.material){o.material.transparent=!p.alive;o.material.opacity=p.alive?1:.28}});if(p.id===myId){const wasMissing=!localModel;localModel=m;if(wasMissing){firstPersonYaw=clearFirstPersonDirection(Number(p.rotation)||0)}if(!p.hidden&&collidesWithMap(m.position.x,m.position.z)){m.position.set(p.x,0,p.z);m.userData.target.copy(m.position);localVelocity.set(0,0)}}}for(const[id,m]of models)if(!active.has(id)){if(renderMode==='3d')scene.remove(m);models.delete(id)}}
function me(){return state?.players.find(p=>p.id===myId)}
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
        m.rotation.y+=(Number(m.userData.rotation||0)-m.rotation.y)*(1-Math.exp(-14*dt));
      }
    }
    updateNearest();
    if(renderMode==='3d'&&renderer&&scene&&camera){
      updateLockerVisuals(dt);
      updateCamera(dt);
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
    if(renderMode==='3d'){
      if(renderer&&scene&&camera)renderer.render(scene,camera);
    }else{
      draw2DMap();
    }
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
function moveLocal(dt){
  const p=me();if(!p||p.hidden)return;if(collidesWithMap(localModel.position.x,localModel.position.z)){localModel.position.set(p.x,0,p.z);localModel.userData.target.copy(localModel.position);localVelocity.set(0,0)}let inputX=0,inputZ=0;
  if(cameraMode===2){const turn=((isDown('ArrowRight')?1:0)-(isDown('ArrowLeft')?1:0))*2.5*dt;firstPersonYaw-=turn;const forward=(isDown('KeyW','ArrowUp')?1:0)-(isDown('KeyS','ArrowDown')?1:0)-joy.y;const strafe=(isDown('KeyD')?1:0)-(isDown('KeyA')?1:0)+joy.x;inputX=Math.sin(firstPersonYaw)*forward+Math.cos(firstPersonYaw)*strafe;inputZ=Math.cos(firstPersonYaw)*forward-Math.sin(firstPersonYaw)*strafe}else{inputX=(isDown('KeyD','ArrowRight')?1:0)-(isDown('KeyA','ArrowLeft')?1:0)+joy.x;inputZ=(isDown('KeyS','ArrowDown')?1:0)-(isDown('KeyW','ArrowUp')?1:0)+joy.y}
  const inputLen=Math.hypot(inputX,inputZ);if(inputLen>1){inputX/=inputLen;inputZ/=inputLen}
  const sprint=isDown('ShiftLeft','ShiftRight')?1.18:1;const maxSpeed=(p.alive?4.6:6.0)*(state.settings?.speed||1)*sprint,accel=20,friction=14;
  if(inputLen>.04){localVelocity.x+=(inputX*maxSpeed-localVelocity.x)*Math.min(1,accel*dt);localVelocity.y+=(inputZ*maxSpeed-localVelocity.y)*Math.min(1,accel*dt)}else{const f=Math.exp(-friction*dt);localVelocity.multiplyScalar(f)}
  const nx=localModel.position.x+localVelocity.x*dt,nz=localModel.position.z+localVelocity.y*dt;
  if(!collidesWithMap(nx,localModel.position.z))localModel.position.x=nx;else localVelocity.x=0;
  if(!collidesWithMap(localModel.position.x,nz))localModel.position.z=nz;else localVelocity.y=0;
  if(localVelocity.lengthSq()>.03)localModel.rotation.y=cameraMode===2?firstPersonYaw:Math.atan2(localVelocity.x,localVelocity.y);else if(cameraMode===2)localModel.rotation.y=firstPersonYaw;
  localModel.userData.target.copy(localModel.position);
  if(performance.now()-lastMove>40){lastMove=performance.now();send('move',{x:localModel.position.x,z:localModel.position.z,rotation:localModel.rotation.y,clientTime:Date.now()})}
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
function updateCamera(){
  if(!localModel||!camera)return;
  const pos=localModel.position;
  const yaw=Number(localModel.rotation.y)||0;
  if(cameraMode===2){
    localModel.visible=false;
    camera.fov=74;camera.near=.03;camera.updateProjectionMatrix();
    const eye=new THREE.Vector3(pos.x,pos.y+1.78,pos.z);
    const forward=new THREE.Vector3(Math.sin(firstPersonYaw),-.025,Math.cos(firstPersonYaw)).normalize();
    camera.position.copy(eye);
    camera.lookAt(eye.clone().addScaledVector(forward,18));
    return;
  }
  camera.fov=cameraMode===0?58:68;camera.near=.06;camera.updateProjectionMatrix();
  const p=me();localModel.visible=p?!p.reported&&!p.hidden:true;
  const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  const distance=cameraMode===0?11:6.2,height=cameraMode===0?10.5:4.6;
  const target=new THREE.Vector3(pos.x,pos.y+(cameraMode===0?.9:1.15),pos.z).addScaledVector(forward,cameraMode===0?2.4:3.4);
  const desired=new THREE.Vector3(pos.x,pos.y+height,pos.z).addScaledVector(forward,-distance);
  const direction=desired.clone().sub(target);let safe=desired.clone();
  for(let t=1;t>=.18;t-=.06){const test=target.clone().addScaledVector(direction,t);if(!collidesWithMap(test.x,test.z,.18)){safe=test;break}}
  camera.position.lerp(safe,.16);camera.lookAt(target);
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
ui.use.onclick=useAction;ui.report.onclick=reportAction;ui.kill.onclick=attackAction;ui.meeting.onclick=meetingAction;ui.sabotage.onclick=()=>openDialog('sabotageDialog');ui.start.onclick=()=>{if(socket?.readyState!==WebSocket.OPEN){showNotice('サーバーへ接続できていません。再読み込みしてください。');return}if(state?.hostId!==myId){showNotice('ゲームを開始できるのはホストだけです。');return}ui.start.disabled=true;ui.start.textContent='開始中…';send('start');setTimeout(()=>{if(state?.phase==='lobby'){ui.start.disabled=false;ui.start.textContent='ゲーム開始'}},5000)};$('copyRoomButton').onclick=()=>navigator.clipboard.writeText(state?.room||'').then(()=>showNotice('ルームコードをコピーしました'));$('cameraButton').onclick=()=>{cameraMode=(cameraMode+1)%3;if(cameraMode===2&&localModel){firstPersonYaw=clearFirstPersonDirection(Number(localModel.rotation.y)||0);camera.position.set(localModel.position.x,localModel.position.y+1.72,localModel.position.z)}const labels=['見下ろし視点','近い視点','一人称視点'];showNotice(labels[cameraMode]);$('cameraButton').textContent=`${labels[(cameraMode+1)%3]}へ切替`};
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
const pendingIce=new Map();let audioUnlocked=false;
function setVoiceStatus(text,active=false){const el=$('voiceStatus');if(!el)return;el.textContent=text;el.classList.toggle('active',active)}
async function unlockRemoteAudio(){audioUnlocked=true;for(const audio of document.querySelectorAll('#remoteAudio audio')){audio.muted=false;audio.volume=1;try{await audio.play()}catch{}}}
document.addEventListener('pointerdown',unlockRemoteAudio,{passive:true});
async function startVoiceChat(){
  if(localVoiceStream||voiceStarting)return;if(!navigator.mediaDevices?.getUserMedia){setVoiceStatus('このブラウザは音声通話に対応していません。');return}
  voiceStarting=true;setVoiceStatus('マイクの許可を待っています…');
  try{localVoiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1,sampleRate:48000},video:false});micMuted=false;updateMicButton();setVoiceStatus('通話接続中…画面を一度クリックしてください。',true);syncVoicePeers();await unlockRemoteAudio()}
  catch(error){console.error('Microphone permission error',error);setVoiceStatus('マイクを使用できません。サイト設定でマイクを許可してください。');showNotice('マイクの使用が許可されませんでした。')}finally{voiceStarting=false}
}
function syncVoicePeers(){if(!localVoiceStream||!activeCallPeer)return;for(const id of [...voicePeers.keys()])if(id!==activeCallPeer)closeVoicePeer(id)}
function ensureVoicePeer(peerId,makeOffer=false){
  let pc=voicePeers.get(peerId);if(pc)return pc;pc=new RTCPeerConnection(RTC_CONFIG);voicePeers.set(peerId,pc);
  for(const track of localVoiceStream?.getAudioTracks()||[])pc.addTrack(track,localVoiceStream);
  pc.onicecandidate=e=>{if(e.candidate)send('voiceSignal',{targetId:peerId,signal:{candidate:e.candidate.toJSON?.()||e.candidate}})};
  pc.ontrack=e=>{const stream=e.streams?.[0]||new MediaStream([e.track]);attachRemoteAudio(peerId,stream)};
  pc.onconnectionstatechange=()=>{const cs=pc.connectionState;setVoiceStatus(cs==='connected'?'音声通話に接続しました。':`音声接続: ${cs}`,cs==='connected');if(cs==='failed'){try{pc.restartIce()}catch{}}if(cs==='closed')closeVoicePeer(peerId)};
  if(makeOffer)queueMicrotask(async()=>{try{await pc.setLocalDescription(await pc.createOffer({offerToReceiveAudio:true}));send('voiceSignal',{targetId:peerId,signal:{description:pc.localDescription}})}catch(e){console.error('Voice offer failed',e)}});return pc
}
async function handleVoiceSignal(m){
  if(!m.fromId||!m.signal)return;if(activeCallPeer!==m.fromId)return;if(!localVoiceStream)await startVoiceChat();if(!localVoiceStream)return;const pc=ensureVoicePeer(m.fromId,false);
  try{if(m.signal.description){await pc.setRemoteDescription(m.signal.description);for(const c of pendingIce.get(m.fromId)||[])await pc.addIceCandidate(c);pendingIce.delete(m.fromId);if(m.signal.description.type==='offer'){await pc.setLocalDescription(await pc.createAnswer());send('voiceSignal',{targetId:m.fromId,signal:{description:pc.localDescription}})}}else if(m.signal.candidate){if(pc.remoteDescription)await pc.addIceCandidate(m.signal.candidate);else{const list=pendingIce.get(m.fromId)||[];list.push(m.signal.candidate);pendingIce.set(m.fromId,list)}}}catch(e){console.error('Voice signaling failed',e);setVoiceStatus('音声接続に失敗しました。別回線ではTURNが必要な場合があります。')}
}
function attachRemoteAudio(peerId,stream){let audio=document.getElementById(`voice-${peerId}`);if(!audio){audio=document.createElement('audio');audio.id=`voice-${peerId}`;audio.autoplay=true;audio.playsInline=true;audio.controls=false;audio.volume=1;audio.muted=false;$('remoteAudio').append(audio)}audio.srcObject=stream;audio.play().then(()=>setVoiceStatus('音声通話に接続しました。',true)).catch(()=>setVoiceStatus('相手の音声を再生するため、画面をクリックしてください。'))}
function closeVoicePeer(peerId){const pc=voicePeers.get(peerId);if(pc){pc.ontrack=null;pc.onicecandidate=null;pc.close();voicePeers.delete(peerId)}pendingIce.delete(peerId);document.getElementById(`voice-${peerId}`)?.remove()}
function stopVoiceChat(){for(const id of [...voicePeers.keys()])closeVoicePeer(id);for(const track of localVoiceStream?.getTracks()||[])track.stop();localVoiceStream=null;voiceStarting=false;setVoiceStatus('メンバー一覧の📞から個別通話できます。');updateMicButton()}
function updateMicButton(){const b=$('micButton');if(!b)return;b.textContent=micMuted?'🔇 マイクOFF':'🎙 マイクON';b.classList.toggle('muted',micMuted)}
$('micButton').onclick=async()=>{await unlockRemoteAudio();if(!localVoiceStream){await startVoiceChat();return}micMuted=!micMuted;for(const t of localVoiceStream.getAudioTracks())t.enabled=!micMuted;updateMicButton();setVoiceStatus(micMuted?'マイクをミュートしています。':'音声通話に接続しました。',!micMuted)};

async function placeCall(peerId){
  if(!peerId||peerId===myId)return;if(activeCallPeer){showNotice('先に現在の通話を終了してください。');return}
  const target=state?.players?.find(p=>p.id===peerId);activeCallPeer=peerId;setVoiceStatus(`${target?.name||'相手'}を呼び出しています…`,true);send('callControl',{targetId:peerId,action:'ring'});
}
async function acceptIncomingCall(){
  if(!incomingCallPeer)return;activeCallPeer=incomingCallPeer;incomingCallPeer=null;closeDialog('incomingCallDialog');await startVoiceChat();if(!localVoiceStream){hangUpCall(false);return}send('callControl',{targetId:activeCallPeer,action:'accept'});ensureVoicePeer(activeCallPeer,false);setVoiceStatus('通話に接続中…',true);
}
function declineIncomingCall(){if(incomingCallPeer)send('callControl',{targetId:incomingCallPeer,action:'decline'});incomingCallPeer=null;closeDialog('incomingCallDialog')}
async function handleCallControl(m){
  const from=m.fromId,action=m.action;if(!from)return;
  if(action==='ring'){
    if(activeCallPeer||incomingCallPeer){send('callControl',{targetId:from,action:'busy'});return}
    incomingCallPeer=from;const caller=state?.players?.find(p=>p.id===from);$('incomingCallerName').textContent=`${caller?.name||'メンバー'}から着信です`;openDialog('incomingCallDialog');
  }else if(action==='accept'&&activeCallPeer===from){await startVoiceChat();if(localVoiceStream){ensureVoicePeer(from,true);setVoiceStatus('音声通話に接続中…',true)}}
  else if(['decline','busy'].includes(action)&&activeCallPeer===from){showNotice(action==='busy'?'相手は通話中です。':'通話が拒否されました。');hangUpCall(false)}
  else if(action==='hangup'&&activeCallPeer===from){showNotice('通話が終了しました。');hangUpCall(false)}
}
function hangUpCall(notify=true){const peer=activeCallPeer;if(notify&&peer)send('callControl',{targetId:peer,action:'hangup'});activeCallPeer=null;stopVoiceChat();setVoiceStatus('メンバー一覧の📞から個別通話できます。');}
ui.players.addEventListener('click',e=>{const b=e.target.closest('.call-member');if(b)placeCall(b.dataset.callId)});
$('acceptCallButton').onclick=acceptIncomingCall;$('declineCallButton').onclick=declineIncomingCall;$('hangupCallButton').onclick=()=>hangUpCall(true);
addEventListener('beforeunload',stopVoiceChat);

function openResult(w){$('resultTitle').textContent=w==='crew'?'CREW VICTORY':'INTRUDER VICTORY';$('resultText').textContent=w==='crew'?'クルーの勝利です！':'侵入者の勝利です。';$('resultPlayers').innerHTML=(state?.players||[]).map(p=>`<span class="result-pill">${escapeHtml(p.name)}</span>`).join('');$('returnLobbyButton').classList.toggle('hidden',state?.hostId!==myId);openDialog('resultDialog')}$('returnLobbyButton').onclick=()=>{send('returnLobby');closeDialog('resultDialog')};
function openDialog(id){const d=$(id);if(!d.open)d.showModal()}function closeDialog(id){const d=$(id);if(d?.open)d.close()}function flashScreen(){document.body.animate([{filter:'brightness(1)'},{filter:'brightness(2) saturate(2)'},{filter:'brightness(1)'}],{duration:450})}
function setupJoystick(){let active=false;const move=e=>{if(!active)return;const r=ui.joystick.getBoundingClientRect(),x=e.clientX-(r.left+r.width/2),y=e.clientY-(r.top+r.height/2),m=Math.min(45,Math.hypot(x,y)),a=Math.atan2(y,x);joy={x:Math.cos(a)*m/45,y:Math.sin(a)*m/45};ui.stick.style.transform=`translate(${joy.x*36}px,${joy.y*36}px)`};ui.joystick.onpointerdown=e=>{active=true;ui.joystick.setPointerCapture(e.pointerId);move(e)};ui.joystick.onpointermove=move;ui.joystick.onpointerup=()=>{active=false;joy={x:0,y:0};ui.stick.style.transform=''}}function resize(){const canvas=$('gameCanvas');if(renderMode==='2d'){const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(innerWidth*ratio));canvas.height=Math.max(1,Math.floor(innerHeight*ratio));canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';return}camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
setInterval(()=>{if(state?.phase==='meeting')$('meetingTimer').textContent=`残り ${Math.max(0,Math.ceil((state.meetingEndsAt-Date.now())/1000))}秒`},500);

$('profileSummary').textContent=profileText();
