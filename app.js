/* ============================================================
   CONNECT · ENTRADAS  —  app.js
   App de gestión de eventos y entradas con QR.
   Backend simulado en localStorage. Sin dependencias de build.
   ============================================================ */
'use strict';

/* ---------- Utils ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9);
const token = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).toUpperCase();
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const codeOf = (prefix) => prefix.toUpperCase() + '-' + Array.from({length:4},()=>ALPHA[Math.floor(Math.random()*ALPHA.length)]).join('');
// Código ÚNICO: evita colisiones al generar miles de entradas (dos personas nunca comparten código).
function newCode(prefix){
  const used = (typeof state!=='undefined' && state && state.tickets) ? new Set(state.tickets.map(t=>t.code)) : new Set();
  let c, i=0; do{ c=codeOf(prefix); } while(used.has(c) && ++i<80); return c;
}
const esc = (s) => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
const initials = (n)=>((n||'').split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase()||'★');
function h(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; }
function copyText(t){ navigator.clipboard?.writeText(t).then(()=>toast('Copiado','ok')).catch(()=>toast('No se pudo copiar','err')); }
function download(name, content, mime='text/plain'){
  const blob = new Blob([content], {type:mime});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
function parseDate(iso){ if(!iso) return null; const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); }
function shortDate(iso){ const dt=parseDate(iso); return dt?{d:String(dt.getDate()).padStart(2,'0'),m:MONTHS[dt.getMonth()].toUpperCase()}:{d:'--',m:'---'}; }
function longDate(iso){ const dt=parseDate(iso); if(!dt) return 'Sin fecha'; return `${DAYS[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`; }
function money(n){ const s=DB.s().symbol||'S/'; const v=Math.round(Number(n)||0); return `${s} ${v.toLocaleString('es-PE')}`; }
function timeAgo(ts){ if(!ts) return ''; const d=Math.floor((Date.now()-ts)/1000); if(d<60)return'hace instantes'; if(d<3600)return`hace ${Math.floor(d/60)} min`; if(d<86400)return`hace ${Math.floor(d/3600)} h`; return `hace ${Math.floor(d/86400)} d`; }
function timeStr(ts){ if(!ts) return '—'; const d=new Date(ts); return d.toLocaleString('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }

/* ---------- Iconos (SVG) ---------- */
const I = {
  dash:'<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z"/>',
  events:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  ticket:'<path d="M2 9a3 3 0 0 0 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v14"/>',
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M3 12h18"/>',
  check2:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  chart:'<path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  menu:'<path d="M3 12h18M3 6h18M3 18h18"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  money:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  trash:'<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  check:'<path d="M20 6 9 17l-5-5"/>', alert:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>', back:'<path d="M19 12H5M12 19l-7-7 7-7"/>',
  box:'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04M12 22.08V12"/>',
  star:'<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  whats:'<path d="M3 21l1.9-5.5A8.5 8.5 0 1 1 12 20.5a8.4 8.4 0 0 1-4.1-1.05z"/>',
  tag:'<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17c0 .53.21 1.04.59 1.41l8.7 8.71a2 2 0 0 0 2.83 0l6.58-6.59a2 2 0 0 0 0-2.83z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
};
const ic = (n, cls='') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${I[n]||''}</svg>`;

/* ============================================================
   DB  (localStorage)
   ============================================================ */
const KEY = 'connect_entradas_v1';
let state = null;
const DB = {
  s(){ return state.settings; },
  load(){ try{ const r=localStorage.getItem(KEY); if(r){ state=JSON.parse(r); return true; } }catch(e){} return false; },
  save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} if(typeof cloudSaveQueued==='function') cloudSaveQueued(); },
  event(id){ return state.events.find(e=>e.id===id); },
  cabeza(id){ return state.cabezas.find(c=>c.id===id); },
  type(ev,id){ return ev?.types.find(t=>t.id===id); },
  ticketsFor(eid){ return state.tickets.filter(t=>t.eventId===eid); },
  activeEvent(){ return DB.event(state.settings.activeEventId) || state.events[0] || null; },
  stats(eid){
    const ts = DB.ticketsFor(eid);
    const issued = ts.filter(t=>t.status!=='void');
    const valid = issued.filter(t=>t.status==='valid'||t.status==='used');
    const used = ts.filter(t=>t.status==='used');
    const unclaimed = ts.filter(t=>t.status==='unclaimed');
    const revenue = issued.filter(t=>t.payment==='paid').reduce((a,t)=>a+(Number(t.price)||0),0);
    const pending = issued.filter(t=>t.payment==='pending').reduce((a,t)=>a+(Number(t.price)||0),0);
    const courtesy = issued.filter(t=>t.payment==='courtesy'||t.payment==='free').length;
    return { total:issued.length, valid:valid.length, used:used.length, unclaimed:unclaimed.length,
      checkinRate: valid.length? Math.round(used.length/valid.length*100):0, revenue, pending, courtesy,
      reqPending: state.requests.filter(r=>r.eventId===eid && r.status==='pending').length };
  }
};

/* ---------- Seed (datos demo: Gala 4) ---------- */
function seed(){
  const ev = {
    id:'ev_gala4', name:'Gala 4', status:'published',
    description:'La cuarta edición de la Gala de Connect. Una noche de gala con lo mejor de la música, boxes premium y una producción de primer nivel.',
    dateISO:'2026-07-18', time:'22:00', venue:'Connect Club', address:'Av. Costanera 1234', city:'Lima',
    cover:'assets/gala4-cover.jpg', createdAt:Date.now()-86400000*6,
    types:[
      {id:'t_boxvip', name:'Box VIP', kind:'box', access:'paid', price:1800, capacity:12, color:'#FFFFFF', includes:['2 botellas premium','Mesa privada','Mozo dedicado'], desc:'Box premium frente a cabina'},
      {id:'t_box', name:'Box Estándar', kind:'box', access:'paid', price:1100, capacity:18, color:'#C0C0C0', includes:['1 botella','Mesa reservada'], desc:'Box en zona central'},
      {id:'t_std', name:'Estándar', kind:'general', access:'paid', price:90, capacity:300, color:'#9E9E9E', includes:[], desc:'Ingreso general'},
      {id:'t_cor', name:'Cortesía', kind:'general', access:'courtesy', price:0, capacity:150, color:'#B5B5B5', includes:[], desc:'Entrada de cortesía'},
      {id:'t_free', name:'Free', kind:'general', access:'free', price:0, capacity:120, color:'#7E7E7E', includes:[], desc:'Ingreso liberado antes de medianoche'},
    ]
  };
  const cabezas = [
    {id:'cb_renzo', name:'Renzo Salas', phone:'51987654321', email:'renzo@connect.pe', prefix:'RNZ', createdAt:Date.now()-86400000*6},
    {id:'cb_cami',  name:'Camila Torres', phone:'51998877665', email:'camila@connect.pe', prefix:'CAM', createdAt:Date.now()-86400000*5},
    {id:'cb_diego', name:'Diego Flores', phone:'51976543210', email:'diego@connect.pe', prefix:'DGO', createdAt:Date.now()-86400000*4},
  ];
  const nombres = ['María Gómez','José Pérez','Lucía Ramos','Andrés Díaz','Valeria Castro','Sebastián Rojas','Daniela Vega','Mateo Cruz','Camila Ruiz','Joaquín Mora','Fernanda León','Bruno Silva','Isabella Núñez','Thiago Paz','Antonella Ríos','Gabriel Soto','Renata Campos','Emilio Vargas','Martina Lara','Nicolás Reyes','Sofía Herrera','Adrián Mendoza','Luciana Aguirre','Tomás Guzmán'];
  const tickets = [];
  let ni = 0;
  function mk(typeId, cabezaId, status, payment){
    const cb = DB && cabezas.find(c=>c.id===cabezaId);
    const ty = ev.types.find(t=>t.id===typeId);
    const nm = nombres[ni++ % nombres.length];
    return {
      id:'tk_'+uid(), code: codeOf(cb?cb.prefix:'CNX'), token: token(),
      eventId:ev.id, typeId, cabezaId,
      holder:{ name:nm, dni:String(70000000+Math.floor(Math.random()*9999999)), email:nm.toLowerCase().replace(/[^a-z]/g,'.')+'@gmail.com', phone:'519'+Math.floor(10000000+Math.random()*89999999) },
      status, payment, price: payment==='paid'? ty.price : 0,
      source:'admin', createdAt:Date.now()-Math.floor(Math.random()*86400000*4),
      claimedAt:Date.now()-Math.floor(Math.random()*86400000*3), usedAt: status==='used'? Date.now()-Math.floor(Math.random()*3600000*5):null
    };
  }
  // Estándar pagadas (algunas usadas)
  for(let i=0;i<10;i++) tickets.push(mk('t_std', cabezas[i%3].id, i<4?'used':'valid', 'paid'));
  // Cortesías
  for(let i=0;i<7;i++) tickets.push(mk('t_cor', cabezas[i%3].id, i<2?'used':'valid', 'courtesy'));
  // Box
  tickets.push(mk('t_boxvip', 'cb_renzo','valid','paid'));
  tickets.push(mk('t_box','cb_cami','valid','paid'));
  // Free
  for(let i=0;i<4;i++) tickets.push(mk('t_free', cabezas[i%3].id, 'valid', 'free'));
  // Códigos sin reclamar (para cabezas)
  for(let i=0;i<6;i++){ const cb=cabezas[i%3]; tickets.push({ id:'tk_'+uid(), code:codeOf(cb.prefix), token:token(), eventId:ev.id, typeId:'t_std', cabezaId:cb.id, holder:{name:'',dni:'',email:'',phone:''}, status:'unclaimed', payment:'paid', price:90, source:'admin', createdAt:Date.now()-86400000, claimedAt:null, usedAt:null }); }

  const requests = [
    {id:'rq_'+uid(), eventId:ev.id, cabezaId:'cb_renzo', typeId:'t_std', name:'Paula Espinoza', dni:'72648193', email:'paula.e@gmail.com', phone:'51987112233', note:'Quiero 1 entrada estándar', status:'pending', createdAt:Date.now()-3600000*5},
    {id:'rq_'+uid(), eventId:ev.id, cabezaId:'cb_cami', typeId:'t_cor', name:'Hugo Marreros', dni:'70991122', email:'hugo.m@gmail.com', phone:'51976223344', note:'Cortesía porfa', status:'pending', createdAt:Date.now()-3600000*2},
  ];

  state = {
    events:[ev], cabezas, tickets, requests,
    settings:{ org:'Connect', currency:'PEN', symbol:'S/', activeEventId:ev.id, scanPin:'',
      payInfo:'Yape / Plin: 987 654 321 (Connect) — Enviar constancia al cabeza para confirmar tu entrada.',
      baseUrl: location.href.split('#')[0] }
  };
  DB.save();
}

/* ============================================================
   UI helpers: toast & modal
   ============================================================ */
function toast(msg, kind='', ms=2600){
  const t = h(`<div class="toast ${kind}">${kind==='ok'?ic('check'):kind==='err'?ic('alert'):kind==='warn'?ic('alert'):ic('check')}<span>${esc(msg)}</span></div>`);
  $('#toast-root').appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(20px)'; t.style.transition='.25s'; setTimeout(()=>t.remove(),260); }, ms);
}
let onModalSubmit = null;
function modal({title, sub='', body, footer='', size=''}){
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-bg" onclick="if(event.target===this)closeModal()">
    <div class="modal ${size}">
      <div class="modal-head"><div><h2>${esc(title)}</h2>${sub?`<div class="sub">${esc(sub)}</div>`:''}</div>
      <button class="modal-x" onclick="closeModal()">${ic('x')}</button></div>
      <div class="modal-body">${body}</div>
      ${footer?`<div class="modal-foot">${footer}</div>`:''}
    </div></div>`;
}
function closeModal(){ $('#modal-root').innerHTML=''; onModalSubmit=null; }

/* ---------- QR ---------- */
function qrDataURL(text, cell=5, margin=2){
  try{ const qr = qrcode(0,'M'); qr.addData(String(text)); qr.make(); return qr.createDataURL(cell, margin); }
  catch(e){ return ''; }
}
function ticketPayload(t){ return `CNCT|${t.id}|${t.token}`; }

/* ---------- Descargar / guardar la entrada como imagen (sirve en iPhone y Android) ---------- */
let _viewTicket = null;
function setViewTicket(t){ _viewTicket = t; }
function downloadCurrentTicket(){ if(_viewTicket) downloadTicketImage(_viewTicket); else toast('No se pudo generar la entrada','err'); }
function _roundRect(x,l,t,w,h,r){ x.beginPath(); x.moveTo(l+r,t); x.arcTo(l+w,t,l+w,t+h,r); x.arcTo(l+w,t+h,l,t+h,r); x.arcTo(l,t+h,l,t,r); x.arcTo(l,t,l+w,t,r); x.closePath(); }
function _wrapText(x,text,cx,cy,maxW,lh){ const words=String(text||'').split(' '); let line=''; const lines=[];
  for(const w of words){ const test=line?line+' '+w:w; if(x.measureText(test).width>maxW && line){ lines.push(line); line=w; } else line=test; }
  if(line) lines.push(line); lines.slice(0,2).forEach((ln,i)=>x.fillText(ln,cx,cy+i*lh)); return Math.min(lines.length,2); }
function downloadTicketImage(t){
  try{
    const e=DB.event(t.eventId)||{}; const ty=DB.type(e,t.typeId)||{};
    const sc=2, W=720, H=1160, c=document.createElement('canvas'); c.width=W*sc; c.height=H*sc;
    const x=c.getContext('2d'); x.scale(sc,sc); x.textAlign='center';
    x.fillStyle='#0b0b0c'; x.fillRect(0,0,W,H);
    x.strokeStyle='rgba(255,255,255,.14)'; x.lineWidth=2; _roundRect(x,24,24,W-48,H-48,26); x.stroke();
    x.fillStyle=ty.color||'#ffffff'; _roundRect(x,24,24,W-48,10,6); x.fill();
    x.fillStyle='#ffffff'; x.font='700 30px Georgia, serif'; x.fillText('CONNECT', W/2, 100);
    x.fillStyle='rgba(255,255,255,.5)'; x.font='400 12px Arial'; x.fillText('ENTRADA OFICIAL', W/2, 124);
    x.fillStyle='#ffffff'; x.font='700 30px Georgia, serif'; const n=_wrapText(x, e.name||'Evento', W/2, 172, W-120, 36);
    x.fillStyle='rgba(255,255,255,.65)'; x.font='400 15px Arial';
    let yTop=172+n*36+6; x.fillText([longDate(e.dateISO), e.time].filter(Boolean).join(' · '), W/2, yTop);
    if(e.venue){ yTop+=22; x.fillText(e.venue, W/2, yTop); }
    const qs=360, qx=(W-qs)/2, qy=yTop+40;
    const img=new Image();
    img.onload=()=>{
      x.fillStyle='#ffffff'; _roundRect(x,qx-20,qy-20,qs+40,qs+40,20); x.fill();
      x.drawImage(img,qx,qy,qs,qs);
      let yy=qy+qs+66; x.fillStyle='#ffffff'; x.font='700 24px Georgia, serif'; x.fillText((t.holder&&t.holder.name)||'Entrada', W/2, yy);
      yy+=30; x.fillStyle='rgba(255,255,255,.6)'; x.font='400 15px Arial'; x.fillText(ty.name||'', W/2, yy);
      yy+=44; x.fillStyle='rgba(255,255,255,.07)'; _roundRect(x,W/2-140,yy-30,280,46,10); x.fill();
      x.fillStyle='#ffffff'; x.font='700 22px monospace'; x.fillText(t.code||'', W/2, yy);
      x.fillStyle='rgba(255,255,255,.4)'; x.font='400 12px Arial'; x.fillText('Personal e intransferible · connect-lima.com', W/2, H-46);
      const a=document.createElement('a'); a.href=c.toDataURL('image/png'); a.download='entrada-'+(t.code||'connect')+'.png';
      document.body.appendChild(a); a.click(); a.remove(); toast('Entrada descargada','ok');
    };
    img.onerror=()=>toast('No se pudo generar la imagen','err');
    img.src=qrDataURL(ticketPayload(t),8,1);
  }catch(err){ console.error(err); toast('No se pudo descargar','err'); }
}

/* ============================================================
   SHELL  (sidebar + topbar)
   ============================================================ */
const NAV = [
  {r:'dashboard', label:'Resumen', icon:'dash'},
  {r:'events', label:'Eventos', icon:'events'},
  {r:'tickettypes', label:'Tickets', icon:'tag'},
  {r:'tickets', label:'Entradas', icon:'ticket'},
  {r:'cabezas', label:'Cabezas', icon:'users'},
  {r:'requests', label:'Solicitudes', icon:'inbox'},
  {r:'scanner', label:'Escáner QR', icon:'scan'},
  {r:'attendees', label:'Asistentes', icon:'check2'},
  {r:'reports', label:'Reportes', icon:'chart'},
  {r:'settings', label:'Configuración', icon:'gear'},
];
function mountShell(){
  const reqCount = state.requests.filter(r=>r.status==='pending').length;
  $('#app').innerHTML = `
  <div class="layout">
    <div class="scrim" id="scrim" onclick="toggleSidebar(false)"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-wordmark wm"></div>
      </div>
      <nav class="nav" id="nav">
        ${NAV.map(n=>`<div class="nav-item" data-route="${n.r}" onclick="go('${n.r}')">${ic(n.icon)}<span>${n.label}</span>${n.r==='requests'&&reqCount?`<span class="nav-badge alert">${reqCount}</span>`:''}</div>`).join('')}
      </nav>
      <div class="sidebar-foot">
        <div class="row"><div class="brand-rombo" style="width:26px;height:26px"></div><div class="grow" style="min-width:0"><div class="uname">${esc(state.settings.org)}</div><div class="urole" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ADMIN_EMAIL||'Administrador')}</div></div><button class="btn-icon btn-xs btn-ghost" title="Cerrar sesión" onclick="logout()">${ic('back')}</button></div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="hamburger" onclick="toggleSidebar(true)">${ic('menu')}</button>
        <div><div class="crumb" id="crumb"></div><h1 id="ptitle">Resumen</h1></div>
        <div class="topbar-spacer"></div>
        <div class="event-switch hide-sm" id="evswitch"></div>
      </header>
      <main class="view" id="view"></main>
    </div>
  </div>`;
}
function toggleSidebar(open){ $('#sidebar')?.classList.toggle('open',open); $('#scrim')?.classList.toggle('show',open); }
function renderEvSwitch(active){
  const box = $('#evswitch'); if(!box) return;
  const scoped = ['tickettypes','tickets','cabezas','requests','scanner','attendees','reports'].includes(active);
  if(!scoped || !state.events.length){ box.innerHTML=''; return; }
  const aid = DB.activeEvent()?.id;
  box.innerHTML = `<span class="label" style="margin:0">Evento</span>
    <select onchange="setActiveEvent(this.value)">${state.events.map(e=>`<option value="${e.id}" ${e.id===aid?'selected':''}>${esc(e.name)}</option>`).join('')}</select>`;
}
function setActiveEvent(id){ state.settings.activeEventId=id; DB.save(); render(); }

