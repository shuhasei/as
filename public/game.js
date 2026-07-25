import * as THREE from 'three';
const $=id=>document.getElementById(id);const ui={menu:$('menu'),game:$('gameScreen'),name:$('nameInput'),roomInput:$('roomInput'),message:$('menuMessage'),room:$('roomCode'),role:$('roleText'),status:$('statusText'),players:$('playerList'),playerCount:$('playerCount'),start:$('startButton'),settings:$('settingsButton'),taskPanel:$('taskPanel'),tasks:$('taskList'),taskProgress:$('taskProgress'),taskCounter:$('taskCounter'),actionBar:$('actionBar'),use:$('useButton'),report:$('reportButton'),kill:$('killButton'),killCooldown:$('killCooldown'),sabotage:$('sabotageButton'),meeting:$('meetingButton'),joystick:$('joystick'),stick:$('stick'),notice:$('notice'),miniMap:$('miniMap'),sabotageBanner:$('sabotageBanner'),sabotageTitle:$('sabotageTitle'),sabotageTimer:$('sabotageTimer')};
const COLORS={red:0xe9343f,blue:0x1456d9,green:0x25a65a,pink:0xf244a8,orange:0xf58220,yellow:0xf3ce28,cyan:0x29cbd4,purple:0x7f43cf,white:0xe8eef7,lime:0x7bd93f};
const MAP_VERSION='aurora-pc-chat-joystick-v42';
const DEVICE_MEMORY=Number(navigator.deviceMemory||0);
const CPU_CORES=Number(navigator.hardwareConcurrency||0);
const COARSE_POINTER=matchMedia('(pointer:coarse)').matches;
const LOW_POWER_DEVICE=COARSE_POINTER||(DEVICE_MEMORY>0&&DEVICE_MEMORY<=4)||(CPU_CORES>0&&CPU_CORES<=4);
const HIGH_POWER_DEVICE=!LOW_POWER_DEVICE&&(DEVICE_MEMORY===0||DEVICE_MEMORY>=8)&&(CPU_CORES===0||CPU_CORES>=6);
const PERF={
  lowPower:LOW_POWER_DEVICE,
  maxPixelRatio:LOW_POWER_DEVICE?1:1.35,
  targetFps:LOW_POWER_DEVICE?30:60,
  enableShadows:HIGH_POWER_DEVICE,
  shadowMapSize:1024,
  shadowFps:10,
  securityFps:LOW_POWER_DEVICE?8:(HIGH_POWER_DEVICE?18:14),
  miniMapFps:LOW_POWER_DEVICE?6:10,
  nearestFps:12,
  hudFps:4,
  lightFps:LOW_POWER_DEVICE?8:15,
  moveInterval:LOW_POWER_DEVICE?70:50
};
const TASKS={
  reactor:['リアクター安定化',-28,18],
  engine:['エンジン出力調整',-28,6],
  scanner:['医療スキャン',-26,-17],
  security:['監視カメラ確認',-14,-2],
  wires:['配線修理',-10,-17],
  cargo:['貨物整理',-6,-17],
  comms:['通信周波数調整',7,-17],
  shield:['シールド同期',20,-15],
  align:['航路調整',30,0],
  weapons:['照準校正',23,15],
  oxygen:['酸素フィルター清掃',2,18],
  fuel:['燃料補給',16,4]
};
const MAP_BOUNDS={minX:-34,maxX:36,minZ:-23,maxZ:24};
const ROOMS=[
  {id:'hub',name:'中央アトリウム',x:0,z:0,w:14,d:12,color:0x2b3547,doors:[['north',0,4.6],['south',-5,3.6],['south',4,3.6],['west',-2,3.8],['east',3,3.8]]},
  {id:'atrium',name:'観測ラウンジ',x:0,z:18,w:18,d:10,color:0x33445b,doors:[['south',0,4.4],['west',0,4.0],['east',-2,4.0]]},
  {id:'reactorRoom',name:'リアクター',x:-27,z:18,w:10,d:10,color:0x4b2732,doors:[['east',0,4.0],['south',0,4.0]]},
  {id:'engineRoom',name:'推進機関室',x:-27,z:6,w:10,d:8,color:0x493b22,doors:[['north',0,4.0],['east',-4,3.2]]},
  {id:'securityRoom',name:'セキュリティ',x:-16,z:-2,w:10,d:8,color:0x26374e,doors:[['west',4,3.2],['east',0,3.8],['south',-4,3.0]]},
  {id:'medicalRoom',name:'医療区画',x:-25,z:-17,w:12,d:10,color:0x203b4b,doors:[['north',5,3.0],['east',0,3.6]]},
  {id:'storageRoom',name:'保管庫',x:-8,z:-17,w:12,d:10,color:0x493824,doors:[['north',3,3.6],['west',1,3.6],['east',0,3.6]]},
  {id:'commsRoom',name:'通信室',x:7,z:-17,w:10,d:8,color:0x1e3d43,doors:[['north',-3,3.6],['west',0,3.6],['east',1,3.4]]},
  {id:'shieldRoom',name:'シールド研究室',x:20,z:-15,w:10,d:8,color:0x244047,doors:[['west',-1,3.4],['north',4.5,3.2]]},
  {id:'navigationRoom',name:'航法管制室',x:29,z:0,w:12,d:10,color:0x253c51,doors:[['west',3,3.4],['south',-4.5,3.2],['north',-3,3.4]]},
  {id:'weaponsRoom',name:'防衛管制室',x:23,z:15,w:12,d:9,color:0x43232c,doors:[['west',1,3.6],['south',-4,3.2],['south',3,3.4]]},
  {id:'adminRoom',name:'管理室',x:16,z:4,w:10,d:8,color:0x2c4054,doors:[['west',-1,3.6],['east',-1,3.4],['north',3,3.2]]}
];
const CORRIDORS=[
  {id:'c-hub-north',x:0,z:9.5,w:4.2,d:7,color:0x1a3146,doors:[['north',0,3.9],['south',0,3.9]]},
  {id:'c-reactor-atrium',x:-15.5,z:18,w:13,d:3.8,color:0x1a3146,doors:[['west',0,3.5],['east',0,3.5]]},
  {id:'c-reactor-engine',x:-27,z:11.5,w:4,d:3,color:0x1a3146,doors:[['north',0,3.7],['south',0,3.7]]},
  {id:'c-engine-security',x:-21.5,z:2,w:3,d:3.2,color:0x1a3146,doors:[['west',0,2.9],['east',0,2.9]]},
  {id:'c-security-hub',x:-9,z:-2,w:4,d:3.8,color:0x1a3146,doors:[['west',0,3.5],['east',0,3.5]]},
  {id:'c-security-medical',x:-20,z:-9,w:3.2,d:6,color:0x1a3146,doors:[['north',0,2.9],['south',0,2.9]]},
  {id:'c-medical-storage',x:-16.5,z:-17,w:5,d:3.6,color:0x1a3146,doors:[['west',0,3.3],['east',0,3.3]]},
  {id:'c-hub-storage',x:-5,z:-9,w:3.6,d:6,color:0x1a3146,doors:[['north',0,3.3],['south',0,3.3]]},
  {id:'c-storage-comms',x:0,z:-17,w:4,d:3.6,color:0x1a3146,doors:[['west',0,3.3],['east',0,3.3]]},
  {id:'c-hub-comms',x:4,z:-9.5,w:3.6,d:7,color:0x1a3146,doors:[['north',0,3.3],['south',0,3.3]]},
  {id:'c-comms-shield',x:13.5,z:-16,w:3,d:3.4,color:0x1a3146,doors:[['west',0,3.1],['east',0,3.1]]},
  {id:'c-shield-navigation',x:24.5,z:-8,w:3.5,d:6,color:0x1a3146,doors:[['north',0,3.2],['south',0,3.2]]},
  {id:'c-hub-admin',x:9,z:3,w:4,d:3.6,color:0x1a3146,doors:[['west',0,3.3],['east',0,3.3]]},
  {id:'c-admin-navigation',x:22,z:3,w:2.5,d:3.4,color:0x1a3146,doors:[['west',0,3.1],['east',0,3.1]]},
  {id:'c-admin-weapons',x:19,z:9.25,w:3.5,d:2.5,color:0x1a3146,doors:[['north',0,3.2],['south',0,3.2]]},
  {id:'c-weapons-navigation',x:26,z:7.75,w:3.5,d:5.5,color:0x1a3146,doors:[['north',0,3.2],['south',0,3.2]]},
  {id:'c-atrium-weapons',x:13,z:16,w:8,d:3.6,color:0x1a3146,doors:[['west',0,3.3],['east',0,3.3]]}
];
const MAP_ZONES=[...ROOMS,...CORRIDORS];
function createDoorBarriers(zones){
  const barriers=[],seen=new Set();
  for(const zone of zones){
    for(const door of zone.doors||[]){
      const [side,offset=0,rawWidth=3.6]=door;
      const horizontal=side==='north'||side==='south';
      const x=zone.x+(horizontal?offset:(side==='east'?zone.w/2:-zone.w/2));
      const z=zone.z+(horizontal?(side==='north'?zone.d/2:-zone.d/2):offset);
      const step=.65;
      const outsideX=x+(side==='east'?step:side==='west'?-step:0);
      const outsideZ=z+(side==='north'?step:side==='south'?-step:0);
      const connected=zones.some(other=>other!==zone&&outsideX>=other.x-other.w/2-.1&&outsideX<=other.x+other.w/2+.1&&outsideZ>=other.z-other.d/2-.1&&outsideZ<=other.z+other.d/2+.1);
      if(!connected)continue;
      const orientation=horizontal?'h':'v';
      const key=`${Math.round(x*10)}:${Math.round(z*10)}:${orientation}`;
      if(seen.has(key))continue;
      seen.add(key);
      const width=Math.max(.8,Number(rawWidth||3.6)-.18);
      barriers.push({x,z,w:horizontal?width:.56,d:horizontal?.56:width,orientation});
    }
  }
  return barriers;
}
const DOOR_BARRIERS=Object.freeze(createDoorBarriers(MAP_ZONES));
function createWallLayout(zones){
  const thickness=.48,walls=[];
  const addSide=(zone,side,length)=>{
    const doors=(zone.doors||[]).filter(d=>d[0]===side).map(d=>{
      const half=Math.max(.4,Number(d[2]||3.6)/2),offset=Number(d[1]||0);
      return[Math.max(-length/2,offset-half),Math.min(length/2,offset+half)];
    }).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
    const merged=[];
    for(const interval of doors){const last=merged[merged.length-1];if(last&&interval[0]<=last[1])last[1]=Math.max(last[1],interval[1]);else merged.push([...interval])}
    let cursor=-length/2;
    const emit=(a,b)=>{if(b-a<.12)return;if(side==='north'||side==='south')walls.push({x:zone.x+(a+b)/2,z:zone.z+(side==='north'?zone.d/2:-zone.d/2),w:b-a,d:thickness});else walls.push({x:zone.x+(side==='east'?zone.w/2:-zone.w/2),z:zone.z+(a+b)/2,w:thickness,d:b-a})};
    for(const [a,b] of merged){emit(cursor,a);cursor=Math.max(cursor,b)}emit(cursor,length/2);
  };
  for(const zone of zones){addSide(zone,'north',zone.w);addSide(zone,'south',zone.w);addSide(zone,'east',zone.d);addSide(zone,'west',zone.d)}
  return walls;
}
const WALLS=createWallLayout(MAP_ZONES);
const LOCKERS=[
  {id:'medical',x:-29.3,z:-19.4,exitX:-27.7,exitZ:-19.4,rot:Math.PI/2},
  {id:'security',x:-19.2,z:-4.5,exitX:-17.6,exitZ:-4.5,rot:Math.PI/2},
  {id:'weapons',x:27,z:17.2,exitX:25.4,exitZ:17.2,rot:-Math.PI/2},
  {id:'storage',x:-12,z:-19.5,exitX:-10.4,exitZ:-19.5,rot:-Math.PI/2}
];
const SECURITY_CONSOLE={x:-18,z:-2};
const SECURITY_CAMERAS=[
  {id:'hub',name:'中央アトリウム',position:[-5.5,7.2,-5.5],target:[1,.7,3.5],radius:12},
  {id:'reactor',name:'リアクター・機関室',position:[-20.5,7.4,11.5],target:[-27,.7,12],radius:14},
  {id:'medical',name:'セキュリティ・医療区画',position:[-13.5,7.1,-8],target:[-22,.7,-10],radius:15},
  {id:'storage',name:'保管庫・通信室',position:[0,7.3,-10.5],target:[0,.7,-17],radius:15},
  {id:'navigation',name:'管理室・航法管制室',position:[19.5,7.5,-2.5],target:[27,.7,1],radius:15},
  {id:'weapons',name:'観測ラウンジ・防衛管制室',position:[12,8.2,22],target:[13,.7,15],radius:16}
];
const EMERGENCY_BUTTON={x:0,z:0};
const CARGO_DELIVERY={x:13.2,z:6.1,name:'管理室の搬入口'};
const SOLID_PROPS=[
  {x:-18,z:-2,w:1.8,d:1.6},
  {x:-10.5,z:-14.5,w:1.6,d:1.6},{x:-5.2,z:-19.2,w:1.8,d:1.5},
  {x:18.2,z:-16.8,w:1.6,d:1.6},{x:25.5,z:13,w:1.5,d:1.5},
  ...LOCKERS.map(locker=>({x:locker.x,z:locker.z,w:1.15,d:.9}))
];
const COLLISION_OBJECTS=Object.freeze([...WALLS,...SOLID_PROPS]);
let socket,myId,state,scene,camera,renderer,clock,localModel,renderMode='3d',canvas2d=null,cameraMode=0,firstPersonYaw=0,firstPersonTargetYaw=0,firstPersonInputBaseYaw=0,firstPersonInputSignature='',nearest={task:null,player:null,body:null,locker:null,security:false,emergency:false,cargoDelivery:false};const models=new Map(),corpseModels=new Map(),keys=new Set(),keyCodes=new Set();let joy={x:0,y:0},lastMove=0,noticeTimer=0,spectatorTargetId=null,spectatorHiddenModelId=null,lastKnownAlive=true;let securityOpen=false,securityCameraIndex=0,securityCamera=null,securityRenderer=null,securityLastRender=0,securityFeedContext=null,securityRenderWidth=0,securityRenderHeight=0,securityViewerFailed=false,securityTaskActive=false,securityTaskCountsProgress=false,securityTaskViewed=new Set(),securityTaskViewTimer=0;const localVelocity=new THREE.Vector2();let localTargetRotation=0,lastServerSync=0;const voicePeers=new Map();const lockerVisuals=new Map();let localVoiceStream=null,voiceStarting=false,micMuted=false,activeCallPeer=null,incomingCallPeer=null,callTimeoutId=0,incomingCallTimeoutId=0,joinTimeoutId=0,joinPending=false,gameInitialized=false,pendingRoom='',pendingName='';let runtimeHandlersInstalled=false,animationStarted=false,fallbackSwitching=false,cargoCarryActive=false,cargoCarryVisual=null;let meetingVoiceStream=null,meetingVoiceStarting=false,meetingVoiceMuted=false,meetingVoiceSource=null,meetingVoiceProcessor=null,meetingVoiceSilentGain=null,meetingVoiceSequence=0;const meetingVoicePlaybackAt=new Map();let groupVoiceStream=null,groupVoiceStarting=false,groupVoiceMuted=false,groupVoiceListening=false,groupVoiceJoined=false,groupVoiceSource=null,groupVoiceProcessor=null,groupVoiceSilentGain=null,groupVoiceSequence=0,groupVoiceLastSentAt=0;const groupVoicePlaybackAt=new Map();
let ceilingGroup=null,doorLockGroup=null,doorLockPanelMaterial=null,doorLockWarningMaterial=null,facilityAmbientLight=null,facilityKeyLight=null,facilityFillLight=null,cameraFillLight=null,headLamp=null;const facilityLights=[],emergencyLights=[];let preferredRendererPixelRatio=1,currentRendererPixelRatio=1,animationLastTime=0,lastNearestUpdate=0,lastMiniMapRender=0,lastHudUpdate=0,lastLightUpdate=0,lastShadowUpdate=0,lastEnclosureMode=-1,performanceWindowStart=0,performanceFrameCount=0,lowFpsWindows=0,highFpsWindows=0,qualitySamplingResumeAt=0;
function cargoCarryStorageKey(){return 'hiddenCrewCargoCarryV13'}
function createCargoParcel(scale=1){
  const group=new THREE.Group();group.scale.setScalar(scale);
  const box=new THREE.Mesh(new THREE.BoxGeometry(.82,.62,.72),new THREE.MeshStandardMaterial({color:0x9a6936,roughness:.72,metalness:.08}));box.castShadow=true;box.position.y=.08;group.add(box);
  const strapMat=new THREE.MeshStandardMaterial({color:0x3b2a1c,roughness:.65});
  const strapA=new THREE.Mesh(new THREE.BoxGeometry(.12,.64,.74),strapMat),strapB=new THREE.Mesh(new THREE.BoxGeometry(.84,.64,.12),strapMat);strapA.position.y=.09;strapB.position.y=.09;group.add(strapA,strapB);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(.4,.22),new THREE.MeshBasicMaterial({color:0xe8d7a8}));label.position.set(0,.08,.365);group.add(label);
  return group;
}
function ensureCargoCarryVisual(){
  if(renderMode!=='3d'||!scene)return null;if(cargoCarryVisual)return cargoCarryVisual;
  cargoCarryVisual=createCargoParcel(1.05);scene.add(cargoCarryVisual);cargoCarryVisual.visible=false;return cargoCarryVisual;
}
function setCargoCarry(active,{persist=true,sync=true}={}){
  const next=!!active,changed=next!==cargoCarryActive;cargoCarryActive=next;
  const visual=ensureCargoCarryVisual();if(visual)visual.visible=cargoCarryActive&&cameraMode===2;
  if(persist){try{if(cargoCarryActive&&state?.room&&me()?.name)sessionStorage.setItem(cargoCarryStorageKey(),JSON.stringify({room:state.room,name:me().name}));else sessionStorage.removeItem(cargoCarryStorageKey())}catch{}}
  if(sync&&changed)send('cargoState',{active:cargoCarryActive});
}
function syncCargoCarryState(){
  const p=me(),valid=state?.phase==='playing'&&p?.alive&&!p?.spectator;
  if(!valid){if(cargoCarryActive)setCargoCarry(false,{sync:false});return}
  if(typeof p?.carryingCargo==='boolean'){
    if(cargoCarryActive!==p.carryingCargo)setCargoCarry(p.carryingCargo,{sync:false});
    return;
  }
  if(!cargoCarryActive){try{const saved=JSON.parse(sessionStorage.getItem(cargoCarryStorageKey())||'null');if(saved?.room===state.room&&saved?.name===p.name)setCargoCarry(true,{persist:false,sync:false})}catch{}}
}
function updateCargoCarryVisual(){
  const visual=ensureCargoCarryVisual(),p=me();if(!visual)return;
  visual.visible=!!(cameraMode===2&&cargoCarryActive&&localModel&&p?.alive&&!p.hidden&&!p.reported);if(!visual.visible)return;
  const yaw=Number(firstPersonYaw)||Number(localModel.rotation.y)||0,forwardX=Math.sin(yaw),forwardZ=Math.cos(yaw);
  visual.position.set(localModel.position.x+forwardX*.86,1.18,localModel.position.z+forwardZ*.86);visual.rotation.y=yaw;visual.rotation.z=Math.sin(performance.now()/180)*.018;
}
function taskDisplayName(id){const carrying=id==='cargo'&&(cargoCarryActive||Boolean(me()?.carryingCargo));return carrying?'貨物運搬：管理室へ':TASKS[id]?.[0]||id}
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
  ws.onclose=event=>{if(socket!==ws)return;socket=null;stopMeetingVoice();stopGroupVoice(false);hangUpCall(false);clearIncomingCall(false);const detail=event.reason?`：${event.reason}`:'';if(joinPending)failJoin(`ルームへ接続できませんでした（code ${event.code}${detail}）。`,false);else showNotice(`接続が切れました（code: ${event.code}${detail}）。再読み込みしてください。`)};
  ws.onerror=error=>{console.error('WebSocket error',error);if(joinPending)setMenuMessage('サーバーへ接続できません。公開先とWorker設定を確認してください。',true)};
}
function handle(m){
  if(m.type==='hello'){
    myId=m.id;ui.room.textContent=m.room;
  }else if(m.type==='joined'){
    if(m.id)myId=m.id;finishJoin(m.room);
  }else if(m.type==='state'){
    if(m.state?.mapVersion&&m.state.mapVersion!==MAP_VERSION){console.warn('[Hidden Crew] client/server version mismatch',MAP_VERSION,m.state.mapVersion)}
    const previousSelf=state?.players?.find(player=>player.id===myId);
    const wasAlive=previousSelf?.alive;
    state=m.state;syncCargoCarryState();
    if(state.phase!=='meeting'&&(meetingVoiceStream||meetingVoiceProcessor))stopMeetingVoice();
    if(joinPending&&myId&&state.players?.some(player=>player.id===myId))finishJoin(state.room);
    ui.start.disabled=false;ui.start.textContent='ゲーム開始';updateUI();updateAdvancedUI();syncModels();updateGroupVoiceUi();
    const currentSelf=me();
    if(wasAlive===true&&currentSelf&&!currentSelf.alive){
      spectatorTargetId=null;clearKeys();localVelocity.set(0,0);
      for(const dialogId of ['taskDialog','securityDialog','sabotageDialog','incomingCallDialog'])closeDialog(dialogId);
      showNotice('倒されました。観戦モードへ切り替えました。');
    }
    if(currentSelf?.alive){spectatorTargetId=null;lastKnownAlive=true}else if(currentSelf){lastKnownAlive=false}
    updateSpectatorUI();
    if(activeCallPeer){const callTarget=state.players?.find(p=>p.id===activeCallPeer);if(!callTarget?.connected||!callTarget?.alive){showNotice('通話相手が退出したため通話を終了しました。');hangUpCall(false)}else updateCallUi()}
    if(state.phase==='meeting'&&document.getElementById('meetingDialog')?.open)updateMeetingVoiceUi();
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
  }else if(m.type==='gameStarted'){ui.start.disabled=false;ui.start.textContent='ゲーム開始';showNotice(m.practiceMode?'1人練習：あなたは人狼です':'ゲームを開始しました')}
  else if(m.type==='meetingStarted'){openMeeting(m.reason);updateGroupVoiceUi()}
  else if(m.type==='meetingEnded'){stopMeetingVoice();closeDialog('meetingDialog');updateGroupVoiceUi();showNotice(m.ejected?`${m.ejected.name}が追放されました。役職は公開されません。`:'誰も追放されませんでした')}
  else if(m.type==='voiceSignal')handleVoiceSignal(m);
  else if(m.type==='voiceAudio')handleVoiceAudio(m);
  else if(m.type==='meetingVoiceAudio')handleMeetingVoiceAudio(m);
  else if(m.type==='groupVoiceAudio')handleGroupVoiceAudio(m);
  else if(m.type==='callControl')handleCallControl(m);
  else if(m.type==='chat')appendChat(m);
  else if(m.type==='sabotage')showNotice('妨害が発生しました');
  else if(m.type==='sabotageFixed')showNotice('妨害が解除されました');
  else if(m.type==='gameFinished'){stopMeetingVoice();hangUpCall(true);saveResult(m.winner);openResult(m.winner)}
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
  addEventListener('orientationchange',()=>{clearKeys();setTimeout(resize,80)});
  window.visualViewport?.addEventListener('resize',resize);
  window.visualViewport?.addEventListener('scroll',resize);
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
  const mapWidth=MAP_BOUNDS.maxX-MAP_BOUNDS.minX,mapHeight=MAP_BOUNDS.maxZ-MAP_BOUNDS.minZ;
  const scale=Math.min(w/(mapWidth+5),h/(mapHeight+5)),offsetX=(w-mapWidth*scale)/2,offsetY=(h-mapHeight*scale)/2;
  const sx=x=>offsetX+(x-MAP_BOUNDS.minX)*scale,sz=z=>offsetY+(z-MAP_BOUNDS.minZ)*scale;
  ctx.fillStyle='#020711';ctx.fillRect(0,0,w,h);
  for(const zone of MAP_ZONES){ctx.fillStyle=`#${Number(zone.color||0x1a3146).toString(16).padStart(6,'0')}`;ctx.fillRect(sx(zone.x-zone.w/2),sz(zone.z-zone.d/2),zone.w*scale,zone.d*scale)}
  ctx.fillStyle='#14263d';for(const o of WALLS)ctx.fillRect(sx(o.x-o.w/2),sz(o.z-o.d/2),Math.max(1,o.w*scale),Math.max(1,o.d*scale));if(doorLockdownActive()){ctx.fillStyle='#ff3448';for(const door of DOOR_BARRIERS)ctx.fillRect(sx(door.x-door.w/2),sz(door.z-door.d/2),Math.max(2,door.w*scale),Math.max(2,door.d*scale))}
  ctx.fillStyle='#26384b';for(const o of SOLID_PROPS)ctx.fillRect(sx(o.x-o.w/2),sz(o.z-o.d/2),o.w*scale,o.d*scale);
  ctx.fillStyle='#355064';ctx.beginPath();ctx.arc(sx(0),sz(0),2.25*scale,0,Math.PI*2);ctx.fill();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${Math.max(8,scale*.28)}px sans-serif`;for(const room of ROOMS){ctx.fillStyle='rgba(225,248,255,.8)';ctx.fillText(room.name,sx(room.x),sz(room.z))}
  for(const [id,[name,x,z]] of Object.entries(TASKS)){ctx.fillStyle='#46dfff';ctx.fillRect(sx(x)-.35*scale,sz(z)-.35*scale,.7*scale,.7*scale)}
  if(cargoCarryActive){ctx.fillStyle='#ffbd5a';ctx.fillRect(sx(CARGO_DELIVERY.x)-.5*scale,sz(CARGO_DELIVERY.z)-.5*scale,scale,scale)}
  for(const locker of LOCKERS){const occupied=state?.players?.some(p=>p.hidden&&p.hiddenAt===locker.id);ctx.fillStyle=occupied?'#ffb34d':'#3b6680';ctx.fillRect(sx(locker.x)-.45*scale,sz(locker.z)-.35*scale,.9*scale,.7*scale)}
  for(const p of state?.players||[]){if(!corpseIsVisible(p))continue;const x=sx(Number(p.bodyX)),y=sz(Number(p.bodyZ)),hex=(COLORS[p.color]||0xffffff).toString(16).padStart(6,'0');ctx.save();ctx.translate(x,y);ctx.rotate(Number(p.bodyRotation||0));ctx.strokeStyle='#ff4055';ctx.lineWidth=Math.max(2,.12*scale);ctx.beginPath();ctx.ellipse(0,0,.9*scale,.5*scale,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=`#${hex}`;ctx.beginPath();ctx.ellipse(0,0,.68*scale,.34*scale,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#a8eaff';ctx.beginPath();ctx.ellipse(.25*scale,-.08*scale,.23*scale,.13*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle='#ffffff';ctx.font=`bold ${Math.max(10,scale*.3)}px sans-serif`;ctx.fillText('遺体',x,y-.85*scale)}
  for(const p of state?.players||[]){if(!playerVisibleToLocalViewer(p))continue;const model=models.get(p.id),x=model?.position?.x??p.x,z=model?.position?.z??p.z;const hex=(COLORS[p.color]||0xffffff).toString(16).padStart(6,'0');ctx.globalAlpha=p.alive?1:.35;ctx.fillStyle=`#${hex}`;ctx.beginPath();ctx.arc(sx(x),sz(z),.52*scale,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#ffffff';ctx.font=`bold ${Math.max(9,scale*.3)}px sans-serif`;ctx.fillText(p.name,sx(x),sz(z)-.75*scale)}
  ctx.fillStyle='rgba(2,7,17,.75)';ctx.fillRect(10,h-40,340,30);ctx.fillStyle='#dffcff';ctx.textAlign='left';ctx.font='14px sans-serif';ctx.fillText('軽量マップ表示中（操作・機能はそのまま使えます）',20,h-20);
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
  ctx.fillStyle='#071524';ctx.fillRect(sx(MAP_BOUNDS.minX),sz(MAP_BOUNDS.minZ),mapWidth*scale,mapHeight*scale);
  ctx.strokeStyle='#2d6f92';ctx.lineWidth=1;ctx.strokeRect(sx(MAP_BOUNDS.minX),sz(MAP_BOUNDS.minZ),mapWidth*scale,mapHeight*scale);
  for(const zone of MAP_ZONES){ctx.fillStyle=`#${Number(zone.color||0x1a3146).toString(16).padStart(6,'0')}`;ctx.fillRect(sx(zone.x-zone.w/2),sz(zone.z-zone.d/2),zone.w*scale,zone.d*scale)}

  ctx.fillStyle='#1b3147';
  for(const wall of WALLS)ctx.fillRect(sx(wall.x-wall.w/2),sz(wall.z-wall.d/2),wall.w*scale,wall.d*scale);
  ctx.fillStyle='#385164';
  for(const prop of SOLID_PROPS)ctx.fillRect(sx(prop.x-prop.w/2),sz(prop.z-prop.d/2),Math.max(2,prop.w*scale),Math.max(2,prop.d*scale));

  if(cargoCarryActive){ctx.strokeStyle='#ffcf65';ctx.lineWidth=2;ctx.strokeRect(sx(CARGO_DELIVERY.x)-5,sz(CARGO_DELIVERY.z)-5,10,10)}

  const self=me();
  if(!self)return;
  for(const player of state?.players||[]){
    if(!playerVisibleToLocalViewer(player))continue;
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
function isTypingTarget(target){return target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement||target?.isContentEditable}function isDown(...codes){return codes.some(code=>keyCodes.has(code))}function handleKeyDown(e){if(isTypingTarget(e.target))return;const code=e.code;const key=String(e.key||'').toLowerCase();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();keyCodes.add(code);keys.add(key);if(e.repeat)return;if(code==='KeyE')useAction();if(code==='KeyR')reportAction();if(code==='KeyQ'||code==='Space')attackAction();if(code==='KeyM')meetingAction()}function handleKeyUp(e){if(isTypingTarget(e.target))return;const code=e.code;const key=String(e.key||'').toLowerCase();if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();keyCodes.delete(code);keys.delete(key)}function clearKeys(){keyCodes.clear();keys.clear();localVelocity.set(0,0);joy={x:0,y:0};firstPersonInputSignature='';if(ui.stick)ui.stick.style.transform='translate(0px,0px)'}function init3D(){
  if(renderer)return;
  renderMode='3d';canvas2d=null;
  const cameraButton=$('cameraButton');if(cameraButton){cameraButton.disabled=false;cameraButton.textContent=cameraMode===0?'近い視点へ切替':cameraMode===1?'一人称視点へ切替':'見下ろし視点へ切替';}
  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x06111c);
  scene.fog=new THREE.FogExp2(0x06111c,.0065);
  camera=new THREE.PerspectiveCamera(54,Math.max(1,innerWidth)/Math.max(1,innerHeight),.06,180);
  camera.position.set(0,15,10);
  camera.lookAt(0,.8,0);
  scene.add(camera);
  const canvas=$('gameCanvas');
  if(!canvas)throw new Error('gameCanvas が見つかりません');
  canvas.style.display='block';
  renderer=new THREE.WebGLRenderer({canvas,antialias:!PERF.lowPower,powerPreference:'high-performance',failIfMajorPerformanceCaveat:false});
  preferredRendererPixelRatio=Math.min(devicePixelRatio||1,PERF.maxPixelRatio);
  currentRendererPixelRatio=preferredRendererPixelRatio;
  renderer.setPixelRatio(currentRendererPixelRatio);
  renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight),false);
  renderer.setClearColor(0x06111c,1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.shadowMap.enabled=PERF.enableShadows;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=PERF.enableShadows;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.52;
  clock=new THREE.Clock();
  buildWorld();
  installRuntimeHandlers();
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();
    console.error('[Hidden Crew] WebGL context lost');
    try{init2DFallback(new Error('WebGLの描画が停止しました'))}catch(error){console.error('[Hidden Crew] WebGL recovery failed',error);showFatalLoadError(error)}
  },{once:true});
  startAnimationLoop();
  showNotice('見下ろし: 方向移動／一人称: 前後移動＋左右旋回　使用: E　通報: R');
}
function createHazardTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#1a2028';ctx.fillRect(0,0,256,64);
  ctx.save();ctx.translate(-64,0);ctx.rotate(-Math.PI/4);ctx.fillStyle='#e2aa2d';
  for(let x=-128;x<512;x+=52)ctx.fillRect(x,-180,24,420);ctx.restore();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,1);return texture;
}
function addBulkheadFrame(zone,door,materials,hazardTexture){
  const [side,offset=0,width=3.6]=door;const group=new THREE.Group();
  const horizontal=side==='north'||side==='south';
  const x=zone.x+(horizontal?offset:(side==='east'?zone.w/2:-zone.w/2));
  const z=zone.z+(horizontal?(side==='north'?zone.d/2:-zone.d/2):offset);
  group.position.set(x,0,z);if(horizontal)group.rotation.y=Math.PI/2;
  const half=Math.max(1.15,width/2),postGeo=new THREE.BoxGeometry(.22,2.8,.32);
  for(const sign of [-1,1]){const post=new THREE.Mesh(postGeo,materials.frame);post.position.set(0,1.4,sign*(half-.12));post.castShadow=true;post.receiveShadow=true;group.add(post)}
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(.34,.28,width),materials.frame);lintel.position.set(0,2.72,0);lintel.castShadow=PERF.enableShadows;group.add(lintel);
  const status=new THREE.Mesh(new THREE.BoxGeometry(.05,.11,.7),materials.status);status.position.set(-.19,2.7,0);group.add(status);
  const threshold=new THREE.Mesh(new THREE.PlaneGeometry(.9,width),new THREE.MeshStandardMaterial({map:hazardTexture,metalness:.35,roughness:.58,side:THREE.DoubleSide}));threshold.rotation.y=Math.PI/2;threshold.rotation.x=-Math.PI/2;threshold.position.set(0,.018,0);group.add(threshold);
  scene.add(group);
}
function doorLockdownActive(){
  return state?.sabotage?.kind==='doors'&&Number(state.sabotage.endsAt||0)>Date.now();
}
function buildDoorLockdownVisuals(){
  doorLockGroup=new THREE.Group();doorLockGroup.name='door-lockdown';doorLockGroup.visible=false;
  doorLockPanelMaterial=new THREE.MeshStandardMaterial({color:0x5a1821,emissive:0x8d0715,emissiveIntensity:1.25,metalness:.88,roughness:.3});
  doorLockWarningMaterial=new THREE.MeshBasicMaterial({color:0xff4050,transparent:true,opacity:.88});
  const panelGeometry=new THREE.BoxGeometry(1,1,1),warningGeometry=new THREE.BoxGeometry(1,1,1),helper=new THREE.Object3D();
  const panels=new THREE.InstancedMesh(panelGeometry,doorLockPanelMaterial,DOOR_BARRIERS.length);
  const warnings=new THREE.InstancedMesh(warningGeometry,doorLockWarningMaterial,DOOR_BARRIERS.length);
  DOOR_BARRIERS.forEach((door,index)=>{
    helper.position.set(door.x,1.42,door.z);helper.scale.set(door.w,2.78,door.d);helper.updateMatrix();panels.setMatrixAt(index,helper.matrix);
    helper.position.set(door.x,1.45,door.z);helper.scale.set(Math.max(.18,door.w*.88),.14,Math.max(.18,door.d+.035));helper.updateMatrix();warnings.setMatrixAt(index,helper.matrix);
  });
  panels.instanceMatrix.needsUpdate=true;warnings.instanceMatrix.needsUpdate=true;
  panels.castShadow=PERF.enableShadows;panels.receiveShadow=true;panels.frustumCulled=false;warnings.frustumCulled=false;
  doorLockGroup.add(panels,warnings);scene.add(doorLockGroup);
}
function updateDoorLockdownVisuals(now=performance.now()/1000){
  if(!doorLockGroup)return;
  const active=doorLockdownActive();doorLockGroup.visible=active;
  if(!active)return;
  if(doorLockPanelMaterial)doorLockPanelMaterial.emissiveIntensity=1.05+Math.max(0,Math.sin(now*7))*.8;
  if(doorLockWarningMaterial)doorLockWarningMaterial.opacity=.55+Math.max(0,Math.sin(now*9))*.4;
}
function buildFacilityEnclosure(){
  ceilingGroup=new THREE.Group();ceilingGroup.name='sealed-ceiling';
  const ceilingMat=new THREE.MeshStandardMaterial({color:0x29465a,emissive:0x0b2130,emissiveIntensity:.58,metalness:.72,roughness:.48});
  const beamMat=new THREE.MeshStandardMaterial({color:0x496b83,emissive:0x0b2030,emissiveIntensity:.42,metalness:.82,roughness:.34});
  const lampMat=new THREE.MeshStandardMaterial({color:0xdff7ff,emissive:0x8fdcf5,emissiveIntensity:1.15,metalness:.08,roughness:.42});
  const ventMat=new THREE.MeshStandardMaterial({color:0x08121b,metalness:.88,roughness:.42});
  for(const zone of MAP_ZONES){
    const slab=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.6,zone.w-.14),.18,Math.max(.6,zone.d-.14)),ceilingMat);
    slab.position.set(zone.x,3.48,zone.z);slab.receiveShadow=true;slab.layers.set(2);ceilingGroup.add(slab);
    const longX=zone.w>=zone.d,span=Math.min(longX?zone.w:zone.d,5.2);
    const fixture=new THREE.Mesh(new THREE.BoxGeometry(longX?span:.38,.08,longX?.38:span),lampMat);
    fixture.position.set(zone.x,3.34,zone.z);fixture.layers.set(2);ceilingGroup.add(fixture);
    const vent=new THREE.Mesh(new THREE.BoxGeometry(longX?1.15:.65,.07,longX?.65:1.15),ventMat);
    vent.position.set(zone.x+(longX?0:Math.min(zone.w*.23,1.4)),3.335,zone.z+(longX?Math.min(zone.d*.23,1.4):0));vent.layers.set(2);ceilingGroup.add(vent);
    if(zone.w>11||zone.d>10){
      const beam=new THREE.Mesh(new THREE.BoxGeometry(longX?.22:zone.w*.82,.22,longX?zone.d*.82:.22),beamMat);
      beam.position.set(zone.x,3.25,zone.z);beam.layers.set(2);ceilingGroup.add(beam);
    }
  }
  scene.add(ceilingGroup);
  const lightColorByRoom={reactorRoom:0xffb0a1,engineRoom:0xffd59a,weaponsRoom:0xffb8c4,medicalRoom:0xb6f4ff,storageRoom:0xffdda1,commsRoom:0xa6fff4,shieldRoom:0xa8fff2,navigationRoom:0xb9ddff,adminRoom:0xb9e9ff,securityRoom:0xb8d8ff,atrium:0xc6e8ff,hub:0xd8f5ff};
  ROOMS.forEach((room,index)=>{
    const color=lightColorByRoom[room.id]||0xc7efff;
    const baseIntensity=room.id==='hub'?4.6:3.85;
    const light=new THREE.PointLight(color,baseIntensity,Math.max(room.w,room.d)*1.62+9,1.25);
    light.position.set(room.x,2.9,room.z);light.castShadow=false;scene.add(light);
    facilityLights.push({light,baseIntensity,phase:index*.73,x:room.x,z:room.z});
  });
  const emergencyPositions=[[-27,18],[-27,6],[-16,-2],[0,0],[20,-15],[29,0],[23,15]];
  const emergencyMat=new THREE.MeshStandardMaterial({color:0x46131a,emissive:0xff2438,emissiveIntensity:1.5,metalness:.45,roughness:.28});
  emergencyPositions.forEach(([x,z],index)=>{
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.13,14,8),emergencyMat);dome.scale.y=.45;dome.position.set(x,2.78,z);dome.layers.set(2);ceilingGroup.add(dome);
    const light=new THREE.PointLight(0xff3348,.08,7,2);light.position.set(x,2.55,z);scene.add(light);emergencyLights.push({light,phase:index*.91,x,z});
  });
  const frameMaterials={frame:new THREE.MeshStandardMaterial({color:0x344d60,metalness:.9,roughness:.25}),status:new THREE.MeshStandardMaterial({color:0x63e7ff,emissive:0x25bce0,emissiveIntensity:2.6,metalness:.25,roughness:.25})};
  const hazardTexture=createHazardTexture();
  for(const room of ROOMS){if(room.doors?.length)addBulkheadFrame(room,room.doors[0],frameMaterials,hazardTexture)}
  const baseMat=new THREE.MeshStandardMaterial({color:0x1f4559,emissive:0x061a24,emissiveIntensity:.8,metalness:.86,roughness:.28});
  const lowerTrim=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),baseMat,WALLS.length);const helper=new THREE.Object3D();
  WALLS.forEach((wall,index)=>{helper.position.set(wall.x,.22,wall.z);helper.scale.set(wall.w+.04,.16,wall.d+.04);helper.updateMatrix();lowerTrim.setMatrixAt(index,helper.matrix)});
  lowerTrim.instanceMatrix.needsUpdate=true;scene.add(lowerTrim);
}
function updateFacilityLighting(dt=.016){
  if(!facilityAmbientLight)return;
  const lightsOut=state?.sabotage?.kind==='lights';const now=performance.now()/1000;
  const securityPreset=securityOpen?SECURITY_CAMERAS[securityCameraIndex]:null;
  const subject=securityPreset?{x:securityPreset.target[0],z:securityPreset.target[2]}:(cameraViewSubject?.().model?.position||localModel?.position||camera?.position||{x:0,z:0});
  const lightRadius=PERF.lowPower?16:22,lightRadiusSq=lightRadius*lightRadius;
  const ambientTarget=lightsOut?.24:2.15;facilityAmbientLight.intensity+=((ambientTarget)-facilityAmbientLight.intensity)*(1-Math.exp(-5*dt));
  if(facilityKeyLight){const target=lightsOut?.12:1.2;facilityKeyLight.intensity+=(target-facilityKeyLight.intensity)*(1-Math.exp(-4*dt))}
  for(const entry of facilityLights){
    const dx=entry.x-subject.x,dz=entry.z-subject.z;
    const active=dx*dx+dz*dz<=lightRadiusSq;
    entry.light.visible=active;
    if(!active)continue;
    const flicker=lightsOut?(Math.sin(now*18+entry.phase)>0.78?.34:.055):1;
    const target=entry.baseIntensity*flicker;entry.light.intensity+=(target-entry.light.intensity)*(1-Math.exp(-(lightsOut?14:5)*dt));
  }
  for(const entry of emergencyLights){
    const dx=entry.x-subject.x,dz=entry.z-subject.z;
    const active=lightsOut&&dx*dx+dz*dz<=(lightRadiusSq*1.25);
    entry.light.visible=active;
    if(!active)continue;
    const pulse=.78+.22*Math.sin(now*4.8+entry.phase);const target=1.45*pulse;entry.light.intensity+=(target-entry.light.intensity)*(1-Math.exp(-8*dt));
  }
}
function updateEnclosureCameraLayer(){
  if(!camera||lastEnclosureMode===cameraMode)return;
  lastEnclosureMode=cameraMode;camera.layers.enable(0);
  if(cameraMode===2)camera.layers.enable(2);else camera.layers.disable(2);
  if(cameraFillLight)cameraFillLight.visible=cameraMode===2;
  if(headLamp)headLamp.visible=cameraMode===2;
}
function buildWorld(){
  facilityAmbientLight=new THREE.HemisphereLight(0xe6f8ff,0x29445a,2.15);scene.add(facilityAmbientLight);
  facilityKeyLight=new THREE.DirectionalLight(0xe4f6ff,1.18);facilityKeyLight.position.set(8,18,12);facilityKeyLight.castShadow=PERF.enableShadows;
  if(PERF.enableShadows){facilityKeyLight.shadow.mapSize.set(PERF.shadowMapSize,PERF.shadowMapSize);facilityKeyLight.shadow.camera.left=-38;facilityKeyLight.shadow.camera.right=38;facilityKeyLight.shadow.camera.top=28;facilityKeyLight.shadow.camera.bottom=-28;facilityKeyLight.shadow.bias=-.00035}
  scene.add(facilityKeyLight);
  facilityFillLight=new THREE.DirectionalLight(0x80b9d8,.72);facilityFillLight.position.set(12,9,-14);scene.add(facilityFillLight);
  cameraFillLight=new THREE.PointLight(0xe7f9ff,1.12,12,1.35);cameraFillLight.position.set(0,.12,.1);cameraFillLight.visible=false;camera.add(cameraFillLight);
  headLamp=new THREE.SpotLight(0xeafaff,1.18,16,Math.PI/4.2,.72,1.15);headLamp.position.set(0,.05,.1);headLamp.target.position.set(0,-.12,7);headLamp.visible=false;camera.add(headLamp);camera.add(headLamp.target);
  const mapWidth=MAP_BOUNDS.maxX-MAP_BOUNDS.minX,mapDepth=MAP_BOUNDS.maxZ-MAP_BOUNDS.minZ;
  const floor=new THREE.Mesh(new THREE.BoxGeometry(mapWidth+2,.5,mapDepth+2),new THREE.MeshPhysicalMaterial({color:0x061522,metalness:.58,roughness:.34,clearcoat:.7}));floor.position.set((MAP_BOUNDS.minX+MAP_BOUNDS.maxX)/2,-.32,(MAP_BOUNDS.minZ+MAP_BOUNDS.maxZ)/2);floor.receiveShadow=true;scene.add(floor);
  for(const zone of MAP_ZONES){const m=new THREE.Mesh(new THREE.BoxGeometry(zone.w,.07,zone.d),new THREE.MeshStandardMaterial({color:zone.color||0x1a3146,metalness:.32,roughness:.52}));m.position.set(zone.x,-.025,zone.z);m.receiveShadow=true;scene.add(m)}
  for(let x=MAP_BOUNDS.minX+1;x<MAP_BOUNDS.maxX;x+=2.5){const l=new THREE.Mesh(new THREE.BoxGeometry(.025,.02,mapDepth),new THREE.MeshBasicMaterial({color:0x16405e,transparent:true,opacity:.42}));l.position.set(x,.005,(MAP_BOUNDS.minZ+MAP_BOUNDS.maxZ)/2);scene.add(l)}
  for(let z=MAP_BOUNDS.minZ+1;z<MAP_BOUNDS.maxZ;z+=2.5){const l=new THREE.Mesh(new THREE.BoxGeometry(mapWidth,.02,.025),new THREE.MeshBasicMaterial({color:0x123651,transparent:true,opacity:.42}));l.position.set((MAP_BOUNDS.minX+MAP_BOUNDS.maxX)/2,.006,z);scene.add(l)}
  const wallMat=new THREE.MeshStandardMaterial({color:0x385873,emissive:0x0d2638,emissiveIntensity:.72,metalness:.64,roughness:.5});
  const trimMat=new THREE.MeshStandardMaterial({color:0x6399b7,metalness:.68,roughness:.36,emissive:0x12394d,emissiveIntensity:.75});
  // 大型マップでもスマホの描画が重くならないよう、壁を2つのInstancedMeshへ集約する。
  const wallInstances=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),wallMat,WALLS.length);
  const trimInstances=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),trimMat,WALLS.length);
  const matrixObject=new THREE.Object3D();
  WALLS.forEach((o,index)=>{matrixObject.position.set(o.x,1.6,o.z);matrixObject.scale.set(o.w,3.2,o.d);matrixObject.updateMatrix();wallInstances.setMatrixAt(index,matrixObject.matrix);matrixObject.position.set(o.x,3.24,o.z);matrixObject.scale.set(o.w+.06,.09,o.d+.06);matrixObject.updateMatrix();trimInstances.setMatrixAt(index,matrixObject.matrix)});
  wallInstances.instanceMatrix.needsUpdate=true;trimInstances.instanceMatrix.needsUpdate=true;wallInstances.castShadow=PERF.enableShadows;wallInstances.receiveShadow=PERF.enableShadows;scene.add(wallInstances,trimInstances);
  buildDoorLockdownVisuals();
  buildFacilityEnclosure();
  const addFloorLabel=(text,x,z)=>{const c=document.createElement('canvas');c.width=512;c.height=112;const ctx=c.getContext('2d');ctx.fillStyle='rgba(4,17,30,.82)';ctx.fillRect(0,0,512,112);ctx.strokeStyle='#59dfff';ctx.lineWidth=4;ctx.strokeRect(3,3,506,106);ctx.fillStyle='#e4fbff';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,56);const m=new THREE.Mesh(new THREE.PlaneGeometry(4.1,.9),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));m.position.set(x,.055,z);m.rotation.x=-Math.PI/2;scene.add(m)};
  ROOMS.forEach(room=>addFloorLabel(room.name,room.x,room.z));
  const addCrate=(x,z,color=0x765733,w=1.4,d=1.4)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,1.15,d),new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.7}));m.position.set(x,.57,z);m.castShadow=true;scene.add(m)};
  addCrate(-10.5,-14.5,0x765733,1.6,1.6);addCrate(-5.2,-19.2,0x526779,1.8,1.5);addCrate(18.2,-16.8,0x647383,1.6,1.6);addCrate(25.5,13,0x526779,1.5,1.5);
  const consoleMesh=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.25,1.6),new THREE.MeshStandardMaterial({color:0x26384b,metalness:.72,roughness:.3}));consoleMesh.position.set(SECURITY_CONSOLE.x,.625,SECURITY_CONSOLE.z);consoleMesh.castShadow=true;scene.add(consoleMesh);
  const table=new THREE.Mesh(new THREE.CylinderGeometry(2.15,2.3,.72,40),new THREE.MeshStandardMaterial({color:0x355064,metalness:.75,roughness:.28}));table.position.set(0,.36,0);table.castShadow=true;scene.add(table);const emergency=new THREE.Mesh(new THREE.CylinderGeometry(.52,.6,.25,32),new THREE.MeshStandardMaterial({color:0xd82e3c,emissive:0x5b0810}));emergency.position.set(0,.86,0);scene.add(emergency);
  Object.entries(TASKS).forEach(([id,[,x,z]],i)=>{const g=new THREE.Group();const base=new THREE.Mesh(new THREE.BoxGeometry(1.25,1.35,.65),new THREE.MeshStandardMaterial({color:0x26384b,metalness:.72,roughness:.3}));base.position.y=.68;base.castShadow=true;g.add(base);const screen=new THREE.Mesh(new THREE.PlaneGeometry(.86,.48),new THREE.MeshBasicMaterial({color:[0x48eaff,0x73ff93,0xffcb4e,0xff719e][i%4]}));screen.position.set(0,.88,.331);g.add(screen);g.position.set(x,0,z);scene.add(g)});
  const cargoDock=new THREE.Group();const dockBase=new THREE.Mesh(new THREE.BoxGeometry(1.8,.25,1.5),new THREE.MeshStandardMaterial({color:0x75512f,metalness:.18,roughness:.72}));dockBase.position.y=.13;dockBase.castShadow=true;cargoDock.add(dockBase);const dockGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.45,1.15),new THREE.MeshBasicMaterial({color:0xffc95c,transparent:true,opacity:.32,side:THREE.DoubleSide}));dockGlow.rotation.x=-Math.PI/2;dockGlow.position.y=.265;cargoDock.add(dockGlow);cargoDock.position.set(CARGO_DELIVERY.x,0,CARGO_DELIVERY.z);scene.add(cargoDock);
  const addLocker=(locker)=>{const group=new THREE.Group();const shellMat=new THREE.MeshStandardMaterial({color:0x28445a,metalness:.78,roughness:.3});const darkMat=new THREE.MeshStandardMaterial({color:0x07131f,metalness:.35,roughness:.55});const shell=new THREE.Mesh(new THREE.BoxGeometry(1.15,2.55,.9),shellMat);shell.position.y=1.275;shell.castShadow=PERF.enableShadows;group.add(shell);const recess=new THREE.Mesh(new THREE.BoxGeometry(.86,2.15,.08),darkMat);recess.position.set(0,1.25,.47);group.add(recess);const doorPivot=new THREE.Group();doorPivot.position.set(-.46,0,.52);const door=new THREE.Mesh(new THREE.BoxGeometry(.9,2.18,.08),new THREE.MeshStandardMaterial({color:0x3b6680,metalness:.82,roughness:.25}));door.position.set(.45,1.25,0);door.castShadow=true;doorPivot.add(door);const handle=new THREE.Mesh(new THREE.BoxGeometry(.06,.3,.07),new THREE.MeshBasicMaterial({color:0x9cecff}));handle.position.set(.78,1.2,.07);doorPivot.add(handle);group.add(doorPivot);const lamp=new THREE.Mesh(new THREE.SphereGeometry(.08,12,8),new THREE.MeshBasicMaterial({color:0x63f4ff}));lamp.position.set(0,2.38,.53);group.add(lamp);group.position.set(locker.x,0,locker.z);group.rotation.y=locker.rot;group.userData={doorPivot,lamp,open:0,lockerId:locker.id};scene.add(group);lockerVisuals.set(locker.id,group)};LOCKERS.forEach(addLocker);
  const starGeo=new THREE.BufferGeometry(),pts=[];for(let i=0;i<1500;i++)pts.push((Math.random()-.5)*150,Math.random()*52+5,(Math.random()-.5)*150);starGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xffffff,size:.09})));
}
const HAT_TYPES=new Set(['none','cap','crown','antenna','beanie','hardhat','wizard','flower','halo']);
function disposeAccessory(object){
  if(!object)return;
  object.traverse(child=>{child.geometry?.dispose?.();if(child.material){const list=Array.isArray(child.material)?child.material:[child.material];for(const material of list)material.dispose?.()}});
}
function createHatAccessory(rawType){
  const type=HAT_TYPES.has(String(rawType||'none'))?String(rawType||'none'):'none';
  const group=new THREE.Group();group.name='characterAccessory';group.position.y=2.02;
  const standard=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.35,metalness:.08,...extra});
  const basic=color=>new THREE.MeshBasicMaterial({color});
  const add=(mesh,x=0,y=0,z=0)=>{mesh.position.set(x,y,z);mesh.castShadow=PERF.enableShadows;group.add(mesh);return mesh};
  if(type==='cap'){
    const dome=add(new THREE.Mesh(new THREE.SphereGeometry(.45,20,12,0,Math.PI*2,0,Math.PI/2),standard(0x2e6ed8)),0,0,0);dome.scale.z=.86;
    add(new THREE.Mesh(new THREE.BoxGeometry(.58,.08,.38),standard(0x234f9d)),0,-.02,.28);
  }else if(type==='crown'){
    add(new THREE.Mesh(new THREE.CylinderGeometry(.38,.42,.18,20),standard(0xf2c94c,{metalness:.45})),0,.02,0);
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;add(new THREE.Mesh(new THREE.ConeGeometry(.12,.42,12),standard(0xffdc63,{metalness:.42})),Math.sin(a)*.3,.29,Math.cos(a)*.3)}
    add(new THREE.Mesh(new THREE.SphereGeometry(.07,12,8),basic(0xff4f72)),0,.53,0);
  }else if(type==='antenna'){
    add(new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.62,10),standard(0x9bb7c9,{metalness:.5})),0,.27,0);
    add(new THREE.Mesh(new THREE.SphereGeometry(.13,16,10),new THREE.MeshBasicMaterial({color:0x62efff})),0,.62,0);
  }else if(type==='beanie'){
    const cap=add(new THREE.Mesh(new THREE.SphereGeometry(.46,20,12,0,Math.PI*2,0,Math.PI/2),standard(0x8d4bd6)),0,0,0);cap.scale.z=.9;
    add(new THREE.Mesh(new THREE.TorusGeometry(.4,.08,8,24),standard(0x6e36ad)),0,-.03,0).rotation.x=Math.PI/2;
    add(new THREE.Mesh(new THREE.SphereGeometry(.13,14,10),standard(0xd7b5ff)),0,.47,0);
  }else if(type==='hardhat'){
    const shell=add(new THREE.Mesh(new THREE.SphereGeometry(.48,20,12,0,Math.PI*2,0,Math.PI/2),standard(0xf5b52e,{metalness:.12})),0,.02,0);shell.scale.z=.88;
    add(new THREE.Mesh(new THREE.BoxGeometry(.9,.09,.56),standard(0xd99313)),0,-.02,.05);
    add(new THREE.Mesh(new THREE.BoxGeometry(.08,.18,.78),standard(0xffcf55)),0,.18,0);
  }else if(type==='wizard'){
    add(new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.06,24),standard(0x40307f)),0,-.03,0);
    const cone=add(new THREE.Mesh(new THREE.ConeGeometry(.42,.95,24),standard(0x51409c)),0,.43,0);cone.rotation.z=-.12;
    for(const [x,y,z] of [[.12,.42,.36],[-.18,.62,.14],[.2,.72,-.08]])add(new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),basic(0xffe47c)),x,y,z);
  }else if(type==='flower'){
    const center=add(new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),standard(0xffc93f)),.28,.12,.03);
    for(let i=0;i<6;i++){const a=i/6*Math.PI*2;const petal=add(new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),standard(0xff72b6)),.28+Math.cos(a)*.16,.12+Math.sin(a)*.16,.03);petal.scale.set(1,.62,.45)}
  }else if(type==='halo'){
    const halo=add(new THREE.Mesh(new THREE.TorusGeometry(.42,.035,10,32),new THREE.MeshBasicMaterial({color:0xfff2a6})),0,.52,0);halo.rotation.x=Math.PI/2;
  }
  group.visible=type!=='none';group.userData.hatType=type;return group;
}
function applyHatAccessory(model,rawType){
  if(!model||renderMode!=='3d')return;
  const type=HAT_TYPES.has(String(rawType||'none'))?String(rawType||'none'):'none';
  if(model.userData.hatType===type)return;
  const old=model.userData.hatGroup;if(old){model.remove(old);disposeAccessory(old)}
  const accessory=createHatAccessory(type);model.add(accessory);model.userData.hatGroup=accessory;model.userData.hatType=type;
}
function createCrewmate(c,hat='none'){const selectedColor=COLORS[c]?c:'white',group=new THREE.Group(),mat=new THREE.MeshPhysicalMaterial({color:COLORS[selectedColor],roughness:.18,metalness:.04,clearcoat:1,clearcoatRoughness:.1}),body=new THREE.Mesh(new THREE.CapsuleGeometry(.62,.88,10,22),mat);body.position.y=1.05;body.scale.z=.82;body.castShadow=PERF.enableShadows;group.add(body);[-.3,.3].forEach(x=>{const l=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.35,8,16),mat);l.position.set(x,.28,0);l.castShadow=PERF.enableShadows;group.add(l)});const pack=new THREE.Mesh(new THREE.BoxGeometry(.8,.9,.34),mat);pack.position.set(0,1.02,-.62);pack.castShadow=PERF.enableShadows;group.add(pack);const rim=new THREE.Mesh(new THREE.SphereGeometry(.52,32,18),new THREE.MeshStandardMaterial({color:0x10151d,metalness:.7,roughness:.16}));rim.scale.set(1.22,.72,.34);rim.position.set(0,1.28,.55);group.add(rim);const visor=new THREE.Mesh(new THREE.SphereGeometry(.46,32,18),new THREE.MeshPhysicalMaterial({color:0xa8eaff,roughness:.05,metalness:.1,clearcoat:1,transmission:.2,transparent:true,opacity:.96}));visor.scale.set(1.2,.68,.3);visor.position.set(0,1.3,.62);group.add(visor);const cargoBox=createCargoParcel(.82);cargoBox.position.set(0,1.02,.94);cargoBox.visible=false;group.add(cargoBox);group.userData.cargoBox=cargoBox;group.userData.target=new THREE.Vector3();group.userData.rotation=0;group.userData.skinMaterial=mat;group.userData.skinColor=selectedColor;applyHatAccessory(group,hat);return group}
function applySelectedSkin(model,color){if(!model||renderMode!=='3d')return;const selectedColor=COLORS[color]?color:'white';if(model.userData.skinColor===selectedColor)return;const material=model.userData.skinMaterial;if(material?.color){material.color.setHex(COLORS[selectedColor]);material.needsUpdate=true}model.userData.skinColor=selectedColor}
function createCorpseLabel(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=88;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='rgba(20,5,9,.88)';ctx.fillRect(8,8,240,72);
  ctx.strokeStyle='#ff6070';ctx.lineWidth=5;ctx.strokeRect(10,10,236,68);
  ctx.fillStyle='#ffffff';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('遺体',128,45);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:true}));
  sprite.scale.set(1.45,.5,1);sprite.position.set(0,1.55,0);sprite.renderOrder=20;
  return sprite;
}
function createCorpse(color,hat='none'){
  const group=new THREE.Group();
  const fallen=createCrewmate(color,hat);fallen.position.set(0,.64,0);fallen.rotation.z=-Math.PI/2;fallen.rotation.x=.08;fallen.scale.set(.82,.82,.82);
  if(fallen.userData.cargoBox)fallen.userData.cargoBox.visible=false;
  fallen.traverse(object=>{if(object.material){object.material.transparent=false;object.material.opacity=1;object.material.depthWrite=true}});
  group.add(fallen);
  const marker=new THREE.Mesh(new THREE.RingGeometry(.9,1.08,36),new THREE.MeshBasicMaterial({color:0xff3348,transparent:true,opacity:.62,side:THREE.DoubleSide,depthWrite:false}));
  marker.rotation.x=-Math.PI/2;marker.position.y=.025;marker.renderOrder=5;group.add(marker);
  const label=createCorpseLabel();group.add(label);
  group.userData.fallenModel=fallen;group.userData.marker=marker;group.userData.label=label;group.userData.skinColor=color;
  return group;
}
function corpseIsVisible(player){
  return Boolean(player&&!player.alive&&!player.reported&&!player.spectator&&Number(player.downedAt)>0&&Number.isFinite(Number(player.bodyX))&&Number.isFinite(Number(player.bodyZ)));
}
function syncCorpseModels(){
  if(renderMode!=='3d'||!scene){corpseModels.clear();return}
  const active=new Set();
  for(const player of state?.players||[]){
    if(!corpseIsVisible(player))continue;
    active.add(player.id);
    let corpse=corpseModels.get(player.id);
    if(!corpse){corpse=createCorpse(player.color,player.hat);corpseModels.set(player.id,corpse);scene.add(corpse)}
    const selectedColor=COLORS[player.color]?player.color:'white';
    if(corpse.userData.skinColor!==selectedColor){applySelectedSkin(corpse.userData.fallenModel,selectedColor);corpse.userData.skinColor=selectedColor}applyHatAccessory(corpse.userData.fallenModel,player.hat)
    corpse.position.set(Number(player.bodyX),0,Number(player.bodyZ));
    corpse.rotation.y=Number(player.bodyRotation||0);
    corpse.visible=true;
  }
  for(const[id,corpse]of corpseModels){
    if(active.has(id))continue;
    scene.remove(corpse);
    corpse.traverse(object=>{if(object.geometry)object.geometry.dispose?.();if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials){material.map?.dispose?.();material.dispose?.()}}});
    corpseModels.delete(id);
  }
}
function updateCorpseVisuals(now){
  const pulse=.52+Math.sin(now*.004)*.16;
  const scale=1+Math.sin(now*.0035)*.035;
  for(const corpse of corpseModels.values()){
    if(corpse.userData.marker){corpse.userData.marker.material.opacity=pulse;corpse.userData.marker.scale.setScalar(scale)}
    if(corpse.userData.label)corpse.userData.label.position.y=1.55+Math.sin(now*.003)*.05;
  }
}
function syncModels(){
  if(!state)return;
  const active=new Set();
  for(const p of state.players){
    active.add(p.id);
    let m=models.get(p.id);
    const created=!m;
    if(created){
      m=renderMode==='2d'?makeFallbackModel(p):createCrewmate(p.color,p.hat);
      models.set(p.id,m);
      if(renderMode==='3d')scene.add(m);
    }
    const hiddenChanged=m.userData.hidden!==Boolean(p.hidden);
    m.userData.hidden=Boolean(p.hidden);
    applySelectedSkin(m,p.color);
    applyHatAccessory(m,p.hat);
    m.userData.target.set(p.x,0,p.z);
    m.userData.rotation=p.rotation;
    if(created||p.id===myId&&(!localModel||hiddenChanged)){
      m.position.set(p.x,0,p.z);
      m.rotation.y=p.rotation||0;
    }
    m.visible=playerVisibleToLocalViewer(p);
    if(m.userData.cargoBox)m.userData.cargoBox.visible=Boolean(p.carryingCargo)&&(p.alive&&!p.hidden&&!p.reported);
    if(renderMode==='3d')m.traverse(o=>{if(o.material){const ghost=!p.alive;o.material.transparent=ghost;o.material.opacity=ghost?.2:1;o.material.depthWrite=!ghost}});
    if(p.id===myId){
      localModel=m;
      if(hiddenChanged){
        localVelocity.set(0,0);
        firstPersonInputSignature='';
        firstPersonInputBaseYaw=firstPersonTargetYaw;
      }
      if(!p.hidden&&collidesWithMap(m.position.x,m.position.z)){
        const safe=findNearestWalkablePosition(p.x,p.z);
        m.position.set(safe.x,0,safe.z);
        m.userData.target.copy(m.position);
        localVelocity.set(0,0);
        if(safe.x!==p.x||safe.z!==p.z)send('move',{x:safe.x,z:safe.z,rotation:m.rotation.y,clientTime:Date.now()});
      }
    }
  }
  for(const[id,m]of models)if(!active.has(id)){
    if(renderMode==='3d')scene.remove(m);
    models.delete(id);
    if(m===localModel)localModel=null;
  }
  syncCorpseModels();
}
function me(){return state?.players.find(p=>p.id===myId)}
function playerVisibleToLocalViewer(player){
  if(!player||player.reported||player.hidden)return false;
  if(player.alive)return true;
  const viewer=me();
  // 生存者には幽霊を一切表示しない。倒されたプレイヤー同士だけが確認できる。
  return Boolean(viewer&&!viewer.alive);
}
function livingSpectatorCandidates(){
  return (state?.players||[]).filter(player=>player.id!==myId&&!player.practiceTarget&&player.alive&&player.connected!==false);
}
function spectatorTarget(){
  if(!spectatorTargetId)return null;
  const player=(state?.players||[]).find(item=>item.id===spectatorTargetId&&item.alive&&item.connected!==false&&!item.practiceTarget);
  if(!player)spectatorTargetId=null;
  return player||null;
}
function restoreSpectatorHiddenModel(){
  if(!spectatorHiddenModelId)return;
  const model=models.get(spectatorHiddenModelId),player=(state?.players||[]).find(item=>item.id===spectatorHiddenModelId);
  if(model&&player)model.visible=playerVisibleToLocalViewer(player);
  spectatorHiddenModelId=null;
}
function setSpectatorTarget(id){
  restoreSpectatorHiddenModel();
  const self=me();
  if(!self||self.alive||state?.phase!=='playing')return;
  spectatorTargetId=id||null;localVelocity.set(0,0);clearKeys();joy={x:0,y:0};
  if(spectatorTargetId){
    const target=spectatorTarget();
    if(target){cameraMode=2;showNotice(`${target.name}の視点を観戦しています`)}
  }else showNotice('自由観戦へ戻りました');
  updateSpectatorUI();
}
function cycleSpectatorTarget(direction=1){
  const candidates=livingSpectatorCandidates();
  if(!candidates.length){setSpectatorTarget(null);showNotice('観戦できる生存者がいません');return}
  const currentIndex=candidates.findIndex(player=>player.id===spectatorTargetId);
  const nextIndex=currentIndex<0?(direction>0?0:candidates.length-1):(currentIndex+direction+candidates.length)%candidates.length;
  setSpectatorTarget(candidates[nextIndex].id);
}
function updateSpectatorUI(){
  const panel=$('spectatorPanel'),status=$('spectatorStatus'),free=$('spectatorFreeButton'),prev=$('spectatorPrevButton'),next=$('spectatorNextButton');
  const self=me(),active=state?.phase==='playing'&&self&&!self.alive&&!self.spectator;
  panel?.classList.toggle('hidden',!active);
  if(!active){restoreSpectatorHiddenModel();spectatorTargetId=null;return}
  const target=spectatorTarget(),candidates=livingSpectatorCandidates();
  if(status)status.textContent=target?`${target.name}の視点を共有中`:'自由観戦中（自分で移動可能）';
  if(free){free.disabled=!target;free.classList.toggle('primary',!target)}
  if(prev)prev.disabled=!candidates.length;
  if(next)next.disabled=!candidates.length;
  if(ui.joystick)ui.joystick.classList.toggle('hidden',!!target);
  const cameraButton=$('cameraButton');
  if(cameraButton&&target){const labels=['見下ろし','近い視点','一人称'];cameraButton.textContent=`観戦：${labels[(cameraMode+1)%3]}へ切替`}
}
$('spectatorFreeButton').onclick=()=>setSpectatorTarget(null);
$('spectatorPrevButton').onclick=()=>cycleSpectatorTarget(-1);
$('spectatorNextButton').onclick=()=>cycleSpectatorTarget(1);
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
  const player=me();
  const isWerewolf=player?.role==='impostor';
  const hasTarget=!!nearest.player;
  const ready=canKill()&&hasTarget;
  if(ui.killCooldown)ui.killCooldown.textContent=remaining>0?`${Math.ceil(remaining/1000)}秒`:'';
  if(ui.kill&&isWerewolf)ui.kill.disabled=!ready;
}
function updateUI(){if(!state)return;const p=me();if(p&&COLORS[p.color]){const colorSelect=$('colorSelect');if(colorSelect&&colorSelect.value!==p.color)colorSelect.value=p.color;localStorage.setItem('hiddenCrewSelectedColor',p.color)}if(p&&HAT_TYPES.has(p.hat||'none')){const hatSelect=$('hatSelect');if(hatSelect&&hatSelect.value!==(p.hat||'none'))hatSelect.value=p.hat||'none';localStorage.setItem('hiddenCrewSelectedHat',p.hat||'none')}ui.room.textContent=state.room;ui.status.textContent={lobby:'ロビー',playing:'プレイ中',meeting:'会議中',finished:'終了'}[state.phase]||state.phase;ui.role.textContent=`役職：${p?.role==='impostor'?'人狼':p?.role==='crew'?'クルー':'---'}`;ui.playerCount.textContent=`${state.players.filter(x=>!x.practiceTarget).length}/12`;ui.players.innerHTML=state.players.map(x=>`<div class="player-row ${x.alive?'':'dead'} ${x.practiceTarget?'practice-target':''}"><span class="dot" style="color:#${(COLORS[x.color]||0).toString(16).padStart(6,'0')};background:currentColor"></span><span class="player-name">${x.practiceTarget?'🎯 ':''}${escapeHtml(x.name)}${x.host?' ★':''}</span>${x.id!==myId&&!x.practiceTarget?`<button class="call-member small" data-call-id="${escapeHtml(x.id)}" ${!x.alive||!x.connected?'disabled':''}>📞</button>`:''}</div>`).join('');const host=state.hostId===myId;ui.start.classList.toggle('hidden',!host||state.phase!=='lobby');ui.settings.classList.toggle('hidden',!host||state.phase!=='lobby');ui.actionBar.classList.toggle('hidden',state.phase!=='playing'||!p?.alive);ui.taskPanel.classList.toggle('hidden',state.phase!=='playing'||!p||!p.alive);ui.kill.classList.toggle('hidden',state.phase!=='playing'||p?.role!=='impostor');ui.kill.disabled=p?.role!=='impostor'||!p?.alive||!canKill()||!nearest.player;ui.kill.title=p?.role==='impostor'?'近くのクルーを攻撃（Q / Space）':'攻撃は人狼だけが使えます';ui.sabotage.classList.toggle('hidden',p?.role!=='impostor'||!p?.alive);ui.joystick.classList.toggle('hidden',state.phase!=='playing'||(!p?.alive&&!!spectatorTargetId));if(p){const done=p.tasksDone||0,total=p.taskTotal||0;ui.taskCounter.textContent=`${done}/${total}`;ui.taskProgress.style.width=`${total?done/total*100:0}%`;ui.tasks.innerHTML=p.role!=='impostor'&&!p.spectator?(p.tasks||[]).map(t=>`<div class="task-row ${(p.completedTasks||[]).includes(t)?'done':''}"><span>${taskDisplayName(t)}</span><b>${(p.completedTasks||[]).includes(t)?'✓':'○'}</b></div>`).join(''):'<p>偽タスクを装いましょう。</p>'}updateSabotage();updateDoorLockdownVisuals();updateSpectatorUI();queueHudLayout();}
function updateSabotage(){const s=state?.sabotage;if(ui.sabotageBanner)ui.sabotageBanner.classList.toggle('hidden',!s);if(!s)return;if(ui.sabotageTitle)ui.sabotageTitle.textContent={lights:'照明停止',reactor:'リアクター暴走',comms:'通信妨害',doors:'ドア封鎖'}[s.kind]||'妨害発生';if(ui.sabotageTimer)ui.sabotageTimer.textContent=`${Math.max(0,Math.ceil((s.endsAt-Date.now())/1000))}秒`}
let animationFrameId=0;
let miniMapEnabled=true;
let animationErrorShown=false;
function resetPerformanceSampling({restoreQuality=false,delay=5500}={}){
  performanceFrameCount=0;
  performanceWindowStart=0;
  lowFpsWindows=0;
  highFpsWindows=0;
  qualitySamplingResumeAt=performance.now()+Math.max(0,delay);
  if(restoreQuality&&renderer&&currentRendererPixelRatio!==preferredRendererPixelRatio){
    currentRendererPixelRatio=preferredRendererPixelRatio;
    renderer.setPixelRatio(currentRendererPixelRatio);
    resize();
  }
}
function qualitySamplingBlocked(now){
  return document.hidden||securityOpen||now<qualitySamplingResumeAt||!!document.querySelector('dialog[open]');
}
function reduceRenderLoadIfNeeded(now){
  // タスクやダイアログのアニメーションは通常プレイの性能判定に含めない。
  if(qualitySamplingBlocked(now)){
    performanceFrameCount=0;
    performanceWindowStart=0;
    return;
  }
  performanceFrameCount++;
  if(!performanceWindowStart)performanceWindowStart=now;
  const elapsed=now-performanceWindowStart;
  if(elapsed<4000)return;
  const fps=performanceFrameCount*1000/elapsed;
  performanceFrameCount=0;
  performanceWindowStart=now;
  if(fps<PERF.targetFps*.68){
    lowFpsWindows++;
    highFpsWindows=0;
  }else if(fps>PERF.targetFps*.9){
    highFpsWindows++;
    lowFpsWindows=0;
  }else{
    lowFpsWindows=0;
    highFpsWindows=0;
  }
  // 一時的な引っ掛かりでは画質を下げず、通常プレイで低FPSが3回続いた時だけ調整する。
  if(renderer&&lowFpsWindows>=3&&currentRendererPixelRatio>.8){
    lowFpsWindows=0;
    currentRendererPixelRatio=Math.max(.8,Math.round((currentRendererPixelRatio-.1)*100)/100);
    renderer.setPixelRatio(currentRendererPixelRatio);
    resize();
    console.info(`[ゲーム] 通常プレイの負荷に合わせて描画倍率を調整しました (${currentRendererPixelRatio}x)`);
  }
  // 動作が安定したら少しずつ本来の画質へ戻す。
  if(renderer&&highFpsWindows>=3&&currentRendererPixelRatio<preferredRendererPixelRatio){
    highFpsWindows=0;
    currentRendererPixelRatio=Math.min(preferredRendererPixelRatio,Math.round((currentRendererPixelRatio+.1)*100)/100);
    renderer.setPixelRatio(currentRendererPixelRatio);
    resize();
  }
}
function animate(now=performance.now()){
  animationFrameId=requestAnimationFrame(animate);
  try{
    if(!clock||document.hidden)return;
    const frameInterval=1000/PERF.targetFps;
    if(animationLastTime&&now-animationLastTime<frameInterval*.86)return;
    const dt=Math.min(animationLastTime?(now-animationLastTime)/1000:1/PERF.targetFps,.05);
    animationLastTime=now;
    if(state?.phase==='playing'&&localModel&&!securityOpen)moveLocal(dt);
    for(const m of models.values()){
      if(m!==localModel&&m?.position&&m?.userData?.target){
        const a=1-Math.exp(-12*dt);
        m.position.lerp(m.userData.target,a);
        m.rotation.y=dampAngle(m.rotation.y,Number(m.userData.rotation||0),16,dt);
      }
    }
    if(now-lastNearestUpdate>=1000/PERF.nearestFps){lastNearestUpdate=now;updateNearest()}
    if(doorLockGroup&&(doorLockdownActive()||doorLockGroup.visible))updateDoorLockdownVisuals(now/1000);
    if(renderMode==='3d'&&renderer&&scene&&camera){
      if(!securityOpen){
        updateLockerVisuals(dt);
        updateCargoCarryVisual();
        if(corpseModels.size)updateCorpseVisuals(now);
        if(now-lastLightUpdate>=1000/PERF.lightFps){const lightDt=Math.min((now-lastLightUpdate)/1000,.15)||dt;lastLightUpdate=now;updateFacilityLighting(lightDt)}
        updateCamera(dt);
        updateEnclosureCameraLayer();
        if(PERF.enableShadows&&now-lastShadowUpdate>=1000/PERF.shadowFps){lastShadowUpdate=now;renderer.shadowMap.needsUpdate=true}
        renderer.render(scene,camera);
      }else if(now-lastLightUpdate>=220){
        const lightDt=Math.min((now-lastLightUpdate)/1000,.12)||dt;lastLightUpdate=now;updateFacilityLighting(lightDt);
      }
    }else if(renderMode==='2d'&&!securityOpen){
      draw2DMap();
    }
    if(securityOpen)renderSecurityFeed();
    if(!securityOpen&&miniMapEnabled&&now-lastMiniMapRender>=1000/PERF.miniMapFps){
      lastMiniMapRender=now;
      try{drawMiniMap()}catch(error){
        miniMapEnabled=false;
        console.error('[Hidden Crew] Mini map disabled',error);
        if(ui.miniMap)ui.miniMap.style.display='none';
        showNotice('ミニマップを停止してゲームを続行します。');
      }
    }
    if(!securityOpen&&now-lastHudUpdate>=1000/PERF.hudFps){lastHudUpdate=now;updateCooldown();updateSabotage()}
    reduceRenderLoadIfNeeded(now);
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
  for(const o of COLLISION_OBJECTS)if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return true;
  if(doorLockdownActive()&&me()?.alive!==false){for(const door of DOOR_BARRIERS)if(Math.abs(x-door.x)<door.w/2+r&&Math.abs(z-door.z)<door.d/2+r)return true}
  if(Math.hypot(x-EMERGENCY_BUTTON.x,z-EMERGENCY_BUTTON.z)<2.05+r)return true;
  return false;
}
function findNearestWalkablePosition(x,z){
  const startX=Number.isFinite(Number(x))?Number(x):0;
  const startZ=Number.isFinite(Number(z))?Number(z):-2.5;
  if(!collidesWithMap(startX,startZ))return{x:startX,z:startZ};
  for(let radius=.35;radius<=3.2;radius+=.35){
    const steps=Math.max(12,Math.ceil(radius*18));
    for(let i=0;i<steps;i++){
      const angle=i/steps*Math.PI*2;
      const candidateX=startX+Math.cos(angle)*radius;
      const candidateZ=startZ+Math.sin(angle)*radius;
      if(!collidesWithMap(candidateX,candidateZ))return{x:candidateX,z:candidateZ};
    }
  }
  return{x:-4.5,z:-3.5};
}
function dampFactor(rate,dt){return 1-Math.exp(-rate*Math.max(0,dt))}
function dampAngle(current,target,rate,dt){
  const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
  return current+delta*dampFactor(rate,dt);
}
function moveLocal(dt){
  const p=me();
  if(!p||p.hidden||(!p.alive&&spectatorTargetId))return;
  if(collidesWithMap(localModel.position.x,localModel.position.z)){
    const safe=findNearestWalkablePosition(p.x,p.z);
    localModel.position.set(safe.x,0,safe.z);
    localModel.userData.target.copy(localModel.position);
    localVelocity.set(0,0);
    if(safe.x!==p.x||safe.z!==p.z)send('move',{x:safe.x,z:safe.z,rotation:localModel.rotation.y,clientTime:Date.now()});
  }

  // 見下ろし・近接視点では、従来どおり画面基準で移動する。
  const screenForward=(isDown('KeyW','ArrowUp')?1:0)-(isDown('KeyS','ArrowDown')?1:0)-joy.y;
  const screenRight=(isDown('KeyD','ArrowRight')?1:0)-(isDown('KeyA','ArrowLeft')?1:0)+joy.x;
  let inputX=screenRight;
  let inputZ=-screenForward;

  // 一人称視点だけは操作を完全に分離する。
  // W/↑とスティック上 = 正面へ進む、S/↓とスティック下 = 後ろへ下がる。
  // A/← = 左旋回、D/→ = 右旋回。左右入力では横移動しない。
  if(renderMode==='3d'&&cameraMode===2){
    const moveAxis=Math.abs(screenForward)>.035?Math.max(-1,Math.min(1,screenForward)):0;
    const rawTurn=Math.max(-1,Math.min(1,screenRight));
    const turnDeadZone=.055;
    const turnAxis=Math.abs(rawTurn)<=turnDeadZone?0:Math.sign(rawTurn)*Math.pow((Math.abs(rawTurn)-turnDeadZone)/(1-turnDeadZone),1.28);
    const isTouch=matchMedia('(pointer:coarse)').matches;
    const turnSpeed=isTouch?1.65:2.25;
    // yaw=0は+Z方向。右旋回は負方向、左旋回は正方向。
    firstPersonTargetYaw-=turnAxis*turnSpeed*dt;
    firstPersonYaw=dampAngle(firstPersonYaw,firstPersonTargetYaw,isTouch?13:18,dt);
    inputX=Math.sin(firstPersonYaw)*moveAxis;
    inputZ=Math.cos(firstPersonYaw)*moveAxis;
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
    const step=Math.min(remaining,1/75);
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
  if(performance.now()-lastMove>PERF.moveInterval){
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
  if(y-r<3.2){for(const o of WALLS)if(Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r)return true;if(doorLockdownActive()){for(const door of DOOR_BARRIERS)if(Math.abs(x-door.x)<door.w/2+r&&Math.abs(z-door.z)<door.d/2+r)return true}}
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
function cameraViewSubject(){
  const self=me(),target=!self?.alive?spectatorTarget():null;
  if(target){const model=models.get(target.id);if(model)return{player:target,model,following:true}}
  return{player:self,model:localModel,following:false};
}
function setCameraLens(targetCamera,fov,near){
  if(!targetCamera)return;
  if(Math.abs(targetCamera.fov-fov)>.01||Math.abs(targetCamera.near-near)>.001){targetCamera.fov=fov;targetCamera.near=near;targetCamera.updateProjectionMatrix()}
}
function snapCameraToCurrentMode(subjectModel=cameraViewSubject().model){
  if(!camera||!subjectModel||cameraMode===2)return;
  const pose=getThirdPersonCameraPose(subjectModel.position);
  setCameraLens(camera,pose.fov,.06);
  camera.position.copy(pose.position);camera.lookAt(pose.target);
}
function updateCamera(dt=.016){
  if(!camera)return;
  const subject=cameraViewSubject(),viewModel=subject.model,viewPlayer=subject.player;
  if(!viewModel){
    restoreSpectatorHiddenModel();
    setCameraLens(camera,54,.06);
    const idlePosition=new THREE.Vector3(0,15,10);
    if(!Number.isFinite(camera.position.x)||!Number.isFinite(camera.position.y)||!Number.isFinite(camera.position.z))camera.position.copy(idlePosition);
    else camera.position.lerp(idlePosition,1-Math.exp(-5*Math.max(.001,dt)));
    camera.lookAt(0,.8,0);return;
  }
  const pos=viewModel.position;
  if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||!Number.isFinite(pos.z)){
    pos.set(Number(viewPlayer?.x)||0,0,Number(viewPlayer?.z)||0);localVelocity.set(0,0);
  }
  if(cameraMode===2){
    if(subject.following){
      if(spectatorHiddenModelId&&spectatorHiddenModelId!==viewPlayer.id)restoreSpectatorHiddenModel();
      viewModel.visible=false;spectatorHiddenModelId=viewPlayer.id;
      if(localModel&&localModel!==viewModel){const self=me();localModel.visible=playerVisibleToLocalViewer(self)}
    }else{
      restoreSpectatorHiddenModel();viewModel.visible=false;
    }
    setCameraLens(camera,74,.045);
    const observedYaw=subject.following?Number(viewModel.rotation.y||viewModel.userData?.rotation||viewPlayer?.rotation||0):firstPersonYaw;
    const eye=new THREE.Vector3(pos.x,pos.y+1.72,pos.z);
    const forward=new THREE.Vector3(Math.sin(observedYaw),-.035,Math.cos(observedYaw)).normalize();
    camera.position.copy(eye);camera.lookAt(eye.clone().addScaledVector(forward,12));return;
  }
  restoreSpectatorHiddenModel();
  if(localModel){const self=me();localModel.visible=playerVisibleToLocalViewer(self)}
  if(viewModel&&viewPlayer)viewModel.visible=playerVisibleToLocalViewer(viewPlayer);
  const pose=getThirdPersonCameraPose(pos);
  setCameraLens(camera,pose.fov,.06);
  const invalidCamera=!Number.isFinite(camera.position.x)||!Number.isFinite(camera.position.y)||!Number.isFinite(camera.position.z);
  if(invalidCamera||camera.position.distanceToSquared(pose.position)>900)camera.position.copy(pose.position);
  else camera.position.lerp(pose.position,1-Math.exp(-(cameraMode===0?7:10)*Math.max(.001,dt)));
  camera.lookAt(pose.target);
}

function updateNearest(){
  nearest={task:null,player:null,body:null,locker:null,security:false,emergency:false,cargoDelivery:false};
  if(!localModel||!state)return;
  const p=me();
  let best=99;
  for(const[id,[,x,z]]of Object.entries(TASKS)){const d=Math.hypot(localModel.position.x-x,localModel.position.z-z);if(d<2&&d<best){best=d;nearest.task=id}}
  best=99;
  for(const other of state.players){if(other.id===myId)continue;const hasBody=corpseIsVisible(other),targetX=hasBody?Number(other.bodyX):Number(other.x),targetZ=hasBody?Number(other.bodyZ):Number(other.z),d=Math.hypot(localModel.position.x-targetX,localModel.position.z-targetZ);if(!other.practiceTarget&&hasBody&&d<2.8&&d<best){best=d;nearest.body=other.id}else if(other.attackable===true&&d<2.8&&d<best){best=d;nearest.player=other.id}}
  if(p?.hidden&&p.hiddenAt){nearest.locker=LOCKERS.find(l=>l.id===p.hiddenAt)||null}else if(!p?.hidden){nearest.locker=LOCKERS.map(l=>({...l,d:Math.hypot(localModel.position.x-l.exitX,localModel.position.z-l.exitZ)})).filter(l=>l.d<=2.0).sort((a,b)=>a.d-b.d)[0]||null}
  nearest.security=Math.hypot(localModel.position.x-SECURITY_CONSOLE.x,localModel.position.z-SECURITY_CONSOLE.z)<=2.2;
  nearest.emergency=Math.hypot(localModel.position.x-EMERGENCY_BUTTON.x,localModel.position.z-EMERGENCY_BUTTON.z)<=2.8;
  nearest.cargoDelivery=cargoCarryActive&&Math.hypot(localModel.position.x-CARGO_DELIVERY.x,localModel.position.z-CARGO_DELIVERY.z)<=2.25;
  ui.use.disabled=!nearest.task&&!nearest.cargoDelivery;ui.use.innerHTML=nearest.cargoDelivery?'荷物を置く <kbd>E</kbd>':'使用 <kbd>E</kbd>';
  ui.report.disabled=!nearest.body;
  ui.kill.disabled=!nearest.player||!canKill();
  const hide=$('hideButton'),security=$('securityButton');
  if(hide){hide.disabled=!p?.alive||p?.spectator||(!p?.hidden&&!nearest.locker);hide.textContent=p?.hidden?'ロッカーから出る':'ロッカーに隠れる';hide.classList.toggle('interaction-ready',!!nearest.locker)}
  if(security){security.disabled=!nearest.security||!!p?.hidden;security.classList.toggle('interaction-ready',nearest.security)}
  if(ui.meeting){ui.meeting.disabled=!nearest.emergency||!!p?.hidden;ui.meeting.classList.toggle('interaction-ready',nearest.emergency)}
  const hint=$('interactionHint');if(hint){let text='';if(p?.hidden)text='ロッカー内：ボタンを押すと外へ出ます';else if(nearest.body)text=p?.role==='doctor'?'倒れている人です：「救助」を押すと助けられます':p?.role==='detective'?'遺体です：「調査」を押すと確認できます':'遺体です：「通報」を押してください';else if(nearest.locker)text='ロッカーに近づきました：隠れることができます';else if(nearest.security)text='監視端末に近づきました：カメラを確認できます';else if(nearest.emergency)text='緊急ボタンに近づきました：会議を開けます';else if(nearest.cargoDelivery)text='管理室の搬入口です：運んだ荷物を置けます';else if(nearest.task)text='端末に近づきました：使用できます';hint.textContent=text;hint.classList.toggle('show',!!text)}
}
function updateLockerVisuals(dt){const p=me();for(const locker of LOCKERS){const visual=lockerVisuals.get(locker.id);if(!visual)continue;const occupied=(state?.players||[]).some(x=>x.hidden&&x.hiddenAt===locker.id);const nearby=nearest.locker?.id===locker.id;const target=occupied?1:(nearby?.22:0);visual.userData.open+=(target-visual.userData.open)*(1-Math.exp(-10*dt));visual.userData.doorPivot.rotation.y=-visual.userData.open*1.45;visual.userData.lamp.material.color.setHex(occupied?0xffb347:nearby?0x77ff9c:0x63f4ff)}}
function useAction(){const p=me();if(!p||!p.alive||p.spectator)return;if(nearest.body&&(p.role==='doctor'||p.role==='detective')){abilityAction();return}if(nearest.cargoDelivery&&cargoCarryActive){openTask('cargoDelivery');return}if(!nearest.task)return;if(nearest.task==='cargo'&&cargoCarryActive){showNotice('荷物を管理室の搬入口まで運んでください');return}if(state.sabotage&&(['reactor','lights','comms'].includes(state.sabotage.kind))){send('fixSabotage',{station:nearest.task});return}openTask(nearest.task)}
function reportAction(){if(nearest.body)send('report',{bodyId:nearest.body});else showNotice('近くに通報できる対象がありません')}function attackAction(){const p=me();if(!p||state?.phase!=='playing')return;if(p.role!=='impostor'){showNotice('攻撃は人狼だけが使えます');return}if(!canKill()){showNotice('攻撃のクールダウン中です');return}if(!nearest.player){showNotice(state?.practiceMode?'近くの訓練用ターゲットへ近づいてください':'攻撃できるクルーに近づいてください');return}send('kill',{targetId:nearest.player})}function meetingAction(){if(!nearest.emergency){showNotice('中央の緊急ボタンに近づいてください');return}send('meeting')}
ui.use.onclick=useAction;ui.report.onclick=reportAction;ui.kill.onclick=attackAction;ui.meeting.onclick=meetingAction;ui.sabotage.onclick=()=>openDialog('sabotageDialog');ui.start.onclick=()=>{if(socket?.readyState!==WebSocket.OPEN){showNotice('サーバーへ接続できていません。再読み込みしてください。');return}if(state?.hostId!==myId){showNotice('ゲームを開始できるのはホストだけです。');return}ui.start.disabled=true;ui.start.textContent='開始中…';send('start');setTimeout(()=>{if(state?.phase==='lobby'){ui.start.disabled=false;ui.start.textContent='ゲーム開始'}},5000)};$('copyRoomButton').onclick=()=>navigator.clipboard.writeText(state?.room||'').then(()=>showNotice('ルームコードをコピーしました'));$('cameraButton').onclick=()=>{if(renderMode!=='3d'||!camera){showNotice('軽量マップでは見下ろし視点で固定されます。');return}const subject=cameraViewSubject();cameraMode=(cameraMode+1)%3;if(cameraMode===2&&subject.model&&!subject.following){const currentYaw=Number(subject.model.rotation.y);firstPersonYaw=clearFirstPersonDirection(Number.isFinite(currentYaw)?currentYaw:Math.PI);firstPersonTargetYaw=firstPersonYaw;firstPersonInputBaseYaw=firstPersonYaw;firstPersonInputSignature='';camera.position.set(subject.model.position.x,subject.model.position.y+1.72,subject.model.position.z)}else snapCameraToCurrentMode(subject.model);const labels=['見下ろし視点','近い視点','一人称視点'];showNotice(subject.following?`${subject.player.name}：${labels[cameraMode]}`:labels[cameraMode]);$('cameraButton').textContent=subject.following?`観戦：${labels[(cameraMode+1)%3]}へ切替`:`${labels[(cameraMode+1)%3]}へ切替`;updateSpectatorUI()};
ui.settings.onclick=()=>{const s=state.settings||{};$('settingImpostors').value=s.impostors;$('settingTasks').value=s.tasks;$('settingSpeed').value=s.speed;$('settingKillCooldown').value=s.killCooldown;$('settingMeeting').value=s.meetingTime;$('settingReveal').value=s.revealRoles?'yes':'no';openDialog('settingsDialog')};$('saveSettingsButton').onclick=()=>{send('settings',{settings:{impostors:+$('settingImpostors').value,tasks:+$('settingTasks').value,speed:+$('settingSpeed').value,killCooldown:+$('settingKillCooldown').value,meetingTime:+$('settingMeeting').value,revealRoles:$('settingReveal').value==='yes'}});closeDialog('settingsDialog')};document.querySelectorAll('[data-sabotage]').forEach(b=>b.onclick=()=>{send('sabotage',{kind:b.dataset.sabotage});closeDialog('sabotageDialog')});document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeDialog(b.dataset.close));

const ROLE_LABELS={crew:'クルー',impostor:'人狼',doctor:'医者',detective:'探偵',guard:'警備員',spectator:'観戦者'};
function abilityAction(){const p=me();if(!p||p.abilityUsed){showNotice('能力は使用済みです');return}if(p.role==='doctor'&&nearest.body)send('revive',{targetId:nearest.body});else if(p.role==='detective'&&nearest.body)send('inspect',{targetId:nearest.body});else if(p.role==='guard'&&nearest.player)send('protect',{targetId:nearest.player});else showNotice('能力を使える対象に近づいてください')}
function updateAdvancedUI(){const p=me(),b=$('abilityButton');if(!p||!b)return;const labels={doctor:'救助',detective:'調査',guard:'守る'};b.classList.toggle('hidden',!labels[p.role]||state.phase!=='playing');b.textContent=p.abilityUsed?`${labels[p.role]||'能力'}（使用済み）`:labels[p.role]||'能力';b.disabled=!!p.abilityUsed;b.classList.toggle('ability-ready',!p.abilityUsed&&!!labels[p.role]);ui.role.textContent=`役職：${ROLE_LABELS[p.role]||p.role}${p.spectator?'（途中参加）':!p.alive?'（観戦中）':''}`;$('hideButton').disabled=!p.alive||p.spectator||(!p.hidden&&!nearest.locker);$('profileSummary').textContent=profileText()}
function profileText(){const s=JSON.parse(localStorage.getItem('hiddenCrewStats')||'{"games":0,"wins":0,"tasks":0}');const title=s.wins>=10?'宇宙の英雄':s.wins>=3?'熟練クルー':s.games>=1?'新人隊員':'初参加';return `称号：${title}　対戦 ${s.games}　勝利 ${s.wins}　今日の目標：タスクを3回完了`}
function saveResult(w){const s=JSON.parse(localStorage.getItem('hiddenCrewStats')||'{"games":0,"wins":0,"tasks":0}');s.games++;const p=me();if((w==='impostor'&&p?.role==='impostor')||(w==='crew'&&p?.role!=='impostor'))s.wins++;localStorage.setItem('hiddenCrewStats',JSON.stringify(s));$('profileSummary').textContent=profileText()}
function updateSecurityTaskUi(){
  const panel=$('securityTaskPanel'),progress=$('securityTaskProgress'),complete=$('securityTaskComplete');
  if(panel)panel.classList.toggle('hidden',!securityTaskActive);
  if(!securityTaskActive)return;
  const viewed=securityTaskViewed.size,required=3;
  if(progress)progress.textContent=`進捗：${viewed} / ${required}か所を確認`;
  if(complete){complete.disabled=viewed<required;complete.textContent=viewed<required?`あと${required-viewed}か所確認してください`:'確認完了'}
  const buttons=$('securityCameraButtons');
  if(buttons)buttons.querySelectorAll('[data-security-camera]').forEach((button,index)=>{const checked=securityTaskViewed.has(index);button.classList.toggle('task-checked',checked);button.setAttribute('aria-pressed',checked?'true':'false');});
}
function scheduleSecurityTaskView(){
  if(securityTaskViewTimer){clearTimeout(securityTaskViewTimer);securityTaskViewTimer=0}
  if(!securityTaskActive)return;
  const index=securityCameraIndex;
  securityTaskViewTimer=setTimeout(()=>{
    securityTaskViewTimer=0;
    if(!securityTaskActive||securityCameraIndex!==index||!securityOpen)return;
    securityTaskViewed.add(index);updateSecurityTaskUi();
  },800);
}
function resetSecurityTaskMode(){
  if(securityTaskViewTimer){clearTimeout(securityTaskViewTimer);securityTaskViewTimer=0}
  securityTaskActive=false;securityTaskCountsProgress=false;securityTaskViewed.clear();updateSecurityTaskUi();
}
function completeSecurityCameraTask(){
  if(!securityTaskActive||securityTaskViewed.size<3)return;
  const counts=securityTaskCountsProgress;
  if(counts){
    const stats=JSON.parse(localStorage.getItem('hiddenCrewStats')||'{"games":0,"wins":0,"tasks":0}');
    stats.tasks=(stats.tasks||0)+1;localStorage.setItem('hiddenCrewStats',JSON.stringify(stats));send('taskComplete',{task:'security'});
  }
  resetSecurityTaskMode();closeDialog('securityDialog');showNotice(counts?'監視カメラ確認完了！':'模擬確認完了（進捗には加算されません）');
}
function updateSecurityCameraUi(){
  const preset=SECURITY_CAMERAS[securityCameraIndex]||SECURITY_CAMERAS[0];
  const title=$('securityCameraName'),buttons=$('securityCameraButtons');
  if(title)title.textContent=`CAM ${String(securityCameraIndex+1).padStart(2,'0')}｜${preset.name}`;
  if(buttons)buttons.querySelectorAll('[data-security-camera]').forEach((button,index)=>button.classList.toggle('active',index===securityCameraIndex));
  const count=(state?.players||[]).filter(player=>player.alive&&!player.hidden&&Math.hypot(player.x-preset.target[0],player.z-preset.target[2])<=preset.radius).length;
  const status=$('securityCameraStatus');if(status)status.textContent=`● LIVE　映像内 ${count}人`;
  updateSecurityTaskUi();
}
function setSecurityCamera(index){
  const length=SECURITY_CAMERAS.length;
  securityCameraIndex=(Number(index)+length)%length;
  const preset=SECURITY_CAMERAS[securityCameraIndex];
  if(securityCamera){
    securityCamera.position.set(...preset.position);
    securityCamera.lookAt(new THREE.Vector3(...preset.target));
    securityCamera.updateMatrixWorld(true);
  }
  updateSecurityCameraUi();
  securityLastRender=0;scheduleSecurityTaskView();
}
function replaceSecurityCanvasForFallback(){
  const oldCanvas=$('securityFeed');
  if(!oldCanvas)return null;
  const canvas=oldCanvas.cloneNode(false);
  canvas.id='securityFeed';
  canvas.setAttribute('aria-label','監視カメラのライブ映像');
  oldCanvas.replaceWith(canvas);
  securityRenderer=null;
  securityFeedContext=null;
  securityRenderWidth=0;
  securityRenderHeight=0;
  return canvas;
}
function ensureSecurityViewer(){
  const canvas=$('securityFeed');
  if(!canvas||renderMode!=='3d'||!scene||securityViewerFailed)return false;
  try{
    if(!securityCamera){
      securityCamera=new THREE.PerspectiveCamera(62,16/9,.08,180);
      const preset=SECURITY_CAMERAS[securityCameraIndex];
      securityCamera.position.set(...preset.position);
      securityCamera.lookAt(new THREE.Vector3(...preset.target));
      securityCamera.updateMatrixWorld(true);
    }
    if(!securityRenderer){
      securityRenderer=new THREE.WebGLRenderer({
        canvas,
        antialias:false,
        alpha:false,
        powerPreference:'high-performance',
        failIfMajorPerformanceCaveat:false,
        preserveDrawingBuffer:false
      });
      securityRenderer.setClearColor(0x020711,1);
      securityRenderer.outputColorSpace=THREE.SRGBColorSpace;
      securityRenderer.toneMapping=THREE.ACESFilmicToneMapping;
      securityRenderer.toneMappingExposure=1.42;
      securityRenderer.shadowMap.enabled=false;
      canvas.addEventListener('webglcontextlost',event=>{
        event.preventDefault();
        securityViewerFailed=true;
        securityRenderer=null;
        replaceSecurityCanvasForFallback();
        drawSecurityFallback();
      },{once:true});
    }
    return true;
  }catch(error){
    securityViewerFailed=true;
    console.warn('[ゲーム] 監視カメラの3Dライブ映像を初期化できませんでした。',error);
    replaceSecurityCanvasForFallback();
    return false;
  }
}
function resizeSecurityViewer(){
  const canvas=$('securityFeed');
  if(!canvas||!ensureSecurityViewer())return false;
  const cssWidth=Math.max(280,Math.floor(canvas.clientWidth||640));
  const cssHeight=Math.max(158,Math.floor(canvas.clientHeight||cssWidth*9/16));
  const coarse=matchMedia('(pointer:coarse)').matches;
  const maxWidth=LOW_POWER_DEVICE?640:(securityTaskActive?960:1280);
  const scale=Math.min(1,maxWidth/cssWidth)*(securityTaskActive?0.96:1);
  const width=Math.max(280,Math.round(cssWidth*scale));
  const height=Math.max(158,Math.round(cssHeight*scale));
  if(width!==securityRenderWidth||height!==securityRenderHeight){
    securityRenderWidth=width;
    securityRenderHeight=height;
    securityRenderer.setPixelRatio(Math.min(devicePixelRatio||1,LOW_POWER_DEVICE?1.15:1.5));
    securityRenderer.setSize(width,height,false);
    securityCamera.aspect=width/height;
    securityCamera.updateProjectionMatrix();
  }
  return true;
}
function drawSecurityFallback(){
  let canvas=$('securityFeed');if(!canvas)return;
  if(!securityFeedContext){
    securityFeedContext=canvas.getContext('2d',{alpha:false});
    if(!securityFeedContext){canvas=replaceSecurityCanvasForFallback();securityFeedContext=canvas?.getContext('2d',{alpha:false})||null}
  }
  const ctx=securityFeedContext;if(!ctx)return;
  const width=Math.max(280,Math.floor(canvas.clientWidth||640));
  const height=Math.max(158,Math.floor(canvas.clientHeight||width*9/16));
  const ratio=Math.min(devicePixelRatio||1,1);
  if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio)){canvas.width=Math.floor(width*ratio);canvas.height=Math.floor(height*ratio)}
  ctx.setTransform(ratio,0,0,ratio,0,0);
  const preset=SECURITY_CAMERAS[securityCameraIndex],viewRadius=preset.radius;
  const scale=Math.min(width,height)/(viewRadius*2.15),cx=width/2,cy=height/2;
  const mapX=x=>cx+(x-preset.target[0])*scale,mapY=z=>cy-(z-preset.target[2])*scale;
  ctx.fillStyle='#020711';ctx.fillRect(0,0,width,height);
  ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
  for(const zone of MAP_ZONES){ctx.fillStyle=`#${Number(zone.color||0x233347).toString(16).padStart(6,'0')}`;ctx.fillRect(mapX(zone.x-zone.w/2),mapY(zone.z+zone.d/2),zone.w*scale,zone.d*scale)}
  ctx.strokeStyle='rgba(115,220,255,.7)';ctx.lineWidth=1.5;for(const wall of WALLS)ctx.strokeRect(mapX(wall.x-wall.w/2),mapY(wall.z+wall.d/2),wall.w*scale,wall.d*scale);
  for(const player of state?.players||[]){if(!corpseIsVisible(player))continue;const x=mapX(Number(player.bodyX)),y=mapY(Number(player.bodyZ));if(x<-20||x>width+20||y<-20||y>height+20)continue;ctx.save();ctx.translate(x,y);ctx.rotate(Number(player.bodyRotation||0));ctx.strokeStyle='#ff4055';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,12,7,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle=`#${(COLORS[player.color]||0xffffff).toString(16).padStart(6,'0')}`;ctx.beginPath();ctx.ellipse(0,0,9,5,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.fillText('遺体',x+11,y-7)}
  for(const player of state?.players||[]){if(!player.alive||player.hidden)continue;const x=mapX(player.x),y=mapY(player.z);if(x<-20||x>width+20||y<-20||y>height+20)continue;ctx.beginPath();ctx.fillStyle=`#${(COLORS[player.color]||0x29cbd4).toString(16).padStart(6,'0')}`;ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.fillText(player.name,x+10,y+4)}
  ctx.restore();ctx.strokeStyle='rgba(84,228,255,.55)';ctx.lineWidth=2;ctx.strokeRect(2,2,width-4,height-4);
  const status=$('securityCameraStatus');if(status)status.textContent=status.textContent.replace('● LIVE','● LIVE MAP');
}
function drawSecurityLiveScene(){
  if(!ensureSecurityViewer()||!resizeSecurityViewer())return false;
  const localWasVisible=localModel?.visible;
  const localPlayer=me();
  const oldFog=scene.fog;
  try{
    if(localModel&&localPlayer?.alive&&playerVisibleToLocalViewer(localPlayer))localModel.visible=true;
    // 監視映像では暗くなりすぎないよう、同じ3Dシーンを少し見通しよく描画します。
    if(oldFog)scene.fog=new THREE.FogExp2(0x020711,Math.min(Number(oldFog.density)||.018,.011));
    securityRenderer.render(scene,securityCamera);
  }finally{
    scene.fog=oldFog;
    if(localModel)localModel.visible=localWasVisible;
  }
  return true;
}
function renderSecurityFeed(){
  const now=performance.now();const effectiveSecurityFps=securityTaskActive?(LOW_POWER_DEVICE?7:(HIGH_POWER_DEVICE?16:12)):PERF.securityFps;if(now-securityLastRender<1000/effectiveSecurityFps)return;securityLastRender=now;
  updateSecurityCameraUi();
  if(renderMode==='3d'&&!securityViewerFailed){
    try{
      if(drawSecurityLiveScene())return;
    }catch(error){
      securityViewerFailed=true;
      console.warn('[ゲーム] 監視カメラの3Dライブ映像を表示できないため、ライブマップへ切り替えます。',error);
      replaceSecurityCanvasForFallback();
    }
  }
  drawSecurityFallback();
}
function openSecurity(options={}){
  if(!state)return;
  const taskMode=!!options.taskMode;
  if(taskMode){
    securityTaskActive=true;securityTaskCountsProgress=!!options.countsProgress;securityTaskViewed.clear();
  }else resetSecurityTaskMode();
  clearKeys();securityOpen=true;
  const buttons=$('securityCameraButtons');
  if(buttons&&!buttons.childElementCount){
    SECURITY_CAMERAS.forEach((preset,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.securityCamera=String(index);
      button.className='security-camera-button';
      button.innerHTML=`<span class="camera-badge">CAM ${String(index+1).padStart(2,'0')}</span><span class="camera-area">${preset.name}</span>`;
      button.onclick=()=>setSecurityCamera(index);
      buttons.append(button);
    });
  }
  updateSecurityTaskUi();openDialog('securityDialog');
  requestAnimationFrame(()=>{ensureSecurityViewer();resizeSecurityViewer();setSecurityCamera(securityCameraIndex);renderSecurityFeed();scheduleSecurityTaskView()});
}
$('abilityButton').onclick=abilityAction;$('hideButton').onclick=()=>{const p=me();if(p?.hidden)send('hide',{lockerId:p.hiddenAt});else if(nearest.locker)send('hide',{lockerId:nearest.locker.id});else showNotice('ロッカーの近くまで移動してください')};$('securityButton').onclick=()=>{if(!nearest.security){showNotice('SECURITYの監視端末に近づいてください');return}openSecurity()};$('securityPrevButton').onclick=()=>setSecurityCamera(securityCameraIndex-1);$('securityNextButton').onclick=()=>setSecurityCamera(securityCameraIndex+1);$('securityTaskComplete').onclick=completeSecurityCameraTask;$('securityDialog').addEventListener('close',()=>{securityOpen=false;clearKeys();resetSecurityTaskMode()});$('tutorialButton').onclick=()=>openDialog('tutorialDialog');const savedSkin=localStorage.getItem('hiddenCrewSelectedColor');if(savedSkin&&COLORS[savedSkin])$('colorSelect').value=savedSkin;const savedHat=localStorage.getItem('hiddenCrewSelectedHat');if(savedHat&&HAT_TYPES.has(savedHat))$('hatSelect').value=savedHat;$('colorSelect').onchange=()=>{localStorage.setItem('hiddenCrewSelectedColor',$('colorSelect').value);if(state?.phase==='lobby')send('customize',{color:$('colorSelect').value,hat:$('hatSelect').value})};$('hatSelect').onchange=()=>{localStorage.setItem('hiddenCrewSelectedHat',$('hatSelect').value);if(state?.phase==='lobby')send('customize',{color:$('colorSelect').value,hat:$('hatSelect').value})};
let activeTaskCleanup=()=>{},activeTaskFinished=false,activeTaskId=null,activeTaskCompletionId=null,activeTaskCountsProgress=false;
function resetTaskRuntime(){
  const cleanup=activeTaskCleanup;activeTaskCleanup=()=>{};
  try{cleanup()}catch(error){console.warn('[Hidden Crew] task cleanup failed',error)}
  activeTaskFinished=false;activeTaskId=null;activeTaskCompletionId=null;activeTaskCountsProgress=false;
  const root=$('taskGame');if(root){root.className='';root.innerHTML=''}
}
function registerTaskCleanup(...cleanups){
  const previous=activeTaskCleanup;
  activeTaskCleanup=()=>{previous();for(const cleanup of cleanups){try{cleanup?.()}catch{}}};
}
function finishInteractiveTask(id){if(activeTaskFinished||activeTaskCompletionId!==id||!$('taskDialog')?.open)return;activeTaskFinished=true;finishTask(id)}
function pointInside(element,clientX,clientY,padding=0){
  if(!element)return false;const rect=element.getBoundingClientRect();
  return clientX>=rect.left+padding&&clientX<=rect.right-padding&&clientY>=rect.top+padding&&clientY<=rect.bottom-padding;
}
function bindTaskDrag(element,{onStart,onMove,onDrop,disabled}={}){
  let pointerId=null,grabX=0,grabY=0,startLeft=0,startTop=0;
  const parent=element.parentElement;
  const down=e=>{
    if(pointerId!==null||disabled?.()||element.dataset.locked==='yes'||(e.button!==undefined&&e.button>0))return;
    e.preventDefault();const er=element.getBoundingClientRect();pointerId=e.pointerId;grabX=e.clientX-er.left;grabY=e.clientY-er.top;
    startLeft=element.offsetLeft;startTop=element.offsetTop;element.classList.add('dragging');
    try{element.setPointerCapture?.(e.pointerId)}catch{}
    onStart?.(e);
  };
  const move=e=>{
    if(pointerId!==e.pointerId)return;e.preventDefault();const pr=parent.getBoundingClientRect();
    const left=Math.max(0,Math.min(parent.clientWidth-element.offsetWidth,e.clientX-pr.left-grabX));
    const top=Math.max(0,Math.min(parent.clientHeight-element.offsetHeight,e.clientY-pr.top-grabY));
    element.style.left=`${left}px`;element.style.top=`${top}px`;onMove?.(e,{left,top,parentRect:pr});
  };
  const end=e=>{
    if(pointerId!==e.pointerId)return;e.preventDefault();element.classList.remove('dragging');
    try{element.releasePointerCapture?.(pointerId)}catch{}pointerId=null;
    const keep=onDrop?.(e,{startLeft,startTop});
    if(keep===false){element.classList.add('returning');element.style.left=`${startLeft}px`;element.style.top=`${startTop}px`;setTimeout(()=>element.classList.remove('returning'),220)}
  };
  element.addEventListener('pointerdown',down,{passive:false});
  document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',end,{passive:false});document.addEventListener('pointercancel',end,{passive:false});
  return()=>{element.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end)};
}
function snapTaskElement(element,target,parent){
  const pr=parent.getBoundingClientRect(),tr=target.getBoundingClientRect();
  element.style.left=`${tr.left-pr.left+(tr.width-element.offsetWidth)/2}px`;
  element.style.top=`${tr.top-pr.top+(tr.height-element.offsetHeight)/2}px`;
}
function openTask(id){
  resetTaskRuntime();activeTaskFinished=false;activeTaskId=id;activeTaskCompletionId=id==='cargoDelivery'?'cargo':id;
  const p=me(),completionTask=activeTaskCompletionId;
  activeTaskCountsProgress=!!(p&&p.alive&&!p.spectator&&p.role!=='impostor'&&(p.tasks||[]).includes(completionTask)&&!(p.completedTasks||[]).includes(completionTask));
  const baseTitle=id==='cargoDelivery'?'貨物の納品':TASKS[id]?.[0]||'TASK';
  $('taskTitle').textContent=activeTaskCountsProgress?baseTitle:`${baseTitle}（模擬操作）`;
  const root=$('taskGame');root.className='task-realistic';root.innerHTML='';

  if(id==='cargoDelivery'){
    root.innerHTML=`<p class="task-guide">運んできた荷物を搬入口の黄色い枠へ置いてください。</p><div class="cargo-delivery task-board" id="cargoDeliveryBoard"><div class="delivery-shelf"><span>納品棚</span></div><div class="delivery-zone" id="deliveryZone">ここへ置く</div><button class="cargo-crate cargo-a carried" id="deliveryCrate" style="left:8%;top:58%"><span>▦</span><b>貨物</b></button></div><p class="task-status">荷物を置くとタスク完了です</p>`;
    const board=$('cargoDeliveryBoard'),crate=$('deliveryCrate'),zone=$('deliveryZone');const cleanup=bindTaskDrag(crate,{onDrop:e=>{if(!pointInside(zone,e.clientX,e.clientY,-8)){showNotice('黄色い納品枠へ置いてください');return false}snapTaskElement(crate,zone,board);crate.dataset.locked='yes';crate.classList.add('placed');zone.classList.add('filled');const counts=activeTaskCountsProgress;setCargoCarry(false,{sync:!counts});updateUI();finishInteractiveTask('cargo');return true}});registerTaskCleanup(cleanup);

  }else if(id==='cargo'){
    root.innerHTML=`<p class="task-guide">3個の荷物を運搬コンテナへ積み込みます。積み込み後は、実際に管理室まで運んでください。</p>
      <div class="cargo-bay task-board" id="cargoBay">
        <div class="cargo-conveyor"><span>搬入口</span></div>
        <div class="cargo-rack-label">運搬コンテナ</div>
        <div class="cargo-slot" data-cargo-slot="A" style="left:67%;top:13%"><b>A</b></div>
        <div class="cargo-slot" data-cargo-slot="B" style="left:67%;top:42%"><b>B</b></div>
        <div class="cargo-slot" data-cargo-slot="C" style="left:67%;top:71%"><b>C</b></div>
        <button class="cargo-crate cargo-a" data-cargo="A" style="left:8%;top:13%" aria-label="荷物A"><span>▦</span><b>A</b></button>
        <button class="cargo-crate cargo-b" data-cargo="B" style="left:25%;top:42%" aria-label="荷物B"><span>▤</span><b>B</b></button>
        <button class="cargo-crate cargo-c" data-cargo="C" style="left:8%;top:71%" aria-label="荷物C"><span>▥</span><b>C</b></button>
      </div><p id="cargoStatus" class="task-status">0 / 3　積み込み済み</p>`;
    const bay=$('cargoBay');let placed=0;const cleanups=[];
    bay.querySelectorAll('.cargo-crate').forEach(crate=>cleanups.push(bindTaskDrag(crate,{onDrop:e=>{
      const target=bay.querySelector(`[data-cargo-slot="${crate.dataset.cargo}"]`);
      if(!pointInside(target,e.clientX,e.clientY,-8)){showNotice('同じ記号のコンテナ枠へ運んでください');return false}
      snapTaskElement(crate,target,bay);crate.dataset.locked='yes';crate.classList.add('placed');target.classList.add('filled');
      $('cargoStatus').textContent=`${++placed} / 3　積み込み済み`;if(placed===3)setTimeout(()=>{if(activeTaskId!=='cargo'||!$('taskDialog')?.open)return;const counts=activeTaskCountsProgress;setCargoCarry(true);updateUI();closeDialog('taskDialog');showNotice(counts?'荷物を持ちました。管理室の黄色い搬入口まで運んでください':'模擬用の荷物を持ちました。搬入口まで運んで偽装できます')},450);return true;
    }})));
    registerTaskCleanup(...cleanups);

  }else if(id==='wires'){
    const colors=[['red','#ff5364'],['cyan','#45dfff'],['yellow','#ffd85a'],['lime','#7dff8a']];
    const right=[...colors].sort(()=>Math.random()-.5);
    root.innerHTML=`<p class="task-guide">左のケーブル端子を、右側の同じ色の差込口まで引いて接続してください。</p><div class="wire-board task-board" id="wireBoard"><svg id="wireSvg"></svg><div class="wire-column left"></div><div class="wire-column right"></div></div><p id="wireStatus" class="task-status">0 / 4　接続済み</p>`;
    const board=$('wireBoard'),left=board.querySelector('.left'),rightCol=board.querySelector('.right'),svg=$('wireSvg');let connected=0;const cleanups=[];
    colors.forEach(([name,color],index)=>{const node=document.createElement('button');node.className='wire-socket wire-source';node.dataset.wire=name;node.style.setProperty('--wire-color',color);node.style.top=`${12+index*24}%`;node.innerHTML='<span></span>';left.append(node)});
    right.forEach(([name,color],index)=>{const node=document.createElement('div');node.className='wire-socket wire-target';node.dataset.wireTarget=name;node.style.setProperty('--wire-color',color);node.style.top=`${12+index*24}%`;node.innerHTML='<span></span>';rightCol.append(node)});
    board.querySelectorAll('.wire-source').forEach(source=>{
      let pointer=null,line=null;
      const down=e=>{if(source.dataset.locked==='yes')return;e.preventDefault();pointer=e.pointerId;const br=board.getBoundingClientRect(),sr=source.getBoundingClientRect();line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',String(sr.left-br.left+sr.width/2));line.setAttribute('y1',String(sr.top-br.top+sr.height/2));line.setAttribute('x2',String(e.clientX-br.left));line.setAttribute('y2',String(e.clientY-br.top));line.style.stroke=getComputedStyle(source).getPropertyValue('--wire-color');svg.append(line);try{source.setPointerCapture?.(pointer)}catch{}};
      const move=e=>{if(pointer!==e.pointerId||!line)return;e.preventDefault();const br=board.getBoundingClientRect();line.setAttribute('x2',String(e.clientX-br.left));line.setAttribute('y2',String(e.clientY-br.top))};
      const end=e=>{if(pointer!==e.pointerId)return;e.preventDefault();pointer=null;const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.wire-target');if(hit&&hit.dataset.wireTarget===source.dataset.wire){const br=board.getBoundingClientRect(),hr=hit.getBoundingClientRect();line.setAttribute('x2',String(hr.left-br.left+hr.width/2));line.setAttribute('y2',String(hr.top-br.top+hr.height/2));source.dataset.locked='yes';source.classList.add('connected');hit.classList.add('connected');$('wireStatus').textContent=`${++connected} / 4　接続済み`;if(connected===4)setTimeout(()=>finishInteractiveTask(id),350)}else{line?.remove();showNotice('同じ色の差込口へつないでください')}line=null};
      source.addEventListener('pointerdown',down,{passive:false});document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',end,{passive:false});document.addEventListener('pointercancel',end,{passive:false});
      cleanups.push(()=>{source.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end)});
    });registerTaskCleanup(...cleanups);

  }else if(id==='scanner'){
    root.innerHTML=`<p class="task-guide">手をスキャナーに置いたまま動かさず、認証が終わるまで押し続けてください。</p><div class="scan-console"><div class="scan-hand">✋<i></i></div><div class="scan-readout"><span id="scanPercent">0%</span><div class="task-meter"><i id="scanBar"></i></div></div></div><button id="scanHold" class="primary task-hold">押したままスキャン</button>`;
    let value=0,timer=0;const b=$('scanHold'),hand=root.querySelector('.scan-hand');
    const stop=()=>{if(timer){clearInterval(timer);timer=0}hand.classList.remove('active')};
    const start=e=>{e.preventDefault();if(timer)return;hand.classList.add('active');timer=setInterval(()=>{value=Math.min(100,value+1.7);$('scanBar').style.width=`${value}%`;$('scanPercent').textContent=`${Math.round(value)}%`;if(value>=100){stop();finishInteractiveTask(id)}},50)};
    b.addEventListener('pointerdown',start,{passive:false});b.addEventListener('pointerup',stop);b.addEventListener('pointercancel',stop);b.addEventListener('pointerleave',stop);registerTaskCleanup(()=>{stop();b.removeEventListener('pointerdown',start);b.removeEventListener('pointerup',stop);b.removeEventListener('pointercancel',stop);b.removeEventListener('pointerleave',stop)});

  }else if(id==='fuel'){
    root.innerHTML=`<p class="task-guide">給油ノズルを燃料口へ差し込み、その後レバーを押し続けて満タンにしてください。</p><div class="fuel-station task-board" id="fuelStation"><div class="fuel-tank"><div id="fuelLiquid"></div><span id="fuelPercent">0%</span></div><div class="fuel-port" id="fuelPort">給油口</div><button class="fuel-nozzle" id="fuelNozzle" style="left:8%;top:62%">⛽<small>ノズル</small></button></div><button id="fuelPump" class="primary task-hold" disabled>レバーを押して給油</button>`;
    const station=$('fuelStation'),nozzle=$('fuelNozzle'),port=$('fuelPort'),pump=$('fuelPump');let connected=false,value=0,timer=0;
    const dragCleanup=bindTaskDrag(nozzle,{onDrop:e=>{if(!pointInside(port,e.clientX,e.clientY,-10)){showNotice('ノズルを給油口へ差し込んでください');return false}snapTaskElement(nozzle,port,station);nozzle.dataset.locked='yes';nozzle.classList.add('connected');connected=true;pump.disabled=false;return true}});
    const stop=()=>{if(timer){clearInterval(timer);timer=0}};const start=e=>{e.preventDefault();if(!connected||timer)return;timer=setInterval(()=>{value=Math.min(100,value+2);$('fuelLiquid').style.height=`${value}%`;$('fuelPercent').textContent=`${Math.round(value)}%`;if(value>=100){stop();finishInteractiveTask(id)}},55)};
    pump.addEventListener('pointerdown',start,{passive:false});pump.addEventListener('pointerup',stop);pump.addEventListener('pointercancel',stop);pump.addEventListener('pointerleave',stop);registerTaskCleanup(dragCleanup,()=>{stop();pump.removeEventListener('pointerdown',start);pump.removeEventListener('pointerup',stop);pump.removeEventListener('pointercancel',stop);pump.removeEventListener('pointerleave',stop)});

  }else if(id==='align'){
    const tx=48+Math.round((Math.random()-.5)*20),ty=45+Math.round((Math.random()-.5)*18);
    root.innerHTML=`<p class="task-guide">航路艇をドラッグし、点滅しているドッキングリングの中央へ合わせてください。</p><div class="nav-radar task-board" id="navRadar"><div class="radar-grid"></div><div class="nav-target" id="navTarget" style="left:${tx}%;top:${ty}%"></div><button class="nav-ship" id="navShip" style="left:7%;top:72%">▲</button></div><p class="task-status">リング中央で自動ロックします</p>`;
    const radar=$('navRadar'),ship=$('navShip'),target=$('navTarget');const cleanup=bindTaskDrag(ship,{onDrop:e=>{if(!pointInside(target,e.clientX,e.clientY,-10)){showNotice('点滅するリングの中央へ合わせてください');return false}snapTaskElement(ship,target,radar);ship.dataset.locked='yes';ship.classList.add('docked');target.classList.add('locked');setTimeout(()=>finishInteractiveTask(id),650);return true}});registerTaskCleanup(cleanup);

  }else if(id==='engine'){
    root.innerHTML=`<p class="task-guide">出力レバーを緑色の範囲へ動かし、安定するまでその位置を保ってください。</p><div class="engine-console"><div class="engine-track" id="engineTrack"><div class="engine-safe"></div><button id="engineKnob" class="engine-knob" style="bottom:12%"></button></div><div class="engine-gauge"><b id="engineValue">12%</b><span id="engineState">出力不足</span><div class="task-meter"><i id="engineStable"></i></div></div></div>`;
    const track=$('engineTrack'),knob=$('engineKnob');let pointer=null,stableTimer=0,stableStart=0,raf=0,current=12;
    const cancelStable=()=>{stableStart=0;$('engineStable').style.width='0%';if(raf){cancelAnimationFrame(raf);raf=0}};
    const stabilityTick=now=>{if(!stableStart)stableStart=now;const progress=Math.min(1,(now-stableStart)/1300);$('engineStable').style.width=`${progress*100}%`;if(progress>=1){finishInteractiveTask(id);return}raf=requestAnimationFrame(stabilityTick)};
    const setValue=e=>{const r=track.getBoundingClientRect();current=Math.round(Math.max(0,Math.min(100,(r.bottom-e.clientY)/r.height*100)));knob.style.bottom=`calc(${current}% - 15px)`;$('engineValue').textContent=`${current}%`;const good=current>=70&&current<=80;$('engineState').textContent=good?'出力安定中…':current<70?'出力不足':'出力過大';$('engineState').classList.toggle('good',good);if(good&&!raf){stableStart=0;raf=requestAnimationFrame(stabilityTick)}else if(!good)cancelStable()};
    const down=e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;setValue(e);try{knob.setPointerCapture?.(pointer)}catch{}};const move=e=>{if(pointer===e.pointerId){e.preventDefault();setValue(e)}};const end=e=>{if(pointer===e.pointerId)pointer=null};
    knob.addEventListener('pointerdown',down,{passive:false});track.addEventListener('pointerdown',down,{passive:false});document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',end);document.addEventListener('pointercancel',end);registerTaskCleanup(()=>{cancelStable();knob.removeEventListener('pointerdown',down);track.removeEventListener('pointerdown',down);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',end)});

  }else if(id==='security'){
    const counts=activeTaskCountsProgress;
    resetTaskRuntime();
    openSecurity({taskMode:true,countsProgress:counts});
    showNotice('3か所のライブ映像を、それぞれ少し確認してください');
    return;

  }else if(id==='comms'){
    const targetFreq=30+Math.floor(Math.random()*41),targetPhase=25+Math.floor(Math.random()*51);
    root.innerHTML=`<p class="task-guide">周波数と位相を調整し、2本の波形を重ねてから通信を固定してください。</p><div class="comms-scope"><div class="scope-wave target"></div><div id="scopeWave" class="scope-wave live"></div><span id="commsQuality">信号品質 0%</span></div><label class="dial-row">周波数 <input id="commsFreq" type="range" min="0" max="100" value="0"><b id="freqValue">0</b></label><label class="dial-row">位相 <input id="commsPhase" type="range" min="0" max="100" value="0"><b id="phaseValue">0</b></label><button id="commsLock" class="primary">通信を固定</button>`;
    const freq=$('commsFreq'),phase=$('commsPhase'),wave=$('scopeWave');const update=()=>{const f=+freq.value,p=+phase.value;$('freqValue').textContent=f;$('phaseValue').textContent=p;const quality=Math.max(0,100-Math.abs(f-targetFreq)*3-Math.abs(p-targetPhase)*3);$('commsQuality').textContent=`信号品質 ${Math.round(quality)}%`;wave.style.setProperty('--freq',String(1+f/35));wave.style.transform=`translateY(${(p-targetPhase)*.35}px)`;wave.classList.toggle('matched',quality>=90)};freq.oninput=phase.oninput=update;$('commsLock').onclick=()=>{if(Math.abs(+freq.value-targetFreq)<=3&&Math.abs(+phase.value-targetPhase)<=3)finishInteractiveTask(id);else showNotice('波形がまだ一致していません')};update();

  }else if(id==='shield'){
    root.innerHTML='<p class="task-guide">点滅している区画を順番に長押しし、6区画すべてへ電力を送ってください。</p><div class="shield-core" id="shieldCore"><div class="shield-center">CORE</div></div><p id="shieldStatus" class="task-status">区画 1 を充電してください</p>';
    const core=$('shieldCore');let current=0,timer=0;const buttons=[];
    for(let i=0;i<6;i++){const b=document.createElement('button');b.className='shield-sector';b.style.setProperty('--angle',`${i*60}deg`);b.style.setProperty('--counter',`${-i*60}deg`);b.innerHTML=`<span>${i+1}</span><i></i>`;core.append(b);buttons.push(b)}
    const refresh=()=>buttons.forEach((b,i)=>b.classList.toggle('active',i===current));refresh();
    const stop=()=>{if(timer){clearInterval(timer);timer=0}buttons[current]?.style.removeProperty('--charge')};
    buttons.forEach((b,index)=>{let charge=0;b.onpointerdown=e=>{e.preventDefault();if(index!==current||timer)return;charge=0;timer=setInterval(()=>{charge+=5;b.style.setProperty('--charge',`${charge}%`);if(charge>=100){stop();b.classList.add('powered');current++;$('shieldStatus').textContent=current>=6?'全区画同期完了':`区画 ${current+1} を充電してください`;refresh();if(current>=6)setTimeout(()=>finishInteractiveTask(id),450)}},45)};b.onpointerup=stop;b.onpointercancel=stop;b.onpointerleave=stop});registerTaskCleanup(stop);

  }else if(id==='weapons'){
    root.innerHTML='<p class="task-guide">照準を合わせ、移動する標的を5回命中させてください。</p><div class="weapon-range task-board" id="weaponRange"><div class="crosshair"></div><button id="targetBtn" class="moving-target" aria-label="標的"></button></div><p id="weaponStatus" class="task-status">命中 0 / 5</p>';
    const range=$('weaponRange'),target=$('targetBtn');let hits=0,moveTimer=0;const relocate=()=>{target.style.left=`${8+Math.random()*78}%`;target.style.top=`${12+Math.random()*68}%`};target.onclick=e=>{e.preventDefault();hits++;$('weaponStatus').textContent=`命中 ${hits} / 5`;target.classList.add('hit');setTimeout(()=>target.classList.remove('hit'),150);if(hits>=5){clearInterval(moveTimer);setTimeout(()=>finishInteractiveTask(id),250)}else relocate()};relocate();moveTimer=setInterval(()=>{if(!activeTaskFinished)relocate()},1100);registerTaskCleanup(()=>clearInterval(moveTimer));

  }else if(id==='oxygen'){
    root.innerHTML='<p class="task-guide">フィルターに詰まった異物をつかみ、右下の廃棄ボックスまで運び出してください。</p><div class="filter-chamber task-board" id="filterChamber"><div class="airflow">AIR FLOW →</div><div class="waste-bin" id="wasteBin">廃棄</div></div><p id="filterStatus" class="task-status">異物 5個</p>';
    const chamber=$('filterChamber'),bin=$('wasteBin');let leftCount=5;const cleanups=[];const positions=[[15,18],[39,26],[22,57],[48,66],[60,38]];
    positions.forEach(([x,y],i)=>{const debris=document.createElement('button');debris.className=`filter-debris debris-${i%3}`;debris.style.left=`${x}%`;debris.style.top=`${y}%`;debris.textContent=['✦','●','◆'][i%3];chamber.append(debris);cleanups.push(bindTaskDrag(debris,{onDrop:e=>{if(!pointInside(bin,e.clientX,e.clientY,-8)){return false}debris.dataset.locked='yes';debris.classList.add('discarded');setTimeout(()=>debris.remove(),220);$('filterStatus').textContent=`異物 ${--leftCount}個`;if(leftCount===0)setTimeout(()=>finishInteractiveTask(id),450);return true}}))});registerTaskCleanup(...cleanups);

  }else{
    root.innerHTML=`<p class="task-guide">3本の制御棒を緑色の安定範囲へ合わせ、安定化ボタンを押し続けてください。</p><div class="reactor-panel"><div class="reactor-rods" id="reactorRods">${[1,2,3].map((n,i)=>`<label><span>ROD ${n}</span><input class="reactor-rod" type="range" min="0" max="100" value="${15+i*18}"><i></i></label>`).join('')}</div><div class="reactor-core"><span id="reactorReadout">不安定</span><div class="task-meter"><i id="reactorBar"></i></div></div></div><button id="reactHold" class="danger task-hold" disabled>押したまま安定化</button>`;
    const rods=[...root.querySelectorAll('.reactor-rod')],hold=$('reactHold');let timer=0,progress=0;
    const update=()=>{const ready=rods.every(r=>Math.abs(+r.value-50)<=7);rods.forEach(r=>r.parentElement.classList.toggle('aligned',Math.abs(+r.value-50)<=7));hold.disabled=!ready;$('reactorReadout').textContent=ready?'制御棒同期：保持してください':'制御棒を中央へ';if(!ready){progress=0;$('reactorBar').style.width='0%';if(timer){clearInterval(timer);timer=0}}};rods.forEach(r=>r.oninput=update);
    const stop=()=>{if(timer){clearInterval(timer);timer=0}};const start=e=>{e.preventDefault();if(hold.disabled||timer)return;timer=setInterval(()=>{progress=Math.min(100,progress+3);$('reactorBar').style.width=`${progress}%`;if(progress>=100){stop();finishInteractiveTask(id)}},45)};hold.addEventListener('pointerdown',start,{passive:false});hold.addEventListener('pointerup',stop);hold.addEventListener('pointercancel',stop);hold.addEventListener('pointerleave',stop);update();registerTaskCleanup(()=>{stop();hold.removeEventListener('pointerdown',start);hold.removeEventListener('pointerup',stop);hold.removeEventListener('pointercancel',stop);hold.removeEventListener('pointerleave',stop)});
  }
  openDialog('taskDialog');
}
function finishTask(id){const counts=activeTaskCountsProgress&&activeTaskCompletionId===id;if(counts){const s=JSON.parse(localStorage.getItem('hiddenCrewStats')||'{"games":0,"wins":0,"tasks":0}');s.tasks=(s.tasks||0)+1;localStorage.setItem('hiddenCrewStats',JSON.stringify(s));send('taskComplete',{task:id})}closeDialog('taskDialog');showNotice(counts?'タスク完了！':'模擬操作完了（進捗には加算されません）')}
$('taskDialog').addEventListener('close',()=>{resetTaskRuntime();resetPerformanceSampling({restoreQuality:true,delay:6000})});
function openMeeting(reason){if(activeCallPeer)hangUpCall(true);stopMeetingVoice();updateGroupVoiceUi();$('meetingReason').textContent=reason;renderVotes();openDialog('meetingDialog');setVoiceStatus('「音声を聞く」を押すと、会議中の全員の声が聞こえます。');updateMeetingVoiceUi();enableMeetingAudio(false)}
function renderVotes(){if(!state)return;const root=$('voteList');root.innerHTML='';state.players.filter(p=>p.alive).forEach(p=>{const b=document.createElement('button');b.textContent=p.name;b.onclick=()=>{send('vote',{targetId:p.id});disableVotes()};root.append(b)});$('skipVoteButton').onclick=()=>{send('vote',{targetId:'skip'});disableVotes()}}
function disableVotes(){document.querySelectorAll('#voteList button,#skipVoteButton').forEach(b=>b.disabled=true)}
function bindChatForm(formId,inputId){const form=$(formId),input=$(inputId);if(!form||!input)return;form.onsubmit=e=>{e.preventDefault();const text=input.value.trim();if(!text)return;if(socket?.readyState!==WebSocket.OPEN){showNotice('チャットサーバーへ接続されていません');return}send('chat',{text});input.value='';input.focus()}}
bindChatForm('globalChatForm','globalChatInput');bindChatForm('meetingChatForm','meetingChatInput');
function appendChat(m){const phase={lobby:'ロビー',playing:'ゲーム',meeting:'会議',finished:'終了'}[m.phase]||'';for(const id of ['globalChatLog','meetingChatLog']){const log=$(id);if(!log)continue;const d=document.createElement('div');d.className='chat-line';const ghost=m.alive===false?'👻 ':'';d.innerHTML=`<span class="chat-name">${ghost}${escapeHtml(m.from)}</span><span class="chat-phase">${escapeHtml(phase)}</span><br>${escapeHtml(m.text)}`;log.append(d);log.scrollTop=log.scrollHeight}}
const chatPanel=$('globalChatPanel'),chatToggle=$('chatToggleButton');
if(chatPanel&&chatToggle){
  const mobileChatLayout=()=>matchMedia('(max-width: 640px)').matches;
  const setChatCollapsed=collapsed=>{
    chatPanel.classList.toggle('collapsed',collapsed);
    chatToggle.textContent=collapsed?'開く':'最小化';
    document.documentElement.classList.toggle('mobile-chat-open',mobileChatLayout()&&!collapsed);
  };
  // スマホでは移動スティックを隠さないよう、最初はチャットを小さく表示する。

  if(mobileChatLayout())setChatCollapsed(true);
  chatToggle.onclick=()=>{setChatCollapsed(!chatPanel.classList.contains('collapsed'));queueHudLayout()};
}
let hudLayoutFrame=0;
let lastHudLayoutKey='';
function queueHudLayout(){
  if(hudLayoutFrame)cancelAnimationFrame(hudLayoutFrame);
  hudLayoutFrame=requestAnimationFrame(()=>{hudLayoutFrame=0;adjustHudLayout()});
}
function setHudStyle(el,property,value){
  if(el&&el.style[property]!==value)el.style[property]=value;
}
function layoutMiniMap(){
  const map=ui.miniMap,chat=$('globalChatPanel');if(!map||!chat)return;
  if(!miniMapEnabled||matchMedia('(max-width:720px)').matches){map.style.display='none';return}
  map.style.display='block';map.style.position='fixed';map.style.right='18px';map.style.bottom='auto';map.style.transformOrigin='top right';
  const task=$('taskPanel'),taskRect=task&&!task.classList.contains('hidden')?task.getBoundingClientRect():null;
  let scale=window.innerWidth<1000?.78:window.innerWidth<1250?.9:1;
  let top=Math.max(92,Math.round((taskRect?.bottom||88)+12));
  map.style.top=`${top}px`;map.style.transform=`scale(${scale})`;
  let mapRect=map.getBoundingClientRect(),chatRect=chat.getBoundingClientRect();
  const overlaps=()=>mapRect.left<chatRect.right+10&&mapRect.right>chatRect.left-10&&mapRect.top<chatRect.bottom+10&&mapRect.bottom>chatRect.top-10;
  if(overlaps()){
    const aboveChat=Math.floor(chatRect.top-mapRect.height-12);
    const taskBottom=Math.ceil((taskRect?.bottom||82)+10);
    if(aboveChat>=taskBottom){top=aboveChat;map.style.top=`${top}px`;mapRect=map.getBoundingClientRect()}
    else{
      scale=Math.max(.58,scale-.18);map.style.transform=`scale(${scale})`;mapRect=map.getBoundingClientRect();
      const secondAbove=Math.floor(chatRect.top-mapRect.height-12);
      if(secondAbove>=taskBottom){map.style.top=`${secondAbove}px`;mapRect=map.getBoundingClientRect()}
      if(mapRect.left<chatRect.right+10&&mapRect.top<chatRect.bottom+10&&mapRect.bottom>chatRect.top-10)map.style.display='none';
    }
  }
}
function adjustHudLayout(){
  const action=ui.actionBar,chat=$('globalChatPanel'),hint=$('controlHint');
  if(!action||!chat)return;
  layoutMiniMap();
  const mobile=matchMedia('(max-width:900px)').matches;
  if(mobile){
    const key=`mobile:${innerWidth}:${innerHeight}`;
    if(key===lastHudLayoutKey)return;
    lastHudLayoutKey=key;
    for(const el of [action,hint]){
      if(!el)continue;
      for(const property of ['left','right','bottom','transform','maxWidth'])el.style.removeProperty(property.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`));
    }
    return;
  }
  if(action.classList.contains('hidden'))return;
  const taskRect=$('taskPanel')?.getBoundingClientRect();
  const mapRect=$('miniMap')?.getBoundingClientRect();
  const chatRect=chat.getBoundingClientRect();
  const actionBefore=action.getBoundingClientRect();
  const actionTop=Number.isFinite(actionBefore.top)?actionBefore.top:window.innerHeight-90;
  const overlapsActionHeight=rect=>!!rect&&rect.width>0&&rect.bottom>actionTop-10&&rect.top<window.innerHeight-8;
  const leftLimit=Math.round(chatRect.right+16);
  let rightLimit=Math.round(window.innerWidth-18);
  // Right-side panels only restrict the action bar when they actually occupy the same vertical area.
  if(overlapsActionHeight(taskRect))rightLimit=Math.min(rightLimit,Math.round(taskRect.left-16));
  if(overlapsActionHeight(mapRect))rightLimit=Math.min(rightLimit,Math.round(mapRect.left-16));
  const available=Math.max(180,rightLimit-leftLimit);
  const naturalWidth=Math.min(action.scrollWidth||action.getBoundingClientRect().width,available);
  const half=naturalWidth/2;
  let center=Math.round(window.innerWidth/2);
  center=Math.max(center,Math.ceil(leftLimit+half));
  center=Math.min(center,Math.floor(rightLimit-half));
  const narrow=available<naturalWidth+24;
  const actionHeight=Math.round(action.getBoundingClientRect().height||66);
  const hintBottom=Math.max(88,actionHeight+30);
  const key=[window.innerWidth,window.innerHeight,chat.classList.contains('collapsed'),leftLimit,rightLimit,Math.round(naturalWidth),actionHeight,narrow].join(':');
  if(key===lastHudLayoutKey)return;
  lastHudLayoutKey=key;
  setHudStyle(action,'bottom','calc(18px + env(safe-area-inset-bottom,0px))');
  if(narrow){
    setHudStyle(action,'left',`${leftLimit}px`);
    setHudStyle(action,'right',`${Math.max(18,window.innerWidth-rightLimit)}px`);
    setHudStyle(action,'transform','none');
    setHudStyle(action,'maxWidth',`${available}px`);
    if(hint){
      setHudStyle(hint,'left',`${leftLimit}px`);
      setHudStyle(hint,'right',`${Math.max(18,window.innerWidth-rightLimit)}px`);
      setHudStyle(hint,'bottom',`${hintBottom}px`);
      setHudStyle(hint,'transform','none');
      setHudStyle(hint,'maxWidth',`${available}px`);
    }
  }else{
    setHudStyle(action,'left',`${center}px`);
    setHudStyle(action,'right','auto');
    setHudStyle(action,'transform','translateX(-50%)');
    setHudStyle(action,'maxWidth',`${available}px`);
    if(hint){
      setHudStyle(hint,'left',`${center}px`);
      setHudStyle(hint,'right','auto');
      setHudStyle(hint,'bottom',`${hintBottom}px`);
      setHudStyle(hint,'transform','translateX(-50%)');
      setHudStyle(hint,'maxWidth',`${available}px`);
    }
  }
}
window.addEventListener('resize',queueHudLayout,{passive:true});
window.addEventListener('orientationchange',()=>setTimeout(queueHudLayout,120),{passive:true});
new MutationObserver(()=>{lastHudLayoutKey='';queueHudLayout()}).observe(chatPanel,{attributes:true,attributeFilter:['class']});
new MutationObserver(()=>{lastHudLayoutKey='';queueHudLayout()}).observe(ui.actionBar,{attributes:true,attributeFilter:['class']});
if('ResizeObserver' in window){const hudResizeObserver=new ResizeObserver(()=>{lastHudLayoutKey='';queueHudLayout()});hudResizeObserver.observe(chatPanel);hudResizeObserver.observe(ui.actionBar);if($('taskPanel'))hudResizeObserver.observe($('taskPanel'))}
queueHudLayout();

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
  updateMicButton();updateGroupVoiceUi();
}
function getVoiceAudioContext(){
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return null;
  if(!voiceAudioContext||voiceAudioContext.state==='closed'){try{voiceAudioContext=new AudioContextClass({latencyHint:'interactive'})}catch{voiceAudioContext=new AudioContextClass()}}
  return voiceAudioContext;
}
function groupVoiceAvailable(){return !!state&&state.phase!=='meeting'&&socket?.readyState===WebSocket.OPEN}
function groupVoiceActive(){return groupVoiceAvailable()&&!activeCallPeer&&groupVoiceJoined}
function setGroupVoiceStatus(text,active=false){
  const status=$('groupVoiceStatus');if(!status)return;status.textContent=text||'グループ音声：未接続';status.classList.toggle('active',active);
}
function updateGroupVoiceUi(){
  const speaker=$('groupSpeakerButton'),mic=$('groupMicButton'),leave=$('groupLeaveButton');if(!speaker||!mic||!leave)return;
  const context=voiceAudioContext,connected=socket?.readyState===WebSocket.OPEN;
  leave.classList.toggle('hidden',!groupVoiceJoined);leave.disabled=!groupVoiceJoined;
  if(!connected||!state){speaker.disabled=true;mic.disabled=true;speaker.textContent='🔊 聞くだけで参加';mic.textContent='🎙 マイクで参加';setGroupVoiceStatus('グループトーク：未接続');return}
  if(state.phase==='meeting'){
    speaker.disabled=true;mic.disabled=true;leave.disabled=!groupVoiceJoined;speaker.textContent='🔊 会議音声へ';mic.textContent='🎙 会議中';setGroupVoiceStatus(groupVoiceJoined?'会議中のため一時停止中':'会議中は会議専用音声を使用します');return;
  }
  if(activeCallPeer){
    speaker.disabled=true;mic.disabled=true;leave.disabled=!groupVoiceJoined;speaker.textContent='🔊 一時停止';mic.textContent='🎙 個人通話中';setGroupVoiceStatus(groupVoiceJoined?'個人通話中のため一時停止中':'個人通話中は参加できません');return;
  }
  const audioReady=groupVoiceListening&&context?.state==='running';
  speaker.disabled=groupVoiceStarting||groupVoiceJoined;
  mic.disabled=groupVoiceStarting;
  speaker.textContent=groupVoiceJoined?'🔊 参加中':'🔊 聞くだけで参加';
  if(groupVoiceStarting)mic.textContent='🎙 準備中…';
  else if(!groupVoiceJoined)mic.textContent='🎙 マイクで参加';
  else if(!groupVoiceStream)mic.textContent='🎙 マイクを追加';
  else mic.textContent=groupVoiceMuted?'🔇 マイクOFF':'🎙 マイクON';
  mic.classList.toggle('muted',groupVoiceMuted);
  if(groupVoiceJoined&&groupVoiceStream)setGroupVoiceStatus(groupVoiceMuted?'参加中（聞くだけ・マイクOFF）':'グループトークに参加中（マイクON）',true);
  else if(groupVoiceJoined&&audioReady)setGroupVoiceStatus('グループトークに参加中（聞くだけ）',true);
  else setGroupVoiceStatus('グループトーク：未参加');
}
function setGroupMembership(joined){
  const next=Boolean(joined);if(groupVoiceJoined===next)return;groupVoiceJoined=next;
  if(socket?.readyState===WebSocket.OPEN)send('groupVoiceControl',{action:next?'join':'leave'});
}
async function enableGroupAudio(showMessage=true){
  const context=getVoiceAudioContext();
  if(!context){if(showMessage)showNotice('このブラウザではグループ音声を再生できません。');updateGroupVoiceUi();return false}
  try{if(context.state==='suspended')await context.resume()}catch(error){console.warn('Group audio resume failed',error)}
  groupVoiceListening=context.state==='running';
  if(!groupVoiceListening&&showMessage)showNotice('もう一度「音声を聞く」を押してください。');
  updateGroupVoiceUi();return groupVoiceListening;
}
async function startGroupVoice(){
  if(!groupVoiceAvailable()){showNotice(state?.phase==='meeting'?'会議中は会議専用音声を使ってください。':'グループトークへ接続できません。');return false}
  if(activeCallPeer){showNotice('個人通話を終了してからグループトークへ参加してください。');return false}
  if(groupVoiceStream)return true;if(groupVoiceStarting)return false;
  if(!navigator.mediaDevices?.getUserMedia){showNotice('グループトークにはHTTPSで開ける対応ブラウザが必要です。');return false}
  groupVoiceStarting=true;updateGroupVoiceUi();setGroupVoiceStatus('マイクの許可を待っています…');
  try{
    await enableGroupAudio(false);
    groupVoiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
    groupVoiceMuted=false;groupVoiceListening=true;setGroupMembership(true);
    const context=getVoiceAudioContext();if(!context)throw new Error('AudioContext unavailable');if(context.state==='suspended')await context.resume();
    groupVoiceSource=context.createMediaStreamSource(groupVoiceStream);
    groupVoiceProcessor=context.createScriptProcessor(4096,1,1);
    groupVoiceSilentGain=context.createGain();groupVoiceSilentGain.gain.value=0;
    groupVoiceSource.connect(groupVoiceProcessor);groupVoiceProcessor.connect(groupVoiceSilentGain).connect(context.destination);
    groupVoiceProcessor.onaudioprocess=event=>{
      if(!groupVoiceActive()||groupVoiceMuted||socket?.readyState!==WebSocket.OPEN)return;
      const track=groupVoiceStream?.getAudioTracks()?.[0];if(!track?.enabled)return;
      const input=event.inputBuffer.getChannelData(0);let energy=0;for(let i=0;i<input.length;i+=4)energy+=input[i]*input[i];
      const rms=Math.sqrt(energy/Math.max(1,Math.ceil(input.length/4)));if(rms<.009)return;
      const now=performance.now();if(now-groupVoiceLastSentAt<65)return;groupVoiceLastSentAt=now;
      const pcm=downsampleVoice(input,event.inputBuffer.sampleRate||context.sampleRate);if(!pcm.length)return;
      send('groupVoiceAudio',{rate:RELAY_SAMPLE_RATE,seq:++groupVoiceSequence,data:pcmToBase64(pcm)});
    };
    updateGroupVoiceUi();showNotice('グループトークに参加しました。');return true;
  }catch(error){
    console.error('Group microphone error',error);stopGroupVoice();showNotice('マイクを使用できません。ブラウザのサイト設定で許可してください。');return false;
  }finally{groupVoiceStarting=false;updateGroupVoiceUi()}
}
function stopGroupVoice(notify=true){
  if(groupVoiceProcessor){groupVoiceProcessor.onaudioprocess=null;try{groupVoiceProcessor.disconnect()}catch{}groupVoiceProcessor=null}
  if(groupVoiceSource){try{groupVoiceSource.disconnect()}catch{}groupVoiceSource=null}
  if(groupVoiceSilentGain){try{groupVoiceSilentGain.disconnect()}catch{}groupVoiceSilentGain=null}
  for(const track of groupVoiceStream?.getTracks()||[])track.stop();
  groupVoiceStream=null;groupVoiceStarting=false;groupVoiceMuted=false;groupVoiceListening=false;groupVoiceSequence=0;groupVoiceLastSentAt=0;groupVoicePlaybackAt.clear();
  if(notify)setGroupMembership(false);else groupVoiceJoined=false;
  updateGroupVoiceUi();
}
async function handleGroupVoiceAudio(message){
  if(!groupVoiceActive()||!groupVoiceListening||!message.fromId||message.fromId===myId||typeof message.data!=='string'||message.data.length>16000)return;
  const context=getVoiceAudioContext();if(!context||context.state!=='running'){setGroupVoiceStatus('音声を聞くには「🔊 音声を聞く」を押してください');updateGroupVoiceUi();return}
  try{
    const pcm=base64ToPcm(message.data);if(!pcm.length)return;
    const rate=Math.max(8000,Math.min(24000,Number(message.rate)||RELAY_SAMPLE_RATE));
    const buffer=context.createBuffer(1,pcm.length,rate),channel=buffer.getChannelData(0);for(let i=0;i<pcm.length;i++)channel[i]=pcm[i]/32768;
    const source=context.createBufferSource(),gain=context.createGain();gain.gain.value=.88;source.buffer=buffer;source.connect(gain).connect(context.destination);
    const now=context.currentTime;let playAt=groupVoicePlaybackAt.get(message.fromId)||0;if(!playAt||playAt<now-.08||playAt>now+.45)playAt=now+.045;
    source.start(playAt);groupVoicePlaybackAt.set(message.fromId,playAt+buffer.duration);source.onended=()=>{try{source.disconnect();gain.disconnect()}catch{}};
    const name=message.from||state?.players?.find(player=>player.id===message.fromId)?.name||'参加者';setGroupVoiceStatus(`🗣 ${name}が話しています`,true);
  }catch(error){console.warn('Group voice playback failed',error)}
}
$('groupSpeakerButton').onclick=async()=>{if(groupVoiceJoined)return;const ready=await enableGroupAudio(true);if(!ready)return;setGroupMembership(true);updateGroupVoiceUi();showNotice('グループトークへ聞くだけで参加しました。')};
$('groupMicButton').onclick=async()=>{
  if(!groupVoiceStream){await startGroupVoice();return}
  groupVoiceMuted=!groupVoiceMuted;for(const track of groupVoiceStream.getAudioTracks())track.enabled=!groupVoiceMuted;updateGroupVoiceUi();
};
$('groupLeaveButton').onclick=()=>{if(!groupVoiceJoined)return;stopGroupVoice(true);showNotice('グループトークから退出しました。')};

function meetingVoiceActive(){return state?.phase==='meeting'&&document.getElementById('meetingDialog')?.open}
function updateMeetingVoiceUi(){
  const speaker=$('speakerButton'),button=$('micButton'),player=me(),context=getVoiceAudioContext();
  if(!speaker||!button)return;
  const inMeeting=meetingVoiceActive();
  speaker.classList.toggle('hidden',!inMeeting);
  if(!inMeeting)return;
  const audioReady=context?.state==='running';
  speaker.disabled=!context;
  speaker.textContent=audioReady?'🔊 音声ON':'🔊 音声を聞く';
  if(!player?.alive){button.disabled=true;button.textContent='👻 発言できません';button.classList.remove('muted');return}
  button.disabled=meetingVoiceStarting;
  if(meetingVoiceStarting){button.textContent='🎙 準備中…';button.classList.remove('muted');return}
  if(!meetingVoiceStream){button.textContent='🎙 マイク開始';button.classList.remove('muted');return}
  button.textContent=meetingVoiceMuted?'🔇 マイクOFF':'🎙 マイクON';
  button.classList.toggle('muted',meetingVoiceMuted);
}
async function enableMeetingAudio(showMessage=true){
  const context=getVoiceAudioContext();
  if(!context){if(showMessage)showNotice('このブラウザでは会議音声を再生できません。');updateMeetingVoiceUi();return false}
  try{if(context.state==='suspended')await context.resume()}catch(error){console.warn('Meeting audio resume failed',error)}
  const ready=context.state==='running';
  if(ready){audioUnlocked=true;setVoiceStatus(meetingVoiceStream?(meetingVoiceMuted?'会議音声を聞いています。マイクはOFFです。':'会議音声に接続しました。マイクはONです。'):'会議音声を聞ける状態です。話す場合は「マイク開始」を押してください。',true)}
  else if(showMessage){setVoiceStatus('ブラウザの音声制限により再生できません。もう一度「音声を聞く」を押してください。');showNotice('会議音声を有効にできませんでした。')}
  updateMeetingVoiceUi();return ready;
}
async function startMeetingVoice(){
  if(!meetingVoiceActive()||!me()?.alive)return false;
  if(meetingVoiceStream)return true;
  if(meetingVoiceStarting)return false;
  if(!navigator.mediaDevices?.getUserMedia){setVoiceStatus('会議マイクにはHTTPSで開ける対応ブラウザが必要です。');showNotice('この環境ではマイクを使用できません。');return false}
  meetingVoiceStarting=true;updateMeetingVoiceUi();setVoiceStatus('会議マイクの許可を待っています…');
  try{
    await enableMeetingAudio(false);
    meetingVoiceStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
    meetingVoiceMuted=false;
    const context=getVoiceAudioContext();
    if(!context)throw new Error('AudioContext unavailable');
    if(context.state==='suspended')await context.resume();
    meetingVoiceSource=context.createMediaStreamSource(meetingVoiceStream);
    meetingVoiceProcessor=context.createScriptProcessor(2048,1,1);
    meetingVoiceSilentGain=context.createGain();meetingVoiceSilentGain.gain.value=0;
    meetingVoiceSource.connect(meetingVoiceProcessor);meetingVoiceProcessor.connect(meetingVoiceSilentGain).connect(context.destination);
    meetingVoiceProcessor.onaudioprocess=event=>{
      if(!meetingVoiceActive()||meetingVoiceMuted||socket?.readyState!==WebSocket.OPEN)return;
      const track=meetingVoiceStream?.getAudioTracks()?.[0];if(!track?.enabled)return;
      const pcm=downsampleVoice(event.inputBuffer.getChannelData(0),event.inputBuffer.sampleRate||context.sampleRate);if(!pcm.length)return;
      send('meetingVoiceAudio',{rate:RELAY_SAMPLE_RATE,seq:++meetingVoiceSequence,data:pcmToBase64(pcm)});
    };
    setVoiceStatus('会議音声に接続しました。生存している全員に声が届きます。',true);return true;
  }catch(error){
    console.error('Meeting microphone error',error);stopMeetingVoice();setVoiceStatus('マイクを使用できません。アドレスバー横のサイト設定でマイクを許可してください。');showNotice('会議マイクの使用が許可されませんでした。');return false;
  }finally{meetingVoiceStarting=false;updateMeetingVoiceUi()}
}
function stopMeetingVoice(){
  if(meetingVoiceProcessor){meetingVoiceProcessor.onaudioprocess=null;try{meetingVoiceProcessor.disconnect()}catch{}meetingVoiceProcessor=null}
  if(meetingVoiceSource){try{meetingVoiceSource.disconnect()}catch{}meetingVoiceSource=null}
  if(meetingVoiceSilentGain){try{meetingVoiceSilentGain.disconnect()}catch{}meetingVoiceSilentGain=null}
  for(const track of meetingVoiceStream?.getTracks()||[])track.stop();
  meetingVoiceStream=null;meetingVoiceStarting=false;meetingVoiceMuted=false;meetingVoiceSequence=0;meetingVoicePlaybackAt.clear();
  updateMeetingVoiceUi();
}
async function handleMeetingVoiceAudio(message){
  if(!meetingVoiceActive()||!message.fromId||message.fromId===myId||typeof message.data!=='string'||message.data.length>16000)return;
  const context=getVoiceAudioContext();if(!context)return;
  if(context.state!=='running'){setVoiceStatus('会議音声を聞くには「音声を聞く」を押してください。');updateMeetingVoiceUi();return}
  try{
    const pcm=base64ToPcm(message.data);if(!pcm.length)return;
    const rate=Math.max(8000,Math.min(24000,Number(message.rate)||RELAY_SAMPLE_RATE));
    const buffer=context.createBuffer(1,pcm.length,rate),channel=buffer.getChannelData(0);
    for(let i=0;i<pcm.length;i++)channel[i]=pcm[i]/32768;
    const source=context.createBufferSource(),gain=context.createGain();gain.gain.value=.95;source.buffer=buffer;source.connect(gain).connect(context.destination);
    const now=context.currentTime;let playAt=meetingVoicePlaybackAt.get(message.fromId)||0;
    if(!playAt||playAt<now-.08||playAt>now+.55)playAt=now+.055;
    source.start(playAt);meetingVoicePlaybackAt.set(message.fromId,playAt+buffer.duration);
    source.onended=()=>{try{source.disconnect();gain.disconnect()}catch{}};
    const name=message.from||state?.players?.find(player=>player.id===message.fromId)?.name||'参加者';
    setVoiceStatus(`会議音声を受信中：${name}`,true);
  }catch(error){console.warn('Meeting voice playback failed',error)}
}
async function unlockRemoteAudio(){
  audioUnlocked=true;const context=getVoiceAudioContext();
  try{if(context?.state==='suspended')await context.resume()}catch{}
  for(const audio of document.querySelectorAll('#remoteAudio audio')){const peerId=audio.id.startsWith('voice-')?audio.id.slice(6):'';if(remoteAudioNodes.has(peerId)){audio.muted=true;continue}audio.muted=false;audio.volume=1;try{await audio.play()}catch{}}
  if(meetingVoiceActive())updateMeetingVoiceUi();
  updateGroupVoiceUi();
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
      voiceRelaySource=context.createMediaStreamSource(localVoiceStream);voiceRelayProcessor=context.createScriptProcessor(2048,1,1);voiceRelaySilentGain=context.createGain();voiceRelaySilentGain.gain.value=0;
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
function updateMicButton(){const button=$('micButton');if(!button)return;if(meetingVoiceActive()){updateMeetingVoiceUi();return}if(!activeCallPeer){button.textContent='🎙 通話相手なし';button.disabled=true;button.classList.remove('muted');return}button.disabled=false;if(!localVoiceStream){button.textContent='🎙 マイク開始';button.classList.remove('muted');return}button.textContent=micMuted?'🔇 マイクOFF':'🎙 マイクON';button.classList.toggle('muted',micMuted)}
$('speakerButton').onclick=()=>enableMeetingAudio(true);
$('micButton').onclick=async()=>{if(meetingVoiceActive()){await enableMeetingAudio(false);if(!meetingVoiceStream){await startMeetingVoice();return}meetingVoiceMuted=!meetingVoiceMuted;for(const track of meetingVoiceStream.getAudioTracks())track.enabled=!meetingVoiceMuted;updateMeetingVoiceUi();setVoiceStatus(meetingVoiceMuted?'会議音声を聞いています。マイクはOFFです。':'会議音声に接続しました。マイクはONです。',true);return}await unlockRemoteAudio();if(!activeCallPeer){showNotice('先にメンバー一覧の📞から通話相手を選んでください。');updateCallUi();return}if(!localVoiceStream){await startVoiceChat();return}micMuted=!micMuted;for(const track of localVoiceStream.getAudioTracks())track.enabled=!micMuted;updateCallUi();setVoiceStatus(micMuted?'マイクをミュートしています。':voiceRelayActive?'音声中継モードで接続しました。':'音声通話に接続しました。',!micMuted)};
async function placeCall(peerId){
  if(!peerId||peerId===myId)return;if(activeCallPeer){showNotice('先に現在の通話を終了してください。');return}
  const target=state?.players?.find(player=>player.id===peerId);if(!target?.connected){showNotice('相手は現在接続していません。');return}
  activeCallPeer=peerId;currentVoiceStatus=`${target?.name||'相手'}への通話を準備しています…`;updateCallUi();await unlockRemoteAudio();
  const started=await startVoiceChat();if(!started||!localVoiceStream){activeCallPeer=null;updateCallUi();return}
  setVoiceStatus(`${target?.name||'相手'}を呼び出しています…`,true);send('callControl',{targetId:peerId,action:'ring'});armCallTimeout(peerId,20000,'応答がないため呼び出しを終了しました。');
}
async function acceptIncomingCall(){
  if(!incomingCallPeer)return;const peer=incomingCallPeer;if(incomingCallTimeoutId){clearTimeout(incomingCallTimeoutId);incomingCallTimeoutId=0}activeCallPeer=peer;incomingCallPeer=null;closeDialog('incomingCallDialog');currentVoiceStatus='個人通話を準備しています…';updateCallUi();await unlockRemoteAudio();
  const started=await startVoiceChat();if(!started||!localVoiceStream){hangUpCall(false);return}
  send('callControl',{targetId:activeCallPeer,action:'accept'});
  // TURNサーバーがない環境でも確実に話せるよう、相手だけに届く音声中継を先に開始する。
  const relayStarted=await startVoiceRelay(activeCallPeer,false);
  ensureVoicePeer(activeCallPeer,false);
  if(!relayStarted)armVoiceFallback(activeCallPeer,800);
  setVoiceStatus(relayStarted?'個人音声通話に接続しました。':'個人音声通話に接続中…',true);
}
function declineIncomingCall(){clearIncomingCall(true)}
async function handleCallControl(m){
  const from=m.fromId,action=m.action;if(!from)return;
  if(action==='ring'){
    if(activeCallPeer||incomingCallPeer){send('callControl',{targetId:from,action:'busy'});return}
    incomingCallPeer=from;const caller=state?.players?.find(player=>player.id===from);$('incomingCallerName').textContent=`${caller?.name||'メンバー'}から着信です`;openDialog('incomingCallDialog');updateCallUi();
    if(incomingCallTimeoutId)clearTimeout(incomingCallTimeoutId);incomingCallTimeoutId=setTimeout(()=>{if(incomingCallPeer===from)clearIncomingCall(true)},20000);
  }else if(action==='accept'&&activeCallPeer===from){
    clearCallTimeout();const started=await startVoiceChat();if(started&&localVoiceStream){
      // 発信側も通話成立直後から個人宛て中継を開始し、WebRTC直接接続は並行して試す。
      const relayStarted=await startVoiceRelay(from,true);
      ensureVoicePeer(from,true);
      if(!relayStarted)armVoiceFallback(from,800);
      setVoiceStatus(relayStarted?'個人音声通話に接続しました。':'個人音声通話に接続中…',true);updateCallUi();
    }
  }else if(action==='relay'&&activeCallPeer===from){await startVoiceRelay(from,false)}
  else if(['decline','busy','unavailable'].includes(action)&&activeCallPeer===from){showNotice(action==='busy'?'相手は通話中です。':action==='unavailable'?'相手に接続できませんでした。':'通話が拒否されました。');hangUpCall(false)}
  else if(action==='hangup'&&incomingCallPeer===from){showNotice('着信がキャンセルされました。');clearIncomingCall(false)}
  else if(action==='hangup'&&activeCallPeer===from){showNotice('通話が終了しました。');hangUpCall(false)}
}
function hangUpCall(notify=true){const peer=activeCallPeer;clearCallTimeout();clearVoiceFallbackTimer();if(notify&&peer)send('callControl',{targetId:peer,action:'hangup'});activeCallPeer=null;stopVoiceChat();setVoiceStatus('メンバー一覧の📞から個別通話できます。');updateCallUi()}
ui.players.addEventListener('click',event=>{const button=event.target.closest('.call-member');if(button)placeCall(button.dataset.callId)});
$('acceptCallButton').onclick=acceptIncomingCall;$('declineCallButton').onclick=declineIncomingCall;$('hangupCallButton').onclick=()=>hangUpCall(true);
updateCallUi();
addEventListener('beforeunload',()=>{stopMeetingVoice();hangUpCall(false);clearIncomingCall(false)});

function openResult(w){restoreSpectatorHiddenModel();$('resultTitle').textContent=w==='crew'?'CREW VICTORY':'WEREWOLF VICTORY';$('resultText').textContent=w==='crew'?'クルーの勝利です！':'人狼の勝利です。';$('resultPlayers').innerHTML=(state?.players||[]).filter(p=>!p.practiceTarget).map(p=>`<span class="result-pill">${escapeHtml(p.name)}</span>`).join('');$('returnLobbyButton').classList.toggle('hidden',state?.hostId!==myId);openDialog('resultDialog')}$('resultCloseButton').onclick=()=>closeDialog('resultDialog');$('returnLobbyButton').onclick=()=>{send('returnLobby');closeDialog('resultDialog')};
function openDialog(id){const d=$(id);resetPerformanceSampling({delay:7000});if(!d.open)d.showModal()}function closeDialog(id){const d=$(id);if(id==='securityDialog'){securityOpen=false;clearKeys()}if(d?.open)d.close();setTimeout(()=>resetPerformanceSampling({restoreQuality:true,delay:5500}),80)}function flashScreen(){document.body.animate([{filter:'brightness(1)'},{filter:'brightness(2) saturate(2)'},{filter:'brightness(1)'}],{duration:450})}
function setupJoystick(){
  if(!ui.joystick||!ui.stick)return;
  let active=false;
  let activePointerId=null;
  let touchId=null;

  ui.joystick.style.touchAction='none';
  ui.joystick.style.userSelect='none';
  ui.joystick.style.webkitUserSelect='none';
  ui.joystick.style.pointerEvents='auto';
  ui.joystick.style.zIndex='80';
  ui.joystick.setAttribute('role','application');
  ui.joystick.setAttribute('aria-label','移動ジョイスティック');

  const reset=()=>{
    active=false;
    activePointerId=null;
    touchId=null;
    joy={x:0,y:0};
    ui.stick.style.transform='translate(0px,0px)';
  };
  const applyPoint=(clientX,clientY)=>{
    if(!active)return;
    const r=ui.joystick.getBoundingClientRect();
    if(!r.width||!r.height)return;
    const x=clientX-(r.left+r.width/2);
    const y=clientY-(r.top+r.height/2);
    const distance=Math.hypot(x,y);
    const maxDistance=Math.max(34,Math.min(r.width,r.height)*.36);
    const rawAmount=Math.min(1,distance/maxDistance);
    const isFirstPerson=renderMode==='3d'&&cameraMode===2;
    // 一人称のスマホ操作は中央付近に広めの遊びを作り、少し触れただけでは動かさない。
    // 外側へ倒すほど徐々に速度が上がり、最大まで倒したときだけ従来の速度になる。
    const deadZone=isFirstPerson ? .24 : .07;
    const responsePower=isFirstPerson ? 1.75 : 1.08;
    const response=rawAmount<=deadZone?0:Math.pow((rawAmount-deadZone)/(1-deadZone),responsePower);
    const angle=Math.atan2(y,x);
    joy={x:Math.cos(angle)*response,y:Math.sin(angle)*response};
    const visualDistance=Math.min(40,maxDistance*.82);
    const visualAmount=rawAmount<=.02?0:rawAmount;
    ui.stick.style.transform=`translate(${Math.cos(angle)*visualAmount*visualDistance}px,${Math.sin(angle)*visualAmount*visualDistance}px)`;
  };
  const pointerDown=e=>{
    if(active||e.button>0)return;
    e.preventDefault();
    active=true;
    activePointerId=e.pointerId;
    try{ui.joystick.setPointerCapture?.(e.pointerId)}catch{}
    applyPoint(e.clientX,e.clientY);
  };
  const pointerMove=e=>{
    if(!active||e.pointerId!==activePointerId)return;
    e.preventDefault();
    applyPoint(e.clientX,e.clientY);
  };
  const pointerEnd=e=>{
    if(!active||e.pointerId!==activePointerId)return;
    e.preventDefault();
    try{ui.joystick.releasePointerCapture?.(e.pointerId)}catch{}
    reset();
  };

  ui.joystick.addEventListener('contextmenu',e=>e.preventDefault());
  if(window.PointerEvent){
    ui.joystick.addEventListener('pointerdown',pointerDown,{passive:false});
    document.addEventListener('pointermove',pointerMove,{passive:false});
    document.addEventListener('pointerup',pointerEnd,{passive:false});
    document.addEventListener('pointercancel',pointerEnd,{passive:false});
    ui.joystick.addEventListener('lostpointercapture',()=>{if(active)reset()});
  }else{
    const findTouch=list=>Array.from(list||[]).find(t=>t.identifier===touchId);
    ui.joystick.addEventListener('touchstart',e=>{
      if(active||!e.changedTouches.length)return;
      e.preventDefault();
      const t=e.changedTouches[0];
      active=true;
      touchId=t.identifier;
      applyPoint(t.clientX,t.clientY);
    },{passive:false});
    document.addEventListener('touchmove',e=>{
      const t=findTouch(e.touches);
      if(!active||!t)return;
      e.preventDefault();
      applyPoint(t.clientX,t.clientY);
    },{passive:false});
    const touchEnd=e=>{
      if(!active||!findTouch(e.changedTouches))return;
      e.preventDefault();
      reset();
    };
    document.addEventListener('touchend',touchEnd,{passive:false});
    document.addEventListener('touchcancel',touchEnd,{passive:false});
  }
}
function resize(){const canvas=$('gameCanvas');if(!canvas)return;const viewport=window.visualViewport;const width=Math.max(1,Math.round(viewport?.width||innerWidth));const height=Math.max(1,Math.round(viewport?.height||innerHeight));document.documentElement.style.setProperty('--app-height',`${height}px`);if(renderMode==='2d'){const ratio=Math.min(devicePixelRatio||1,PERF.maxPixelRatio);canvas.width=Math.max(1,Math.floor(width*ratio));canvas.height=Math.max(1,Math.floor(height*ratio));canvas.style.width=width+'px';canvas.style.height=height+'px';return}if(!camera||!renderer)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false)}
setInterval(()=>{if(state?.phase==='meeting')$('meetingTimer').textContent=`残り ${Math.max(0,Math.ceil((state.meetingEndsAt-Date.now())/1000))}秒`},500);

$('profileSummary').textContent=profileText();

// --- Responsive HUD layout fix: prevents chat, joystick, hints and action buttons from overlapping. ---
(function installHudLayoutFix(){
  const style=document.createElement('style');
  style.id='hiddenCrewHudLayoutFix';
  style.textContent=`
    html,body,#app,.screen{height:var(--app-height,100dvh);overscroll-behavior:none}
    button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    #gameScreen{overflow:hidden;isolation:isolate;background:#020711;touch-action:none}
    #gameCanvas{position:absolute;inset:0;z-index:0;width:100%;height:100%;display:block;background:#020711;touch-action:none}
    input,select,textarea,dialog{touch-action:auto}
    dialog::backdrop{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;background:rgba(1,7,16,.76)}
    /* Full-screen terminal mode */
    #securityDialog,#taskDialog,#sabotageDialog{
      position:fixed!important;inset:0!important;width:100dvw!important;height:100dvh!important;
      max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;
      border:0!important;border-radius:0!important;background:#020711!important;color:#eefaff;
      overflow:hidden!important;
    }
    #securityDialog::backdrop,#taskDialog::backdrop,#sabotageDialog::backdrop{background:#020711!important}
    #securityDialog .dialog-card,#taskDialog .dialog-card,#sabotageDialog .dialog-card{
      width:100%!important;height:100%!important;min-height:100%!important;max-width:none!important;max-height:none!important;
      margin:0!important;border:0!important;border-radius:0!important;box-sizing:border-box!important;
      padding:calc(16px + env(safe-area-inset-top,0px)) calc(18px + env(safe-area-inset-right,0px)) calc(16px + env(safe-area-inset-bottom,0px)) calc(18px + env(safe-area-inset-left,0px))!important;
      background:linear-gradient(145deg,#07162a,#020914 72%)!important;overflow:auto!important;
    }
    #securityDialog .close,#taskDialog .close,#sabotageDialog .close{
      position:fixed!important;z-index:10005!important;top:calc(12px + env(safe-area-inset-top,0px))!important;
      right:calc(14px + env(safe-area-inset-right,0px))!important;width:52px!important;height:52px!important;
      min-width:52px!important;border-radius:50%!important;font-size:28px!important;background:rgba(5,20,38,.94)!important;
      border:2px solid rgba(135,230,255,.68)!important;box-shadow:0 8px 24px rgba(0,0,0,.4)!important;
    }
    #securityDialog .security-dialog-card{display:flex!important;flex-direction:column!important;overflow:hidden!important}
    #securityDialog .security-monitor{display:grid!important;grid-template-rows:minmax(260px,1fr) auto auto auto auto!important;min-height:0!important;flex:1!important}
    #securityDialog .security-screen{height:100%!important;min-height:260px!important;max-height:none!important;aspect-ratio:auto!important;border-radius:12px!important}
    #securityDialog #securityFeed{image-rendering:auto!important}
    #securityDialog .security-camera-buttons{grid-template-columns:repeat(6,minmax(0,1fr))!important}
    #securityDialog .security-camera-buttons button{min-height:58px!important;padding:8px 10px!important}
    #taskDialog .dialog-card{display:flex!important;flex-direction:column!important}
    #taskDialog #taskTitle{margin:0 70px 12px 0!important;flex:0 0 auto}
    #taskDialog #taskGame{width:min(1400px,100%)!important;margin:0 auto!important;flex:1 1 auto!important;min-height:0!important}
    #taskDialog #taskGame.task-realistic{min-height:calc(100dvh - 110px)!important;align-content:center!important}
    #taskDialog .task-board{height:min(72dvh,760px)!important;min-height:360px!important}
    #sabotageDialog .dialog-card{display:flex!important;flex-direction:column!important;justify-content:center!important}
    #sabotageDialog h2{margin:0 70px 28px 0!important;text-align:center!important;font-size:clamp(28px,4vw,48px)!important}
    #sabotageDialog .sabotage-grid{width:min(1000px,100%)!important;margin:auto!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:20px!important}
    #sabotageDialog .sabotage-grid button{min-height:clamp(100px,18dvh,180px)!important;font-size:clamp(20px,3vw,34px)!important}

    .meeting-voice-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .meeting-voice-actions button{min-height:42px;white-space:nowrap}
    #speakerButton{border-color:rgba(76,224,255,.65)}
    #speakerButton.hidden{display:none!important}
    @media(max-width:640px){.voice-header{align-items:flex-start;gap:8px}.meeting-voice-actions{width:100%;justify-content:stretch}.meeting-voice-actions button{flex:1}}

    #securityDialog .dialog-card{width:min(1320px,98vw);max-width:none;max-height:min(96dvh,1000px);padding:16px 18px 16px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;scrollbar-gutter:stable}
    .security-dialog-card h2{margin-bottom:6px}
    .security-help{margin:0 0 10px;color:#d7f6ff;opacity:.98;font-size:14px;line-height:1.65;padding:10px 12px;border-radius:12px;background:rgba(10,35,53,.72);border:1px solid rgba(95,224,255,.22)}
    .security-help strong{color:#8ef1ff}
    .security-monitor{display:grid;gap:12px;min-width:0;grid-auto-rows:max-content}
    .security-screen{position:relative;width:100%;aspect-ratio:16/8.6;max-height:58dvh;overflow:hidden;border:2px solid rgba(76,224,255,.65);border-radius:16px;background:#020711;box-shadow:inset 0 0 28px rgba(21,186,255,.18),0 0 18px rgba(25,185,255,.1);min-width:0}
    #securityFeed{display:block;width:100%;height:100%;background:#020711}
    .security-feed-header{position:absolute;left:12px;right:12px;top:10px;z-index:2;display:flex;justify-content:space-between;gap:10px;align-items:center;pointer-events:none;font-size:14px;font-weight:800;text-shadow:0 2px 4px #000;flex-wrap:wrap}
    #securityCameraName{padding:6px 10px;border-radius:999px;background:rgba(3,14,28,.58);border:1px solid rgba(126,228,255,.24)}
    #securityCameraStatus{color:#56ffb2;padding:6px 10px;border-radius:999px;background:rgba(3,14,28,.58);border:1px solid rgba(126,228,255,.24)}
    .security-scanlines{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0,rgba(255,255,255,.025) 1px,transparent 1px,transparent 4px);mix-blend-mode:screen}
    .security-camera-controls{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;position:sticky;top:0;z-index:2;padding:2px 0;background:linear-gradient(180deg,rgba(5,18,34,.98),rgba(5,18,34,.82))}
    .security-camera-controls button{min-width:144px;min-height:44px}
    .security-camera-buttons{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%;min-width:0;align-items:stretch}
    .security-camera-buttons button{min-width:0;padding:11px 12px;font-size:14px;min-height:62px;text-align:left;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;line-height:1.3;border-radius:14px;overflow:hidden}
    .security-camera-buttons .camera-badge{display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;letter-spacing:.08em;padding:3px 8px;border-radius:999px;background:rgba(147,232,255,.12);border:1px solid rgba(126,228,255,.24);color:#9eeeff}
    .security-camera-buttons .camera-area{font-size:15px;font-weight:700;color:#eefaff}
    .security-camera-buttons button.active{outline:2px solid #50ddff;background:rgba(27,175,223,.28);box-shadow:0 0 0 1px rgba(80,221,255,.35) inset} .security-camera-buttons button.active .camera-area{color:#ffffff}
    .security-note{margin:0;text-align:center;opacity:.86;font-size:13px;line-height:1.5;padding-bottom:2px}
    .security-task-panel{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(90,230,255,.42);border-radius:14px;background:rgba(13,43,64,.94);min-width:0;position:sticky;bottom:0;z-index:2;box-shadow:0 -8px 18px rgba(0,0,0,.18)}
    .security-task-panel.hidden{display:none!important}.security-task-panel strong{color:#83efff;font-size:15px}.security-task-panel span{font-size:14px;line-height:1.4}.security-task-panel button{min-height:46px;white-space:nowrap;min-width:176px}
    .security-camera-buttons button.task-checked{border-color:#61ffb2;background:rgba(38,142,100,.28)}
    .security-camera-buttons button.task-checked::after{content:'✓ 確認済み';align-self:flex-end;margin-top:2px;font-size:12px;font-weight:700;color:#78ffc1}


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
      position:fixed!important;
      right:18px!important;
      top:330px;
      bottom:auto!important;
      transform-origin:top right;
    }

    #actionBar{
      z-index:50;
      position:fixed !important;
      left:50% !important;
      right:auto !important;
      bottom:calc(18px + env(safe-area-inset-bottom,0px)) !important;
      transform:translateX(-50%);
      display:flex;
      justify-content:center;
      align-items:center;
      gap:10px;
      flex-wrap:wrap;
      width:max-content;
      max-width:min(920px,calc(100vw - 520px));
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
      transition:none !important;
    }

    #globalChatPanel{
      z-index:55;
      position:fixed !important;
      left:18px !important;
      bottom:18px !important;
      width:min(430px,calc(100vw - 36px));
      max-width:min(430px,calc(100vw - 36px));
      max-height:min(460px,calc(100vh - 250px));
    }
    .group-voice-bar{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 0 10px;border-bottom:1px solid rgba(120,220,255,.18)}
    .group-voice-status{min-width:0;font-size:12px;line-height:1.35;color:#c9e9f3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .group-voice-status.active{color:#72ffc0}
    .group-voice-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
    .group-voice-actions button{min-height:38px;padding:7px 9px;white-space:nowrap}.group-voice-actions .hidden{display:none!important}
    #globalChatPanel.collapsed{
      width:330px !important;
      min-height:112px;
      max-height:112px;
      overflow:hidden;
    }
    #globalChatPanel.collapsed .chat-log,#globalChatPanel.collapsed .chat-form{display:none!important}
    #globalChatPanel.collapsed .group-voice-bar{border-bottom:0;padding-bottom:2px}

    @media (min-width:901px){
      #globalChatPanel.collapsed{
        width:360px !important;
        height:auto !important;
        min-height:118px;
        max-height:190px;
        overflow:hidden;
      }
      #globalChatPanel.collapsed .group-voice-bar{
        grid-template-columns:1fr;
        align-items:stretch;
        gap:7px;
        width:100%;
      }
      #globalChatPanel.collapsed .group-voice-status{
        white-space:normal;
        overflow:visible;
        text-overflow:clip;
        line-height:1.35;
      }
      #globalChatPanel.collapsed .group-voice-actions{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        width:100%;
        gap:6px;
      }
      #globalChatPanel.collapsed .group-voice-actions button{
        width:100%;
        min-width:0;
        padding:7px 5px;
        font-size:12px;
        overflow:hidden;
        text-overflow:ellipsis;
      }
    }

    #joystick{
      z-index:32;
      position:fixed !important;
      left:30px !important;
      bottom:calc(118px + env(safe-area-inset-bottom,0px)) !important;
      touch-action:none;
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

    .player-row.practice-target{border:1px solid rgba(80,225,255,.45);background:rgba(37,137,169,.12)}
    .player-row.practice-target .player-name{color:#8eeeff}



    /* Hands-on task mini games */
    #taskDialog .dialog-card{width:min(1320px,98vw);max-width:none;min-height:min(92dvh,940px);max-height:min(96dvh,980px);padding:16px 18px 18px;display:flex;flex-direction:column;overflow:auto;box-sizing:border-box}
    #taskGame.task-realistic{display:grid;gap:14px;min-height:max(420px,calc(92dvh - 170px));align-content:start;user-select:none;-webkit-user-select:none}
    .task-guide{margin:0;color:#d8ebff;line-height:1.55}
    .task-board{position:relative;width:100%;height:min(56dvh,520px);overflow:hidden;border:1px solid rgba(83,218,255,.45);border-radius:16px;background:radial-gradient(circle at 50% 45%,rgba(38,79,112,.38),rgba(3,11,22,.96));touch-action:none}
    .task-status{text-align:center;margin:0;font-weight:800;color:#8eeeff}
    .task-hold{min-height:52px;font-weight:800;touch-action:none}
    .task-meter{height:14px;border:1px solid rgba(104,224,255,.45);border-radius:999px;overflow:hidden;background:#07111e}
    .task-meter>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#24c9ff,#70ffac);transition:width .05s linear}
    .dragging{z-index:20!important;transform:scale(1.09) rotate(-2deg)!important;filter:brightness(1.2);box-shadow:0 16px 28px rgba(0,0,0,.5)!important}
    .returning{transition:left .2s ease,top .2s ease,transform .2s ease}

    .cargo-bay{background:linear-gradient(90deg,rgba(45,35,27,.75) 0 49%,rgba(17,37,54,.9) 49% 100%),repeating-linear-gradient(0deg,transparent 0 28px,rgba(255,255,255,.03) 28px 30px)}
    .cargo-conveyor{position:absolute;left:3%;top:6%;bottom:6%;width:43%;border:2px solid #81694f;border-radius:12px;background:repeating-linear-gradient(90deg,#302b28 0 20px,#45403b 20px 38px);opacity:.72}.cargo-conveyor span,.cargo-rack-label{position:absolute;top:5px;left:8px;font-size:11px;font-weight:800;color:#c7d8e7}
    .cargo-rack-label{left:auto;right:10%;top:4%}.cargo-slot{position:absolute;width:25%;height:20%;border:2px dashed rgba(115,226,255,.65);border-radius:10px;display:grid;place-items:center;color:#7ceaff;background:rgba(18,69,94,.25)}.cargo-slot.filled{border-style:solid;background:rgba(61,212,151,.16)}
    .cargo-crate{position:absolute;width:70px;height:58px;display:grid;grid-template-columns:1fr auto;align-items:center;gap:5px;padding:7px;border:2px solid rgba(255,255,255,.42);border-radius:8px;color:#fff;font-size:18px;cursor:grab;touch-action:none;box-shadow:0 7px 12px rgba(0,0,0,.35)}.cargo-crate small{font-size:10px}.cargo-crate.placed{cursor:default;animation:cargoDrop .35s ease}.cargo-a{background:#a6483e}.cargo-b{background:#2e6fa7}.cargo-c{background:#95712a}@keyframes cargoDrop{50%{transform:translateY(-8px) scale(1.05)}100%{transform:none}}
    .cargo-delivery{background:linear-gradient(135deg,#172533,#080f17)}.delivery-shelf{position:absolute;right:6%;top:8%;width:48%;height:80%;border:5px solid #65798a;border-radius:12px;background:repeating-linear-gradient(0deg,#1c2933 0 42px,#101a22 42px 48px)}.delivery-shelf span{position:absolute;top:7px;left:10px;font-size:11px;font-weight:800}.delivery-zone{position:absolute;right:13%;top:36%;width:30%;height:30%;border:3px dashed #ffc95c;border-radius:12px;background:rgba(255,190,70,.12);display:grid;place-items:center;color:#ffd784;font-weight:900}.delivery-zone.filled{border-style:solid;background:rgba(86,255,176,.16)}.cargo-crate.carried{width:92px;height:70px}

    .wire-board{height:320px;background:linear-gradient(90deg,#1a242d 0 48%,#111a23 48% 52%,#1a242d 52%)}.wire-column{position:absolute;inset:0;width:50%}.wire-column.right{left:50%}.wire-socket{position:absolute;width:58px;height:58px;margin-top:-29px;border-radius:50%;border:3px solid var(--wire-color);background:#08111a;box-shadow:0 0 16px color-mix(in srgb,var(--wire-color),transparent 50%);display:grid;place-items:center;touch-action:none}.wire-source{left:12%;cursor:grab}.wire-target{right:12%}.wire-socket span{width:24px;height:24px;border-radius:50%;background:var(--wire-color)}.wire-socket.connected{filter:brightness(1.45);box-shadow:0 0 25px var(--wire-color)}#wireSvg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}#wireSvg line{stroke-width:12;stroke-linecap:round;filter:drop-shadow(0 0 4px currentColor)}

    .scan-console{display:grid;grid-template-columns:minmax(160px,1fr) 1fr;gap:18px;align-items:center;padding:16px;border-radius:16px;background:#081724;border:1px solid rgba(83,218,255,.35)}.scan-hand{position:relative;height:200px;display:grid;place-items:center;font-size:108px;border-radius:14px;overflow:hidden;background:radial-gradient(circle,#143d51,#07111b)}.scan-hand i{position:absolute;left:0;right:0;top:-12px;height:8px;background:#5affc5;box-shadow:0 0 18px #5affc5;opacity:0}.scan-hand.active i{opacity:1;animation:scanBeam 1.1s linear infinite alternate}@keyframes scanBeam{to{top:calc(100% - 8px)}}.scan-readout{display:grid;gap:14px;text-align:center;font-size:32px;font-weight:900}

    .fuel-station{height:290px}.fuel-tank{position:absolute;right:8%;top:11%;width:34%;height:70%;border:4px solid #8da7b7;border-radius:14px;overflow:hidden;background:#07121b;display:grid;place-items:center}.fuel-tank span{z-index:2;font-size:28px;font-weight:900;text-shadow:0 2px 3px #000}.fuel-tank #fuelLiquid{position:absolute;left:0;right:0;bottom:0;height:0;background:linear-gradient(#ffd756,#e58d1c);transition:height .06s linear}.fuel-port{position:absolute;right:34%;top:37%;width:72px;height:72px;border:7px solid #8ca3ad;border-radius:50%;display:grid;place-items:center;background:#151f24;font-size:10px}.fuel-nozzle{position:absolute;width:90px;height:70px;border-radius:12px;background:#d6a927;color:#101820;font-size:28px;display:grid;place-items:center;touch-action:none}.fuel-nozzle small{font-size:10px}.fuel-nozzle.connected{transform:rotate(-18deg)}

    .nav-radar{height:330px;background:radial-gradient(circle at center,rgba(30,116,144,.3),#06101b 68%),repeating-radial-gradient(circle,transparent 0 42px,rgba(84,220,255,.18) 43px 45px)}.radar-grid{position:absolute;inset:0;background:linear-gradient(90deg,transparent 49.6%,rgba(71,215,255,.2) 50%,transparent 50.4%),linear-gradient(0deg,transparent 49.6%,rgba(71,215,255,.2) 50%,transparent 50.4%)}.nav-target{position:absolute;width:84px;height:84px;margin:-42px;border:3px dashed #73f9ff;border-radius:50%;animation:targetPulse 1s ease-in-out infinite}.nav-target.locked{border-style:solid;background:rgba(90,255,184,.18)}@keyframes targetPulse{50%{transform:scale(1.12);box-shadow:0 0 22px #55e6ff}}.nav-ship{position:absolute;width:62px;height:62px;border-radius:50%;font-size:28px;background:#ef8f3a;color:#fff;touch-action:none;transform:rotate(35deg)}.nav-ship.docked{animation:shipLock .5s ease}@keyframes shipLock{50%{transform:rotate(35deg) scale(.82)}100%{transform:rotate(35deg)}}

    .engine-console{display:grid;grid-template-columns:150px 1fr;gap:30px;align-items:center;justify-content:center;padding:18px}.engine-track{position:relative;width:76px;height:300px;margin:auto;border-radius:38px;background:linear-gradient(#432229,#433a1f 25%,#214d35 20% 30%,#172232 30%);border:3px solid #71899d;touch-action:none}.engine-safe{position:absolute;left:8px;right:8px;bottom:70%;height:10%;border:2px solid #5dff9b;border-radius:16px;background:rgba(66,255,144,.2)}.engine-knob{position:absolute;left:50%;width:105px;height:34px;margin-left:-52px;border-radius:10px;background:#e4e8ec;border:4px solid #65798d;touch-action:none}.engine-gauge{display:grid;gap:14px;text-align:center}.engine-gauge b{font-size:50px}.engine-gauge span{font-weight:800;color:#ffb565}.engine-gauge span.good{color:#70ffac}

    .security-sequence{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.security-sequence button{min-height:94px;display:grid;gap:8px;background:#111d2a;border:1px solid #385269}.security-sequence button i{display:block;height:18px;border-radius:999px;background:#2a3541}.security-sequence button.signal i{background:#5affbf;box-shadow:0 0 22px #5affbf}.security-sequence button.accepted{border-color:#56ffc1;background:rgba(38,142,100,.26)}

    .comms-scope{position:relative;height:150px;overflow:hidden;border:2px solid #496c82;border-radius:12px;background:repeating-linear-gradient(90deg,transparent 0 31px,rgba(68,192,225,.12) 31px 32px),repeating-linear-gradient(0deg,transparent 0 29px,rgba(68,192,225,.12) 29px 30px),#03101a}.scope-wave{position:absolute;left:0;right:0;top:50%;height:4px}.scope-wave:before{content:'';position:absolute;left:0;right:0;top:-28px;height:60px;background:repeating-radial-gradient(ellipse at center,transparent 0 12px,currentColor 13px 14px,transparent 15px 24px);opacity:.75}.scope-wave.target{color:#55f4aa}.scope-wave.live{color:#44cfff;transition:transform .08s}.scope-wave.live:before{transform:scaleX(var(--freq,1));transform-origin:center}.scope-wave.live.matched{color:#fff;filter:drop-shadow(0 0 7px #63ffc0)}#commsQuality{position:absolute;right:10px;top:8px;font-weight:800}.dial-row{display:grid;grid-template-columns:80px 1fr 44px;gap:10px;align-items:center}.dial-row input{width:100%}

    .shield-core{position:relative;width:min(390px,80vw);aspect-ratio:1;margin:auto;border-radius:50%;background:radial-gradient(circle,#182c40 0 23%,#07111b 24% 100%);border:2px solid #46647d}.shield-center{position:absolute;inset:36%;display:grid;place-items:center;border-radius:50%;background:#1f4760;box-shadow:0 0 25px #29d7ff;font-weight:900}.shield-sector{position:absolute;left:50%;top:50%;width:84px;height:64px;margin:-32px -42px;transform:rotate(var(--angle)) translateY(-145px) rotate(var(--counter));border-radius:12px;background:#172434;border:2px solid #4f6a7c;overflow:hidden;touch-action:none}.shield-sector i{position:absolute;left:0;bottom:0;height:6px;width:var(--charge,0%);background:#5dffad}.shield-sector.active{border-color:#ffe56d;box-shadow:0 0 16px #ffe56d}.shield-sector.powered{background:#1d7455;border-color:#66ffc1}.shield-sector.powered i{width:100%}

    .weapon-range{height:330px;background:radial-gradient(circle at center,rgba(36,72,92,.5),#050b12 75%)}.weapon-range:before,.weapon-range:after{content:'';position:absolute;background:rgba(71,220,255,.18)}.weapon-range:before{left:50%;top:0;bottom:0;width:1px}.weapon-range:after{top:50%;left:0;right:0;height:1px}.crosshair{position:absolute;left:50%;top:50%;width:70px;height:70px;margin:-35px;border:2px solid rgba(72,230,255,.35);border-radius:50%}.moving-target{position:absolute;width:58px;height:58px;margin:-29px;border-radius:50%;background:radial-gradient(circle,#fff 0 15%,#ef4358 16% 35%,#fff 36% 52%,#ef4358 53%);box-shadow:0 0 18px rgba(255,78,100,.7);transition:left .18s ease,top .18s ease;touch-action:manipulation}.moving-target.hit{transform:scale(.72);filter:brightness(2)}

    .filter-chamber{height:320px;background:repeating-linear-gradient(90deg,rgba(68,184,211,.08) 0 22px,transparent 22px 44px),linear-gradient(90deg,#08212b,#07111a)}.airflow{position:absolute;left:12px;top:10px;color:#66eaff;font-weight:800;letter-spacing:3px}.waste-bin{position:absolute;right:4%;bottom:7%;width:25%;height:24%;border:3px dashed #ffbe5c;border-radius:12px;background:rgba(116,74,25,.35);display:grid;place-items:center;font-weight:900;color:#ffd190}.filter-debris{position:absolute;width:48px;height:48px;border-radius:50%;font-size:22px;touch-action:none}.debris-0{background:#7c9d46}.debris-1{background:#806864}.debris-2{background:#a17d35}.filter-debris.discarded{transform:scale(.2) rotate(120deg);opacity:0;transition:.22s}

    .reactor-panel{display:grid;grid-template-columns:1fr 190px;gap:18px;align-items:center}.reactor-rods{display:grid;gap:14px}.reactor-rods label{display:grid;grid-template-columns:70px 1fr 24px;gap:10px;align-items:center;padding:12px;border-radius:10px;background:#101c29;border:1px solid #344b60}.reactor-rods label i{width:18px;height:18px;border-radius:50%;background:#ff5d65}.reactor-rods label.aligned{border-color:#5cffad}.reactor-rods label.aligned i{background:#5cffad;box-shadow:0 0 14px #5cffad}.reactor-core{display:grid;gap:14px;text-align:center;padding:22px;border-radius:50%;aspect-ratio:1;background:radial-gradient(circle,#173b50,#07111a 70%);border:3px solid #467b91;place-content:center}.reactor-core span{font-weight:900}

    .spectator-panel{
      position:fixed !important;z-index:64;left:50%;bottom:112px;transform:translateX(-50%);
      width:min(650px,calc(100vw - 40px));padding:12px 14px;display:grid;gap:9px;text-align:center;
    }
    .spectator-panel.hidden{display:none !important}
    .spectator-heading{display:flex;justify-content:center;align-items:center;gap:14px;flex-wrap:wrap}
    .spectator-heading strong{color:#72e9ff;letter-spacing:.08em}
    .spectator-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
    .spectator-actions button{min-height:42px}
    .spectator-panel small{opacity:.78;line-height:1.4}
    .result-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:16px}
    #sabotageDialog .dialog-card{width:min(920px,96vw);max-width:none;max-height:min(88dvh,720px);padding:16px 18px;overflow:auto}
    #sabotageDialog .sabotage-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    #sabotageDialog .sabotage-grid button{min-height:84px;font-size:20px;font-weight:800}

    @media(max-width:640px){
      #taskDialog .dialog-card{width:98vw;padding:10px;min-height:92dvh;max-height:96dvh;overflow:auto}
      #taskGame.task-realistic{min-height:calc(92dvh - 160px);gap:8px}.task-board{height:min(44dvh,360px)}.task-guide{font-size:13px}.cargo-crate{width:58px;height:50px;font-size:15px}.wire-board{height:275px}.wire-socket{width:48px;height:48px;margin-top:-24px}.scan-console{grid-template-columns:1fr;gap:8px}.scan-hand{height:145px;font-size:78px}.scan-readout{font-size:22px}.engine-console{grid-template-columns:105px 1fr;gap:10px;padding:6px}.engine-track{height:235px;width:60px}.engine-knob{width:82px;margin-left:-41px}.engine-gauge b{font-size:35px}.security-sequence{grid-template-columns:repeat(2,1fr)}.security-sequence button{min-height:70px}.shield-sector{width:66px;height:52px;margin:-26px -33px;transform:rotate(var(--angle)) translateY(-112px) rotate(var(--counter))}.reactor-panel{grid-template-columns:1fr}.reactor-core{width:150px;margin:auto}.nav-radar,.weapon-range,.filter-chamber{height:260px}
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
      #miniMap{right:10px!important;bottom:auto!important;transform-origin:top right}
      #actionBar{left:10px !important;right:10px !important;bottom:10px !important;transform:none;width:auto;max-width:none}
      #controlHint{display:none}
      #globalChatPanel{left:10px !important;bottom:104px !important;max-width:min(320px,calc(100vw - 20px))}
      #joystick{left:18px !important;bottom:190px !important;transform:scale(.82);transform-origin:bottom left}
    }



    @media (max-width:720px){#miniMap{display:none!important}}

    @media (pointer:coarse){
      #joystick{width:138px;height:138px;z-index:80}
      #stick{left:41px;top:41px}
      #actionBar button,.call-member,#cameraButton{min-height:44px;min-width:44px}
    }

    @media (max-width:640px){
      #securityDialog .dialog-card{width:98vw;padding:10px 10px 12px;max-height:96dvh;overflow:hidden}
      .security-help{font-size:12px;margin-bottom:10px}
      .security-screen{aspect-ratio:16/10;max-height:38dvh}
      .security-camera-buttons{grid-template-columns:1fr}
      .security-camera-buttons button{font-size:13px;padding:10px 12px;min-height:58px}
      .security-camera-buttons .camera-badge{font-size:10px}
      .security-camera-buttons .camera-area{font-size:14px}
      .security-feed-header{font-size:11px;top:7px;left:7px;right:7px}
      .security-camera-controls button{min-width:120px;padding:8px 10px}
      .security-task-panel{grid-template-columns:1fr;justify-items:center;text-align:center;position:sticky;bottom:0}
      .security-task-panel button{width:100%}
      #sabotageDialog .dialog-card{width:96vw;max-height:92dvh;padding:12px}
      #sabotageDialog .sabotage-grid{grid-template-columns:1fr}
      #sabotageDialog .sabotage-grid button{min-height:62px;font-size:17px}
      #topBar{top:8px;left:8px;right:8px;max-width:none;gap:6px;flex-wrap:wrap}
      #playerPanel{top:118px;left:8px;width:min(44vw,170px);max-height:210px}
      #taskPanel{top:118px;right:8px;width:min(44vw,170px);max-height:210px}
      #miniMap{display:none}
      .spectator-panel{left:8px;right:8px;bottom:146px;transform:none;width:auto;padding:9px;gap:6px}
      .spectator-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px}
      .spectator-actions button{min-width:0;padding:7px 5px;font-size:11px}
      .spectator-panel small{font-size:10px}
      .group-voice-bar{grid-template-columns:1fr;gap:6px}
      .group-voice-actions{justify-content:stretch}
      .group-voice-actions button{flex:1;min-width:0;font-size:12px}
      #globalChatPanel{bottom:calc(142px + env(safe-area-inset-bottom,0px)) !important}
      #joystick{bottom:calc(220px + env(safe-area-inset-bottom,0px)) !important}
      #actionBar{padding:8px;gap:6px;max-height:132px;overflow:auto;-webkit-overflow-scrolling:touch}
      #actionBar button{min-height:42px;padding:8px 10px;font-size:13px}
    }

    @media (max-width:640px) and (orientation:portrait){
      #globalChatPanel{
        z-index:92;
        left:10px !important;
        right:10px !important;
        bottom:calc(148px + env(safe-area-inset-bottom,0px)) !important;
        width:auto !important;
        max-width:none !important;
        max-height:min(52vh,430px);
      }
      #globalChatPanel.collapsed{
        left:auto !important;
        right:10px !important;
        width:min(238px,calc(100vw - 28px)) !important;
        min-height:116px;
        max-height:116px;
        bottom:calc(150px + env(safe-area-inset-bottom,0px)) !important;
      }
      #globalChatPanel.collapsed .group-voice-bar{grid-template-columns:1fr;gap:5px;padding-top:4px}
      #globalChatPanel.collapsed .group-voice-status{text-align:center;font-size:11px}
      #globalChatPanel.collapsed .group-voice-actions{justify-content:center}
      #globalChatPanel.collapsed .group-voice-actions button{min-height:34px;padding:5px 7px;font-size:11px}
      #globalChatPanel:not(.collapsed) ~ #joystick,
      html.mobile-chat-open #joystick{
        opacity:0;
        pointer-events:none !important;
      }
      #joystick{
        left:14px !important;
        bottom:calc(150px + env(safe-area-inset-bottom,0px)) !important;
        transform:scale(.78);
        transform-origin:bottom left;
        transition:opacity .14s ease;
      }
      #actionBar{z-index:86}
    }

    /* PC layout: keyboard operation only. Prevent the touch stick from covering chat. */
    @media (min-width:901px){
      #joystick{display:none !important}
    }

    @media (pointer:coarse) and (orientation:landscape) and (max-height:560px){
      #topBar{top:4px;font-size:11px;padding:5px 8px}
      #playerPanel,#taskPanel{top:62px;max-height:145px;font-size:11px}
      #globalChatPanel{bottom:76px !important;max-height:150px}
      #globalChatPanel.collapsed{left:auto !important;right:8px !important;width:230px !important;min-height:108px;max-height:108px}
      #globalChatPanel:not(.collapsed) ~ #joystick,
      html.mobile-chat-open #joystick{opacity:0;pointer-events:none !important}
      #joystick{left:12px !important;bottom:78px !important;transform:scale(.72);transform-origin:bottom left;transition:opacity .14s ease}
      #actionBar{left:170px !important;right:8px !important;bottom:4px !important;max-height:70px;overflow:auto}
      #interactionHint,#notice{bottom:82px !important}
    }

    @media(max-width:760px){
      #securityDialog .dialog-card,#taskDialog .dialog-card,#sabotageDialog .dialog-card{
        padding:calc(10px + env(safe-area-inset-top,0px)) calc(10px + env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) calc(10px + env(safe-area-inset-left,0px))!important;
      }
      #securityDialog .security-monitor{grid-template-rows:minmax(220px,1fr) auto auto auto auto!important;gap:8px!important}
      #securityDialog .security-camera-buttons{grid-template-columns:repeat(2,minmax(0,1fr))!important;max-height:28dvh!important;overflow:auto!important}
      #securityDialog .security-camera-buttons button{min-height:52px!important}
      #securityDialog .security-help{margin-right:58px!important;font-size:12px!important;padding:7px 9px!important}
      #securityDialog .security-task-panel{position:relative!important;grid-template-columns:1fr!important;padding:8px!important;gap:6px!important}
      #taskDialog #taskGame.task-realistic{min-height:calc(100dvh - 82px)!important;align-content:start!important}
      #taskDialog .task-board{height:min(62dvh,520px)!important;min-height:280px!important}
      #sabotageDialog .sabotage-grid{grid-template-columns:1fr!important;gap:12px!important}
      #sabotageDialog .sabotage-grid button{min-height:clamp(72px,15dvh,120px)!important}
    }

  `;
  document.head.append(style);
})();
