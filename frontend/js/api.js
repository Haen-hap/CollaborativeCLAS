// Envío de sesiones anónimas al backend (POST /api/sessions). Si no hay red, quedan en una cola y se reintentan.
const API=(window.CCLAS_API||"").replace(/\/$/,"");
const lsGet=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let flushing=false;
async function flushOutbox(){if(flushing)return;flushing=true;const left=[];
 for(const p of lsGet("cclas_outbox",[])){try{const r=await fetch(API+"/api/sessions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});if(!r.ok&&r.status!==422)left.push(p)}catch(e){left.push(p)}}
 lsSet("cclas_outbox",left);flushing=false}
function sendSession(p){const box=lsGet("cclas_outbox",[]).filter(x=>x.session_id!==p.session_id);box.push(p);lsSet("cclas_outbox",box);flushOutbox()}
addEventListener("online",flushOutbox);addEventListener("load",flushOutbox);
