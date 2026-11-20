const fs=require('fs'),vm=require('vm'),assert=require('assert');
let drawCalls=0;const elements=new Map(),gradientCalls=[];const ctx=new Proxy({}, {get(t,k){if(k==='createLinearGradient')return (...args)=>{const gradient={args,stops:[],addColorStop(position,color){this.stops.push({position,color})}};gradientCalls.push(gradient);return gradient};return ()=>{drawCalls++}},set(){return true}});
function el(id){if(!elements.has(id))elements.set(id,{style:{},classList:{toggle(){}},value:60,checked:true,open:false,tagName:'DIV',textContent:'',dataset:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:1200,height:400}),showModal(){this.open=true},close(){this.open=false}});return elements.get(id)}
const sandbox={document:{createElement:()=>el(Symbol()),getElementById:el,querySelectorAll:()=>[],addEventListener(){},activeElement:{tagName:'BODY'}},ResizeObserver:class{observe(){}},devicePixelRatio:1,requestAnimationFrame(){},console};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../game.js','utf8')+`;globalThis.test={S,step,draw,gamma,setC,frame,drive,frameScales,shiftedWavelength,trainApproaching,trainPassState,MAX_BETA,setCars,headWorld,tailWorld,stopDistance,trainLength,rearOffset};`,sandbox);const {S,step,draw,gamma,setC,frame,drive,frameScales,shiftedWavelength,trainApproaching,trainPassState,MAX_BETA,setCars,headWorld,tailWorld,stopDistance,trainLength,rearOffset}=sandbox.test;
drive(1);for(let i=0;i<1000;i++)step(.02);assert(S.v>40&&S.v<60);assert(S.tau<S.t);assert(gamma()>1);draw();frame('train');draw();setC(25);assert(S.v<25);assert(Number.isFinite(gamma()));S.v=20;drive(-1);for(let i=0;i<5000;i++)step(.02);assert.equal(S.v,0);assert.equal(gamma(),1);
S.target=1;S.x=477;S.v=0;const score=S.score;step(.02);assert.equal(S.score,score+1);assert.equal(S.target,2);S.x=960;S.v=2;step(.02);assert.equal(S.target,3);S.paused=true;const x=S.x,t=S.t;step(.05);assert.equal(S.x,x);assert.equal(S.t,t);el('reset').onclick();assert.equal(S.score,0);assert.equal(S.t,0);assert.equal(S.v,0);console.log('PASS: acceleration, sublight limit, clocks, both frame render paths, braking, station scoring, missed station, pause and reset');
for(const beta of [0,.3,.6,.8,.99]){
 const g=1/Math.sqrt(1-beta*beta),c=60,v=beta*c,L=160;
 // Independent Lorentz-event check: two ground endpoints simultaneous in train frame.
 const t1=0,x1=0,x2=L,t2=v*L/(c*c);
 const trainDistance=g*((x2-v*t2)-(x1-v*t1));
 assert(Math.abs(frameScales(beta,'train').world*L-trainDistance)<1e-10);
 assert.equal(frameScales(beta,'train').train,1);
 // Moving train endpoints at equal ground time: inverse transform of rest separation.
 const measuredTrain=L/g;
 assert(Math.abs(frameScales(beta,'external').train*L-measuredTrain)<1e-10);
 assert.equal(frameScales(beta,'external').world,1);
 assert(Math.abs(shiftedWavelength(beta,true)*shiftedWavelength(beta,false)-550**2)<1e-7);
 if(beta>0){assert(shiftedWavelength(beta,true)<550);assert(shiftedWavelength(beta,false)>550)}
}
S.c=60;S.v=48;frame('external');draw();assert(el('frameNote').textContent.includes('54.0'));frame('train');draw();assert(el('frameNote').textContent.includes('96.0'));el('doppler').checked=false;draw();assert.equal(el('dopplerNote').textContent,'Окраска выключена');console.log('PASS: reciprocal contraction vs Lorentz events, 0.8c example, Doppler signs, zero shift and reciprocal wavelengths');
el('reset').onclick();el('doppler').checked=true;frame('external');S.v=30;S.x=440;draw();assert(trainApproaching());assert(el('dopplerNote').textContent.includes('синий'));
S.x=479;step(.02);assert.equal(S.target,1);assert.equal(S.observerX,450);draw();assert(!trainApproaching());assert.equal(trainPassState(),'passing');assert(el('dopplerNote').textContent.includes('головная часть'));
S.x=520;step(.02);assert.equal(S.target,2);draw();assert(el('dopplerNote').textContent.includes('красный'));S.x=1000;step(.02);assert.equal(S.target,3);assert.equal(S.observerX,450);draw();assert(el('dopplerNote').textContent.includes('красный'));
el('moveObserver').onclick();assert.equal(S.observerX,1350);assert(trainApproaching());draw();assert(el('dopplerNote').textContent.includes('синий'));
frame('train');draw();assert(el('observerControls').hidden);frame('external');draw();assert(!el('observerControls').hidden);
el('reset').onclick();assert.equal(S.observerX,450);draw();assert(el('dopplerNote').textContent.includes('сдвига нет'));
console.log('PASS: observer remains fixed across two station changes; receding train remains red; explicit relocation, observer controls and reset');
S.v=30;S.x=400;assert.equal(trainPassState(),'approaching');S.x=450;assert.equal(trainPassState(),'passing');S.x=500;assert.equal(trainPassState(),'receding');
for(const velocity of [15,30,48,59.7]){
 S.v=velocity;S.x=S.observerX;gradientCalls.length=0;draw();
 const tint=gradientCalls.find(g=>g.stops.length===5);assert(tint,'train tint is spatial');
 const [left,,right]=tint.args,center=1200*.5,half=45/gamma()*4;
 assert(left>center-half&&left<center);assert(right>center&&right<center+half);
 assert(tint.stops[0].color!==tint.stops[4].color);assert(tint.stops[2].color.endsWith(',0)'));
 const previous=left;S.x+=2;gradientCalls.length=0;draw();
 const moved=gradientCalls.find(g=>g.stops.length===5);assert(Math.abs(moved.args[0]-previous+8)<1e-9,'transition follows observer as camera moves');
}
console.log('PASS: approach / mixed passage / recession; blue and red across train; observer-anchored smooth transition at four speeds');
for(const c of [25,60,300])for(const beta of [0,.8,.995]){
 el('reset').onclick();S.c=c;S.v=c*beta;drive(0);
 const dt=.02;step(dt);
 assert(Math.abs(S.lightRight/dt+S.v-c)<1e-9,'external right pulse moves at c after camera motion is removed');
 assert(Math.abs(S.lightLeft/dt+S.v+c)<1e-9,'external left pulse moves at -c after camera motion is removed');
 assert(Math.abs(S.lightTrain/S.tau-c)<1e-9,'local train measurement is c');
 const phases=[S.lightRight,S.lightLeft,S.lightTrain];S.paused=true;step(dt);
 assert.deepEqual([S.lightRight,S.lightLeft,S.lightTrain],phases);
 frame('train');draw();frame('external');draw();
 el('reset').onclick();assert.deepEqual([S.lightRight,S.lightLeft,S.lightTrain],[0,0,0]);
}
console.log('PASS: light speed in both directions and frames at 3 light speeds and 3 train speeds; pulse pause, rendering and reset');
el('reset').onclick();S.c=60;el('extremeSpeed').onclick();assert.equal(S.mode,0);assert(Math.abs(S.v/S.c-.999999)<1e-14);assert(gamma()>707&&gamma()<708);
assert(Math.abs(90*frameScales(S.v/S.c,'external').train-.1272792)<1e-6);
assert(el('beta').innerHTML.startsWith('0.999999'));assert(el('contraction').textContent.includes('0.141%'));
drive(1);for(let i=0;i<200;i++)step(.05);assert(S.v<=MAX_BETA*S.c);assert(Number.isFinite(gamma()));
setC(25);assert(S.v<=MAX_BETA*S.c);assert(S.v<S.c);
S.x=1e7;for(const f of ['external','train']){frame(f);drawCalls=0;draw();assert(drawCalls<20000,`extreme ${f} draw cost: ${drawCalls}`)}
console.log('PASS: 0.999999c preset, 707-fold contraction, precision, speed limit under thrust and c changes, bounded rendering in both frames');
el('normalAcceleration').onclick();el('reset').onclick();S.c=60;drive(1);for(let i=0;i<20;i++)step(.05);const slowVelocity=S.v;
el('fastAcceleration').onclick();assert.equal(S.acceleration,400);assert.equal(S.braking,600);el('reset').onclick();drive(1);for(let i=0;i<20;i++)step(.05);assert(S.v>slowVelocity*10);
el('extremeAcceleration').onclick();assert.equal(S.acceleration,50000);assert.equal(S.braking,100000);el('reset').onclick();drive(1);for(let i=0;i<20;i++)step(.05);assert(S.v/S.c>=.999998);drive(-1);for(let i=0;i<20;i++)step(.05);assert.equal(S.v,0);
el('accelerationValue').onchange({target:{value:'123'}});assert.equal(S.acceleration,123);assert.equal(S.braking,100000);
el('brakingRange').oninput({target:{value:'3'}});assert.equal(S.braking,1000);assert.equal(S.acceleration,123);
el('brakingValue').onchange({target:{value:'200000'}});assert.equal(S.braking,100000);el('accelerationValue').onchange({target:{value:'-1'}});assert.equal(S.acceleration,1);
el('reset').onclick();assert.equal(S.acceleration,1);assert.equal(S.braking,100000);assert.equal(S.v,0);
console.log('PASS: independent acceleration and braking settings, presets, sliders and number inputs; extreme launch and full stop; bounds and reset preferences');
for(const cars of [1,2,3,8,12]){
 setCars(cars);el('reset').onclick();assert.equal(S.cars,cars);assert.equal(trainLength(),cars*30);assert.equal(headWorld(),45);assert.equal(tailWorld(),45-cars*30);
 // Old centre-of-platform stop must no longer count.
 S.x=450;S.v=0;step(.02);assert.equal(S.score,0);assert.equal(S.target,1);
 // Nose stops 8 m before the end of the 160 m platform, regardless of car count.
 S.x=477;assert.equal(headWorld(),522);assert.equal(stopDistance(),0);step(.02);assert.equal(S.score,1);assert.equal(S.target,2);
 el('reset').onclick();S.x=477-7;step(.02);assert.equal(S.score,0);S.x=477+7;step(.02);assert.equal(S.score,0);
 S.x=100;S.v=S.c*.8;assert(Math.abs(headWorld()-127)<1e-10);assert(Math.abs(headWorld()-tailWorld()-cars*30*.6)<1e-10);
 for(const f of ['external','train']){frame(f);draw();assert(el('frameNote').textContent.includes('/ '+cars*30+' м'))}
}
setCars(100);assert.equal(S.cars,12);setCars(0);assert.equal(S.cars,1);el('carCountRange').oninput({target:{value:'8'}});assert.equal(S.cars,8);assert.equal(el('carCount').value,8);setCars(3);
console.log('PASS: 1–12 cars, fixed nose and second-car camera anchor, count persistence, contracted geometry, nose-at-platform-end scoring, stop tolerance and count controls');








