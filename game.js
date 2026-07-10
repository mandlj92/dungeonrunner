(() => {
'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s), panels=['menu','choice','armory','scores','pause','summary'];
const W=1280,H=720, TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
const storeKey='ashvault-save-v1';
const defaults={embers:0,best:0,runs:0,wins:0,unlocks:{ironHeart:0,edge:0,boots:0},scores:[]};
let meta=loadMeta(), state='menu', last=0, keys={}, mouse={x:W/2,y:H/2,down:false}, room, player, enemies=[],bullets=[],particles=[],drops=[],roomNo=0,score=0,kills=0,elapsed=0,paused=false,shake=0, gamepadAttack=false;
function loadMeta(){try{return Object.assign(structuredClone(defaults),JSON.parse(localStorage.getItem(storeKey)||'{}'))}catch{return structuredClone(defaults)}}
function saveMeta(){localStorage.setItem(storeKey,JSON.stringify(meta)); updateMeta()}
function updateMeta(){$('#metaLine').textContent=`Embers ${meta.embers} · Best ${meta.best.toLocaleString()} · Escapes ${meta.wins}`}
function show(id){panels.forEach(p=>$('#'+p).classList.toggle('visible',p===id)); state=id==='menu'?'menu':state}
function hideAll(){panels.forEach(p=>$('#'+p).classList.remove('visible'))}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1700)}
function resetRun(){
 roomNo=0;score=0;kills=0;elapsed=0;enemies=[];bullets=[];particles=[];drops=[];
 player={x:W/2,y:H/2,r:17,hp:100+meta.unlocks.ironHeart*10,maxHp:100+meta.unlocks.ironHeart*10,speed:235+meta.unlocks.boots*12,damage:18+meta.unlocks.edge*2,fireRate:.32,shotSpeed:680,lastShot:0,dashCd:1.8,dashAt:-9,dashTime:0,inv:0,crit:.08,pierce:0,multishot:1,lifesteal:0,armor:0,roomHeal:0,weapon:'Cinder Pistol'};
 nextRoom();state='playing';hideAll();
}
function nextRoom(){roomNo++; bullets=[];drops=[]; room=generateRoom(); player.x=W/2;player.y=H-88; spawnWave(); toast(roomNo===10?'THE WARDEN AWAKENS':`CHAMBER ${roomNo}`)}
function generateRoom(){const obs=[];let count=roomNo===10?2:Math.floor(rand(2,6));for(let i=0;i<count;i++){let w=rand(70,150),h=rand(55,115);obs.push({x:rand(90,W-90-w),y:rand(120,H-170-h),w,h})}return{obs,cleared:false,theme:roomNo<4?0:roomNo<8?1:2}}
function spawnWave(){enemies=[];if(roomNo===10){enemies.push(makeEnemy('boss',W/2,150));return}let n=3+Math.floor(roomNo*1.25);for(let i=0;i<n;i++){let type=Math.random()<.16+roomNo*.025?'shooter':Math.random()<.22?'brute':'stalker';let p=safeSpawn();enemies.push(makeEnemy(type,p.x,p.y))}}
function safeSpawn(){for(let k=0;k<40;k++){let p={x:rand(70,W-70),y:rand(70,H/2)};if(!collidesObs(p.x,p.y,28))return p}return{x:100,y:100}}
function makeEnemy(type,x,y){const t={stalker:{r:15,hp:34,speed:95,damage:12,color:'#cf665e',value:90},brute:{r:24,hp:92,speed:55,damage:22,color:'#99645a',value:180},shooter:{r:17,hp:42,speed:68,damage:9,color:'#b6935d',value:150},boss:{r:55,hp:950,speed:52,damage:25,color:'#d3a14e',value:3000}}[type];return{x,y,type,...t,maxHp:t.hp,hit:0,attack:rand(0,.8),phase:0}}
function collidesObs(x,y,r){return room?.obs.some(o=>x+r>o.x&&x-r<o.x+o.w&&y+r>o.y&&y-r<o.y+o.h)}
function moveEntity(e,dx,dy){e.x+=dx;if(collidesObs(e.x,e.y,e.r)||e.x<e.r||e.x>W-e.r)e.x-=dx;e.y+=dy;if(collidesObs(e.x,e.y,e.r)||e.y<e.r||e.y>H-e.r)e.y-=dy}
function input(dt){
 let x=(keys.KeyD?1:0)-(keys.KeyA?1:0),y=(keys.KeyS?1:0)-(keys.KeyW?1:0),ax=mouse.x-player.x,ay=mouse.y-player.y,attack=mouse.down;
 const gp=navigator.getGamepads?.()[0];if(gp){x+=dead(gp.axes[0]);y+=dead(gp.axes[1]);let rx=dead(gp.axes[2]),ry=dead(gp.axes[3]);if(Math.hypot(rx,ry)>.2){ax=rx;ay=ry}attack=attack||gp.buttons[7]?.pressed;if(gp.buttons[4]?.pressed&&!gamepadAttack)dash(x,y);gamepadAttack=gp.buttons[4]?.pressed}
 let l=Math.hypot(x,y)||1;x/=l;y/=l;let speed=player.speed*(player.dashTime>0?3.6:1);moveEntity(player,x*speed*dt,y*speed*dt);player.aim=Math.atan2(ay,ax);if(attack)shoot();if(keys.Space){dash(x,y);keys.Space=false}
}
const dead=v=>Math.abs(v)<.18?0:v;
function dash(x,y){if(elapsed-player.dashAt<player.dashCd)return;player.dashAt=elapsed;player.dashTime=.16;player.inv=.24;burst(player.x,player.y,'#d9c28a',16);if(!x&&!y){moveEntity(player,Math.cos(player.aim)*55,Math.sin(player.aim)*55)}}
function shoot(){if(elapsed-player.lastShot<player.fireRate)return;player.lastShot=elapsed;let spread=.13;for(let i=0;i<player.multishot;i++){let off=(i-(player.multishot-1)/2)*spread, a=player.aim+off;bullets.push({x:player.x+Math.cos(a)*24,y:player.y+Math.sin(a)*24,vx:Math.cos(a)*player.shotSpeed,vy:Math.sin(a)*player.shotSpeed,r:5,damage:player.damage,pierce:player.pierce,enemy:false,life:1.5})}burst(player.x+Math.cos(player.aim)*25,player.y+Math.sin(player.aim)*25,'#ffd77a',5)}
function enemyShoot(e,count=1){let a=Math.atan2(player.y-e.y,player.x-e.x);for(let i=0;i<count;i++){let q=a+(i-(count-1)/2)*.22;bullets.push({x:e.x,y:e.y,vx:Math.cos(q)*(e.type==='boss'?340:270),vy:Math.sin(q)*(e.type==='boss'?340:270),r:e.type==='boss'?8:6,damage:e.damage,enemy:true,life:4})}}
function update(dt){
 if(state!=='playing'||paused)return; elapsed+=dt;player.inv=Math.max(0,player.inv-dt);player.dashTime=Math.max(0,player.dashTime-dt);input(dt);
 for(const e of enemies){e.hit=Math.max(0,e.hit-dt);e.attack-=dt;let dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
  if(e.type==='shooter'){if(d>240)moveEntity(e,dx/d*e.speed*dt,dy/d*e.speed*dt);else if(d<170)moveEntity(e,-dx/d*e.speed*dt,-dy/d*e.speed*dt);if(e.attack<=0){enemyShoot(e);e.attack=1.35}}
  else if(e.type==='boss'){e.phase+=dt;moveEntity(e,dx/d*e.speed*dt,dy/d*e.speed*dt);if(e.attack<=0){enemyShoot(e,e.hp<e.maxHp*.5?7:5);e.attack=e.hp<e.maxHp*.5?.72:1.05}if(Math.sin(e.phase*2)>0.985)spawnMinion(e)}
  else moveEntity(e,dx/d*e.speed*dt,dy/d*e.speed*dt);
  if(d<e.r+player.r+3&&player.inv<=0){hurtPlayer(Math.max(1,e.damage-player.armor));player.inv=.65;moveEntity(player,dx/d*28,dy/d*28)}
 }
 for(const b of bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(collidesObs(b.x,b.y,b.r))b.life=0;if(b.enemy){if(Math.hypot(b.x-player.x,b.y-player.y)<b.r+player.r&&player.inv<=0){hurtPlayer(Math.max(1,b.damage-player.armor));player.inv=.45;b.life=0}}else for(const e of enemies){if(e.hp>0&&Math.hypot(b.x-e.x,b.y-e.y)<b.r+e.r){let crit=Math.random()<player.crit,dam=b.damage*(crit?2:1);e.hp-=dam;e.hit=.09;b.pierce--;if(b.pierce<0)b.life=0;score+=Math.round(dam);burst(b.x,b.y,crit?'#fff1a8':'#d36b55',crit?10:5);if(e.hp<=0)killEnemy(e);break}}}
 bullets=bullets.filter(b=>b.life>0&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);enemies=enemies.filter(e=>e.hp>0);
 for(const d of drops){if(Math.hypot(d.x-player.x,d.y-player.y)<35){if(d.type==='heart')player.hp=Math.min(player.maxHp,player.hp+18);else score+=75;d.dead=true;toast(d.type==='heart'?'+18 vitality':'+75 score')}}drops=drops.filter(d=>!d.dead);
 particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=.96;p.vy*=.96});particles=particles.filter(p=>p.life>0);shake=Math.max(0,shake-dt*18);
 if(!enemies.length&&!room.cleared){room.cleared=true;player.hp=Math.min(player.maxHp,player.hp+player.roomHeal);setTimeout(roomComplete,500)}
}
function spawnMinion(e){if(enemies.length<9){let a=rand(0,TAU);enemies.push(makeEnemy('stalker',e.x+Math.cos(a)*80,e.y+Math.sin(a)*80))}}
function hurtPlayer(n){player.hp-=n;shake=12;burst(player.x,player.y,'#ff554f',18);if(player.hp<=0)endRun(false)}
function killEnemy(e){kills++;score+=e.value;shake=Math.min(10,shake+2);burst(e.x,e.y,e.color,18);if(player.lifesteal)player.hp=Math.min(player.maxHp,player.hp+player.lifesteal);if(Math.random()<.12)drops.push({x:e.x,y:e.y,type:'heart'});else if(Math.random()<.2)drops.push({x:e.x,y:e.y,type:'coin'})}
function roomComplete(){if(state!=='playing')return;if(roomNo===10){endRun(true);return}const choices=pickUpgrades(3);$('#choice').innerHTML=`<p class="eyebrow">CHAMBER CLEARED</p><h2>Choose a Relic</h2><div class="cards">${choices.map((u,i)=>`<button class="card" data-up="${i}"><span class="tag">${u.rarity}</span><h3>${u.name}</h3><p>${u.desc}</p></button>`).join('')}</div>`;$('#choice').classList.add('visible');state='choice';document.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{choices[+b.dataset.up].apply();$('#choice').classList.remove('visible');state='playing';nextRoom()})}
const upgrades=[
{name:'Tempered Edge',rarity:'common',desc:'+25% weapon damage.',apply(){player.damage*=1.25}},
{name:'Quicklock',rarity:'common',desc:'20% faster attacks.',apply(){player.fireRate*=.8}},
{name:'Longshot Rune',rarity:'common',desc:'+25% projectile speed and +10% damage.',apply(){player.shotSpeed*=1.25;player.damage*=1.1}},
{name:'Blood Chalice',rarity:'rare',desc:'Heal 3 vitality on every kill.',apply(){player.lifesteal+=3}},
{name:'Split Sigil',rarity:'rare',desc:'Fire one additional projectile.',apply(){player.multishot=Math.min(5,player.multishot+1)}},
{name:'Ghost Nail',rarity:'rare',desc:'Projectiles pierce one additional foe.',apply(){player.pierce++}},
{name:'Blackglass Heart',rarity:'rare',desc:'+35 maximum vitality and heal fully.',apply(){player.maxHp+=35;player.hp=player.maxHp}},
{name:'Warden Plate',rarity:'rare',desc:'Reduce all incoming damage by 4.',apply(){player.armor+=4}},
{name:'Execution Mark',rarity:'legendary',desc:'+15% critical chance.',apply(){player.crit+=.15}},
{name:'Ashen Renewal',rarity:'legendary',desc:'Heal 10 vitality after every chamber.',apply(){player.roomHeal+=10}},
{name:'Storm Chamber',rarity:'legendary',desc:'40% faster attacks, but lose 15 maximum vitality.',apply(){player.fireRate*=.6;player.maxHp=Math.max(25,player.maxHp-15);player.hp=Math.min(player.hp,player.maxHp)}}];
function pickUpgrades(n){return [...upgrades].sort(()=>Math.random()-.5).slice(0,n)}
function endRun(win){state='summary';paused=false;let earned=Math.floor(roomNo*3+kills*.5+(win?35:0));meta.embers+=earned;meta.runs++;if(win)meta.wins++;meta.best=Math.max(meta.best,score);meta.scores.push({score,rooms:roomNo,time:Math.floor(elapsed),win,date:new Date().toLocaleDateString()});meta.scores.sort((a,b)=>b.score-a.score);meta.scores=meta.scores.slice(0,10);saveMeta();$('#summary').innerHTML=`<p class="eyebrow">${win?'VAULT CONQUERED':'THE VAULT CLAIMS ANOTHER'}</p><h2>${win?'The Warden Falls':'Run Ended'}</h2><div class="score-row"><span>Score</span><strong>${score.toLocaleString()}</strong></div><div class="score-row"><span>Chambers</span><strong>${roomNo}/10</strong></div><div class="score-row"><span>Enemies defeated</span><strong>${kills}</strong></div><div class="score-row"><span>Embers recovered</span><strong>${earned}</strong></div><button id="again">Run Again</button><button id="home" class="secondary">Return to Vault</button>`;show('summary');$('#again').onclick=resetRun;$('#home').onclick=()=>{show('menu');updateMeta()}}
function burst(x,y,color,n){for(let i=0;i<n;i++){let a=rand(0,TAU),s=rand(30,220);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.2,.65),max:.65,color,r:rand(1,4)})}}
function draw(){ctx.save();ctx.clearRect(0,0,W,H);let sx=shake?rand(-shake,shake):0,sy=shake?rand(-shake,shake):0;ctx.translate(sx,sy);drawFloor();if(room){room.obs.forEach(drawObs);drops.forEach(drawDrop);bullets.forEach(drawBullet);enemies.forEach(drawEnemy);if(player)drawPlayer();particles.forEach(drawParticle)}ctx.restore();if(state==='playing'||state==='choice'||paused)drawHud();}
function drawFloor(){let grad=ctx.createRadialGradient(W/2,H/2,50,W/2,H/2,800);grad.addColorStop(0,room?.theme===2?'#241c18':'#171b24');grad.addColorStop(1,'#080a0f');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(255,255,255,.025)';ctx.lineWidth=1;for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
function drawObs(o){ctx.fillStyle='#151923';ctx.fillRect(o.x,o.y,o.w,o.h);ctx.strokeStyle='#37323a';ctx.lineWidth=3;ctx.strokeRect(o.x,o.y,o.w,o.h);ctx.fillStyle='rgba(255,255,255,.025)';ctx.fillRect(o.x+8,o.y+8,o.w-16,8)}
function drawPlayer(){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.aim);ctx.fillStyle=player.inv>0&&Math.floor(elapsed*20)%2?'#fff':'#d9c28a';ctx.beginPath();ctx.arc(0,0,player.r,0,TAU);ctx.fill();ctx.fillStyle='#35313a';ctx.fillRect(8,-5,25,10);ctx.restore()}
function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);ctx.fillStyle=e.hit?'#fff':e.color;ctx.beginPath();if(e.type==='boss'){for(let i=0;i<12;i++){let a=i/12*TAU,r=i%2?e.r*.72:e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath()}else ctx.arc(0,0,e.r,0,TAU);ctx.fill();ctx.fillStyle='#0a0b0e';ctx.beginPath();ctx.arc(-e.r*.25,-3,3,0,TAU);ctx.arc(e.r*.25,-3,3,0,TAU);ctx.fill();ctx.restore();if(e.hp<e.maxHp){let w=e.type==='boss'?140:e.r*2;ctx.fillStyle='#201416';ctx.fillRect(e.x-w/2,e.y-e.r-15,w,5);ctx.fillStyle='#d05b54';ctx.fillRect(e.x-w/2,e.y-e.r-15,w*(e.hp/e.maxHp),5)}}
function drawBullet(b){ctx.fillStyle=b.enemy?'#e45b4e':'#ffd77a';ctx.shadowBlur=12;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();ctx.shadowBlur=0}
function drawDrop(d){ctx.fillStyle=d.type==='heart'?'#e95b61':'#e6b85c';ctx.beginPath();ctx.arc(d.x,d.y,9+Math.sin(elapsed*5)*2,0,TAU);ctx.fill()}
function drawParticle(p){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.r,p.r);ctx.globalAlpha=1}
function drawHud(){if(!player)return;ctx.fillStyle='rgba(5,7,12,.82)';ctx.fillRect(24,22,330,78);ctx.fillStyle='#302026';ctx.fillRect(44,50,270,14);ctx.fillStyle='#d85c59';ctx.fillRect(44,50,270*(player.hp/player.maxHp),14);ctx.fillStyle='#f4ead7';ctx.font='700 16px system-ui';ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`,44,43);ctx.fillStyle='#a99f91';ctx.font='13px system-ui';ctx.fillText(player.weapon,44,85);ctx.textAlign='right';ctx.fillStyle='#f4ead7';ctx.font='800 18px system-ui';ctx.fillText(`CHAMBER ${roomNo}/10`,W-34,46);ctx.fillStyle='#e6b85c';ctx.fillText(score.toLocaleString(),W-34,72);ctx.textAlign='left';let d=clamp((elapsed-player.dashAt)/player.dashCd,0,1);ctx.fillStyle='#242a36';ctx.fillRect(44,H-46,150,8);ctx.fillStyle='#d9c28a';ctx.fillRect(44,H-46,150*d,8);ctx.fillStyle='#a99f91';ctx.font='12px system-ui';ctx.fillText('DASH',44,H-54)}
function armory(){const items=[['ironHeart','Iron Heart','+10 starting vitality per rank',12],['edge','Honed Edge','+2 starting damage per rank',14],['boots','Wayfarer Boots','+12 movement speed per rank',10]];$('#armory').innerHTML=`<p class="eyebrow">PERMANENT ARMORY</p><h2>Spend Embers</h2><p>Available: <strong>${meta.embers}</strong></p>${items.map(([k,n,d,c])=>{let rank=meta.unlocks[k],cost=c*(rank+1);return `<div class="shop-row"><span><strong>${n} ${rank}/5</strong><br><small>${d}</small></span><button data-buy="${k}" ${rank>=5?'disabled':''}>${rank>=5?'MAX':cost+' embers'}</button></div>`}).join('')}<button id="armoryBack" class="secondary">Back</button>`;show('armory');document.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{let k=b.dataset.buy,base={ironHeart:12,edge:14,boots:10}[k],cost=base*(meta.unlocks[k]+1);if(meta.embers>=cost&&meta.unlocks[k]<5){meta.embers-=cost;meta.unlocks[k]++;saveMeta();armory()}else toast('Not enough embers')});$('#armoryBack').onclick=()=>show('menu')}
function scores(){let rows=meta.scores.length?meta.scores.map((s,i)=>`<div class="score-row"><span>#${i+1} ${s.win?'Escape':'Room '+s.rooms}</span><strong>${s.score.toLocaleString()}</strong></div>`).join(''):'<p class="fine">No runs recorded.</p>';$('#scores').innerHTML=`<p class="eyebrow">HALL OF RECORDS</p><h2>Best Runs</h2>${rows}<button id="scoresBack" class="secondary">Back</button>`;show('scores');$('#scoresBack').onclick=()=>show('menu')}
function togglePause(){if(state!=='playing'&&state!=='pause')return;paused=!paused;if(paused){state='pause';$('#pause').classList.add('visible')}else{state='playing';$('#pause').classList.remove('visible')}}
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Escape')togglePause();if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault()});addEventListener('keyup',e=>keys[e.code]=false);canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*W;mouse.y=(e.clientY-r.top)/r.height*H});canvas.addEventListener('mousedown',()=>mouse.down=true);addEventListener('mouseup',()=>mouse.down=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('#startBtn').onclick=resetRun;$('#armoryBtn').onclick=armory;$('#scoresBtn').onclick=scores;$('#resumeBtn').onclick=togglePause;$('#quitBtn').onclick=()=>endRun(false);
function loop(t){let dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();requestAnimationFrame(loop)}
updateMeta();show('menu');requestAnimationFrame(loop);
})();