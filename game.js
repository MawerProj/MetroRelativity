'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),screen=canvas.getContext('2d');
const worldLayer=document.createElement('canvas'),trainLayer=document.createElement('canvas');
let ctx=screen;
const S={x:0,v:0,c:60,t:0,tau:0,mode:0,frame:'external',paused:false,score:0,target:1,observerX:450,lightRight:0,lightLeft:0,lightTrain:0,acceleration:4,braking:6,cars:3};
const names=['Начало','Спектр','Импульс','Горизонт','Квант','Сингулярность'];
const MAX_BETA=.999999;
const CAR_LENGTH=30,FRONT_OFFSET=45,STOP_OFFSET=72,STOP_TOLERANCE=6;
let width=1200,height=400,last=0;
const gamma=()=>1/Math.sqrt(1-(S.v/S.c)**2);
// x tracks the second car's centre. Adding cars extends the rear, never the front.
const trainLength=()=>S.cars*CAR_LENGTH;
const rearOffset=()=>FRONT_OFFSET-trainLength();
const headWorld=()=>S.x+FRONT_OFFSET/gamma();
const tailWorld=()=>S.x+rearOffset()/gamma();
const stopDistance=()=>S.target*450+STOP_OFFSET-headWorld();
function setCars(value){const number=Number(value);if(!Number.isFinite(number)||value==='')return;S.cars=Math.max(1,Math.min(12,Math.round(number)));$('carCount').value=S.cars;$('carCountRange').value=S.cars;$('carLength').textContent=`${trainLength()} м в покое · 30 м на вагон`;updateUI()}
$('carCount').onchange=e=>{setCars(e.target.value);e.target.value=S.cars};$('carCountRange').oninput=e=>setCars(e.target.value);
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;for(const layer of [canvas,worldLayer,trainLayer]){layer.width=Math.round(width*devicePixelRatio);layer.height=Math.round(height*devicePixelRatio);layer.getContext('2d').setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0)}}
new ResizeObserver(resize).observe(canvas);
function drive(n){S.mode=n;['brake','coast','throttle'].forEach((id,i)=>$(id).classList.toggle('selected',i===n+1));$('driveLabel').textContent=['ТОРМОЖЕНИЕ','НАКАТ','ТЯГА'][n+1]}
$('brake').onclick=()=>drive(-1);$('coast').onclick=()=>drive(0);$('throttle').onclick=()=>drive(1);
$('extremeSpeed').onclick=()=>{S.v=MAX_BETA*S.c;drive(0);updateUI()};
function setAcceleration(kind,value){const number=Number(value);if(!Number.isFinite(number))return;S[kind]=Math.max(1,Math.min(100000,number));$(kind+'Value').value=S[kind];$(kind+'Range').value=Math.log10(S[kind]);updateUI()}
for(const kind of ['acceleration','braking']){
$(kind+'Value').onchange=e=>{if(e.target.value==='')e.target.value=S[kind];else setAcceleration(kind,e.target.value)};
$(kind+'Range').oninput=e=>{const value=10**Number(e.target.value);setAcceleration(kind,value<10?Math.round(value*10)/10:Math.round(value))};
}
for(const [id,a,b] of [['normalAcceleration',4,6],['fastAcceleration',400,600],['extremeAcceleration',50000,100000]])$(id).onclick=()=>{setAcceleration('acceleration',a);setAcceleration('braking',b)};
function pause(){S.paused=!S.paused;$('pause').textContent=S.paused?'▶ Продолжить':'Ⅱ Пауза'}$('pause').onclick=pause;
function setC(c){S.c=Number(c);S.v=Math.min(S.v,MAX_BETA*S.c);$('lightSpeed').value=c;$('cLabel').innerHTML=c+' <small>м/с</small>';document.querySelectorAll('[data-c]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.c)===S.c));updateUI()}
$('lightSpeed').oninput=e=>setC(e.target.value);document.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>setC(b.dataset.c));
function frame(f){S.frame=f;$('external').classList.toggle('selected',f==='external');$('trainFrame').classList.toggle('selected',f==='train');$('frameTag').textContent=f==='external'?'ВНЕШНЯЯ СИСТЕМА':'СИСТЕМА ПОЕЗДА';$('frameNote').textContent=f==='external'?'Поезд сокращается. Окружение сохраняет длину.':'Поезд сохраняет длину. Окружение сокращается.'} $('external').onclick=()=>frame('external');$('trainFrame').onclick=()=>frame('train');
$('reset').onclick=()=>{Object.assign(S,{x:0,v:0,t:0,tau:0,score:0,target:1,observerX:450,paused:false,lightRight:0,lightLeft:0,lightTrain:0});$('pause').textContent='Ⅱ Пауза';drive(0);updateUI()};
$('moveObserver').onclick=()=>{S.observerX=S.target*450};
for(const id of ['help','physics'])$(id).onclick=()=>$('info').showModal();$('closeInfo').onclick=()=>$('info').close();$('info').onclick=e=>{if(e.target===$('info')){const r=$('info').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('info').close()}};
document.addEventListener('keydown',e=>{if($('info').open||document.activeElement.tagName==='INPUT')return;if(e.code==='Space'){e.preventDefault();if(!e.repeat)pause()}if(['KeyD','ArrowRight'].includes(e.code)){e.preventDefault();drive(1)}if(['KeyS','ArrowLeft','ArrowDown'].includes(e.code)){e.preventDefault();drive(-1)}if(['KeyW','ArrowUp'].includes(e.code)){e.preventDefault();drive(0)}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!S.paused)pause()});
function clock(t){const m=Math.floor(t/60);return String(m).padStart(2,'0')+':'+(t%60).toFixed(1).padStart(4,'0')}
function step(dt){if(S.paused||$('info').open)return;const acceleration=S.mode===1?S.acceleration:S.mode===-1?-S.braking:0;const properMomentum=S.v*gamma()+acceleration*dt;S.v=Math.max(0,Math.min(MAX_BETA*S.c,properMomentum/Math.sqrt(1+(properMomentum/S.c)**2)));S.x+=S.v*dt;S.t+=dt;S.tau+=dt/gamma();stepLight(dt);const d=stopDistance();if(Math.abs(d)<=STOP_TOLERANCE&&S.v<.6){S.score++;S.target++}else if(d< -24){S.target++}}
function stepLight(dt){
// External camera tracks the train: photon velocity on screen is +/-c - v.
// The train comparison uses its local elapsed time: distance = c * d(tau).
S.lightRight=(S.lightRight+(S.c-S.v)*dt)%80;
S.lightLeft=(S.lightLeft+(-S.c-S.v)*dt)%80;
S.lightTrain=(S.lightTrain+S.c*dt/gamma())%80;
}
function updateUI(){const g=gamma(),b=S.v/S.c;$('speed').innerHTML=S.v.toFixed(1)+' <small>м/с</small>';$('kmh').textContent=(S.v*3.6).toFixed(0)+' км/ч';$('beta').innerHTML=b.toFixed(6)+' <small>c</small>';$('gamma').innerHTML=g.toFixed(3)+' <small>γ</small>';$('contraction').textContent='Длина движущихся объектов: '+(100/g).toFixed(3)+'%';$('betaBar').style.width=(b*100)+'%';$('earthClock').textContent=clock(S.t);$('trainClock').textContent=clock(S.tau);$('distance').textContent='До стоп-метки головой поезда '+Math.round(stopDistance())+' м';$('mission').textContent='Остановитесь у станции «'+names[S.target%names.length]+'»';$('score').textContent=S.score;$('motionTag').textContent=S.paused?'ПАУЗА':S.v<.1?'ПОЕЗД НА СТАРТЕ':S.mode===1?`РАЗГОН · a₀ = ${S.acceleration} м/с²`:S.mode===-1?`ТОРМОЖЕНИЕ · a₀ = −${S.braking} м/с²`:'ДВИЖЕНИЕ НАКАТОМ';$('sceneHint').textContent=S.paused?'Симуляция на паузе':S.v<.1?'Дайте тягу, чтобы начать движение':S.frame==='train'?'Вы в поезде · станции движутся влево':'Вы на платформе · камера следует за поездом'}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h)}
function text(t,x,y,size=12,color='#afc2c8',align='left'){ctx.fillStyle=color;ctx.font=`${size}px Manrope,Arial`;ctx.textAlign=align;ctx.fillText(t,x,y)}
function line(x,y,x2,y2,col,w=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=col;ctx.lineWidth=w;ctx.stroke()}
// Both frames measure the moving object's simultaneous endpoints: L = L0 / gamma.
function frameScales(beta,frame){const k=Math.sqrt(1-beta*beta);return {world:frame==='train'?k:1,train:frame==='train'?1:k}}
function shiftedWavelength(beta,approaching){return 550*Math.sqrt((1+(approaching?-beta:beta))/(1-(approaching?-beta:beta)))}
function trainApproaching(){return (headWorld()+tailWorld())/2<S.observerX}
function trainPassState(){return headWorld()<S.observerX?'approaching':tailWorld()>S.observerX?'receding':'passing'}
function tintColor(wavelength,alpha){const rgb=wavelength<390?'143,101,255':wavelength<460?'82,112,255':wavelength<500?'62,170,255':wavelength<550?'70,207,232':wavelength<590?'236,179,76':wavelength<650?'248,113,72':'224,56,78';return `rgba(${rgb},${alpha})`}
function tintLayer(approaching){const beta=S.v/S.c;if(!$('doppler').checked||beta===0)return;const strength=Math.min(.67,Math.abs(Math.log(shiftedWavelength(beta,true)/550))*.62);ctx.save();ctx.globalCompositeOperation='source-atop';if(approaching===null){const gradient=ctx.createLinearGradient(width*.18,0,width*.76,0);gradient.addColorStop(0,tintColor(shiftedWavelength(beta,false),strength));gradient.addColorStop(.46,tintColor(shiftedWavelength(beta,false),strength*.65));gradient.addColorStop(.54,tintColor(shiftedWavelength(beta,true),strength*.65));gradient.addColorStop(1,tintColor(shiftedWavelength(beta,true),strength));ctx.fillStyle=gradient}else ctx.fillStyle=tintColor(shiftedWavelength(beta,approaching),strength);ctx.fillRect(0,0,width,height);ctx.restore()}
function tintTrain(observerScreenX,px){const beta=S.v/S.c;if(!$('doppler').checked||beta===0)return;
// Each part is classified by its own position, not by the train's centre.
// In this longitudinal teaching model the passage band is smoothed, not ray-traced.
const strength=Math.min(.67,Math.abs(Math.log(shiftedWavelength(beta,true)/550))*.62),band=Math.min(6,trainLength()/gamma()*.15)*px;
const gradient=ctx.createLinearGradient(observerScreenX-band,0,observerScreenX+band,0);
gradient.addColorStop(0,tintColor(shiftedWavelength(beta,true),strength));
gradient.addColorStop(.45,tintColor(shiftedWavelength(beta,true),strength*.15));
gradient.addColorStop(.5,tintColor(550,0));
gradient.addColorStop(.55,tintColor(shiftedWavelength(beta,false),strength*.15));
gradient.addColorStop(1,tintColor(shiftedWavelength(beta,false),strength));
ctx.save();ctx.globalCompositeOperation='source-atop';ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);ctx.restore()}
function lampColor(){return '#cfee9e'}
function drawLight(px){const trainFrame=S.frame==='train',period=80*px;
ctx.save();rect(13,60,width-26,66,'#0a171ee8');
text(`СВЕТ · c = ${S.c} м/с`,24,76,10,'#e5f6bc');
if(width>650)text(trainFrame?'Местное время поезда · скорость света c':'Камера за поездом · движение импульсов: c − v и −c − v',width-24,76,10,'#94aab4','right');
for(const [y,direction,phase,color,label] of [[94,1,trainFrame?S.lightTrain:S.lightRight,'#deff91','ПО ХОДУ'],[114,-1,trainFrame?-S.lightTrain:S.lightLeft,'#8ee7ff','НАВСТРЕЧУ']]){
line(24,y,width-24,y,'#29404a');
const offset=((phase*px)%period+period)%period;
ctx.save();ctx.beginPath();ctx.rect(24,81,width-48,43);ctx.clip();
for(let x=offset-period;x<width+period;x+=period){
const tail=ctx.createLinearGradient(x-direction*32,y,x,y);tail.addColorStop(0,'#ffffff00');tail.addColorStop(1,color);ctx.fillStyle=tail;ctx.fillRect(direction>0?x-32:x,y-1.5,32,3);
ctx.shadowColor=color;ctx.shadowBlur=10;rect(x-3,y-3,6,6,color);ctx.shadowBlur=0;
}ctx.restore();
rect(width-110,y-7,88,14,'#0a171ef0');text(label,width-28,y+3,9,color,'right');
}ctx.restore();}
function draw(){const trainFrame=S.frame==='train',scales=frameScales(S.v/S.c,S.frame),worldScale=scales.world,trainScale=scales.train,px=width<650?2.8:4;const cy=height*.63,cx=width*.5;const world=x=>cx+(x-S.x)*px*worldScale;
$('frameNote').textContent=`Поезд: ${(trainLength()*trainScale).toFixed(3)} / ${trainLength()} м · платформа: ${(160*worldScale).toFixed(3)} / 160 м`;
$('dopplerNote').textContent=!$('doppler').checked?'Окраска выключена':S.v===0?'Поезд неподвижен: доплеровского сдвига нет.':trainFrame?'Всё окружение: впереди — синий сдвиг, позади — красный.':trainPassState()==='passing'?'Поезд проезжает наблюдателя: хвост — синий, прошедшая головная часть — красная.':trainPassState()==='approaching'?'Весь поезд: синий сдвиг — приближается к наблюдателю.':'Весь поезд: красный сдвиг — удаляется от наблюдателя.';
$('observerPosition').textContent=`Наблюдатель: «${names[(S.observerX/450)%names.length]}», ${S.observerX} м · до поезда ${Math.round(Math.abs(S.x-S.observerX))} м`;
$('observerControls').hidden=trainFrame;
ctx=worldLayer.getContext('2d');ctx.clearRect(0,0,width,height);
const bg=ctx.createLinearGradient(0,0,0,height);bg.addColorStop(0,'#101c25');bg.addColorStop(.8,'#1a303b');bg.addColorStop(1,'#101719');ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);
// Tiled tunnel, with all longitudinal dimensions transformed in train frame.
const span=(width/2+200)/(px*worldScale)+250,start=S.x-span,end=S.x+span;
// Skip subpixel repetitions at extreme contraction; preserve real positions and widths.
const gridStep=20*Math.max(1,Math.ceil(8/(20*px*worldScale))),lampStep=90*Math.max(1,Math.ceil(30/(90*px*worldScale))),railStep=4*Math.max(1,Math.ceil(5/(4*px*worldScale)));
for(let x=Math.floor(start/gridStep)*gridStep;x<end;x+=gridStep){const sx=world(x),unit=20*px*worldScale;line(sx,68,sx,cy+8,'#253b46');line(sx,cy+8,sx+unit,cy+8,'#344b52');if((x/20)%2===0){rect(sx,91,unit*.65,3,'#314853');rect(sx+unit*.05,96,unit*.55,1,'#21343e')}}
line(0,cy-28,width,cy-28,'#263d46',2);line(0,cy+19,width,cy+19,'#3a5158',2);
for(let x=Math.floor(start/lampStep)*lampStep;x<end;x+=lampStep){const sx=world(x),color=lampColor(x-S.x);ctx.save();ctx.shadowColor=color;ctx.shadowBlur=18;rect(sx-8*worldScale,cy-104,16*worldScale,4,color);ctx.restore();rect(sx-1*worldScale,cy-100,2*worldScale,83,'#405159');if(worldScale>.1)text(String(Math.round(x)).padStart(4,'0'),sx,cy-114,9,'#536d77','center')}
// Stations are 160 m long, spaced 450 m apart.
for(let n=Math.max(0,Math.floor((S.x-span)/450));n<=(S.x+span)/450;n++){const sx=world(n*450),sw=160*px*worldScale;if(sx+sw/2<0||sx-sw/2>width)continue;rect(sx-sw/2,cy-143,sw,155,'#253b43');rect(sx-sw/2,cy-143,sw,3,'#57747a');if(sw<12){rect(sx-sw/2,cy+12,sw,15,'#5f7068');continue}for(let j=-3;j<=3;j++){const xx=sx+j*20*px*worldScale;rect(xx-3*worldScale,cy-137,6*worldScale,145,'#526566');rect(xx-4*worldScale,cy-137,2*worldScale,145,'#70817b')}
rect(sx-sw/2,cy+12,sw,15,'#5f7068');rect(sx-sw/2,cy+12,sw,3,'#d0d99b');ctx.save();ctx.translate(sx,cy-99);ctx.scale(worldScale,1);rect(-86,-22,172,32,'#15282b');text(names[n%names.length].toUpperCase(),0,0,14,'#d6e5db','center');ctx.restore();const stopX=world(n*450+STOP_OFFSET);line(stopX,cy+28,stopX,cy+60,'#d6fa73',2);text('СТОП · ГОЛОВА',stopX,cy+76,9,'#b1cb86','center')}
rect(0,cy+32,width,height-cy,'#101a20');for(let x=Math.floor(start/railStep)*railStep;x<end;x+=railStep){const sx=world(x);rect(sx,cy+39,2*px*worldScale,5,'#2d3c42');rect(sx,cy+53,2*px*worldScale,5,'#27373c')}line(0,cy+37,width,cy+37,'#8da3a6',2);line(0,cy+51,width,cy+51,'#4e6b72',2);
// Tint the entire moving environment, including walls, platforms and rails.
if(trainFrame)tintLayer(null);screen.clearRect(0,0,width,height);screen.drawImage(worldLayer,0,0,width,height);
// The camera follows the train, but the physical external observer stays put.
if(!trainFrame){ctx=screen;const ox=world(S.observerX);if(ox>-100&&ox<width+100){line(ox,cy-155,ox,cy+61,'#e9be7c',1);text('НАБЛЮДАТЕЛЬ',ox,cy-162,10,'#e9be7c','center')}}
ctx=trainLayer.getContext('2d');ctx.clearRect(0,0,width,height);
// Head is car 1 on the right. Car 2 stays at the camera anchor.
const carPitch=CAR_LENGTH*px;ctx.save();ctx.translate(cx,cy);ctx.scale(trainScale,1);for(let i=0;i<S.cars;i++){const x=(15-i*CAR_LENGTH)*px,carW=carPitch-(i===0?0:5);ctx.save();ctx.shadowColor='#0009';ctx.shadowBlur=14;rect(x,-52,carW,71,'#adbbb5');ctx.restore();rect(x,-52,carW,5,'#d2dacf');rect(x,-46,carW,6,'#798e89');rect(x,-2,carW,9,'#bce56e');rect(x,9,carW,10,'#667d7d');for(let j=0;j<5;j++){const xx=x+9+j*(carW-19)/5;rect(xx,-33,17*px/4,26,'#172d39');rect(xx+2,-31,13*px/4,3,'#49636c');if(j===2){rect(xx-3,-37,23*px/4,51,'#798d88');rect(xx-1,-32,8*px/4,24,'#1a3542');rect(xx+10*px/4,-32,8*px/4,24,'#1a3542');line(xx+9*px/4,-35,xx+9*px/4,13,'#bac8b9')}}for(const wx of [x+17,x+carW-19]){ctx.beginPath();ctx.arc(wx,cy-cy+22,8,0,Math.PI*2);ctx.fillStyle='#0b141a';ctx.fill();ctx.beginPath();ctx.arc(wx,22,3,0,Math.PI*2);ctx.fillStyle='#667778';ctx.fill()}text(i===0?'М  /  01':'М  /  '+String(i+1).padStart(2,'0'),x+6,-42,6,'#dfebdc');if(i<S.cars-1)rect(x-5,-38,5,48,'#39494a')}
ctx.shadowColor='#e9f9b5';ctx.shadowBlur=15;rect(FRONT_OFFSET*px-8,-23,4,8,'#e9f9b5');ctx.shadowBlur=0;rect(rearOffset()*px+1,-21,3,6,'#f18173');ctx.restore();
// The mission advances automatically; the observer moves only by explicit control.
if(!trainFrame)tintTrain(world(S.observerX),px);screen.drawImage(trainLayer,0,0,width,height);ctx=screen;
// Comparison ruler shows the contracted / proper train length.
const rearX=cx+rearOffset()*px*trainScale,frontX=cx+FRONT_OFFSET*px*trainScale,ry=cy+92;line(rearX,ry,frontX,ry,'#99b674');line(rearX,ry-4,rearX,ry+4,'#99b674');line(frontX,ry-4,frontX,ry+4,'#99b674');text((trainLength()*trainScale).toFixed(3)+' м · '+S.cars+' ваг.',Math.max(95,Math.min(width-95,(rearX+frontX)/2)),ry+18,10,'#a1ba91','center');
const vignette=ctx.createLinearGradient(0,0,width,0);vignette.addColorStop(0,'#07131b80');vignette.addColorStop(.15,'#07131b00');vignette.addColorStop(.85,'#07131b00');vignette.addColorStop(1,'#07131b80');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
drawLight(px);
}
function loop(now){const dt=Math.min((now-last)/1000||0,.05);last=now;step(dt);draw();updateUI();requestAnimationFrame(loop)}
resize();drive(0);requestAnimationFrame(loop);





