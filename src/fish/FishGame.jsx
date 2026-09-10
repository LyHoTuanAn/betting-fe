import {useEffect, useRef, useState} from 'react';
import {Crosshair, LogOut, Minus, Plus, UserRound} from 'lucide-react';
import {ResultFx} from '../shared/ResultFx.jsx';
import {Topbar} from '../shared/Topbar.jsx';
import {API_URL, api} from '../shared/api.js';
import {playCelebrationAudio} from '../shared/audio.js';
import {BET_LIMITS} from '../shared/constants.js';
import {compactFishFx} from '../shared/device.js';
import {money} from '../shared/format.js';
import {fxBits, fxCoins} from '../shared/fx-data.js';
import {useGameFx} from '../shared/hooks.js';
import {Popup, usePopup} from '../shared/Popup.jsx';
import {FishModel, OceanAmbient} from './FishModel.jsx';
import {createFish, fishTypes} from './fish-data.js';

export function FishGame({goHome,balance,setBalance,sound,setSound,token}){
  const comboRef=useRef(0),comboTimer=useRef(null),fireTimerRef=useRef(null),pointerRef=useRef(null),shootRef=useRef(null),aimFrameRef=useRef(null),socketRef=useRef(null),playerIdRef=useRef(null);
 const [fx,triggerFx,dismissFx]=useGameFx();
 const area=useRef(null),[power,setPower]=useState(1000),[shots,setShots]=useState([]),[hits,setHits]=useState([]),[coins,setCoins]=useState([]),[fishes,setFishes]=useState(()=>Array.from({length:12},(_,i)=>createFish(i))),[target,setTarget]=useState({x:50,y:45}),[aim,setAim]=useState(0),[eventNotice,setEventNotice]=useState(null),[frenzy,setFrenzy]=useState(false);
 const [roomInfo,setRoomInfo]=useState({count:0,capacity:6});
 const exitPopup=usePopup();
 const [roomReady,setRoomReady]=useState(false),[loadProgress,setLoadProgress]=useState(35);
 const [phase,setPhase]=useState('waiting'),[lobby,setLobby]=useState(null),[stage,setStage]=useState('calm'),[selfReady,setSelfReady]=useState(false);
 const fishesRef=useRef(fishes);
 useEffect(()=>{fishesRef.current=fishes},[fishes]);

 useEffect(()=>{
  let isMounted=true;
  const criticalAssets=[
   '/assets/fish-real-bg.webp',
   '/assets/fish-cannon-real.webp',
   '/assets/fish-real-clown.webp',
   '/assets/fish-real-blue.webp',
   '/assets/fish-real-lion.webp',
   '/assets/fish-real-arowana.webp',
   '/assets/fish-real-manta.webp',
   '/assets/fish-real-turtle.webp',
   '/assets/fish-real-squid.webp',
   '/assets/fish-real-shark.webp',
   '/assets/fish-real-dragon.webp',
   '/assets/fish-real-dragoncarp.webp',
   '/assets/fish-real-mermaid.webp'
  ];
  let count=0;
  criticalAssets.forEach(src=>{
   const img=new Image();
   img.decoding='async';
   img.onload=()=>{
    if(!isMounted)return;
    count++;
    setLoadProgress(Math.floor(35+(count/criticalAssets.length)*65));
    if(count>=criticalAssets.length){
     setTimeout(()=>{if(isMounted)setRoomReady(true)},150);
    }
   };
   img.onerror=()=>{
    if(!isMounted)return;
    count++;
    if(count>=criticalAssets.length&&isMounted)setRoomReady(true);
   };
   img.src=src;
  });
  const fallback=setTimeout(()=>{if(isMounted)setRoomReady(true)},900);
  return()=>{isMounted=false;clearTimeout(fallback)};
 },[]);

  useEffect(()=>{
   const wsBase=API_URL.replace(/^http/,'ws').replace(/[/]api$/,'');
   const socket=new WebSocket(`${wsBase}/ws/fish?token=${encodeURIComponent(token)}`);socketRef.current=socket;
   // Server đóng socket kèm mã lý do (hết phiên, game bảo trì...). Không đọc mã
   // này thì màn hình chỉ đứng im và người chơi không biết vì sao không bắn được.
   let leaving=false;
   const CLOSE_REASON={
    1008:'PHIÊN ĐĂNG NHẬP HẾT HẠN, VUI LÒNG ĐĂNG NHẬP LẠI',
    1013:'GAME BẮN CÁ ĐANG TẠM ĐÓNG ĐỂ BẢO TRÌ',
    1006:'MẤT KẾT NỐI MẠNG TỚI PHÒNG BẮN CÁ',
    1011:'PHÒNG BẮN CÁ GẶP SỰ CỐ, VUI LÒNG VÀO LẠI'
   };
   const shape=f=>{const t=fishTypes.find(k=>k.kind===f.kind)||{};return {id:f.id,kind:f.kind,value:f.value,hp:f.hp,maxHp:f.maxHp,tag:f.tag,size:t.size||'small',name:t.name||'',x:f.x*100,top:f.y*100,heading:f.heading,server:true,round:0,delay:0,dur:0,hitKey:0,dead:false}};
   const STAGE_NOTICE={
    'school-warn':{type:'school',title:'ĐÀN CÁ LỚN SẮP XUẤT HIỆN',sub:'Chuẩn bị săn bầy cá'},
    'school':{type:'school active',title:'🌊 BẦY CÁ ĐANG DI CƯ 🌊',sub:'Săn nhanh trước khi đàn rời đi'},
    'rare-warn':{type:'mermaid',title:'🧜‍♀️ CÁ HOÀNG KIM SẮP XUẤT HIỆN',sub:'Chuẩn bị dồn hoả lực'},
    'rare':{type:'mermaid active',title:'🧜‍♀️ CÁ HOÀNG KIM ĐÃ XUẤT HIỆN',sub:'Ai dứt điểm người đó ăn trọn'}
   };
   socket.onerror=()=>{if(!leaving)triggerFx('diceLose','KHÔNG KẾT NỐI ĐƯỢC PHÒNG BẮN CÁ',2200)};
   socket.onclose=event=>{
    if(leaving||event.code===1000)return;
    triggerFx('diceLose',CLOSE_REASON[event.code]||(event.reason?event.reason.toUpperCase():'MẤT KẾT NỐI TỚI PHÒNG BẮN CÁ, VUI LÒNG VÀO LẠI'),2600);
   };
   socket.onmessage=event=>{
    let m;
    try{m=JSON.parse(event.data)}catch{return triggerFx('diceLose','MÁY CHỦ GỬI DỮ LIỆU KHÔNG ĐỌC ĐƯỢC',1600)}
    if(m.type==='joined'){playerIdRef.current=m.playerId;setLobby(m);setPhase(m.status==='playing'?'playing':'waiting');return}
    if(m.type==='lobby'){setLobby(m);if(m.status==='playing')setPhase('playing');return}
    if(m.type==='game-start'){setPhase('playing');setEventNotice(null);return}
    if(m.type==='state'){setPhase('playing');setStage(m.stage);setFishes(m.fish.map(shape));setRoomInfo({count:m.players.length,capacity:m.capacity});return}
    if(m.type==='stage'){setEventNotice(STAGE_NOTICE[m.stage]||null);setFrenzy(m.stage==='school');return}
    if(m.type==='wallet'){setBalance(m.balance);return}
    if(m.type==='error'){triggerFx('diceLose',m.message||'Không thể bắn',1400);return}
    if(m.type==='shot'){
     if(m.playerId!==playerIdRef.current)return;
     if(m.killed){
      comboRef.current+=1;
      clearTimeout(comboTimer.current);
      comboTimer.current=setTimeout(()=>comboRef.current=0,1500);
      const coinId=Date.now()+Math.random();
      setCoins(c=>[...c,{id:coinId,x:m.aimX*100,y:m.aimY*100,value:m.payout,combo:comboRef.current}]);
      const isBoss=m.payout>=40000;
      const fxType=isBoss?'bossWin':comboRef.current>=3?'combo':'fishWin';
      playCelebrationAudio(fxType,sound);
      triggerFx(fxType,`+${money(m.payout)}`,isBoss?4500:3200);
      setTimeout(()=>setCoins(c=>c.filter(a=>a.id!==coinId)),1850);
      return;
     }
     const hitId=Date.now()+Math.random();
     setHits(h=>[...h,{id:hitId,x:m.aimX*100,y:m.aimY*100,miss:!m.fishId,damage:m.damage}]);
     setTimeout(()=>setHits(h=>h.filter(a=>a.id!==hitId)),820);
    }
   };
   return()=>{leaving=true;socket.close(1000,'left');socketRef.current=null;clearTimeout(comboTimer.current);clearInterval(fireTimerRef.current);cancelAnimationFrame(aimFrameRef.current)};
  },[token]);

 const pointAt=e=>{
  if(!area.current)return;
  const r=area.current.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  setTarget({x:x/r.width*100,y:y/r.height*100});
  setAim(Math.atan2(y-(r.height-42),x-r.width/2)*180/Math.PI+90);
 };
 const resetFishLap=id=>{
  const current=fishesRef.current.find(f=>f.id===id);
  if(!current||current.dead||(current.hp===current.maxHp&&current.hitKey===0))return;
  const refreshed=fishesRef.current.map(f=>f.id===id&&!f.dead?{...f,hp:f.maxHp,hitKey:0}:f);
  fishesRef.current=refreshed;
  setFishes(refreshed);
 };
 const shoot=e=>{
  if(!area.current)return;
  if(balance<power){triggerFx('diceLose','KHÔNG ĐỦ VÀNG ĐỂ BẮN',1400);return}
  const r=area.current.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,px=x/r.width*100,py=y/r.height*100;
  const id=Date.now(),baseX=r.width/2,baseY=r.height-42,barrelLen=170,dx=x-baseX,dy=y-baseY,angle=Math.atan2(dy,dx)*180/Math.PI;
  const rad=angle*Math.PI/180,muzzleX=baseX+Math.cos(rad)*barrelLen,muzzleY=baseY+Math.sin(rad)*barrelLen;
  const distance=Math.max(40,Math.hypot(x-muzzleX,y-muzzleY));
  setTarget({x:px,y:py});
  setAim(angle+90);
  setShots(s=>[...s,{id,x:px,y:py,angle,distance,power,sx:muzzleX,sy:muzzleY}]);
  setTimeout(()=>setShots(s=>s.filter(a=>a.id!==id)),360);
   const shotPower=power;
   if(socketRef.current?.readyState===WebSocket.OPEN)socketRef.current.send(JSON.stringify({type:'shoot',aimX:px/100,aimY:py/100,power:shotPower}));else triggerFx('diceLose','CHƯA KẾT NỐI ĐƯỢC PHÒNG BẮN CÁ, VUI LÒNG CHỜ HOẶC VÀO LẠI',1800)
 };
 shootRef.current=shoot;
  const trackAim=e=>{
   if(pointerRef.current)pointerRef.current={clientX:e.clientX,clientY:e.clientY};
   if(aimFrameRef.current)return;
   aimFrameRef.current=requestAnimationFrame(()=>{aimFrameRef.current=null;pointAt(e)});
  };
 const stopFiring=e=>{
  clearInterval(fireTimerRef.current);
  fireTimerRef.current=null;
  pointerRef.current=null;
  if(e?.pointerId!=null&&area.current?.hasPointerCapture?.(e.pointerId))area.current.releasePointerCapture(e.pointerId);
 };
 const startFiring=e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();
  area.current?.setPointerCapture?.(e.pointerId);
  pointerRef.current={clientX:e.clientX,clientY:e.clientY};
  shoot(e);
  clearInterval(fireTimerRef.current);
  fireTimerRef.current=setInterval(()=>{
   if(pointerRef.current)shootRef.current?.(pointerRef.current);
  },compactFishFx?210:165);
 };
 const toggleReady=()=>{const next=!selfReady;setSelfReady(next);socketRef.current?.send(JSON.stringify({type:next?'ready':'unready'}))};
 const leaveRoom=()=>{socketRef.current?.send(JSON.stringify({type:'leave'}));goHome()};
 /** Nút back phải hỏi lại: đang ở giữa trận cùng người khác, bấm nhầm là mất lượt. */
 const askExit=async()=>{
  const agreed=await exitPopup.confirm({
   title:'Thoát phòng bắn cá?',
   message:phase==='waiting'?'Bạn sẽ rời phòng chờ và quay về trang chủ.':'Trận đang diễn ra. Rời phòng bây giờ sẽ mất lượt chơi hiện tại.',
   confirmLabel:'THOÁT PHÒNG',cancelLabel:'Ở LẠI',danger:true
  });
  if(agreed)leaveRoom();
 };
 if(phase==='waiting'){
  const seats=lobby?lobby.capacity:6,taken=lobby?lobby.players.length:0,ready=lobby?lobby.readyCount:0;
  const secs=lobby&&lobby.countdownMs!==null?Math.ceil(lobby.countdownMs/1000):null;
  return <div className="screen fishScreen fishWaiting"><Topbar balance={balance} onBack={askExit} sound={sound} setSound={setSound}/>
   <Popup popup={exitPopup.popup} onClose={exitPopup.close}/>
   <div className="fishTitle"><b>PHÒNG CHỜ</b><span>{lobby?lobby.roomId.toUpperCase():'ĐANG KẾT NỐI'}</span></div>
   <main className="waitRoom">
    <p className="waitLead">{secs!==null?`Đủ người sẵn sàng — vào trận sau ${secs} giây`:`Cần ${lobby?lobby.needReady:4} người sẵn sàng để bắt đầu`}</p>
    <div className="waitSeats">{Array.from({length:seats},(_,i)=>{const pl=lobby&&lobby.players[i];return <div key={i} className={'waitSeat '+(pl?(pl.ready?'ready':'joined'):'empty')}><UserRound/><span>{pl?(pl.id===playerIdRef.current?'Bạn':'Người chơi'):'Trống'}</span><small>{pl?(pl.ready?'SẴN SÀNG':'ĐANG CHỜ'):'—'}</small></div>})}</div>
    <p className="waitCount">{taken}/{seats} người trong phòng · {ready} đã sẵn sàng</p>
    <div className="waitActions">
     <button className={'waitReady '+(selfReady?'on':'')} onClick={toggleReady}>{selfReady?'HUỶ SẴN SÀNG':'SẴN SÀNG'}</button>
     <button className="waitLeave" onClick={leaveRoom}><LogOut/> THOÁT PHÒNG</button>
    </div>
   </main></div>;
 }
 return (
  <div className={'screen fishScreen '+(frenzy?'fishFrenzy':'')}>
   {!roomReady&&(
    <div className="fishMatchmakingOverlay">
     <div className="matchmakingRadar">
      <div className="radarSweep"/>
      <div className="radarPulse r1"/>
      <div className="radarPulse r2"/>
      <div className="radarCenterIcon">🔱</div>
     </div>
     <h2 className="matchmakingTitle">ĐANG GHÉP PHÒNG ĐẠI DƯƠNG</h2>
     <p className="matchmakingSub">Đang nạp súng pháo và bản đồ thủy cung...</p>
     <div className="matchmakingBarBox">
      <div className="matchmakingFill" style={{width:`${loadProgress}%`}}/>
     </div>
     <span className="matchmakingPercent">{loadProgress}%</span>
    </div>
   )}
   <ResultFx fx={fx} onDismiss={dismissFx}/>
   <Topbar balance={balance} onBack={askExit} sound={sound} setSound={setSound}/>
   <div className="fishTitle"><b>BẮN CÁ</b><span>ĐẠI DƯƠNG VÀNG</span></div>
   <div className="roomPlayers"><UserRound/> {roomInfo.count}/{roomInfo.capacity} người trong phòng</div>
   <Popup popup={exitPopup.popup} onClose={exitPopup.close}/>
   {eventNotice&&<div className={'fishEventNotice '+eventNotice.type}><strong>{eventNotice.title}</strong><span>{eventNotice.sub}</span></div>}
   <main className="ocean" ref={area} onPointerMove={trackAim} onPointerDown={startFiring} onPointerUp={stopFiring} onPointerCancel={stopFiring}>
    <OceanAmbient/>
    {fishes.map(f=><div data-fish-id={f.id+':'+f.round} onAnimationIteration={e=>{if(!f.server&&e.target===e.currentTarget)resetFishLap(f.id)}} className={'movingFish fish3d '+f.kind+' '+f.size+' '+(f.server?'serverFish ':'')+(f.hitKey?'damaged ':'')+(f.dead?'dead':'')} key={f.id+'-'+f.round} style={{top:f.server?undefined:f.top+'%',animation:f.server?'none':undefined,animationDelay:f.delay+'s',animationDuration:f.dur+'s','--server-x':f.server?f.x+'%':undefined,'--server-y':f.server?f.top+'%':undefined,'--fish-rot':f.server?(f.heading*180/Math.PI).toFixed(1)+'deg':undefined,'--fish-flip':f.server?(Math.cos(f.heading)<0?-1:1):undefined,'--hit':f.hitKey}}><FishModel key={f.hitKey} fish={f}/></div>)}
    <div className="crosshair" style={{left:target.x+'%',top:target.y+'%'}}><Crosshair/></div>
    {shots.map(s=><div className="trueShot" key={s.id} style={{'--sx':s.sx+'px','--sy':s.sy+'px','--angle':s.angle+'deg','--dist':s.distance+'px','--power':Math.min(1.8,1+s.power/9000)}}><span className="trueTrail"/><span className="trueCore"/><span className="trueBullet"><i/><b/></span></div>)}
    {hits.map(h=><div className={'hit fishHit '+(h.miss?'miss':'')+' '+(h.killed?'killed':'')} key={h.id} style={{left:h.x+'%',top:h.y+'%'}}><i className="impactRing"/>{!h.miss&&<><span className="captureNet"/><span className="captureNet netTwo"/>{!compactFishFx&&<span className="captureNet netThree"/>}<span className="waterImpact"/>{Array.from({length:compactFishFx?4:8},(_,n)=><em key={n} style={{'--spark-angle':`${n*(compactFishFx?90:45)}deg`}}/>)}</>}{h.miss?'MISS':h.killed?'HẠ CÁ':'TRÚNG'}{!h.miss&&<b>-{h.damage}</b>}</div>)}
    {coins.map(c=><div className="fishReward" key={c.id} style={{left:c.x+'%',top:c.y+'%'}}><span className="rewardRays"/><strong>+{money(c.value)}</strong><span className="rewardLabel">{c.combo>=3?`COMBO x${Math.min(10,c.combo)}`:'NHẬN VÀNG'}</span>{(compactFishFx?fxCoins.slice(0,16):[...fxCoins,...fxCoins]).map((coin,n)=><i key={n} style={{animationDelay:`${n*.012}s`,'--rx':`${Math.cos(n*.72)*(92+n%7*11)}px`,'--ry':`${Math.sin(n*.72)*(72+n%5*12)-48}px`,'--coin-size':`${15+n%4*5}px`}}/>)}{fxBits.slice(0,compactFishFx?7:18).map(bit=><em key={bit.id} style={{'--rx':`${Math.cos(bit.id*1.7)*(70+bit.id%5*12)}px`,'--ry':`${Math.sin(bit.id*1.7)*(58+bit.id%4*10)-30}px`,animationDelay:`${bit.id*.015}s`}}/>)}</div>)}
    <div className={'cannon realCannon '+(shots.length?'firing':'')} style={{'--aim':`${aim}deg`}}>
     <div className="betQuick">{[100,1000,5000,10000].map(v=><button key={v} className={power===v?'active':''} onPointerDown={e=>{e.stopPropagation();setPower(v)}}>{v>=1000?v/1000+'K':v}</button>)}</div>
     <div className="cannonAim"><img src="/assets/fish-cannon-real.webp" alt="Súng bắn cá 3D" loading="eager" decoding="async"/><div className="muzzleBeam"/></div>
     <div className="power"><button onPointerDown={e=>{e.stopPropagation();setPower(Math.max(BET_LIMITS.fish.min,power-100))}}><Minus/></button><strong>{money(power)}</strong><button onPointerDown={e=>{e.stopPropagation();setPower(Math.min(BET_LIMITS.fish.max,power+100))}}><Plus/></button></div>
    </div>
   </main>
  </div>
 );
}