/* ============================================================
   ROUTER
   ============================================================ */
let currentScanner = null;
function go(route){ location.hash = '#/'+route; }
function stopScanner(){ window.__scanning=false; if(currentScanner){ try{ currentScanner.stop().then(()=>currentScanner.clear()).catch(()=>{});}catch(e){} currentScanner=null; } }

async function render(){
  const hash = location.hash.replace(/^#\/?/, '') || 'home';
  const [route, a, b] = hash.split('/');
  stopScanner();

  // Rutas públicas y de cliente (pantalla completa, sin datos de admin)
  switch(route){
    case 'home':    return renderCustomerHome();
    case 'about':   return renderAbout();
    case 'login':   return renderAuthPage('login');
    case 'registro':return renderAuthPage('register');
    case 'cuenta':  return renderCustomerHub(a);
    case 'claim':   return renderClaim(a, b);
    case 'e':       return renderClaim(a, '');
    case 'canje':   return renderClaim(a, '', {canje:true, code:b||''});
    case 'panel':   return renderCabezaPanel(a, b);
    case 't':       return renderPublicTicket(a);
  }

  // Rutas de admin: requieren sesión de administrador
  if(!state){
    const session = await cloudSession();
    if(!session) return renderAuthPage('login');
    const admin = await cloudIsAdmin();
    if(!admin){ location.hash = '#/cuenta'; return; }
    await loadAdmin();
    return;
  }

  if(!$('.layout')) mountShell();
  // estado activo nav
  $$('.nav-item').forEach(n=>n.classList.toggle('active', n.dataset.route===route));
  toggleSidebar(false);
  const titles = {dashboard:'Resumen',events:'Eventos',tickettypes:'Tickets',tickets:'Entradas',cabezas:'Cabezas',requests:'Solicitudes',scanner:'Escáner QR',attendees:'Asistentes',reports:'Reportes',settings:'Configuración'};
  $('#ptitle').textContent = titles[route]||'Connect';
  $('#crumb').textContent = '';
  renderEvSwitch(route);
  const v = $('#view');
  switch(route){
    case 'dashboard': return viewDashboard(v);
    case 'events': return (a==='new')?viewEventForm(v,null):(a&&b==='edit')?viewEventForm(v,a):a?viewEventDetail(v,a):viewEvents(v);
    case 'tickettypes': return viewTicketTypes(v);
    case 'tickets': return viewTickets(v);
    case 'cabezas': return a?viewCabezaDetail(v,a):viewCabezas(v);
    case 'requests': return viewRequests(v);
    case 'scanner': return viewScanner(v);
    case 'attendees': return viewAttendees(v);
    case 'reports': return viewReports(v);
    case 'settings': return viewSettings(v);
    default: return viewDashboard(v);
  }
}

/* ============================================================
   VIEW: Dashboard
   ============================================================ */
function viewDashboard(v){
  const evs = state.events;
  const allT = state.tickets.filter(t=>t.status!=='void');
  const revenue = allT.filter(t=>t.payment==='paid').reduce((a,t)=>a+(+t.price||0),0);
  const used = allT.filter(t=>t.status==='used').length;
  const courtesy = allT.filter(t=>t.payment==='courtesy'||t.payment==='free').length;
  const reqs = state.requests.filter(r=>r.status==='pending').length;
  const active = DB.activeEvent();
  const kpis = [
    {ic:'events', val:evs.length, label:'Eventos', },
    {ic:'ticket', val:allT.length, label:'Entradas emitidas'},
    {ic:'check2', val:used, label:'Check-ins realizados'},
    {ic:'money', val:money(revenue), label:'Recaudado'},
  ];
  v.innerHTML = `
  <div class="between mb24">
    <div><div class="eyebrow">Panel de control</div><div class="page-title">Hola, ${esc(state.settings.org)}</div><div class="page-sub">Resumen general de tus eventos y entradas.</div></div>
    <button class="btn btn-primary hide-sm" onclick="go('events/new')">${ic('plus')} Crear evento</button>
  </div>
  <div class="grid grid-4 mb24">
    ${kpis.map(k=>`<div class="kpi"><div class="k-ico">${ic(k.ic)}</div><div class="k-val">${k.val}</div><div class="k-label">${k.label}</div></div>`).join('')}
  </div>
  <div class="grid cols-main">
    <div class="card">
      <div class="card-head"><div class="section-title">Próximos eventos</div><button class="btn btn-ghost btn-sm" onclick="go('events')">Ver todos</button></div>
      ${evs.length? evs.map(e=>{const st=DB.stats(e.id);const sd=shortDate(e.dateISO);return `
        <div class="row" style="padding:12px 0;border-bottom:1px solid var(--border-soft);cursor:pointer" onclick="go('events/${e.id}')">
          <div style="width:48px;text-align:center"><div style="font-family:var(--serif);font-size:22px;font-weight:700">${sd.d}</div><div style="font-size:10px;letter-spacing:1px;color:var(--gold-bright)">${sd.m}</div></div>
          <div class="grow"><div style="font-weight:700;font-size:15px">${esc(e.name)}</div><div class="muted" style="font-size:12.5px">${esc(e.venue)} · ${st.total} entradas · ${st.used} ingresos</div></div>
          ${statusBadge(e)}
        </div>`}).join('') : emptyBlock('Aún no tienes eventos','Crea tu primer evento para empezar a emitir entradas.','Crear evento',"go('events/new')")}
    </div>
    <div class="card">
      <div class="section-title mb16">Atajos</div>
      <div class="grid" style="gap:10px">
        ${shortcut('scan','Escanear entradas','Control de acceso','scanner')}
        ${shortcut('ticket','Generar entradas','Cortesías y códigos','tickets')}
        ${shortcut('inbox','Solicitudes'+(reqs?` · ${reqs} nuevas`:''),'Aprobar o rechazar','requests')}
        ${shortcut('chart','Reportes','Ventas y recaudación','reports')}
      </div>
    </div>
  </div>`;
}
function shortcut(icon,t,s,route){ return `<div class="menu-shortcut row" style="cursor:pointer;border:1px solid var(--border);border-radius:12px;padding:14px;gap:14px" onclick="go('${route}')">
  <div class="k-ico" style="margin:0">${ic(icon)}</div><div class="grow"><div style="font-weight:600">${esc(t)}</div><div class="muted" style="font-size:12px">${esc(s)}</div></div><div style="color:var(--gold);transform:rotate(180deg)">${ic('back')}</div></div>`; }
function statusBadge(e){
  if(e.status==='draft') return `<span class="badge badge-gray"><span class="dot"></span>Borrador</span>`;
  if(e.status==='past') return `<span class="badge badge-gray"><span class="dot"></span>Finalizado</span>`;
  return `<span class="badge badge-green"><span class="dot"></span>Publicado</span>`;
}
function emptyBlock(title,desc,btn,action){ return `<div class="empty"><div class="brand-rombo rombo"></div><h3>${esc(title)}</h3><p>${esc(desc)}</p>${btn?`<button class="btn btn-secondary" onclick="${action}">${esc(btn)}</button>`:''}</div>`; }

/* ============================================================
   VIEW: Eventos (lista)
   ============================================================ */
function viewEvents(v){
  v.innerHTML = `
  <div class="between mb24">
    <div><div class="eyebrow">Catálogo</div><div class="page-title">Eventos</div></div>
    <button class="btn btn-primary" onclick="go('events/new')">${ic('plus')} Crear evento</button>
  </div>
  ${state.events.length? `<div class="grid grid-auto">${state.events.map(eventCard).join('')}</div>` : emptyBlock('Aún no tienes eventos','Crea tu primer evento para empezar a emitir entradas con QR.','Crear evento',"go('events/new')")}`;
}
function eventCard(e){
  const st = DB.stats(e.id); const sd = shortDate(e.dateISO);
  return `<div class="ev-card" onclick="go('events/${e.id}')">
    <div class="ev-cover" style="${e.cover?`background-image:url('${e.cover}')`:''}">
      <div class="ev-date"><div class="d">${sd.d}</div><div class="m">${sd.m}</div></div>
      <div class="ev-status">${statusBadge(e)}</div>
      <div class="brand-rombo ev-rombo"></div>
    </div>
    <div class="ev-body">
      <h3>${esc(e.name)}</h3>
      <div class="ev-meta">${ic('pin')}${esc(e.venue||'Sin lugar')}${e.city?', '+esc(e.city):''}</div>
      <div class="ev-meta">${ic('clock')}${longDate(e.dateISO)} · ${esc(e.time||'--:--')}</div>
      <div class="ev-foot">
        <div class="s"><b>${st.total}</b><span>Emitidas</span></div>
        <div class="s"><b>${st.used}</b><span>Ingresos</span></div>
        <div class="s"><b>${money(st.revenue)}</b><span>Recaudado</span></div>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   VIEW: Crear / Editar evento
   ============================================================ */
let formCover = null;
function viewEventForm(v, id){
  const e = id? DB.event(id) : null;
  formCover = e? e.cover : null;
  const t = e? e.types : [];
  window._types = JSON.parse(JSON.stringify(t));
  $('#ptitle').textContent = e?'Editar evento':'Crear evento';
  $('#crumb').textContent = 'Eventos';
  v.innerHTML = `
  <div class="row mb24"><button class="btn btn-ghost btn-sm" onclick="go('events')">${ic('back')} Volver</button></div>
  <div class="grid cols-2" style="align-items:start">
    <div class="card">
      <div class="section-title mb16">Información del evento</div>
      <div class="field"><label class="label">Nombre del evento</label><input id="f-name" placeholder="Ej. Gala 4" value="${esc(e?.name||'')}"></div>
      <div class="field"><label class="label">Descripción</label><textarea id="f-desc" placeholder="Cuéntale a tus invitados de qué trata...">${esc(e?.description||'')}</textarea></div>
      <div class="field-row">
        <div class="field"><label class="label">Fecha</label><input type="date" id="f-date" value="${e?.dateISO||''}"></div>
        <div class="field"><label class="label">Hora</label><input type="time" id="f-time" value="${e?.time||'22:00'}"></div>
      </div>
      <div class="field"><label class="label">Lugar / Venue</label><input id="f-venue" placeholder="Ej. Connect Club" value="${esc(e?.venue||'')}"></div>
      <div class="field-row">
        <div class="field"><label class="label">Dirección</label><input id="f-address" placeholder="Av. ..." value="${esc(e?.address||'')}"></div>
        <div class="field"><label class="label">Ciudad</label><input id="f-city" placeholder="Lima" value="${esc(e?.city||'Lima')}"></div>
      </div>
      <div class="field"><label class="label">Estado</label>
        <select id="f-status">
          <option value="published" ${e?.status!=='draft'&&e?.status!=='past'?'selected':''}>Publicado</option>
          <option value="draft" ${e?.status==='draft'?'selected':''}>Borrador</option>
          <option value="past" ${e?.status==='past'?'selected':''}>Finalizado</option>
        </select></div>
    </div>
    <div>
      <div class="card mb16">
        <label class="label">Imagen / Flyer</label>
        <div class="uploader ${formCover?'has-img':''}" id="cover-up" onclick="$('#cover-file').click()">
          ${formCover?`<img src="${formCover}"><div class="ov">Cambiar imagen</div>`:`<div>${ic('plus')}<div class="mt8 muted">Subir flyer del evento</div><div class="hint dim">JPG o PNG · se optimiza automáticamente</div></div>`}
        </div>
        <input type="file" id="cover-file" accept="image/*" class="hidden" onchange="onCover(event)">
      </div>
      <div class="card">
        <div class="between mb16"><div class="section-title">Tipos de entrada</div><button class="btn btn-secondary btn-sm" onclick="addType()">${ic('plus')} Añadir</button></div>
        <div id="types-list"></div>
      </div>
    </div>
  </div>
  <div class="row mt24" style="justify-content:flex-end;gap:10px">
    <button class="btn btn-ghost" onclick="go('events')">Cancelar</button>
    <button class="btn btn-primary" onclick="saveEvent('${e?.id||''}')">${ic('check')} ${e?'Guardar cambios':'Crear evento'}</button>
  </div>`;
  renderTypes();
}
function renderTypes(){
  const box = $('#types-list'); if(!box) return;
  box.innerHTML = window._types.map((t,i)=>`
    <div class="card pad-sm mb12" style="background:var(--surface-2)">
      <div class="between mb12">
        <div class="row gap8"><span style="width:10px;height:10px;border-radius:3px;background:${t.color}"></span><b>${esc(t.name)||'Tipo '+(i+1)}</b></div>
        <button class="btn-icon btn-xs btn-ghost" onclick="rmType(${i})">${ic('trash')}</button>
      </div>
      <div class="field-row mb8">
        <div><label class="label">Nombre</label><input value="${esc(t.name)}" oninput="upType(${i},'name',this.value)"></div>
        <div><label class="label">Tipo</label><select onchange="upType(${i},'kind',this.value)"><option value="general" ${t.kind==='general'?'selected':''}>Individual</option><option value="box" ${t.kind==='box'?'selected':''}>Box / Mesa</option></select></div>
      </div>
      <div class="field-row three">
        <div><label class="label">Acceso</label><select onchange="upType(${i},'access',this.value)"><option value="paid" ${t.access==='paid'?'selected':''}>Pagada</option><option value="courtesy" ${t.access==='courtesy'?'selected':''}>Cortesía</option><option value="free" ${t.access==='free'?'selected':''}>Free</option></select></div>
        <div><label class="label">Precio (${DB.s().symbol})</label><input type="number" min="0" value="${t.price}" ${t.access!=='paid'?'disabled':''} oninput="upType(${i},'price',this.value)"></div>
        <div><label class="label">Cupos</label><input type="number" min="1" value="${t.capacity}" oninput="upType(${i},'capacity',this.value)"></div>
      </div>
    </div>`).join('') || `<div class="muted" style="font-size:13px">Puedes añadir tickets aquí, o crearlos después en la sección <b>Tickets</b>.</div>`;
}
function addType(){ window._types.push({id:uid(),name:'',kind:'general',access:'paid',price:0,capacity:100,color:['#FFFFFF','#C0C0C0','#9E9E9E','#7E7E7E','#B5B5B5','#6A6A6A'][window._types.length%6],includes:[],desc:''}); renderTypes(); }
function rmType(i){ window._types.splice(i,1); renderTypes(); }
function upType(i,k,val){ window._types[i][k] = (k==='price'||k==='capacity')? Number(val) : val; if(k==='access'&&val!=='paid'){window._types[i].price=0;} if(k==='access') renderTypes(); }
function onCover(ev){
  const file = ev.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    const img = new Image();
    img.onload = ()=>{
      const max=1000, sc=Math.min(1,max/img.width); const c=document.createElement('canvas');
      c.width=img.width*sc; c.height=img.height*sc; c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      formCover = c.toDataURL('image/jpeg',0.82);
      const up=$('#cover-up'); up.classList.add('has-img'); up.innerHTML=`<img src="${formCover}"><div class="ov">Cambiar imagen</div>`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function saveEvent(id){
  const name = $('#f-name').value.trim();
  if(!name) return toast('Ponle un nombre al evento','err');
  const data = {
    name, description:$('#f-desc').value.trim(), dateISO:$('#f-date').value, time:$('#f-time').value,
    venue:$('#f-venue').value.trim(), address:$('#f-address').value.trim(), city:$('#f-city').value.trim(),
    status:$('#f-status').value, cover:formCover,
    types: window._types.map(t=>({...t, name:t.name.trim()||'Entrada', price:Number(t.price)||0, capacity:Number(t.capacity)||100}))
  };
  if(id){ Object.assign(DB.event(id), data); toast('Evento actualizado','ok'); }
  else { const ev={id:'ev_'+uid(), createdAt:Date.now(), ...data}; state.events.unshift(ev); state.settings.activeEventId=ev.id; toast('Evento creado','ok'); id=ev.id; }
  DB.save(); go('events/'+id);
}

/* ============================================================
   VIEW: Detalle de evento (tabs)
   ============================================================ */
let evTab = 'resumen';
function viewEventDetail(v, id, tab){
  const e = DB.event(id); if(!e) return go('events');
  state.settings.activeEventId = id;
  evTab = tab||evTab||'resumen';
  $('#ptitle').textContent = e.name; $('#crumb').textContent='Eventos';
  const st = DB.stats(id); const sd=shortDate(e.dateISO);
  v.innerHTML = `
  <div class="row mb16 between">
    <button class="btn btn-ghost btn-sm" onclick="go('events')">${ic('back')} Eventos</button>
    <div class="row gap8">
      <button class="btn btn-ghost btn-sm" onclick="go('events/${id}/edit')">${ic('edit')} Editar</button>
      <button class="btn btn-secondary btn-sm" onclick="openGenerate('${id}')">${ic('plus')} Generar entradas</button>
    </div>
  </div>
  <div class="card mb24" style="padding:0;overflow:hidden">
    <div class="ev-cover" style="height:170px;${e.cover?`background-image:url('${e.cover}')`:''}">
      <div class="ev-date"><div class="d">${sd.d}</div><div class="m">${sd.m}</div></div>
      <div class="ev-status">${statusBadge(e)}</div>
    </div>
    <div style="padding:18px 22px">
      <div class="between"><div><div class="page-title">${esc(e.name)}</div>
      <div class="ev-meta mt8">${ic('clock')}${longDate(e.dateISO)} · ${esc(e.time)}</div>
      <div class="ev-meta">${ic('pin')}${esc(e.venue)}${e.address?' — '+esc(e.address):''}${e.city?', '+esc(e.city):''}</div></div></div>
      ${e.description?`<p class="muted mt12" style="max-width:680px;font-size:13.5px;line-height:1.6">${esc(e.description)}</p>`:''}
    </div>
  </div>
  <div class="tabs">
    ${['Resumen','Entradas','Boxes','Cabezas','Asistentes'].map((t,i)=>{const k=['resumen','entradas','boxes','cabezas','asistentes'][i];return `<div class="tab ${evTab===k?'active':''}" onclick="setEvTab('${id}','${k}')">${t}</div>`}).join('')}
  </div>
  <div id="ev-tabc"></div>`;
  renderEvTab(e, st);
}
function setEvTab(id,k){ evTab=k; const e=DB.event(id); renderEvTab(e, DB.stats(id)); $$('.tab').forEach(t=>t.classList.toggle('active', t.textContent.toLowerCase()===({resumen:'resumen',entradas:'entradas',boxes:'boxes',cabezas:'cabezas',asistentes:'asistentes'}[k]))); }
function renderEvTab(e, st){
  const c = $('#ev-tabc'); if(!c) return;
  if(evTab==='resumen'){
    c.innerHTML = `
    <div class="grid grid-4 mb24">
      <div class="kpi"><div class="k-ico">${ic('ticket')}</div><div class="k-val">${st.total}</div><div class="k-label">Entradas emitidas</div></div>
      <div class="kpi"><div class="k-ico">${ic('check2')}</div><div class="k-val">${st.used}<span style="font-size:14px;color:var(--text-muted)"> / ${st.valid}</span></div><div class="k-label">Ingresos (${st.checkinRate}%)</div></div>
      <div class="kpi"><div class="k-ico">${ic('money')}</div><div class="k-val">${money(st.revenue)}</div><div class="k-label">Recaudado</div></div>
      <div class="kpi"><div class="k-ico">${ic('star')}</div><div class="k-val">${st.courtesy}</div><div class="k-label">Cortesías / Free</div></div>
    </div>
    <div class="grid cols-2">
      <div class="card"><div class="section-title mb16">Entradas por tipo</div>${typeBars(e)}</div>
      <div class="card"><div class="section-title mb16">Links públicos</div>
        <label class="label">Página del evento</label>
        ${linkBox(claimUrl(e.id,''))}
        <label class="label mt16">Link de canje (reclamar con código)</label>
        ${linkBox(canjeUrl(e.id))}
        <p class="muted mt12" style="font-size:12.5px">Reparte este <b>único</b> link. Cada persona pone su código y recibe su QR — el código ya identifica a su cabeza, no necesitas un link por cabeza.</p>
        ${st.pending>0?`<div class="badge badge-amber mt16"><span class="dot"></span>${money(st.pending)} en pagos pendientes</div>`:''}
      </div>
    </div>`;
  } else if(evTab==='entradas'){
    c.innerHTML = ticketsTable(DB.ticketsFor(e.id).filter(t=>DB.type(e,t.typeId)?.kind!=='box'), e);
  } else if(evTab==='boxes'){
    c.innerHTML = boxesView(e);
  } else if(evTab==='cabezas'){
    c.innerHTML = cabezasGrid(e);
  } else if(evTab==='asistentes'){
    c.innerHTML = attendeesTable(e.id);
  }
}
function typeBars(e){
  const ts=DB.ticketsFor(e.id).filter(t=>t.status!=='void');
  const max=Math.max(1,...e.types.map(ty=>ts.filter(t=>t.typeId===ty.id).length));
  return e.types.map(ty=>{const n=ts.filter(t=>t.typeId===ty.id).length;return `<div class="bar-row"><div class="b-label">${esc(ty.name)}</div><div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%;background:linear-gradient(90deg,${ty.color},${ty.color})"></div></div><div class="b-val">${n} / ${ty.capacity}</div></div>`}).join('');
}

/* ============================================================
   VIEW: Entradas (global, evento activo)
   ============================================================ */
const ui = { tq:'', tfilter:'all', aq:'' };
function viewTickets(v){
  const e = DB.activeEvent();
  if(!e) return v.innerHTML = emptyBlock('Sin eventos','Crea un evento para gestionar entradas.','Crear evento',"go('events/new')");
  v.innerHTML = `
  <div class="between mb24">
    <div><div class="eyebrow">${esc(e.name)}</div><div class="page-title">Entradas</div></div>
    <div class="row gap8"><button class="btn btn-ghost" onclick="exportTickets('${e.id}')">${ic('download')} Excel</button><button class="btn btn-secondary" onclick="go('cabezas')">${ic('users')} Generar por cabeza</button></div>
  </div>
  <div id="tickets-host"></div>`;
  $('#tickets-host').innerHTML = ticketsTable(DB.ticketsFor(e.id), e);
}
function ticketsTable(list, e){
  const counts = { all:list.length, valid:list.filter(t=>t.status==='valid').length, used:list.filter(t=>t.status==='used').length, unclaimed:list.filter(t=>t.status==='unclaimed').length };
  const filtered = list.filter(t=>{
    if(ui.tfilter!=='all' && t.status!==ui.tfilter) return false;
    if(ui.tq){ const q=ui.tq.toLowerCase(); return (t.holder.name||'').toLowerCase().includes(q)||(t.code||'').toLowerCase().includes(q)||(t.holder.dni||'').includes(q); }
    return true;
  });
  const sorted = filtered.slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const isMobile = matchMedia('(max-width:680px)').matches;
  return `
  <div class="toolbar">
    <div class="search">${ic('search')}<input placeholder="Buscar por nombre, código o DNI..." value="${esc(ui.tq)}" oninput="ui.tq=this.value;refreshTickets('${e.id}')"></div>
    <div class="seg">
      ${[['all','Todas'],['valid','Activas'],['used','Ingresó'],['unclaimed','Sin reclamar']].map(([k,l])=>`<button class="${ui.tfilter===k?'active':''}" onclick="ui.tfilter='${k}';refreshTickets('${e.id}')">${l} ${counts[k]?`(${counts[k]})`:''}</button>`).join('')}
    </div>
  </div>
  ${filtered.length? (isMobile
    ? `<div class="tk-cards">${sorted.map(t=>ticketCard(t,e)).join('')}</div>`
    : `<div class="table-wrap"><table>
    <thead><tr><th>Asistente</th><th>Tipo</th><th>Código</th><th>Cabeza</th><th>Pago</th><th>Estado</th><th></th></tr></thead>
    <tbody>${sorted.map(t=>ticketRow(t,e)).join('')}</tbody>
  </table></div>`) : `<div class="empty"><div class="brand-rombo rombo"></div><h3>Sin entradas</h3><p>No hay entradas que coincidan con el filtro.</p></div>`}`;
}
function ticketRow(t,e){
  const ty=DB.type(e,t.typeId); const cb=DB.cabeza(t.cabezaId);
  return `<tr>
    <td>${t.holder.name?`<div class="who">${esc(t.holder.name)}</div><div class="sub">${esc(t.holder.dni||'')}</div>`:'<span class="muted">— sin reclamar —</span>'}</td>
    <td><span class="badge" style="background:${ty?ty.color+'22':'#333'};color:${ty?ty.color:'#999'};border-color:${ty?ty.color+'55':'#444'}">${esc(ty?.name||'?')}</span></td>
    <td><span class="code-chip" onclick="copyText('${t.code}')">${esc(t.code)}</span></td>
    <td>${cb?esc(cb.name):'<span class="dim">—</span>'}</td>
    <td>${payBadge(t)}</td>
    <td>${statusTicket(t)}</td>
    <td><div class="t-actions"><button class="btn-icon btn-xs btn-ghost" title="Ver QR" onclick="showTicketModal('${t.id}')">${ic('eye')}</button><button class="btn-icon btn-xs btn-ghost" title="Anular" onclick="voidTicket('${t.id}')">${ic('trash')}</button></div></td>
  </tr>`;
}
function ticketCard(t,e){
  const ty=DB.type(e,t.typeId); const cb=DB.cabeza(t.cabezaId); const named=!!t.holder.name;
  return `<div class="tk-card">
    <div class="tk-card-top">
      <div class="tk-name ${named?'':'muted'}">${named?esc(t.holder.name):'Sin reclamar'}</div>
      ${statusTicket(t)}
    </div>
    <div class="tk-sub">${named&&t.holder.dni?'DNI '+esc(t.holder.dni):'—'}</div>
    <div class="tk-chips">
      <span class="badge" style="background:${ty?ty.color+'22':'#333'};color:${ty?ty.color:'#999'};border-color:${ty?ty.color+'55':'#444'}">${esc(ty?.name||'?')}</span>
      <span class="code-chip" onclick="copyText('${t.code}')">${esc(t.code)}</span>
      ${payBadge(t)}
    </div>
    <div class="tk-cabeza">${cb?('Cabeza · '+esc(cb.name)):'<span class="dim">Sin cabeza</span>'}</div>
    <div class="tk-actions">
      <button class="btn btn-ghost btn-sm grow" onclick="showTicketModal('${t.id}')">${ic('eye')} Ver QR</button>
      <button class="btn-icon btn-ghost" title="Anular" onclick="voidTicket('${t.id}')">${ic('trash')}</button>
    </div>
  </div>`;
}
function statusTicket(t){
  if(t.status==='used') return `<span class="badge badge-blue"><span class="dot"></span>Ingresó</span>`;
  if(t.status==='unclaimed') return `<span class="badge badge-amber"><span class="dot"></span>Sin reclamar</span>`;
  if(t.status==='void') return `<span class="badge badge-red"><span class="dot"></span>Anulada</span>`;
  return `<span class="badge badge-green"><span class="dot"></span>Activa</span>`;
}
function payBadge(t){
  if(t.payment==='paid') return `<span class="badge badge-green">Pagado</span>`;
  if(t.payment==='pending') return `<span class="badge badge-amber">Pendiente</span>`;
  if(t.payment==='courtesy') return `<span class="badge badge-gold">Cortesía</span>`;
  return `<span class="badge badge-gray">Free</span>`;
}
function refreshTickets(eid){ const host=$('#tickets-host'); if(host) host.innerHTML=ticketsTable(DB.ticketsFor(eid),DB.event(eid)); }
function voidTicket(id){ const t=state.tickets.find(x=>x.id===id); if(!t)return; confirmModal('Anular entrada','La entrada quedará invalidada y no permitirá el ingreso. ¿Continuar?',()=>{ t.status='void'; DB.save(); render(); toast('Entrada anulada','warn'); }); }

/* ---------- Generar entradas (modal) ---------- */
let genCtx = { eid:null, cabezaId:null };
function pickCabeza(eid){
  if(!state.cabezas.length){
    return modal({ title:'Aún no tienes cabezas', size:'narrow', body:`<p class="muted" style="font-size:14px;line-height:1.6">Las entradas se generan desde el perfil de cada cabeza o promotor. Crea uno para empezar.</p>`, footer:`<button class="btn btn-ghost" onclick="closeModal()">Cerrar</button><button class="btn btn-primary" onclick="closeModal();openCabezaForm()">${ic('plus')} Nuevo cabeza</button>` });
  }
  modal({ title:'¿Para qué cabeza?', sub:'Elige el cabeza o promotor — las entradas se generarán a su nombre.', body:`
    <div class="grid" style="gap:10px">${state.cabezas.map(c=>`<div class="row gap12" style="cursor:pointer;border:1px solid var(--border);border-radius:12px;padding:12px;transition:border-color .15s" onmouseover="this.style.borderColor='var(--gold-line)'" onmouseout="this.style.borderColor='var(--border)'" onclick="closeModal();openGenerate('${eid}','${c.id}')"><span class="avatar">${initials(c.name)}</span><div class="grow"><div style="font-weight:700">${esc(c.name)}</div><div class="muted" style="font-size:12px">Prefijo ${c.prefix}</div></div><span style="color:var(--text-dim);transform:rotate(180deg)">${ic('back')}</span></div>`).join('')}</div>
  `, footer:`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>` });
}
function openGenerate(eid, cabezaId){
  const e=DB.event(eid); if(!e) return toast('Selecciona un evento','err');
  if(!cabezaId) return pickCabeza(eid);
  const cb=DB.cabeza(cabezaId); if(!cb) return pickCabeza(eid);
  const avail=e.types.filter(t=>t.active!==false);
  if(!avail.length) return toast('No hay tickets activos en este evento. Créalos en la sección Tickets.','err');
  genCtx={eid, cabezaId};
  modal({ title:'Generar entradas', sub:`${cb.name} · ${e.name}`, size:'wide', body:`
    <div class="card pad-sm mb16" style="background:var(--surface-2);display:flex;align-items:center;gap:12px;border:1px solid var(--border)">
      <span class="avatar">${initials(cb.name)}</span>
      <div class="grow"><div style="font-weight:700">${esc(cb.name)}</div><div class="muted" style="font-size:12px">Prefijo ${cb.prefix} · las entradas se generan a su nombre</div></div>
      <span class="badge badge-gray">${ic('users')} Cabeza</span>
    </div>
    <div class="field"><label class="label">Tipo de entrada</label>
      <select id="g-type">${avail.map(t=>{const rem=typeRemaining(e,t);return `<option value="${t.id}" ${rem<1?'disabled':''}>${esc(t.name)} · ${t.access==='paid'?money(t.price):ACCESS_LABEL[t.access]||t.access} · quedan ${rem}</option>`}).join('')}</select></div>
    <div class="field"><label class="label">Modo</label>
      <select id="g-mode">
        <option value="codes">Códigos para reclamar (el cabeza los reparte)</option>
        <option value="direct">Entrada directa con datos (QR listo)</option>
      </select></div>
    <div id="g-codes-wrap"><div class="field"><label class="label">Cantidad</label><input type="number" id="g-qty" min="1" max="500" value="10"></div></div>
    <div id="g-direct" class="hidden">
      <div class="field-row"><div class="field"><label class="label">Nombre</label><input id="g-name"></div><div class="field"><label class="label">DNI</label><input id="g-dni"></div></div>
      <div class="field-row"><div class="field"><label class="label">Email</label><input id="g-email"></div><div class="field"><label class="label">Celular</label><input id="g-phone"></div></div>
    </div>
  `, footer:`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="doGenerate()">${ic('check')} Generar</button>` });
  $('#g-mode').addEventListener('change', e2=>{ const dir=e2.target.value==='direct'; $('#g-codes-wrap').classList.toggle('hidden', dir); $('#g-direct').classList.toggle('hidden', !dir); });
}
function doGenerate(){
  const eid=genCtx.eid, cabezaId=genCtx.cabezaId;
  const e=DB.event(eid); const typeId=$('#g-type').value;
  const ty=DB.type(e,typeId); const cb=DB.cabeza(cabezaId);
  if(!ty) return toast('Elige un tipo de entrada','err');
  if(ty.active===false) return toast('Este ticket está inactivo','err');
  const remaining=typeRemaining(e,ty);
  const mode=$('#g-mode').value;
  if(mode==='direct' && remaining<1) return toast(`"${ty.name}" está agotado. Aumenta los cupos en Tickets.`,'err');
  const pay = ty.access==='paid'?'paid':ty.access==='courtesy'?'courtesy':'free';
  const prefix = cb?cb.prefix:'CN';
  if(mode==='direct'){
    const name=$('#g-name').value.trim();
    if(!name) return toast('Ingresa el nombre','err');
    const t={ id:'tk_'+uid(), code:newCode(prefix), token:token(), eventId:eid, typeId, cabezaId:cabezaId||null,
      holder:{name, dni:$('#g-dni').value.trim(), email:$('#g-email').value.trim(), phone:$('#g-phone').value.trim()},
      status:'valid', payment:pay, price: pay==='paid'?ty.price:0, source:'admin', createdAt:Date.now(), claimedAt:Date.now(), usedAt:null };
    state.tickets.push(t); DB.save(); closeModal(); showTicketModal(t.id); toast('Entrada generada','ok'); return;
  }
  const qty = clamp(parseInt($('#g-qty').value)||1,1,500);
  if(qty>remaining) return toast(`Solo quedan ${remaining} cupos de "${ty.name}". Ajusta la cantidad o aumenta los cupos en Tickets.`,'err');
  const made=[];
  for(let i=0;i<qty;i++){ const t={ id:'tk_'+uid(), code:newCode(prefix), token:token(), eventId:eid, typeId, cabezaId:cabezaId||null, holder:{name:'',dni:'',email:'',phone:''}, status:'unclaimed', payment:pay, price: pay==='paid'?ty.price:0, source:'admin', createdAt:Date.now(), claimedAt:null, usedAt:null }; state.tickets.push(t); made.push(t); }
  DB.save(); closeModal(); render();
  toast(`${qty} códigos generados`,'ok');
  // Ofrecer exportación inmediata
  setTimeout(()=>codesModal(made, e, cb), 200);
}
function codesModal(list, e, cb){
  modal({ title:'Códigos generados', sub:`${list.length} códigos · ${e.name}${cb?' · '+cb.name:''}`, body:`
    <p class="muted mb16" style="font-size:13px">Comparte estos códigos${cb?' con '+esc(cb.name):''}. Cada persona abre su <b>link de canje</b>, ingresa sus datos y recibe su QR al instante.</p>
    <div class="table-wrap" style="max-height:300px;overflow:auto"><table><thead><tr><th>#</th><th>Código</th><th>Link de canje (abre con el código puesto)</th></tr></thead>
    <tbody>${list.map((t,i)=>`<tr><td>${i+1}</td><td><span class="code-chip">${t.code}</span></td><td class="sub">${canjeUrl(e.id, t.code)}</td></tr>`).join('')}</tbody></table></div>
  `, footer:`<button class="btn btn-ghost" onclick="closeModal()">Cerrar</button><button class="btn btn-secondary" onclick="copyText('${canjeUrl(e.id)}')">${ic('link')} Link de canje</button><button class="btn btn-primary" onclick="exportCodes('${e.id}',[${list.map(t=>`'${t.id}'`).join(',')}])">${ic('download')} Exportar Excel</button>` });
}
function exportCodes(eid, ids){
  const e=DB.event(eid);
  const rows=[['Codigo','Evento','Tipo','Cabeza','Link de canje']];
  ids.forEach(id=>{const t=state.tickets.find(x=>x.id===id);if(!t)return;const cb=DB.cabeza(t.cabezaId);rows.push([t.code,e.name,DB.type(e,t.typeId)?.name||'',cb?cb.name:'',canjeUrl(eid,t.code)]);});
  download(`codigos_${e.name.replace(/\s+/g,'_')}.csv`, rows.map(r=>r.map(csv).join(',')).join('\n'), 'text/csv');
  toast('Exportado','ok');
}
function exportTickets(eid){
  const e=DB.event(eid); const rows=[['Nombre','DNI','Email','Celular','Tipo','Codigo','Cabeza','Pago','Estado','Ingreso']];
  DB.ticketsFor(eid).forEach(t=>{const cb=DB.cabeza(t.cabezaId);rows.push([t.holder.name,t.holder.dni,t.holder.email,t.holder.phone,DB.type(e,t.typeId)?.name||'',t.code,cb?cb.name:'',t.payment,t.status,t.usedAt?timeStr(t.usedAt):'']);});
  download(`entradas_${e.name.replace(/\s+/g,'_')}.csv`, rows.map(r=>r.map(csv).join(',')).join('\n'),'text/csv');
  toast('Entradas exportadas','ok');
}
const csv = s => `"${String(s==null?'':s).replace(/"/g,'""')}"`;

/* ---------- Ver ticket (QR) ---------- */
function ticketCardHTML(t){
  const e=DB.event(t.eventId); const ty=DB.type(e,t.typeId); const cb=DB.cabeza(t.cabezaId);
  return `<div class="ticket" id="ticket-print">
    <div class="ticket-accent" style="background:${ty?.color||'#fff'}"></div>
    <div class="ticket-top"><div class="brand-rombo rombo"></div><div class="ev">${esc(e.name)}</div><div class="meta">${longDate(e.dateISO)} · ${esc(e.time)}<br>${esc(e.venue)}</div></div>
    <div class="ticket-qr"><img src="${qrDataURL(ticketPayload(t),6,2)}" alt="QR"></div>
    <div class="ticket-info">
      <div class="it"><div class="l">Asistente</div><div class="v">${esc(t.holder.name||'—')}</div></div>
      <div class="it"><div class="l">Tipo</div><div class="v"><span class="tt-dot" style="background:${ty?.color||'#fff'}"></span>${esc(ty?.name||'')}</div></div>
      <div class="it"><div class="l">${cb?'Cabeza':'DNI'}</div><div class="v">${esc(cb?cb.name:(t.holder.dni||'—'))}</div></div>
      <div class="it"><div class="l">Estado</div><div class="v">${t.status==='used'?'Ya ingresó':t.status==='void'?'Anulada':'Válida'}</div></div>
    </div>
    <div class="ticket-code"><div class="c">${esc(t.code)}</div></div>
  </div>`;
}
function showTicketModal(id){
  const t=state.tickets.find(x=>x.id===id); if(!t) return;
  setViewTicket(t);
  modal({ title:'Entrada', sub:'QR personal e intransferible', size:'narrow', body:ticketCardHTML(t),
    footer:`<button class="btn btn-ghost" onclick="closeModal()">Cerrar</button>
      <button class="btn btn-secondary" onclick="downloadCurrentTicket()">${ic('download')} Descargar</button>
      <button class="btn btn-primary" onclick="window.open('#/t/${t.id}','_blank')">${ic('eye')} Abrir entrada</button>` });
}

/* ============================================================
   VIEW: Cabezas
   ============================================================ */
function cabezasGrid(e){
  return `<div class="grid grid-auto">${state.cabezas.map(c=>{
    const ts=DB.ticketsFor(e.id).filter(t=>t.cabezaId===c.id&&t.status!=='void');
    const rev=ts.filter(t=>t.payment==='paid').reduce((a,t)=>a+(+t.price||0),0);
    return `<div class="card"><div class="row between mb12"><div class="row gap10"><div class="avatar">${initials(c.name)}</div><div><div style="font-weight:700">${esc(c.name)}</div><div class="muted" style="font-size:12px">Prefijo ${c.prefix}</div></div></div></div>
    <div class="row" style="gap:18px"><div><div style="font-family:var(--serif);font-size:20px">${ts.length}</div><div class="dim" style="font-size:11px">Entradas</div></div><div><div style="font-family:var(--serif);font-size:20px">${money(rev)}</div><div class="dim" style="font-size:11px">Vendido</div></div></div>
    <div class="divider"></div>
    <div class="grid mt12" style="grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn btn-secondary btn-sm" onclick="window.open('#/panel/${e.id}/${c.id}','_blank')">${ic('ticket')} Sus entradas</button>
      <button class="btn btn-primary btn-sm" onclick="openGenerate('${e.id}','${c.id}')">${ic('plus')} Generar</button>
      <button class="btn btn-ghost btn-sm" onclick="waLink('${c.id}','${e.id}')">${ic('whats')} Enviar link</button>
      <button class="btn btn-ghost btn-sm" onclick="go('cabezas/${c.id}')">Ver perfil</button>
    </div></div>`;
  }).join('')}</div>`;
}
function viewCabezas(v){
  const e=DB.activeEvent();
  v.innerHTML = `<div class="between mb24"><div><div class="eyebrow">Equipo de ventas</div><div class="page-title">Cabezas</div><div class="page-sub">Cada cabeza tiene su propio perfil y link. Entra a su perfil para generar entradas a su nombre${e?' en '+esc(e.name):''}.</div></div>
    <button class="btn btn-primary" onclick="openCabezaForm()">${ic('plus')} Nuevo cabeza</button></div>
    ${!state.cabezas.length? emptyBlock('Sin cabezas','Crea tus vendedores o promotores. Desde el perfil de cada uno generas y administras sus entradas.','Nuevo cabeza','openCabezaForm()') : e? cabezasGrid(e) : '<div class="muted">Crea un evento primero.</div>'}`;
}
function openCabezaForm(id){
  const c=id?DB.cabeza(id):null;
  modal({ title:c?'Editar cabeza':'Nuevo cabeza', size:'narrow', body:`
    <div class="field"><label class="label">Nombre completo</label><input id="cb-name" value="${esc(c?.name||'')}" placeholder="Ej. Renzo Salas"></div>
    <div class="field-row"><div class="field"><label class="label">Prefijo</label><input id="cb-prefix" maxlength="4" value="${esc(c?.prefix||'')}" placeholder="RNZ" style="text-transform:uppercase"></div>
    <div class="field"><label class="label">Celular (WhatsApp)</label><input id="cb-phone" value="${esc(c?.phone||'')}" placeholder="51987654321"></div></div>
    <div class="field"><label class="label">Email</label><input id="cb-email" value="${esc(c?.email||'')}" placeholder="correo@connect.pe"></div>
  `, footer:`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveCabeza('${id||''}')">${ic('check')} Guardar</button>` });
}
function saveCabeza(id){
  const name=$('#cb-name').value.trim(); let prefix=$('#cb-prefix').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!name) return toast('Ingresa el nombre','err'); if(!prefix) prefix=name.slice(0,3).toUpperCase();
  const data={name,prefix,phone:$('#cb-phone').value.trim(),email:$('#cb-email').value.trim()};
  if(id){ Object.assign(DB.cabeza(id),data); toast('Cabeza actualizado','ok'); }
  else { state.cabezas.push({id:'cb_'+uid(),createdAt:Date.now(),...data}); toast('Cabeza creado','ok'); }
  DB.save(); closeModal(); render();
}
function viewCabezaDetail(v,id){
  const c=DB.cabeza(id); if(!c) return go('cabezas');
  const e=DB.activeEvent();
  $('#ptitle').textContent=c.name; $('#crumb').textContent='Cabezas';
  const ts=e?DB.ticketsFor(e.id).filter(t=>t.cabezaId===id):[];
  const rev=ts.filter(t=>t.payment==='paid'&&t.status!=='void').reduce((a,t)=>a+(+t.price||0),0);
  v.innerHTML=`<div class="row mb16 between"><button class="btn btn-ghost btn-sm" onclick="go('cabezas')">${ic('back')} Cabezas</button>
    <div class="row gap8"><button class="btn btn-ghost btn-sm" onclick="openCabezaForm('${id}')">${ic('edit')} Editar</button><button class="btn btn-primary btn-sm" onclick="openGenerate('${e?.id}','${id}')">${ic('plus')} Generar entradas</button></div></div>
  <div class="grid grid-4 mb24">
    <div class="kpi"><div class="k-ico">${ic('ticket')}</div><div class="k-val">${ts.filter(t=>t.status!=='void').length}</div><div class="k-label">Entradas (${e?esc(e.name):'—'})</div></div>
    <div class="kpi"><div class="k-ico">${ic('check2')}</div><div class="k-val">${ts.filter(t=>t.status==='used').length}</div><div class="k-label">Ingresaron</div></div>
    <div class="kpi"><div class="k-ico">${ic('money')}</div><div class="k-val">${money(rev)}</div><div class="k-label">Vendido</div></div>
    <div class="kpi"><div class="k-ico">${ic('star')}</div><div class="k-val">${c.prefix}</div><div class="k-label">Prefijo</div></div>
  </div>
  <div class="grid cols-2 mb24" style="align-items:start">
    <div class="card"><div class="section-title mb8">Link de canje ${e?'· '+esc(e.name):''}</div><p class="muted mb16" style="font-size:13px">Reparte este único link junto con los códigos que le generas a ${esc(c.name)}. El código ya identifica que la venta es suya — no necesita un link propio.</p>${e?linkBox(canjeUrl(e.id)):'<div class="muted">Selecciona un evento.</div>'}
    <div class="row gap8 mt12"><button class="btn btn-secondary btn-sm" onclick="waLink('${id}','${e?.id}')">${ic('whats')} Enviar por WhatsApp</button></div>
    ${e?`<details style="margin-top:14px"><summary class="muted" style="font-size:12.5px;cursor:pointer">Link personalizado (opcional)</summary><p class="dim" style="font-size:12px;margin:8px 0 10px">Muestra "Te invita ${esc(c.name)}". Úsalo solo para invitar a alguien que todavía no tiene código; para los códigos no hace falta.</p>${linkBox(claimUrl(e.id,id))}</details>`:''}</div>
    <div class="card"><div class="section-title mb8">Su página de entradas</div><p class="muted mb16" style="font-size:13px">Solo las entradas de ${esc(c.name)}: códigos, reclamadas y quién ya ingresó. Envíasela para que controle sus ventas sin entrar al panel de administrador.</p>${e?linkBox(panelUrl(e.id,id)):'<div class="muted">Selecciona un evento.</div>'}
    <div class="row gap8 mt12"><button class="btn btn-secondary btn-sm" onclick="window.open('#/panel/${e?.id}/${id}','_blank')">${ic('eye')} Abrir página</button><button class="btn btn-ghost btn-sm" onclick="waPanelLink('${id}','${e?.id}')">${ic('whats')} Enviar por WhatsApp</button></div></div>
  </div>
  <div class="card"><div class="section-title mb16">Entradas de ${esc(c.name)}</div>${ts.length?`<div class="table-wrap"><table><thead><tr><th>Asistente</th><th>Tipo</th><th>Código</th><th>Estado</th></tr></thead><tbody>${ts.map(t=>`<tr><td>${t.holder.name?esc(t.holder.name):'<span class="muted">sin reclamar</span>'}</td><td>${esc(DB.type(e,t.typeId)?.name||'')}</td><td><span class="code-chip">${t.code}</span></td><td>${statusTicket(t)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="muted" style="font-size:13px">Aún no tiene entradas en este evento.</div>'}</div>`;
}
function waLink(cid,eid){ const c=DB.cabeza(cid); const e=DB.event(eid); if(!c||!e) return; const url=canjeUrl(eid); const msg=`¡Hola ${c.name.split(' ')[0]}! Este es el link para que tus compradores reclamen su entrada a *${e.name}* (${longDate(e.dateISO)}) con el código que les des:\n${url}`; window.open(`https://wa.me/${(c.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank'); }
function waPanelLink(cid,eid){ const c=DB.cabeza(cid); const e=DB.event(eid); if(!c||!e) return; const url=panelUrl(eid,cid); const msg=`¡Hola ${c.name.split(' ')[0]}! Este es tu panel de *${e.name}*: ahí ves tus entradas, tus códigos y quién ya ingresó:\n${url}`; window.open(`https://wa.me/${(c.phone||'').replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank'); }

/* ============================================================
   PÚBLICO: Panel del cabeza (solo SUS entradas)
   ============================================================ */
const panelUI={q:'',f:'all'};
function panelUrl(eid,cid){ const base=(state.settings.baseUrl||location.href.split('#')[0]); return `${base}#/panel/${eid}/${cid}`; }
async function renderCabezaPanel(eid,cid){
  stopScanner();
  $('#app').className='app-shell';
  if(!state) state = { events:[], cabezas:[], tickets:[], requests:[], settings:Object.assign({}, DEFAULT_SETTINGS) };
  // Modo público (sin sesión): traer los datos del cabeza por funciones seguras
  if(!DB.event(eid) || !DB.cabeza(cid)){
    $('#app').innerHTML=publicWrap(`<div class="public-pad"><div class="empty"><div class="brand-rombo rombo" style="width:46px;height:46px;margin:0 auto 14px"></div><h3>Cargando…</h3></div></div>`);
    try{
      const [ev, cb2, rows] = await Promise.all([ cloudGetEventPublic(eid), cloudGetCabeza(cid), cloudPanelTickets(eid,cid) ]);
      if(ev && !DB.event(eid)) state.events.push(ev);
      if(cb2 && !DB.cabeza(cid)) state.cabezas.push({ id:cb2.id, name:cb2.name, prefix:'', phone:'', email:'', createdAt:0 });
      const ev2=DB.event(eid);
      if(ev2){
        const tm=new Map((ev2.types||[]).map(t=>[t.id,t]));
        (rows||[]).forEach(r=>{ if(r.type_id && !tm.has(r.type_id)){ const tt={id:r.type_id,name:r.type_name||'?',color:r.color||'#fff',kind:'general',access:'paid',price:0,capacity:0,includes:[],desc:'',active:true}; tm.set(r.type_id,tt); ev2.types.push(tt); } });
      }
      state.tickets = (rows||[]).map(r=>({ id:r.id, code:r.code, token:null, eventId:eid, typeId:r.type_id, cabezaId:cid,
        holder:r.holder||{name:'',dni:'',email:'',phone:''}, status:r.status, payment:r.payment, price:Number(r.price)||0,
        source:'admin', createdAt:r.created_at||0, claimedAt:null, usedAt:null }));
    }catch(err){ console.error(err); }
  }
  const e=DB.event(eid); const cb=DB.cabeza(cid);
  if(!e||!cb){ $('#app').innerHTML=publicWrap(`<div class="public-pad"><div class="empty"><div class="brand-rombo rombo" style="width:46px;height:46px;margin:0 auto 14px"></div><h3>Página no encontrada</h3><p>El link no es válido o el perfil fue eliminado.</p></div></div>`); return; }
  panelUI.q=''; panelUI.f='all';
  const ts=DB.ticketsFor(eid).filter(t=>t.cabezaId===cid&&t.status!=='void');
  const claimed=ts.filter(t=>t.holder&&t.holder.name).length;
  const unclaimed=ts.filter(t=>t.status==='unclaimed').length;
  const used=ts.filter(t=>t.status==='used').length;
  const rev=ts.filter(t=>t.payment==='paid').reduce((a,t)=>a+(+t.price||0),0);
  $('#app').innerHTML=`
  <div class="panel-wrap">
    <div class="evp-top"><div class="brand-wordmark wm"></div></div>
    <div class="row gap12 mb16" style="align-items:center">
      <div class="avatar" style="width:46px;height:46px;font-size:15px">${initials(cb.name)}</div>
      <div class="grow"><div style="font-family:var(--serif);font-size:22px;font-weight:700">${esc(cb.name)}</div>
      <div class="muted" style="font-size:13px">Tus entradas · ${esc(e.name)} · ${longDate(e.dateISO)}</div></div>
    </div>
    <div class="scan-stats mb16" style="flex-wrap:wrap">
      <div class="s"><b>${ts.length}</b><span>Entradas</span></div>
      <div class="s"><b>${claimed}</b><span>Reclamadas</span></div>
      <div class="s"><b>${unclaimed}</b><span>Sin reclamar</span></div>
      <div class="s"><b style="color:var(--success)">${used}</b><span>Ingresaron</span></div>
      <div class="s"><b>${money(rev)}</b><span>Vendido</span></div>
    </div>
    <div class="card pad-sm mb16"><label class="label">Tu link de venta — compártelo con tus compradores</label>${linkBox(claimUrl(eid,cid))}</div>
    <div class="toolbar" style="margin-bottom:0"><div class="search">${ic('search')}<input placeholder="Buscar por nombre, DNI o código..." oninput="panelUI.q=this.value;panelRefresh('${eid}','${cid}')"></div></div>
    <div id="panel-host">${panelRows(eid,cid)}</div>
    <div class="evp-foot">Powered by Connect · Entradas</div>
  </div>`;
}
function panelRows(eid,cid){
  const e=DB.event(eid);
  const q=(panelUI.q||'').toLowerCase().trim();
  let list=DB.ticketsFor(eid).filter(t=>t.cabezaId===cid&&t.status!=='void');
  const counts={all:list.length, valid:list.filter(t=>t.status==='valid').length, unclaimed:list.filter(t=>t.status==='unclaimed').length, used:list.filter(t=>t.status==='used').length};
  if(panelUI.f!=='all') list=list.filter(t=>t.status===panelUI.f);
  if(q) list=list.filter(t=>(t.holder.name||'').toLowerCase().includes(q)||(t.holder.dni||'').includes(q)||(t.code||'').toLowerCase().includes(q));
  list.sort((a,b)=>b.createdAt-a.createdAt);
  const seg=`<div class="toolbar" style="margin:12px 0"><div class="seg">${[['all','Todas'],['valid','Activas'],['unclaimed','Sin reclamar'],['used','Ingresaron']].map(([k,l])=>`<button class="${panelUI.f===k?'active':''}" onclick="panelUI.f='${k}';panelRefresh('${eid}','${cid}')">${l}${counts[k]?` (${counts[k]})`:''}</button>`).join('')}</div></div>`;
  if(!list.length) return seg+`<div class="empty"><div class="brand-rombo rombo"></div><h3>${q||panelUI.f!=='all'?'Sin resultados':'Aún no tienes entradas'}</h3><p>${q||panelUI.f!=='all'?'Prueba con otro filtro o búsqueda.':'Cuando el organizador te genere códigos o tus compradores reclamen, aparecerán aquí.'}</p></div>`;
  return seg+`<div class="table-wrap"><table><thead><tr><th>Comprador</th><th>Tipo</th><th>Código</th><th>Pago</th><th>Estado</th><th></th></tr></thead><tbody>${list.map(t=>{const ty=DB.type(e,t.typeId);return `<tr><td>${t.holder.name?`<div class="who">${esc(t.holder.name)}</div><div class="sub">${esc(t.holder.dni||'')}</div>`:'<span class="muted">— sin reclamar —</span>'}</td><td><span class="tt-dot" style="background:${ty?.color||'#fff'}"></span>${esc(ty?.name||'?')}</td><td><span class="code-chip" onclick="copyText('${t.code}')">${esc(t.code)}</span></td><td>${payBadge(t)}</td><td>${statusTicket(t)}</td><td>${t.holder.name?`<button class="btn-icon btn-xs btn-ghost" title="Ver QR" onclick="window.open('#/t/${t.id}','_blank')">${ic('eye')}</button>`:''}</td></tr>`}).join('')}</tbody></table></div>`;
}
function panelRefresh(eid,cid){ const h=$('#panel-host'); if(h) h.innerHTML=panelRows(eid,cid); }

/* ---------- Link helpers ---------- */
function claimUrl(eid, cid){ const base=(state.settings.baseUrl||location.href.split('#')[0]); return cid? `${base}#/claim/${eid}/${cid}` : `${base}#/e/${eid}`; }
function canjeUrl(eid, code){ const base=(state.settings.baseUrl||location.href.split('#')[0]); return `${base}#/canje/${eid}${code?'/'+code:''}`; }
function linkBox(url){ return `<div class="row gap8" style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:10px 12px"><div class="grow mono" style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--gold-bright)">${esc(url)}</div><button class="btn-icon btn-xs btn-ghost" onclick="copyText('${url}')" title="Copiar">${ic('copy')}</button><button class="btn-icon btn-xs btn-ghost" onclick="window.open('${url}','_blank')" title="Abrir">${ic('link')}</button></div>`; }

/* ============================================================
   VIEW: Boxes
   ============================================================ */
function boxesView(e){
  const boxes=e.types.filter(t=>t.kind==='box');
  if(!boxes.length) return `<div class="empty"><div class="brand-rombo rombo"></div><h3>Sin boxes</h3><p>Este evento no tiene tipos de entrada tipo Box / Mesa.</p></div>`;
  return `<div class="grid grid-auto">${boxes.map(b=>{const ts=DB.ticketsFor(e.id).filter(t=>t.typeId===b.id&&t.status!=='void');const sold=ts.length;return `
    <div class="card"><div class="between mb12"><div class="row gap8"><span style="width:12px;height:12px;border-radius:4px;background:${b.color}"></span><b style="font-family:var(--serif);font-size:17px">${esc(b.name)}</b></div><span class="badge badge-gold">${money(b.price)}</span></div>
    ${b.includes&&b.includes.length?`<div class="pills mb12">${b.includes.map(x=>`<span class="badge badge-gray">${esc(x)}</span>`).join('')}</div>`:''}
    <div class="bar-track mb8"><div class="bar-fill" style="width:${Math.min(100,sold/b.capacity*100)}%;background:${b.color}"></div></div>
    <div class="between"><span class="muted" style="font-size:12.5px">${sold} / ${b.capacity} ocupados</span><button class="btn btn-secondary btn-xs" onclick="openGenerate('${e.id}')">${ic('plus')} Códigos</button></div></div>`}).join('')}</div>`;
}

/* ============================================================
   VIEW: Tickets (tipos de entrada del evento)
   ============================================================ */
const TT_PALETTE=['#FFFFFF','#BFBFBF','#8C8C8C','#C9A24B','#C7B98F','#8FB89C','#8FA8C7','#9C8FB8','#C78F9B','#C78F6F'];
const ACCESS_LABEL={paid:'Venta',courtesy:'Cortesía',free:'Free'};
function typeIssuedCount(eid,tid){ return DB.ticketsFor(eid).filter(t=>t.typeId===tid&&t.status!=='void').length; }
function typeRemaining(e,ty){ return Math.max(0,(Number(ty.capacity)||0)-typeIssuedCount(e.id,ty.id)); }
function viewTicketTypes(v){
  const e=DB.activeEvent();
  if(!e) return v.innerHTML=emptyBlock('Sin eventos','Crea un evento para configurar sus tickets.','Crear evento',"go('events/new')");
  v.innerHTML=`<div class="between mb24"><div><div class="eyebrow">${esc(e.name)}</div><div class="page-title">Tickets</div><div class="page-sub">Los tipos de entrada de este evento. Lo inactivo o agotado no aparece en los links públicos ni se puede generar.</div></div>
    <button class="btn btn-primary" onclick="openTypeForm('${e.id}')">${ic('plus')} Nuevo ticket</button></div>
    ${e.types.length? `<div class="grid grid-auto">${e.types.map(t=>typeCardHTML(e,t)).join('')}</div>` : emptyBlock('Sin tickets','Crea el primer tipo de entrada de este evento.','Nuevo ticket',`openTypeForm('${e.id}')`)}`;
}
function typeCardHTML(e,ty){
  const issued=typeIssuedCount(e.id,ty.id);
  const remaining=Math.max(0,(Number(ty.capacity)||0)-issued);
  const rev=DB.ticketsFor(e.id).filter(t=>t.typeId===ty.id&&t.status!=='void'&&t.payment==='paid').reduce((a,t)=>a+(+t.price||0),0);
  const inactive=ty.active===false;
  const pct=Math.min(100, ty.capacity? issued/ty.capacity*100:0);
  return `<div class="card tt-card" style="--tt-color:${ty.color||'#fff'};${inactive?'opacity:.6':''}">
    <div class="between mb8">
      <div><div style="font-weight:700;font-size:16.5px;font-family:var(--serif)">${esc(ty.name)}</div>
      <div class="muted" style="font-size:12px;margin-top:2px">${ty.kind==='box'?'Box / Mesa':'Individual'} · ${ACCESS_LABEL[ty.access]||ty.access}${ty.access==='paid'?' · '+money(ty.price):''}</div></div>
      ${inactive?'<span class="badge badge-gray"><span class="dot"></span>Inactivo</span>':(remaining<1?'<span class="badge badge-red"><span class="dot"></span>Agotado</span>':'<span class="badge badge-green"><span class="dot"></span>Activo</span>')}
    </div>
    ${ty.desc?`<p class="muted mb8" style="font-size:12.5px">${esc(ty.desc)}</p>`:''}
    ${ty.includes&&ty.includes.length?`<div class="pills mb12">${ty.includes.map(x=>`<span class="badge badge-gray">${esc(x)}</span>`).join('')}</div>`:''}
    <div class="bar-track mb8"><div class="bar-fill" style="width:${pct}%;background:${ty.color||'#fff'}"></div></div>
    <div class="between" style="font-size:12.5px"><span class="muted">${issued} / ${ty.capacity} emitidas · quedan ${remaining}</span><span class="mono">${money(rev)}</span></div>
    <div class="divider"></div>
    <div class="between">
      <label class="row gap8" style="cursor:pointer"><span class="switch"><input type="checkbox" ${inactive?'':'checked'} onchange="toggleTypeActive('${e.id}','${ty.id}')"><span class="track"></span></span><span class="muted" style="font-size:12.5px">${inactive?'Inactivo':'Activo'}</span></label>
      <div class="row gap6"><button class="btn-icon btn-xs btn-ghost" title="Eliminar" onclick="deleteType('${e.id}','${ty.id}')">${ic('trash')}</button><button class="btn btn-secondary btn-sm" onclick="openTypeForm('${e.id}','${ty.id}')">${ic('edit')} Editar</button></div>
    </div>
  </div>`;
}
function openTypeForm(eid, tid){
  const e=DB.event(eid); if(!e) return;
  const ty=tid? DB.type(e,tid):null;
  const color=ty?.color||TT_PALETTE[e.types.length%TT_PALETTE.length];
  const issued=ty? typeIssuedCount(eid,tid):0;
  modal({ title:ty?'Editar ticket':'Nuevo ticket', sub:e.name, body:`
    <div class="field"><label class="label">Nombre del ticket</label><input id="tt-name" value="${esc(ty?.name||'')}" placeholder="Ej. VIP, Preventa, Cortesía..."></div>
    <div class="field-row">
      <div class="field"><label class="label">Formato</label><select id="tt-kind"><option value="general" ${ty?.kind!=='box'?'selected':''}>Individual</option><option value="box" ${ty?.kind==='box'?'selected':''}>Box / Mesa</option></select></div>
      <div class="field"><label class="label">Uso</label><select id="tt-access" onchange="$('#tt-price').disabled=this.value!=='paid';if(this.value!=='paid')$('#tt-price').value=0"><option value="paid" ${!ty||ty.access==='paid'?'selected':''}>Venta</option><option value="courtesy" ${ty?.access==='courtesy'?'selected':''}>Cortesía</option><option value="free" ${ty?.access==='free'?'selected':''}>Free</option></select></div>
    </div>
    <div class="field-row">
      <div class="field"><label class="label">Precio (${DB.s().symbol})</label><input type="number" id="tt-price" min="0" value="${ty?ty.price:0}" ${ty&&ty.access!=='paid'?'disabled':''}></div>
      <div class="field"><label class="label">Cantidad disponible</label><input type="number" id="tt-cap" min="1" value="${ty?ty.capacity:100}">${ty?`<div class="hint">Ya emitidas: ${issued}</div>`:''}</div>
    </div>
    <div class="field"><label class="label">Color del ticket</label>
      <div class="swatches">${TT_PALETTE.map(c=>`<span class="swatch ${c===color?'sel':''}" data-c="${c}" style="background:${c}" onclick="selectSwatch(this)"></span>`).join('')}</div>
      <input type="hidden" id="tt-color" value="${color}">
      <div class="hint">Acento sutil: se ve como una línea fina y un punto en el ticket, sin invadir el diseño.</div></div>
    <div class="field"><label class="label">Incluye (opcional)</label><input id="tt-includes" value="${esc((ty?.includes||[]).join(', '))}" placeholder="Ej. 2 botellas, mesa privada — separa con comas"></div>
    <div class="field"><label class="label">Descripción (opcional)</label><input id="tt-desc" value="${esc(ty?.desc||'')}" placeholder="Se muestra en la página pública"></div>
    <div class="card pad-sm" style="background:var(--surface-2)"><label class="checkline" style="justify-content:space-between;margin:0"><span><b style="font-size:13.5px">Ticket activo</b><div class="muted" style="font-size:12px">Si está inactivo no aparece en links públicos ni se puede generar.</div></span><span class="switch"><input type="checkbox" id="tt-active" ${!ty||ty.active!==false?'checked':''}><span class="track"></span></span></label></div>
  `, footer:`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="saveTypeForm('${eid}','${tid||''}')">${ic('check')} ${ty?'Guardar cambios':'Crear ticket'}</button>` });
}
function selectSwatch(el){ $('#tt-color').value=el.dataset.c; $$('.swatch').forEach(s=>s.classList.toggle('sel', s===el)); }
function saveTypeForm(eid, tid){
  const e=DB.event(eid); if(!e) return;
  const name=$('#tt-name').value.trim(); if(!name) return toast('Ponle un nombre al ticket','err');
  const access=$('#tt-access').value;
  const data={ name, kind:$('#tt-kind').value, access, price:access==='paid'?(Number($('#tt-price').value)||0):0,
    capacity:Math.max(1,Number($('#tt-cap').value)||1), color:$('#tt-color').value||'#FFFFFF',
    includes:$('#tt-includes').value.split(',').map(s=>s.trim()).filter(Boolean), desc:$('#tt-desc').value.trim(),
    active:$('#tt-active').checked };
  if(tid){ Object.assign(DB.type(e,tid), data); toast('Ticket actualizado','ok'); }
  else { e.types.push({id:'tt_'+uid(), ...data}); toast('Ticket creado','ok'); }
  DB.save(); closeModal(); render();
}
function toggleTypeActive(eid,tid){ const ty=DB.type(DB.event(eid),tid); if(!ty) return; ty.active=ty.active===false; DB.save(); render(); toast(ty.active?'Ticket activado':'Ticket desactivado', ty.active?'ok':'warn'); }
function deleteType(eid,tid){
  const e=DB.event(eid); const ty=DB.type(e,tid); if(!ty) return;
  const refs=state.tickets.filter(t=>t.eventId===eid&&t.typeId===tid).length;
  if(refs) return toast(`No se puede eliminar: tiene ${refs} entrada${refs!==1?'s':''} emitida${refs!==1?'s':''}. Desactívalo en su lugar.`,'err');
  confirmModal('Eliminar ticket',`Se eliminará "${ty.name}" de ${e.name}. Esta acción no se puede deshacer.`,()=>{ e.types=e.types.filter(t=>t.id!==tid); DB.save(); render(); toast('Ticket eliminado','warn'); });
}

/* ============================================================
   VIEW: Solicitudes
   ============================================================ */
function viewRequests(v){
  const e=DB.activeEvent();
  const reqs = state.requests.filter(r=>!e||r.eventId===e.id);
  const pend=reqs.filter(r=>r.status==='pending');
  v.innerHTML=`<div class="between mb24"><div><div class="eyebrow">${e?esc(e.name):''}</div><div class="page-title">Solicitudes</div><div class="page-sub">Pedidos de entrada desde los links de los cabezas. Apruébalas para emitir el QR.</div></div></div>
  ${reqs.length? `<div class="grid grid-auto">${reqs.sort((a,b)=>(a.status==='pending'?-1:1)-(b.status==='pending'?-1:1)||b.createdAt-a.createdAt).map(r=>reqCard(r)).join('')}</div>` : emptyBlock('Sin solicitudes','Cuando alguien pida una entrada desde un link de cabeza, aparecerá aquí.','',null)}`;
}
function reqCard(r){
  const e=DB.event(r.eventId); const ty=DB.type(e,r.typeId); const cb=DB.cabeza(r.cabezaId);
  return `<div class="card"><div class="between mb12"><div><div style="font-weight:700;font-size:15px">${esc(r.name)}</div><div class="muted" style="font-size:12.5px">DNI ${esc(r.dni||'—')} · ${esc(r.phone||'')}</div></div>${r.status==='pending'?`<span class="badge badge-amber"><span class="dot"></span>Pendiente</span>`:r.status==='approved'?`<span class="badge badge-green"><span class="dot"></span>Aprobada</span>`:`<span class="badge badge-red"><span class="dot"></span>Rechazada</span>`}</div>
  <div class="row wrap gap8 mb12"><span class="badge" style="background:${ty?ty.color+'22':'#333'};color:${ty?ty.color:'#999'}">${esc(ty?.name||'')}</span>${ty?.access==='paid'?`<span class="badge badge-gold">${money(ty.price)}</span>`:''}${cb?`<span class="badge badge-gray">${ic('users')} ${esc(cb.name)}</span>`:''}</div>
  ${r.note?`<p class="muted" style="font-size:12.5px;margin-bottom:12px">"${esc(r.note)}"</p>`:''}
  <div class="dim" style="font-size:11.5px;margin-bottom:12px">${timeAgo(r.createdAt)}</div>
  ${r.status==='pending'?`<div class="row gap8"><button class="btn btn-danger btn-sm grow" onclick="rejectReq('${r.id}')">Rechazar</button><button class="btn btn-primary btn-sm grow" onclick="approveReq('${r.id}')">${ic('check')} Aprobar</button></div>`:''}</div>`;
}
function approveReq(id){
  const r=state.requests.find(x=>x.id===id); if(!r) return;
  const e=DB.event(r.eventId); const ty=DB.type(e,r.typeId); const cb=DB.cabeza(r.cabezaId);
  if(!ty) return toast('El ticket de esta solicitud ya no existe','err');
  if(ty.active===false) return toast(`"${ty.name}" está inactivo. Actívalo en Tickets para aprobar.`,'err');
  if(typeRemaining(e,ty)<1) toast(`Atención: se superaron los cupos de "${ty.name}"`,'warn');
  const pay = ty.access==='paid'?'paid':ty.access==='courtesy'?'courtesy':'free';
  const t={ id:'tk_'+uid(), code:newCode(cb?cb.prefix:'CN'), token:token(), eventId:r.eventId, typeId:r.typeId, cabezaId:r.cabezaId,
    holder:{name:r.name,dni:r.dni,email:r.email,phone:r.phone}, status:'valid', payment:pay, price:pay==='paid'?ty.price:0, source:'request', createdAt:Date.now(), claimedAt:Date.now(), usedAt:null };
  state.tickets.push(t); r.status='approved'; DB.save(); render(); showTicketModal(t.id); toast('Solicitud aprobada · entrada emitida','ok');
}
function rejectReq(id){ const r=state.requests.find(x=>x.id===id); if(!r)return; r.status='rejected'; DB.save(); render(); toast('Solicitud rechazada','warn'); }

/* ============================================================
   VIEW: Asistentes
   ============================================================ */
function viewAttendees(v){
  const e=DB.activeEvent();
  if(!e) return v.innerHTML=emptyBlock('Sin eventos','Crea un evento.','Crear evento',"go('events/new')");
  v.innerHTML=`<div class="between mb24"><div><div class="eyebrow">${esc(e.name)}</div><div class="page-title">Asistentes</div></div><button class="btn btn-ghost" onclick="exportTickets('${e.id}')">${ic('download')} Excel</button></div>${attendeesTable(e.id)}`;
}
function attendeesTable(eid){
  const st=DB.stats(eid);
  return `<div class="scan-stats mb16"><div class="s"><b>${st.valid}</b><span>Con entrada</span></div><div class="s"><b style="color:var(--success)">${st.used}</b><span>Ingresaron</span></div><div class="s"><b>${st.valid-st.used}</b><span>Por llegar</span></div><div class="s"><b>${st.checkinRate}%</b><span>Asistencia</span></div></div>
  <div class="toolbar"><div class="search">${ic('search')}<input placeholder="Buscar por nombre, DNI, código o cabeza..." value="${esc(ui.aq||'')}" oninput="ui.aq=this.value;refreshAttendees('${eid}')"></div></div>
  <div id="att-host">${attendeesRows(eid)}</div>`;
}
function attendeesRows(eid){
  const e=DB.event(eid);
  const q=(ui.aq||'').toLowerCase().trim();
  let list=DB.ticketsFor(eid).filter(t=>t.holder.name && t.status!=='void');
  if(q) list=list.filter(t=>{const cb=DB.cabeza(t.cabezaId);return (t.holder.name||'').toLowerCase().includes(q)||(t.holder.dni||'').includes(q)||(t.code||'').toLowerCase().includes(q)||(cb&&cb.name.toLowerCase().includes(q));});
  list.sort((a,b)=>(b.usedAt||0)-(a.usedAt||0)||(b.claimedAt||0)-(a.claimedAt||0));
  if(!list.length) return q?`<div class="empty"><div class="brand-rombo rombo"></div><h3>Sin resultados</h3><p>Nadie coincide con "${esc(ui.aq)}".</p></div>`:`<div class="empty"><div class="brand-rombo rombo"></div><h3>Sin asistentes aún</h3><p>Las personas que reclamen su entrada aparecerán aquí.</p></div>`;
  const isMobile = matchMedia('(max-width:680px)').matches;
  const head = `<div class="muted mb12" style="font-size:12.5px">${list.length} asistente${list.length!==1?'s':''}${q?' encontrado'+(list.length!==1?'s':''):''}</div>`;
  if(isMobile) return head+`<div class="tk-cards">${list.map(t=>attendeeCard(t,e)).join('')}</div>`;
  return head+`<div class="table-wrap"><table><thead><tr><th>Asistente</th><th>Tipo</th><th>Cabeza</th><th>Estado</th><th>Hora de ingreso</th><th></th></tr></thead><tbody>${list.map(t=>{const cb=DB.cabeza(t.cabezaId);return `<tr><td><div class="who">${esc(t.holder.name)}</div><div class="sub">${esc(t.holder.dni||'')}</div></td><td>${esc(DB.type(e,t.typeId)?.name||'')}</td><td>${cb?esc(cb.name):'<span class="dim">—</span>'}</td><td>${t.status==='used'?'<span class="badge badge-blue"><span class="dot"></span>Ingresó</span>':'<span class="badge badge-green"><span class="dot"></span>Por llegar</span>'}</td><td class="mono">${t.usedAt?timeStr(t.usedAt):'—'}</td><td>${t.status==='used'?`<button class="btn btn-ghost btn-xs" onclick="undoCheckin('${t.id}')">Deshacer</button>`:`<button class="btn btn-secondary btn-xs" onclick="manualCheckin('${t.id}')">Marcar ingreso</button>`}</td></tr>`}).join('')}</tbody></table></div>`;
}
function refreshAttendees(eid){ const host=$('#att-host'); if(host) host.innerHTML=attendeesRows(eid); }
function attendeeCard(t,e){
  const ty=DB.type(e,t.typeId); const cb=DB.cabeza(t.cabezaId); const used=t.status==='used';
  return `<div class="tk-card">
    <div class="tk-card-top">
      <div class="tk-name">${esc(t.holder.name)}</div>
      ${used?'<span class="badge badge-blue"><span class="dot"></span>Ingresó</span>':'<span class="badge badge-green"><span class="dot"></span>Por llegar</span>'}
    </div>
    <div class="tk-sub">${t.holder.dni?'DNI '+esc(t.holder.dni):'—'}${used&&t.usedAt?' · ingresó '+timeStr(t.usedAt):''}</div>
    <div class="tk-chips">
      <span class="badge" style="background:${ty?ty.color+'22':'#333'};color:${ty?ty.color:'#999'};border-color:${ty?ty.color+'55':'#444'}">${esc(ty?.name||'?')}</span>
      ${cb?`<span class="muted" style="font-size:12px">${esc(cb.name)}</span>`:''}
    </div>
    <div class="tk-actions">
      ${used?`<button class="btn btn-ghost btn-sm grow" onclick="undoCheckin('${t.id}')">Deshacer ingreso</button>`:`<button class="btn btn-secondary btn-sm grow" onclick="manualCheckin('${t.id}')">${ic('check')} Marcar ingreso</button>`}
    </div>
  </div>`;
}
function manualCheckin(id){ const t=state.tickets.find(x=>x.id===id); if(!t)return; t.status='used'; t.usedAt=Date.now(); DB.save(); render(); toast('Ingreso registrado','ok'); }
function undoCheckin(id){ const t=state.tickets.find(x=>x.id===id); if(!t)return; t.status='valid'; t.usedAt=null; DB.save(); render(); toast('Ingreso deshecho','warn'); }

/* ============================================================
   VIEW: Escáner QR
   ============================================================ */
function viewScanner(v){
  const e=DB.activeEvent();
  if(!e) return v.innerHTML=emptyBlock('Sin eventos','Crea un evento para escanear entradas.','Crear evento',"go('events/new')");
  const st=DB.stats(e.id);
  v.innerHTML=`<div class="scanner">
    <div class="between mb16"><div><div class="eyebrow">${esc(e.name)}</div><div class="page-title">Escáner</div></div></div>
    <div class="scan-stats"><div class="s"><b>${st.valid}</b><span>Válidas</span></div><div class="s"><b style="color:var(--success)">${st.used}</b><span>Ingresaron</span></div><div class="s"><b>${st.valid-st.used}</b><span>Faltan</span></div></div>
    <div id="scan-queue" class="hidden" style="text-align:center;font-size:12px;font-weight:600;color:#0b0b0c;background:var(--warn,#f4b740);border-radius:8px;padding:6px 10px;margin-bottom:10px"></div>
    <div class="card" style="padding:14px">
      <div id="qr-reader" style="width:100%"></div>
      <div id="scan-fallback" class="hidden"><div class="scan-frame"><div class="empty" style="padding:30px"><div class="brand-rombo rombo"></div><h3>Cámara no disponible</h3><p>Para usar la cámara abre la app en <b>https</b> o <b>localhost</b> y concede permiso. Mientras tanto, valida por código abajo.</p></div></div></div>
      <div class="row gap8 mt12"><button class="btn btn-secondary grow" id="scan-start" onclick="startScan('${e.id}')">${ic('scan')} Iniciar cámara</button><button class="btn btn-ghost hidden" id="scan-torch" title="Linterna" style="min-width:52px">${ic('scan')}</button></div>
      <div class="divider"><span></span></div>
      <label class="label">Validación manual por código</label>
      <div class="row gap8"><input id="manual-code" placeholder="Ej. RNZ-AB12" style="text-transform:uppercase" onkeydown="if(event.key==='Enter')validateManual('${e.id}')"><button class="btn btn-primary" onclick="validateManual('${e.id}')">${ic('check')} Validar</button></div>
    </div>
  </div>`;
  updateQueueBadge();
}
function startScan(eid){
  if(typeof Html5Qrcode==='undefined'){ $('#scan-fallback').classList.remove('hidden'); return toast('Lector no disponible (sin conexión)','err'); }
  const btn=$('#scan-start'); btn.disabled=true; btn.innerHTML='Iniciando...';
  currentScanner = new Html5Qrcode('qr-reader', {verbose:false});
  // Recuadro de lectura relativo al visor (más tolerante a distintos celulares/distancias).
  const qrbox=(vw,vh)=>{ const s=Math.max(200, Math.min(340, Math.floor(Math.min(vw,vh)*0.72))); return {width:s,height:s}; };
  const config={ fps:12, qrbox, aspectRatio:1.0, disableFlip:true,
    experimentalFeatures:{ useBarCodeDetectorIfSupported:true } };
  currentScanner.start({facingMode:'environment'}, config,
    (txt)=>{ onScanHit(eid, txt); },
    ()=>{}
  ).then(()=>{
    window.__scanning=true;
    btn.innerHTML=ic('x')+' Detener'; btn.disabled=false;
    btn.onclick=()=>{stopScanner();viewScanner($('#view'));};
    setupTorch();
  }).catch(err=>{ window.__scanning=false; btn.disabled=false; btn.innerHTML=ic('scan')+' Iniciar cámara'; $('#scan-fallback').classList.remove('hidden'); toast('No se pudo abrir la cámara','err'); });
}
/* Linterna: aparece solo si el dispositivo la soporta (clave con poca luz). */
function setupTorch(){
  try{
    const tbtn=$('#scan-torch'); if(!tbtn||!currentScanner||!currentScanner.getRunningTrackCapabilities) return;
    const caps=currentScanner.getRunningTrackCapabilities();
    if(caps && caps.torch){
      tbtn.classList.remove('hidden'); tbtn.dataset.on='0';
      tbtn.onclick=()=>{ const on=tbtn.dataset.on==='1';
        currentScanner.applyVideoConstraints({advanced:[{torch:!on}]})
          .then(()=>{ tbtn.dataset.on=on?'0':'1'; tbtn.style.background=on?'':'var(--fg,#fff)'; tbtn.style.color=on?'':'#000'; }).catch(()=>{}); };
    } else { tbtn.classList.add('hidden'); }
  }catch(e){}
}
let lastScan = 0;
function onScanHit(eid, txt){
  const now=Date.now(); if(now-lastScan<1500) return; lastScan=now;
  processScan(eid, txt);
}
function validateManual(eid){ const code=$('#manual-code').value.trim().toUpperCase(); if(!code) return; processScan(eid, code); $('#manual-code').value=''; }
function buzz(kind){ if(navigator.vibrate) navigator.vibrate(kind==='ok'?80:[60,40,60]); }
function persistLocal(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
function updateScanStats(){ const e=DB.activeEvent(); if(!e) return; const st=DB.stats(e.id); const box=$('.scan-stats');
  if(box) box.innerHTML=`<div class="s"><b>${st.valid}</b><span>Válidas</span></div><div class="s"><b style="color:var(--success)">${st.used}</b><span>Ingresaron</span></div><div class="s"><b>${st.valid-st.used}</b><span>Faltan</span></div>`; }

/* ---- Cola de ingresos offline (si se cae el WiFi de la puerta, no se pierde nada) ---- */
const SCAN_Q_KEY='connect_scan_queue';
function scanQueue(){ try{ return JSON.parse(localStorage.getItem(SCAN_Q_KEY)||'[]'); }catch(e){ return []; } }
function setScanQueue(q){ try{ localStorage.setItem(SCAN_Q_KEY, JSON.stringify(q)); }catch(e){} }
function queueOfflineScan(id){ const q=scanQueue(); if(!q.includes(id)){ q.push(id); setScanQueue(q); } }
function updateQueueBadge(){ const b=$('#scan-queue'); if(!b) return; const n=scanQueue().length;
  if(n){ b.classList.remove('hidden'); b.textContent=n+' por sincronizar'; } else { b.classList.add('hidden'); } }
async function flushScanQueue(){
  const q=scanQueue(); if(!q.length || typeof cloudScanTicket!=='function') return;
  const eid=(DB.activeEvent()&&DB.activeEvent().id)||null;
  const remaining=[]; let conflicts=0, synced=0;
  for(const id of q){
    try{ const r=await cloudScanTicket(id, eid); if(r&&r.result==='already') conflicts++; else synced++; }
    catch(e){ remaining.push(id); }
  }
  setScanQueue(remaining); updateQueueBadge();
  if(synced) toast(synced+' ingreso(s) sincronizado(s)','ok');
  if(conflicts) toast(conflicts+' ya estaban registrados en otra puerta','warn');
}
window.addEventListener('online', ()=>{ flushScanQueue(); });

async function processScan(eid, raw){
  // 1) Resolver la entrada localmente: instantáneo y funciona aunque no haya señal.
  let t=null; const parts=String(raw).split('|');
  if(parts[0]==='CNCT'&&parts[1]) t=state.tickets.find(x=>x.id===parts[1]&&x.token===parts[2]);
  if(!t) t=state.tickets.find(x=>x.code===String(raw).trim().toUpperCase());
  if(!t){ showScanResult('err','No válida','Código no reconocido',null); buzz('err'); return; }

  // 2) Chequeos que no dependen del servidor.
  const e=DB.event(t.eventId);
  if(t.eventId!==eid){ showScanResult('err','Otro evento','Esta entrada es de "'+(e?e.name:'?')+'"',t); buzz('err'); return; }
  if(t.status==='void'){ showScanResult('err','Anulada','Esta entrada fue anulada',t); buzz('err'); return; }
  if(t.status==='unclaimed'){ showScanResult('warn','Sin reclamar','El código aún no fue canjeado',t); buzz('warn'); return; }
  if(t.status==='used'){ showScanResult('warn','Ya ingresó','Registrada '+timeAgo(t.usedAt),t); buzz('warn'); return; }

  // 3) 'valid' → marcar en el SERVIDOR de forma atómica (una sola puerta gana).
  try{
    const r=await cloudScanTicket(t.id, eid);
    if(!r) throw new Error('sin respuesta');
    if(r.result==='ok'){ t.status='used'; t.usedAt=r.used_at||Date.now(); persistLocal(); showScanResult('ok','Bienvenido','',t); buzz('ok'); }
    else if(r.result==='already'){ t.status='used'; t.usedAt=r.used_at||t.usedAt||Date.now(); persistLocal(); showScanResult('warn','Ya ingresó','Registrada en otra puerta · '+timeAgo(t.usedAt),t); buzz('warn'); }
    else if(r.result==='void'){ t.status='void'; persistLocal(); showScanResult('err','Anulada','Esta entrada fue anulada',t); buzz('err'); }
    else if(r.result==='unclaimed'){ t.status='unclaimed'; persistLocal(); showScanResult('warn','Sin reclamar','El código aún no fue canjeado',t); buzz('warn'); }
    else if(r.result==='other_event'){ showScanResult('err','Otro evento','Esta entrada no es de este evento',t); buzz('err'); }
    else if(r.result==='not_found'){ showScanResult('err','No válida','Código no reconocido',null); buzz('err'); }
    else { t.status='used'; t.usedAt=Date.now(); persistLocal(); showScanResult('ok','Bienvenido','',t); buzz('ok'); }
    updateScanStats();
  }catch(err){
    // 4) Sin conexión → registrar local + encolar. La puerta NUNCA se frena.
    t.status='used'; t.usedAt=Date.now(); queueOfflineScan(t.id); persistLocal();
    showScanResult('ok','Ingreso registrado','Sin conexión · se sincroniza luego',t); buzz('ok');
    updateScanStats(); updateQueueBadge();
  }
}
function showScanResult(kind,title,detail,t){
  const e=t?DB.event(t.eventId):null; const ty=t?DB.type(e,t.typeId):null; const cb=t?DB.cabeza(t.cabezaId):null;
  const icoMap={ok:'check',err:'x',warn:'alert'};
  const el=h(`<div class="scan-result ${kind}">
    <div class="big-ico">${ic(icoMap[kind])}</div>
    <h2>${esc(title)}</h2>
    ${t?`<div class="det"><div class="nm">${esc(t.holder.name||'Entrada sin nombre')}</div>
      <div class="rw"><span>Tipo</span><b>${esc(ty?.name||'')}</b></div>
      ${cb?`<div class="rw"><span>Cabeza</span><b>${esc(cb.name)}</b></div>`:''}
      <div class="rw"><span>Código</span><b>${esc(t.code)}</b></div>
      ${detail?`<div class="rw"><span>Nota</span><b>${esc(detail)}</b></div>`:''}</div>`:`<p style="color:rgba(255,255,255,.7)">${esc(detail)}</p>`}
    <button class="btn btn-primary mt24" style="min-width:200px" onclick="this.closest('.scan-result').remove()">${ic('scan')} Siguiente</button>
  </div>`);
  document.body.appendChild(el);
  setTimeout(()=>{ if(el.parentElement && kind==='ok') el.remove(); }, 2200);
  // refrescar stats al cerrar
  el.addEventListener('click', ev=>{ if(ev.target.closest('button')){ if($('.scanner')) { const v=$('#view'); /* keep camera running, only update stats */ const e2=DB.activeEvent(); const st=DB.stats(e2.id); const stats=$('.scan-stats'); if(stats) stats.innerHTML=`<div class="s"><b>${st.valid}</b><span>Válidas</span></div><div class="s"><b style="color:var(--success)">${st.used}</b><span>Ingresaron</span></div><div class="s"><b>${st.valid-st.used}</b><span>Faltan</span></div>`; } } });
}

/* ============================================================
   VIEW: Reportes
   ============================================================ */
function viewReports(v){
  const e=DB.activeEvent();
  if(!e) return v.innerHTML=emptyBlock('Sin eventos','Crea un evento.','Crear evento',"go('events/new')");
  const st=DB.stats(e.id); const ts=DB.ticketsFor(e.id).filter(t=>t.status!=='void');
  // por cabeza
  const byCab=state.cabezas.map(c=>{const l=ts.filter(t=>t.cabezaId===c.id);return {name:c.name,count:l.length,rev:l.filter(t=>t.payment==='paid').reduce((a,t)=>a+(+t.price||0),0),used:l.filter(t=>t.status==='used').length};}).filter(x=>x.count).sort((a,b)=>b.rev-a.rev);
  const maxRev=Math.max(1,...byCab.map(c=>c.rev));
  // pago split
  const paid=ts.filter(t=>t.payment==='paid').length, cort=ts.filter(t=>t.payment==='courtesy').length, free=ts.filter(t=>t.payment==='free').length, pend=ts.filter(t=>t.payment==='pending').length;
  const total=Math.max(1,paid+cort+free+pend);
  const seg=[['#F2F2F2',paid,'Pagadas'],['#A0A0A0',cort,'Cortesías'],['#6E6E6E',free,'Free'],['#3A3A3A',pend,'Pendientes']];
  let acc=0; const grad=seg.map(([c,n])=>{const a=acc/total*360;acc+=n;const b=acc/total*360;return `${c} ${a}deg ${b}deg`;}).join(',');
  v.innerHTML=`<div class="between mb24"><div><div class="eyebrow">${esc(e.name)}</div><div class="page-title">Reportes</div></div><button class="btn btn-ghost" onclick="exportTickets('${e.id}')">${ic('download')} Exportar</button></div>
  <div class="grid grid-4 mb24">
    <div class="kpi"><div class="k-ico">${ic('money')}</div><div class="k-val">${money(st.revenue)}</div><div class="k-label">Recaudado</div></div>
    <div class="kpi"><div class="k-ico">${ic('clock')}</div><div class="k-val">${money(st.pending)}</div><div class="k-label">Por cobrar</div></div>
    <div class="kpi"><div class="k-ico">${ic('ticket')}</div><div class="k-val">${st.total}</div><div class="k-label">Entradas</div></div>
    <div class="kpi"><div class="k-ico">${ic('check2')}</div><div class="k-val">${st.checkinRate}%</div><div class="k-label">Asistencia</div></div>
  </div>
  <div class="grid cols-main">
    <div class="card"><div class="section-title mb16">Ranking de cabezas</div>${byCab.length?byCab.map(c=>`<div class="bar-row"><div class="b-label">${esc(c.name)}</div><div class="bar-track"><div class="bar-fill" style="width:${c.rev/maxRev*100}%"></div></div><div class="b-val">${money(c.rev)}</div></div>`).join(''):'<div class="muted" style="font-size:13px">Sin ventas registradas.</div>'}</div>
    <div class="card"><div class="section-title mb16">Composición de entradas</div>
      <div class="donut-wrap"><div class="donut" style="background:conic-gradient(${grad})"><div class="hole"><b>${st.total}</b><span>TOTAL</span></div></div>
      <div class="legend">${seg.map(([c,n,l])=>`<div class="li"><span class="sw" style="background:${c}"></span><span class="grow">${l}</span><b>${n}</b></div>`).join('')}</div></div>
    </div>
  </div>
  <div class="card mt24"><div class="section-title mb16">Detalle por tipo de entrada</div>
    <div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Emitidas</th><th>Ingresaron</th><th>Cupos</th><th>Recaudado</th></tr></thead><tbody>${e.types.map(ty=>{const l=ts.filter(t=>t.typeId===ty.id);return `<tr><td><span class="badge" style="background:${ty.color}22;color:${ty.color}">${esc(ty.name)}</span></td><td>${l.length}</td><td>${l.filter(t=>t.status==='used').length}</td><td>${ty.capacity}</td><td class="mono">${money(l.filter(t=>t.payment==='paid').reduce((a,t)=>a+(+t.price||0),0))}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

/* ============================================================
   VIEW: Configuración
   ============================================================ */
function viewSettings(v){
  const s=state.settings;
  v.innerHTML=`<div class="mb24"><div class="eyebrow">Ajustes</div><div class="page-title">Configuración</div></div>
  <div class="grid cols-2" style="align-items:start">
    <div class="card"><div class="section-title mb16">General</div>
      <div class="field"><label class="label">Organización</label><input id="s-org" value="${esc(s.org)}"></div>
      <div class="field-row"><div class="field"><label class="label">Moneda</label><select id="s-cur"><option value="PEN" ${s.currency==='PEN'?'selected':''}>Soles (S/)</option><option value="USD" ${s.currency==='USD'?'selected':''}>Dólares ($)</option></select></div>
      <div class="field"><label class="label">PIN de escáner (opcional)</label><input id="s-pin" value="${esc(s.scanPin||'')}" placeholder="Vacío = sin PIN"></div></div>
      <div class="field"><label class="label">Datos de pago (se muestran en el link público)</label><textarea id="s-pay">${esc(s.payInfo||'')}</textarea></div>
      <div class="field"><label class="label">URL base de los links</label><input id="s-url" value="${esc(s.baseUrl||'')}"><div class="hint">Cuando publiques la app online, pon aquí su dirección para que los links funcionen.</div></div>
      <button class="btn btn-primary mt8" onclick="saveSettings()">${ic('check')} Guardar</button>
    </div>
    <div>
      <div class="card mb16"><div class="section-title mb8">Marca</div><p class="muted" style="font-size:13px">Esta plataforma usa la identidad de Connect (logo, rombo y colores). Para cambiarla, reemplaza los archivos en la carpeta <span class="code-chip">assets/</span>.</p>
      <div class="row gap16 mt16" style="align-items:center"><div class="brand-rombo" style="width:44px;height:44px"></div><div class="brand-wordmark" style="height:22px;width:150px"></div></div></div>
      <div class="card"><div class="section-title mb8">Datos</div><p class="muted mb16" style="font-size:13px">Tus datos se guardan en este navegador. Haz copias de seguridad.</p>
        <div class="row gap8 wrap"><button class="btn btn-ghost btn-sm" onclick="exportDB()">${ic('download')} Exportar respaldo</button><button class="btn btn-ghost btn-sm" onclick="$('#imp').click()">${ic('plus')} Importar</button><input type="file" id="imp" class="hidden" accept="application/json" onchange="importDB(event)"><button class="btn btn-danger btn-sm" onclick="wipe()">${ic('trash')} Borrar todo</button></div>
      </div>
    </div>
  </div>`;
}
function saveSettings(){ const s=state.settings; s.org=$('#s-org').value.trim()||'Connect'; s.currency=$('#s-cur').value; s.symbol=s.currency==='USD'?'$':'S/'; s.scanPin=$('#s-pin').value.trim(); s.payInfo=$('#s-pay').value.trim(); s.baseUrl=$('#s-url').value.trim(); DB.save(); render(); toast('Configuración guardada','ok'); }
function exportDB(){ download('connect_entradas_backup.json', JSON.stringify(state,null,2), 'application/json'); }
function importDB(ev){ const f=ev.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=e=>{ try{ state=JSON.parse(e.target.result); DB.save(); render(); toast('Datos importados','ok'); }catch(err){ toast('Archivo inválido','err'); } }; r.readAsText(f); }
function wipe(){ confirmModal('Borrar todo','Se eliminarán todos tus eventos, entradas y cabezas. Esta acción no se puede deshacer.',()=>{ localStorage.removeItem(KEY); seed(); migrate(); render(); toast('Datos reiniciados','warn'); }); }
function confirmModal(title,msg,onYes){ modal({title,size:'narrow',body:`<p class="muted" style="font-size:14px;line-height:1.6">${esc(msg)}</p>`,footer:`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button><button class="btn btn-danger" id="cf-yes">Confirmar</button>`}); $('#cf-yes').onclick=()=>{ closeModal(); onYes(); }; }

/* ============================================================
   PÚBLICO: Claim (reclamar/solicitar entrada)
   ============================================================ */
let claimState = { view:'home', typeId:null, eid:null, cid:'' };
async function renderClaim(eid, cid, opts){
  opts=opts||{};
  stopScanner();
  if(!state) state = { events:[], cabezas:[], tickets:[], requests:[], settings:Object.assign({}, DEFAULT_SETTINGS) };
  let e=DB.event(eid);
  if(!e){
    $('#app').className='app-shell';
    $('#app').innerHTML=publicWrap(`<div class="public-pad"><div class="empty"><div class="brand-rombo rombo" style="width:46px;height:46px;margin:0 auto 14px"></div><h3>Cargando…</h3></div></div>`);
    try{ e=await cloudGetEventPublic(eid); }catch(err){ console.error(err); }
    if(e && !DB.event(eid)) state.events.push(e);
  }
  $('#app').className='app-shell';
  if(!e){ $('#app').innerHTML=publicWrap(`<div class="public-pad"><div class="empty"><div class="brand-rombo rombo" style="width:46px;height:46px;margin:0 auto 14px"></div><h3>Evento no encontrado</h3><p>El link no es válido o el evento fue eliminado.</p></div></div>`); return; }
  const cb=cid?DB.cabeza(cid):null;
  const firstAvail=e.types.find(t=>t.active!==false&&typeRemaining(e,t)>0)||e.types.find(t=>t.active!==false)||e.types[0];
  claimState={view:'home', typeId:firstAvail?.id, eid, cid:cid||'', canje:!!opts.canje, precode:opts.code||''};
  const sd=shortDate(e.dateISO);
  const ini = cb? cb.name.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase() : '';
  $('#app').innerHTML = `
  <div class="evp">
    <div class="evp-top"><div class="brand-wordmark wm"></div></div>
    <div class="evp-grid">
      <div class="evp-media">
        ${e.cover? `<img src="${e.cover}" alt="${esc(e.name)}">` : `<div class="fallback"><div class="brand-rombo rombo" style="width:50%;height:50%"></div></div>`}
        <div class="chip"><div class="d">${sd.d}</div><div class="m">${sd.m}</div></div>
        <div class="status">${statusBadge(e)}</div>
      </div>
      <div class="evp-info">
        <h1>${esc(e.name)}</h1>
        <div class="evp-meta">
          ${metaItem('cal','Fecha', longDate(e.dateISO))}
          ${metaItem('clock','Hora', e.time||'Por confirmar')}
          ${metaItem('pin','Lugar', [e.venue,e.address,e.city].filter(Boolean).join(' · ')||'Por confirmar')}
        </div>
        ${e.description? `<div class="evp-desc">${esc(e.description)}</div>`:''}
        ${cb? `<div class="evp-cabeza"><span class="av">${ini||'★'}</span>Te invita ${esc(cb.name)}</div>`:''}
        <div id="claim-body"></div>
      </div>
    </div>
    <div class="evp-foot">Powered by Connect · Entradas</div>
  </div>`;
  renderClaimBody();
}
function metaItem(icon,l,v){ return `<div class="mi"><div class="ico">${ic(icon)}</div><div><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div></div>`; }
function publicWrap(inner){ return `<div class="public"><div class="public-top"><div class="brand-wordmark wm"></div></div><div class="public-card">${inner}</div><div class="dim mt16" style="font-size:11.5px">Powered by Connect · Entradas</div></div>`; }
function setClaimView(v){ claimState.view=v; renderClaimBody(); }
function renderClaimBody(){
  const e=DB.event(claimState.eid); const box=$('#claim-body'); if(!box) return;
  if(claimState.view==='request'){
    box.innerHTML=`
      <button class="btn btn-ghost btn-sm mb16" onclick="setClaimView('home')">${ic('back')} Volver</button>
      <label class="label">Elige tu entrada</label>
      <div class="mb16">${e.types.filter(t=>t.active!==false).map(t=>{const out=typeRemaining(e,t)<1;return `<div class="tt-option ${out?'disabled':claimState.typeId===t.id?'sel':''}" ${out?'':`onclick="claimState.typeId='${t.id}';renderClaimBody()"`}><div class="tt-radio"></div><div class="grow"><div class="tt-name"><span class="tt-dot" style="background:${t.color||'#fff'}"></span> ${esc(t.name)}</div>${t.desc?`<div class="tt-desc">${esc(t.desc)}</div>`:''}</div><div class="tt-price">${out?'<span class="badge badge-red">Agotado</span>':(t.access==='paid'?money(t.price):t.access==='courtesy'?'Cortesía':'Free')}</div></div>`}).join('')||'<div class="muted mb16" style="font-size:13px">Por ahora no hay tickets disponibles para este evento.</div>'}</div>
      <div class="field-row"><div class="field"><label class="label">Nombre y apellido</label><input id="cl-name"></div><div class="field"><label class="label">DNI</label><input id="cl-dni"></div></div>
      <div class="field-row"><div class="field"><label class="label">Email</label><input id="cl-email" type="email"></div><div class="field"><label class="label">Celular</label><input id="cl-phone"></div></div>
      ${currentTypePaid()?`<div class="card pad-sm mb16" style="background:var(--surface-2)"><div class="label">Pago</div><p class="muted" style="font-size:12.5px;line-height:1.5">${esc(state.settings.payInfo||'')}</p></div>`:''}
      <button class="btn btn-primary btn-block" onclick="submitRequest()">${ic('send')} ${currentTypePaid()?'Enviar y reservar':'Solicitar entrada'}</button>
      <p class="dim mt12" style="font-size:11.5px;text-align:center">Tu solicitud llega al organizador${claimState.cid?' y a tu cabeza':''} para aprobación.</p>`;
    return;
  }
  box.innerHTML=`
    <div class="code-card">
      <div class="cc-h"><span class="r"></span><h3>${claimState.canje?'Canjea tu código':'Reclama tu entrada'}</h3></div>
      <p>${claimState.canje?'Ingresa el código que te enviaron, registra tus datos y recibe tu QR al instante.':'¿Te enviaron un código? Ingrésalo, registra tus datos y recibe tu QR al instante.'}</p>
      <div class="ci"><input id="cl-code" placeholder="TU CÓDIGO" maxlength="14" value="${esc(claimState.precode||'')}" onkeydown="if(event.key==='Enter')redeemCode()"><button class="btn-claim" onclick="redeemCode()">${ic('check')} ${claimState.canje?'Canjear':'Reclamar'}</button></div>
    </div>
    ${claimState.canje?'':`<div class="evp-or">o</div><button class="btn btn-ghost btn-block" onclick="setClaimView('request')">${ic('ticket')} No tengo código — Solicitar entrada</button>`}`;
}
function currentTypePaid(){ const e=DB.event(claimState.eid); return DB.type(e,claimState.typeId)?.access==='paid'; }
async function submitRequest(){
  const name=($('#cl-name').value||'').trim(); if(!name) return toast('Ingresa tu nombre','err');
  const ev=DB.event(claimState.eid); const ty=DB.type(ev,claimState.typeId);
  if(!ty||ty.active===false) return toast('Este ticket no está disponible','err');
  try{
    await cloudSubmitRequest({ eventId:claimState.eid, cabezaId:claimState.cid||null, typeId:claimState.typeId,
      name, dni:($('#cl-dni').value||'').trim(), email:($('#cl-email').value||'').trim(), phone:($('#cl-phone').value||'').trim(), note:'' });
  }catch(err){ console.error(err); return toast('No se pudo enviar la solicitud','err'); }
  $('#claim-body').innerHTML=`<div class="evp-success"><div class="big">${ic('check')}</div><h3>¡Solicitud enviada!</h3><p>Recibirás tu entrada con QR cuando ${claimState.cid?'tu cabeza':'el organizador'} apruebe tu solicitud${currentTypePaid()?' y confirme tu pago':''}.</p></div>`;
  toast('Solicitud enviada','ok');
}
async function redeemCode(){
  const code=($('#cl-code').value||'').trim().toUpperCase(); if(!code) return;
  let t; try{ t=await cloudLookupTicket(claimState.eid, code); }
  catch(err){ console.error(err); return toast('Error de conexión','err'); }
  if(!t) return toast('Código no encontrado para este evento','err');
  if(t.status==='void') return toast('Este código fue anulado','err');
  if(t.status==='used') return toast('Esta entrada ya ingresó al evento','err');
  if(t.status==='valid'){
    $('#claim-body').innerHTML=`<div class="evp-success"><div class="badge badge-green mb16"><span class="dot"></span>Esta entrada ya fue reclamada</div><p class="muted" style="font-size:13.5px;text-align:center">Si es tuya, abrila para ver tu QR.</p><button class="btn btn-primary btn-block" style="margin-top:14px" onclick="window.open('#/t/${t.id}','_blank')">${ic('eye')} Ver mi entrada</button></div>`;
    return;
  }
  claimState.pending={ id:t.id, typeId:t.type_id, code:t.code||code };
  const s = await cloudSession();
  if(!s) return renderClaimAuth();
  return renderClaimForm();
}
/* Registro/login dentro del flujo de reclamo (sin perder el contexto del código) */
let CLAIM_AUTH_MODE='register';
function setClaimAuth(m){ CLAIM_AUTH_MODE=m; renderClaimAuth(); }
function renderClaimAuth(){
  const box=$('#claim-body'); if(!box) return;
  const isReg = CLAIM_AUTH_MODE!=='login';
  box.innerHTML=`
    <div class="badge badge-green mb16"><span class="dot"></span>Código válido</div>
    <p class="muted" style="font-size:13.5px;margin-bottom:14px">Crea tu cuenta (o inicia sesión) para reclamar y guardar tu entrada.</p>
    <div class="auth-tabs sm"><button class="${isReg?'on':''}" onclick="setClaimAuth('register')">Crear cuenta</button><button class="${!isReg?'on':''}" onclick="setClaimAuth('login')">Ya tengo cuenta</button></div>
    <form onsubmit="event.preventDefault();${isReg?'doClaimRegister()':'doClaimLogin()'}">
      ${isReg?`<div class="field"><label class="label">Nombre y apellido</label><input id="ca-name"></div>`:''}
      <div class="field"><label class="label">Email</label><input id="ca-email" type="email" autocomplete="username"></div>
      <div class="field"><label class="label">Contraseña</label><input id="ca-pass" type="password" autocomplete="${isReg?'new-password':'current-password'}"></div>
      <button class="btn btn-primary btn-block" id="ca-btn" type="submit">${isReg?'Crear cuenta y continuar':'Iniciar sesión y continuar'}</button>
      <div id="ca-err" class="login-err"></div>
    </form>`;
}
async function doClaimLogin(){
  const email=($('#ca-email').value||'').trim(), pass=$('#ca-pass').value||''; const err=$('#ca-err'); if(err) err.textContent='';
  if(!email||!pass){ if(err) err.textContent='Completa email y contraseña.'; return; }
  const btn=$('#ca-btn'); btn.disabled=true; btn.textContent='Entrando…';
  const { error }=await cloudSignIn(email,pass);
  if(error){ if(err) err.textContent=isUnconfirmed(error)?'Tu cuenta no está confirmada todavía. Revisa tu correo.':'Email o contraseña incorrectos.'; btn.disabled=false; btn.textContent='Iniciar sesión y continuar'; return; }
  renderClaimForm();
}
async function doClaimRegister(){
  const name=($('#ca-name').value||'').trim(), email=($('#ca-email').value||'').trim(), pass=$('#ca-pass').value||''; const err=$('#ca-err'); if(err) err.textContent='';
  if(!name||!email||!pass){ if(err) err.textContent='Completa todos los campos.'; return; }
  if(pass.length<6){ if(err) err.textContent='La contraseña debe tener al menos 6 caracteres.'; return; }
  const btn=$('#ca-btn'); btn.disabled=true; btn.textContent='Creando…';
  const { data, error }=await cloudSignUp(email,pass,name);
  if(error){ if(err) err.textContent=/registered|already|exists/i.test(error.message||'')?'Ese correo ya tiene cuenta. Inicia sesión.':(error.message||'No se pudo crear.'); btn.disabled=false; btn.textContent='Crear cuenta y continuar'; return; }
  if(data && data.session){ renderClaimForm(); }
  else { box_msg('Revisa tu correo para confirmar tu cuenta y vuelve a ingresar tu código.'); }
}
function box_msg(m){ const box=$('#claim-body'); if(box) box.innerHTML=`<div class="evp-success"><div class="big">${ic('check')}</div><h3>Casi listo</h3><p>${esc(m)}</p></div>`; }
async function renderClaimForm(){
  const box=$('#claim-body'); if(!box) return;
  box.innerHTML=`<div class="empty" style="padding:18px 0"><div class="brand-rombo rombo"></div><h3>Cargando…</h3></div>`;
  let prof=null; try{ prof=await cloudMyProfile(); }catch(e){}
  box.innerHTML=`<div class="badge badge-green mb16"><span class="dot"></span>Código válido</div>
    <div class="field-row"><div class="field"><label class="label">Nombre y apellido</label><input id="rc-name" value="${esc(prof?prof.name:'')}"></div><div class="field"><label class="label">DNI</label><input id="rc-dni"></div></div>
    <div class="field-row"><div class="field"><label class="label">Email</label><input id="rc-email" type="email" value="${esc(prof?prof.email:'')}"></div><div class="field"><label class="label">Celular</label><input id="rc-phone"></div></div>
    <button class="btn btn-primary btn-block" onclick="confirmRedeem()">${ic('check')} Reclamar mi entrada</button>`;
}
async function confirmRedeem(){
  const p=claimState.pending; if(!p) return;
  const name=($('#rc-name').value||'').trim(); if(!name) return toast('Ingresa tu nombre','err');
  const holder={ name, dni:($('#rc-dni').value||'').trim(), email:($('#rc-email').value||'').trim(), phone:($('#rc-phone').value||'').trim() };
  let res;
  try{ res=await cloudClaimTicket(p.id, holder, claimState.cid||null); }
  catch(err){ console.error(err); const m=String(err.message||err);
    if(/used/.test(m)) return toast('Esta entrada ya ingresó','err');
    if(/void/.test(m)) return toast('Este código fue anulado','err');
    if(/already_has_ticket/.test(m)) return toast('Ya tienes tu entrada para este evento. Cada persona reclama una sola.','err');
    if(/already/.test(m)) return toast('Esta entrada ya fue reclamada','err');
    return toast('No se pudo reclamar','err'); }
  const t={ id:res.id, token:res.token, code:p.code, eventId:claimState.eid, typeId:p.typeId, cabezaId:claimState.cid||null, holder, status:'valid' };
  showClaimedTicket(t);
  cloudSendTicket(res.id);           // envía la entrada por correo (silencioso si aún no está desplegada)
  toast('¡Entrada reclamada!','ok');
}
function showClaimedTicket(t){
  setViewTicket(t);
  $('#claim-body').innerHTML=`<div class="txt-c mb16"><div class="badge badge-green"><span class="dot"></span>Entrada lista</div></div>${ticketCardHTML(t)}<div class="row gap8 mt16"><button class="btn btn-primary grow" onclick="downloadCurrentTicket()">${ic('download')} Descargar entrada</button><button class="btn btn-secondary grow" onclick="window.open('#/t/${t.id}','_blank')">${ic('eye')} Abrir</button></div><p class="dim mt12" style="font-size:11.5px;text-align:center">Te enviamos tu entrada al correo. También puedes descargarla o verla desde <b>Mi cuenta</b>.</p>`;
}

/* PÚBLICO: ver una entrada (link directo) */
async function renderPublicTicket(id){
  stopScanner();
  if(!state) state = { events:[], cabezas:[], tickets:[], requests:[], settings:Object.assign({}, DEFAULT_SETTINGS) };
  $('#app').className='app-shell';
  $('#app').innerHTML=publicWrap(`<div class="public-pad"><div class="empty"><div class="brand-rombo rombo"></div><h3>Cargando…</h3></div></div>`);
  let r; try{ r=await cloudGetTicket(id); }catch(err){ console.error(err); }
  if(!r){ $('#app').innerHTML=publicWrap(`<div class="public-pad"><div class="empty"><div class="brand-rombo rombo"></div><h3>Entrada no encontrada</h3></div></div>`); return; }
  if(!DB.event(r.event_id)){ try{ const e=await cloudGetEventPublic(r.event_id); if(e) state.events.push(e); }catch(err){} }
  const t={ id:r.id, token:r.token, code:r.code, eventId:r.event_id, typeId:r.type_id, cabezaId:null,
    holder:r.holder||{name:'',dni:'',email:'',phone:''}, status:r.status };
  setViewTicket(t);
  $('#app').innerHTML=publicWrap(`<div class="public-pad"><div class="txt-c mb16"><div class="badge ${t.status==='used'?'badge-blue':t.status==='void'?'badge-red':'badge-green'}"><span class="dot"></span>${t.status==='used'?'Ya ingresó':t.status==='void'?'Anulada':'Entrada válida'}</div></div>${ticketCardHTML(t)}<div class="row gap8 mt16 no-print"><button class="btn btn-primary grow" onclick="downloadCurrentTicket()">${ic('download')} Descargar entrada</button></div></div>`);
}

/* ============================================================
   INIT
   ============================================================ */
function migrate(){
  let ch=false;
  // Limpieza única de los datos de demostración (entradas, tickets y cabezas de ejemplo)
  if(!state.settings.demoWiped){
    state.tickets=[]; state.requests=[]; state.cabezas=[];
    (state.events||[]).forEach(e=>{ e.types=[]; });
    state.settings.demoWiped=true; ch=true;
  }
  const cmap={'#C9A24B':'#FFFFFF','#9A7BC7':'#C0C0C0','#6FA8C7':'#9E9E9E','#5BBE8B':'#B5B5B5','#E0A93C':'#7E7E7E','#D26A5C':'#6A6A6A'};
  (state.events||[]).forEach(e=>{
    (e.types||[]).forEach(t=>{
      if(t.name==='Free / SREEE'){ t.name='Free'; ch=true; }
      if(cmap[t.color]){ t.color=cmap[t.color]; ch=true; }
      if(t.active===undefined){ t.active=true; ch=true; }
    });
    if(e.id==='ev_gala4' && !e.cover){ e.cover='assets/gala4-cover.jpg'; ch=true; }
  });
  if(ch) DB.save();
}
/* ============================================================
   ARRANQUE + AUTENTICACIÓN (admin + clientes)
   ============================================================ */
let _wasMobile = matchMedia('(max-width:680px)').matches;
async function boot(){
  window.addEventListener('hashchange', render);
  window.addEventListener('resize', ()=>{
    const m = matchMedia('(max-width:680px)').matches; if(m===_wasMobile) return; _wasMobile=m;
    const e = (typeof DB!=='undefined' && DB.activeEvent) ? DB.activeEvent() : null; if(!e) return;
    if(document.getElementById('tickets-host')) refreshTickets(e.id);
    if(document.getElementById('att-host')) refreshAttendees(e.id);
  });
  sb.auth.onAuthStateChange((event)=>{ if(event==='PASSWORD_RECOVERY') renderSetNewPassword(); });
  render();
}
let ADMIN_EMAIL='';
async function loadAdmin(){
  try{ await cloudLoadAll(); }
  catch(e){ console.error(e); toast('No se pudieron cargar los datos','err'); renderAuthPage('login'); return; }
  try{ const s=await cloudSession(); ADMIN_EMAIL=(s&&s.user&&s.user.email)||''; }catch(e){}
  if(!state.settings.symbol) state.settings.symbol = state.settings.currency==='USD'?'$':'S/';
  render();
  subscribeRealtime();
  flushScanQueue();   // sincroniza ingresos que quedaron offline en una sesión previa
}
async function logout(){ try{ await cloudSignOut(); }catch(e){} state=null; ADMIN_EMAIL=''; location.hash='#/home'; render(); }

/* ---------- Cabecera pública (clientes) ---------- */
function custShell(inner, loggedIn, active){
  const right = loggedIn
    ? `<a class="cust-link ${active==='cuenta'?'on':''}" href="#/cuenta">Mi cuenta</a><button class="cust-link as-btn" onclick="logout()">Salir</button>`
    : `<a class="cust-link ${active==='auth'?'on':''}" href="#/login">Iniciar sesión</a>`;
  $('#app').className='app-shell';
  $('#app').innerHTML = `<div class="cust">
    <header class="cust-top">
      <a class="brand-wordmark cust-wm" href="#/home" aria-label="Connect"></a>
      <nav class="cust-nav">${right}</nav>
    </header>
    <main class="cust-main">${inner}</main>
    <footer class="cust-foot">© ${new Date().getFullYear()} Connect · Lima. Productora de eventos premium.</footer>
  </div>`;
}

/* ---------- Home / Acerca de Connect ---------- */
async function renderCustomerHome(){
  stopScanner();
  const s = await cloudSession(); const loggedIn=!!s;
  let cta;
  if(loggedIn){
    const admin = await cloudIsAdmin();
    cta = admin
      ? `<a class="btn btn-primary btn-lg" href="#/dashboard">${ic('dash')} Panel de administración</a><a class="btn btn-ghost btn-lg" href="#/cuenta">Mis entradas</a>`
      : `<a class="btn btn-primary btn-lg" href="#/cuenta">${ic('ticket')} Ver mis entradas</a>`;
  } else {
    cta = `<a class="btn btn-primary btn-lg" href="#/registro">Crear cuenta</a><a class="btn btn-ghost btn-lg" href="#/login">Iniciar sesión</a>`;
  }
  custShell(`
    <section class="hero">
      <div class="brand-rombo hero-rombo"></div>
      <div class="hero-eyebrow">Cada noche una historia</div>
      <h1>Tu entrada, en un solo lugar</h1>
      <p class="hero-sub">Reclama tu código, guarda tu QR y vive los eventos de <b>Connect</b> desde tu celular.</p>
      <div class="hero-cta">${cta}</div>
    </section>
    <section class="about">
      <h2>Acerca de Connect</h2>
      <p class="about-lead">Connect es una productora de eventos premium en Lima. Creamos experiencias de primer nivel: producción impecable, la mejor música y los ambientes más exclusivos de la ciudad.</p>
      <div class="about-grid">
        <div class="about-card"><div class="ac-ic">${ic('ticket')}</div><h3>Entrada digital</h3><p>Reclama tu código y recibe tu QR al instante, listo para el ingreso.</p></div>
        <div class="about-card"><div class="ac-ic">${ic('check2')}</div><h3>Acceso simple</h3><p>Muestras tu QR en la puerta. Sin filas, sin papeles.</p></div>
        <div class="about-card"><div class="ac-ic">${ic('star')}</div><h3>Tu historial</h3><p>Mira tus próximas entradas y los eventos a los que fuiste.</p></div>
      </div>
    </section>`, loggedIn, 'home');
}
async function renderAbout(){ return renderCustomerHome(); }

/* ---------- Login / Registro de clientes (y admin) ---------- */
let AUTH_MODE='login';
function authCardHTML(){
  const isReg = AUTH_MODE==='register';
  return `<div class="auth-wrap"><div class="auth-card">
    <div class="brand-wordmark auth-wm"></div>
    <div class="auth-tagline">Cada noche una historia</div>
    <div class="auth-tabs">
      <button class="${!isReg?'on':''}" onclick="switchAuth('login')">Iniciar sesión</button>
      <button class="${isReg?'on':''}" onclick="switchAuth('register')">Crear cuenta</button>
    </div>
    <form onsubmit="event.preventDefault();${isReg?'doRegister()':'doLogin()'}">
      ${isReg?`<label class="label">Nombre y apellido</label><input id="au-name" autocomplete="name" placeholder="Tu nombre">`:''}
      <label class="label" style="margin-top:${isReg?'12px':'0'}">Email</label>
      <input id="au-email" type="email" autocomplete="username" placeholder="tu@correo.com">
      <label class="label" style="margin-top:12px">Contraseña</label>
      <input id="au-pass" type="password" autocomplete="${isReg?'new-password':'current-password'}" placeholder="••••••••">
      <button class="btn btn-primary btn-block" id="au-btn" type="submit" style="margin-top:18px">${isReg?'Crear mi cuenta':'Entrar'}</button>
      <div id="au-err" class="login-err"></div>
    </form>
    ${isReg?'':`<button class="auth-forgot" onclick="forgotPassword()">¿Olvidaste tu contraseña?</button>`}
  </div></div>`;
}
async function renderAuthPage(mode){
  stopScanner(); state=null; AUTH_MODE=mode||'login';
  custShell(authCardHTML(), false, 'auth');
  setTimeout(()=>{ const el=$('#au-email'); if(el) el.focus(); }, 60);
}
function switchAuth(m){ AUTH_MODE=m; custShell(authCardHTML(), false, 'auth'); setTimeout(()=>{const e=$('#au-'+(m==='register'?'name':'email'));if(e)e.focus();},40); }
function isUnconfirmed(error){ const m=(error&&(error.code||error.message)||'')+''; return /email.?not.?confirmed|not.?confirmed|confirm/i.test(m); }
async function doLogin(){
  const email=($('#au-email').value||'').trim(), pass=$('#au-pass').value||'';
  const err=$('#au-err'); err.textContent='';
  if(!email||!pass){ err.textContent='Completa email y contraseña.'; return; }
  const btn=$('#au-btn'); btn.disabled=true; btn.textContent='Entrando…';
  try{
    const { error } = await cloudSignIn(email, pass);
    if(error){ err.textContent=isUnconfirmed(error)?'Tu cuenta todavía no está confirmada. Revisa tu correo, o escríbenos para activarla.':'Email o contraseña incorrectos.'; btn.disabled=false; btn.textContent='Entrar'; return; }
    const admin = await cloudIsAdmin();
    location.hash = admin ? '#/dashboard' : '#/cuenta';
    render();
  }catch(e){ err.textContent='Error de conexión. Prueba de nuevo.'; btn.disabled=false; btn.textContent='Entrar'; }
}
async function doRegister(){
  const name=($('#au-name').value||'').trim(), email=($('#au-email').value||'').trim(), pass=$('#au-pass').value||'';
  const err=$('#au-err'); err.textContent='';
  if(!name||!email||!pass){ err.textContent='Completa todos los campos.'; return; }
  if(pass.length<6){ err.textContent='La contraseña debe tener al menos 6 caracteres.'; return; }
  const btn=$('#au-btn'); btn.disabled=true; btn.textContent='Creando…';
  try{
    const { data, error } = await cloudSignUp(email, pass, name);
    if(error){ err.textContent=/registered|already|exists/i.test(error.message||'')?'Ya existe una cuenta con ese correo.':(error.message||'No se pudo crear la cuenta.'); btn.disabled=false; btn.textContent='Crear mi cuenta'; return; }
    if(data && data.session){ location.hash='#/cuenta'; render(); }
    else { custShell(`<div class="auth-wrap"><div class="auth-card txt-c"><div class="big-ok">${ic('check')}</div><h2>Revisa tu correo</h2><p class="login-sub">Te enviamos un email para confirmar tu cuenta. Confírmala y vuelve a iniciar sesión.</p><a class="btn btn-primary btn-block" href="#/login" style="margin-top:8px">Ir a iniciar sesión</a></div></div>`, false); }
  }catch(e){ err.textContent='Error de conexión. Prueba de nuevo.'; btn.disabled=false; btn.textContent='Crear mi cuenta'; }
}
async function forgotPassword(){
  const email=($('#au-email').value||'').trim();
  if(!email){ $('#au-err').textContent='Escribe tu email arriba y toca de nuevo.'; return; }
  try{ await cloudResetPassword(email); toast('Te enviamos un email para cambiar tu contraseña','ok'); }
  catch(e){ toast('No se pudo enviar el email','err'); }
}
function renderSetNewPassword(){
  stopScanner();
  custShell(`<div class="auth-wrap"><div class="auth-card">
    <div class="brand-wordmark auth-wm"></div>
    <h2 style="text-align:center">Nueva contraseña</h2>
    <p class="login-sub">Elige tu nueva contraseña.</p>
    <form onsubmit="event.preventDefault();doSetNewPassword()">
      <label class="label">Nueva contraseña</label>
      <input id="np-pass" type="password" autocomplete="new-password" placeholder="••••••••">
      <button class="btn btn-primary btn-block" id="np-btn" type="submit" style="margin-top:16px">Guardar contraseña</button>
      <div id="np-err" class="login-err"></div>
    </form>
  </div></div>`, true);
}
async function doSetNewPassword(){
  const pass=$('#np-pass').value||''; const err=$('#np-err'); err.textContent='';
  if(pass.length<6){ err.textContent='Mínimo 6 caracteres.'; return; }
  const btn=$('#np-btn'); btn.disabled=true; btn.textContent='Guardando…';
  try{ const { error }=await cloudUpdatePassword(pass); if(error){ err.textContent='No se pudo guardar.'; btn.disabled=false; btn.textContent='Guardar contraseña'; return; } toast('Contraseña actualizada','ok'); location.hash='#/cuenta'; render(); }
  catch(e){ err.textContent='Error. Prueba de nuevo.'; btn.disabled=false; btn.textContent='Guardar contraseña'; }
}

/* ---------- Hub del cliente ---------- */
async function renderCustomerHub(tab){
  stopScanner();
  const s = await cloudSession();
  if(!s){ location.hash='#/login'; return; }
  tab = tab||'entradas';
  custShell(`<div class="hub">
    <h1 class="hub-title">Mi cuenta</h1>
    <div class="hub-tabs">
      <button class="${tab==='entradas'?'on':''}" onclick="location.hash='#/cuenta'">Mis entradas</button>
      <button class="${tab==='historial'?'on':''}" onclick="location.hash='#/cuenta/historial'">Historial</button>
      <button class="${tab==='perfil'?'on':''}" onclick="location.hash='#/cuenta/perfil'">Configuración</button>
    </div>
    <div id="hub-body"><div class="empty"><div class="brand-rombo rombo"></div><h3>Cargando…</h3></div></div>
  </div>`, true, 'cuenta');
  if(tab==='perfil') return renderHubProfile();
  return renderHubTickets(tab);
}
async function renderHubTickets(tab){
  let rows=[]; try{ rows=await cloudMyTickets(); }catch(e){ console.error(e); }
  const today=new Date().toISOString().slice(0,10);
  const isPast = r => (r.status==='used') || (r.date_iso && r.date_iso < today);
  const list = (rows||[]).filter(r=> tab==='historial' ? isPast(r) : !isPast(r));
  const host=$('#hub-body'); if(!host) return;
  if(!list.length){
    host.innerHTML=`<div class="empty"><div class="brand-rombo rombo"></div><h3>${tab==='historial'?'Todavía no fuiste a ningún evento':'No tienes entradas activas'}</h3><p>${tab==='historial'?'Aquí vas a ver los eventos a los que asististe.':'Cuando reclames un código, tu entrada aparece aquí.'}</p>${tab!=='historial'?'<a class="btn btn-primary" href="#/home" style="margin-top:6px">¿Cómo reclamar?</a>':''}</div>`;
    return;
  }
  host.innerHTML = `<div class="hub-tickets">${list.map(r=>{
    const dt = r.date_iso? longDate(r.date_iso) : 'Fecha por confirmar';
    const badge = r.status==='used'?'<span class="badge badge-blue">Ya ingresó</span>':r.status==='void'?'<span class="badge badge-red">Anulada</span>':'<span class="badge badge-green">Válida</span>';
    return `<div class="hub-tk">
      <div class="hub-tk-main">
        <div class="hub-tk-ev">${esc(r.event_name)}</div>
        <div class="hub-tk-meta">${dt}${r.venue?` · ${esc(r.venue)}`:''}</div>
        <div class="hub-tk-type"><span class="tt-dot" style="background:${r.color||'#fff'}"></span>${esc(r.type_name||'Entrada')} ${badge}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="window.open('#/t/${r.id}','_blank')">${ic('eye')} Ver QR</button>
    </div>`;}).join('')}</div>`;
}
async function renderHubProfile(){
  const host=$('#hub-body'); if(!host) return;
  let p=null; try{ p=await cloudMyProfile(); }catch(e){}
  if(!p){ host.innerHTML='<div class="empty"><h3>No se pudo cargar tu perfil</h3></div>'; return; }
  host.innerHTML = `<div class="hub-profile">
    <div class="hp-block">
      <div class="field"><label class="label">Nombre y apellido</label><input id="pf-name" value="${esc(p.name||'')}"></div>
      <button class="btn btn-primary btn-sm" onclick="saveCustName()">Guardar nombre</button>
    </div>
    <div class="hp-block">
      <div class="field"><label class="label">Correo electrónico</label><input id="pf-email" type="email" value="${esc(p.email||'')}"></div>
      <button class="btn btn-secondary btn-sm" onclick="changeCustEmail()">Cambiar correo</button>
      <p class="dim sm">Te llegará un email al correo nuevo para confirmar el cambio.</p>
    </div>
    <div class="hp-block">
      <label class="label">Contraseña</label>
      <p class="dim sm" style="margin:0 0 10px">Por seguridad, la contraseña se cambia desde un enlace que te enviamos por correo.</p>
      <button class="btn btn-secondary btn-sm" onclick="changeCustPassword('${esc(p.email||'')}')">Enviarme enlace para cambiar contraseña</button>
    </div>
    <div class="hp-block">
      <button class="btn btn-ghost btn-sm" onclick="logout()">${ic('back')} Cerrar sesión</button>
    </div>
  </div>`;
}
async function saveCustName(){ const n=($('#pf-name').value||'').trim(); if(!n) return toast('Escribe tu nombre','err'); try{ await cloudUpdateName(n); toast('Nombre actualizado','ok'); }catch(e){ toast('No se pudo guardar','err'); } }
async function changeCustEmail(){ const em=($('#pf-email').value||'').trim(); if(!em) return toast('Escribe tu correo','err'); try{ const {error}=await cloudUpdateEmail(em); if(error){ toast('No se pudo cambiar el correo','err'); return; } toast('Te enviamos un email para confirmar','ok'); }catch(e){ toast('No se pudo cambiar el correo','err'); } }
async function changeCustPassword(email){ if(!email) return toast('No encontramos tu correo','err'); try{ await cloudResetPassword(email); toast('Te enviamos un email para cambiar tu contraseña','ok'); }catch(e){ toast('No se pudo enviar el email','err'); } }

document.addEventListener('DOMContentLoaded', boot);
if(document.readyState!=='loading') boot();
