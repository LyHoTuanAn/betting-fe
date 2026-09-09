export const bubbles=Array.from({length:24},(_,i)=>({id:i,left:(i*41)%100,delay:-(i%10)*.7,size:5+i%9,dur:5+i%6}));
export const fishTypes=[
 {kind:'clown',hp:120,value:3500,dur:7,size:'small'},
 {kind:'blue',hp:150,value:5200,dur:8,size:'small'},
 {kind:'lion',hp:220,value:7200,dur:9,size:'mid'},
 {kind:'arowana',hp:330,value:12000,dur:10,size:'wide'},
 {kind:'manta',hp:420,value:16000,dur:11,size:'wide'},
 {kind:'turtle',hp:540,value:22000,dur:12,size:'big'},
 {kind:'squid',hp:620,value:28000,dur:11,size:'wide'},
 {kind:'shark',hp:700,value:32000,dur:12,size:'big'},
 {kind:'dragon',hp:950,value:52000,dur:14,size:'boss',name:'RỒNG BIỂN'},
 {kind:'dragoncarp',hp:1400,value:100000,dur:15,size:'legend',name:'CÁ CHÉP ĐẦU RỒNG'},
 {kind:'mermaid',hp:2000,value:180000,dur:17,size:'mythic',name:'NÀNG TIÊN CÁ'}
];
const fishSpawnRoster=[0,1,0,2,1,3,0,4,2,1,5,3,0,6,1,7,2,4,3,5];
export const createFish=(id,round=0)=>{
 const type=fishTypes[fishSpawnRoster[(id+round*3)%fishSpawnRoster.length]];
 return {id,round,kind:type.kind,size:type.size,name:type.name||'',hp:type.hp,maxHp:type.hp,value:type.value,top:9+((id*19+round*11)%63),delay:-(id*1.13+(id%7)*.37+round*.43),dur:Math.max(6,type.dur-1+(id%5)*.47),hitKey:0,dead:false};
};
