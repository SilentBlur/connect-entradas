/* ============================================================
   CONNECT · ENTRADAS — cloud.js
   Backend real con Supabase. Provee:
   - cliente + mapeo fila(DB) <-> objeto(app)
   - cloudLoadAll()  : carga toda la base al `state` (admin)
   - cloudSaveQueued(): sincroniza los cambios del `state` a la nube
   - auth (login/logout) + helpers públicos (RPC) para reclamar entradas
   Se carga ANTES de app.js. Usa los globales `state`, `toast`, `render`.
   ============================================================ */
'use strict';

const SUPA_URL = 'https://ynaotlpmuyqymrzlulxx.supabase.co';
const SUPA_KEY = 'sb_publishable_D2Zm9Gp3smh2b4rpc6bXYg___Ue2t6w';
const sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

/* ---------- Mapeo fila (snake_case DB)  <->  objeto (camelCase app) ---------- */
const eventToRow = e => ({ id:e.id, name:e.name, status:e.status||'draft', description:e.description||null,
  date_iso:e.dateISO||null, start_time:e.time||null, venue:e.venue||null, address:e.address||null,
  city:e.city||null, cover:e.cover||null, created_at:e.createdAt||null });
const rowToEvent = r => ({ id:r.id, name:r.name, status:r.status, description:r.description||'',
  dateISO:r.date_iso||'', time:r.start_time||'', venue:r.venue||'', address:r.address||'', city:r.city||'',
  cover:r.cover||'', createdAt:r.created_at||0, types:[] });

const typeToRow = (t, eventId) => ({ id:t.id, event_id:eventId, name:t.name, kind:t.kind||'general',
  access:t.access||'paid', price:Number(t.price)||0, capacity:Number(t.capacity)||0, color:t.color||null,
  includes:t.includes||[], descr:t.desc||null, active:t.active!==false });
const rowToType = r => ({ id:r.id, name:r.name, kind:r.kind, access:r.access, price:Number(r.price)||0,
  capacity:Number(r.capacity)||0, color:r.color||'', includes:r.includes||[], desc:r.descr||'', active:r.active!==false });

const cabezaToRow = c => ({ id:c.id, name:c.name, phone:c.phone||null, email:c.email||null,
  prefix:c.prefix||null, created_at:c.createdAt||null });
const rowToCabeza = r => ({ id:r.id, name:r.name, phone:r.phone||'', email:r.email||'', prefix:r.prefix||'', createdAt:r.created_at||0 });

const ticketToRow = t => ({ id:t.id, code:t.code, token:t.token, event_id:t.eventId, type_id:t.typeId||null,
  cabeza_id:t.cabezaId||null, holder:t.holder||{name:'',dni:'',email:'',phone:''}, status:t.status||'unclaimed',
  payment:t.payment||'paid', price:Number(t.price)||0, source:t.source||'admin', created_at:t.createdAt||null,
  claimed_at:t.claimedAt||null, used_at:t.usedAt||null });
const rowToTicket = r => ({ id:r.id, code:r.code, token:r.token, eventId:r.event_id, typeId:r.type_id,
  cabezaId:r.cabeza_id, holder:r.holder||{name:'',dni:'',email:'',phone:''}, status:r.status, payment:r.payment,
  price:Number(r.price)||0, source:r.source||'admin', createdAt:r.created_at||0, claimedAt:r.claimed_at, usedAt:r.used_at });

const requestToRow = r => ({ id:r.id, event_id:r.eventId, cabeza_id:r.cabezaId||null, type_id:r.typeId||null,
  name:r.name, dni:r.dni||null, email:r.email||null, phone:r.phone||null, note:r.note||null,
  status:r.status||'pending', created_at:r.createdAt||null });
const rowToRequest = r => ({ id:r.id, eventId:r.event_id, cabezaId:r.cabeza_id, typeId:r.type_id, name:r.name,
  dni:r.dni||'', email:r.email||'', phone:r.phone||'', note:r.note||'', status:r.status, createdAt:r.created_at||0 });

const settingsToRow = s => ({ id:1, org:s.org||'Connect', currency:s.currency||'PEN', symbol:s.symbol||'S/',
  active_event_id:s.activeEventId||null, scan_pin:s.scanPin||null, pay_info:s.payInfo||null, base_url:s.baseUrl||null });
const rowToSettings = r => ({ org:r.org||'Connect', currency:r.currency||'PEN', symbol:r.symbol||'S/',
  activeEventId:r.active_event_id||null, scanPin:r.scan_pin||'', payInfo:r.pay_info||'', baseUrl:r.base_url||'' });

const DEFAULT_SETTINGS = { org:'Connect', currency:'PEN', symbol:'S/', activeEventId:null, scanPin:'', payInfo:'', baseUrl:'' };

/* ---------- Carga completa (admin) ---------- */
async function cloudLoadAll(){
  const [ev, ty, cb, tk, rq, st] = await Promise.all([
    sb.from('events').select('*'),
    sb.from('ticket_types').select('*'),
    sb.from('cabezas').select('*'),
    sb.from('tickets').select('*'),
    sb.from('requests').select('*'),
    sb.from('settings').select('*').eq('id',1).maybeSingle(),
  ]);
  const err = ev.error||ty.error||cb.error||tk.error||rq.error||st.error;
  if(err) throw err;
  const events = (ev.data||[]).map(rowToEvent);
  const byEvent = {};
  (ty.data||[]).forEach(r=>{ (byEvent[r.event_id]=byEvent[r.event_id]||[]).push(rowToType(r)); });
  events.forEach(e=> e.types = byEvent[e.id]||[]);
  state = {
    events,
    cabezas: (cb.data||[]).map(rowToCabeza),
    tickets: (tk.data||[]).map(rowToTicket),
    requests:(rq.data||[]).map(rowToRequest),
    settings: st.data ? rowToSettings(st.data) : Object.assign({}, DEFAULT_SETTINGS)
  };
  cloudSnapshot();
}

/* ---------- Guardado por diferencias (admin) ---------- */
let _snap = null;
function cloudSnapshot(){
  _snap = JSON.parse(JSON.stringify({ events:state.events, cabezas:state.cabezas,
    tickets:state.tickets, requests:state.requests, settings:state.settings }));
}
function _flatTypes(events){ const o=[]; (events||[]).forEach(e=>(e.types||[]).forEach(t=>o.push(Object.assign({__e:e.id}, t)))); return o; }
async function _diffUpsert(table, cur, snap, mapper){
  const snapJson = new Map(snap.map(x=>[x.id, JSON.stringify(x)]));
  const ups = [];
  for(const x of cur){ const s = snapJson.get(x.id); if(s===undefined || s!==JSON.stringify(x)) ups.push(mapper(x)); }
  if(ups.length){ const { error } = await sb.from(table).upsert(ups); if(error) throw error; }
}
async function _diffDelete(table, cur, snap){
  const curIds = new Set(cur.map(x=>x.id));
  const del = snap.filter(x=>!curIds.has(x.id)).map(x=>x.id);
  if(del.length){ const { error } = await sb.from(table).delete().in('id', del); if(error) throw error; }
}
async function cloudSave(){
  if(!_snap) return; // modo público: no sincroniza el state completo
  // Upserts (padres primero por las FK)
  await _diffUpsert('events',       state.events,            _snap.events,            eventToRow);
  await _diffUpsert('cabezas',      state.cabezas,           _snap.cabezas,           cabezaToRow);
  await _diffUpsert('ticket_types', _flatTypes(state.events),_flatTypes(_snap.events),t=>typeToRow(t, t.__e));
  await _diffUpsert('tickets',      state.tickets,           _snap.tickets,           ticketToRow);
  await _diffUpsert('requests',     state.requests,          _snap.requests,          requestToRow);
  if(JSON.stringify(state.settings)!==JSON.stringify(_snap.settings)){
    const { error } = await sb.from('settings').upsert(settingsToRow(state.settings)); if(error) throw error;
  }
  // Deletes (hijos primero)
  await _diffDelete('tickets',      state.tickets,            _snap.tickets);
  await _diffDelete('requests',     state.requests,           _snap.requests);
  await _diffDelete('ticket_types', _flatTypes(state.events), _flatTypes(_snap.events));
  await _diffDelete('events',       state.events,             _snap.events);
  await _diffDelete('cabezas',      state.cabezas,            _snap.cabezas);
  cloudSnapshot();
}
let _saveChain = Promise.resolve();
function cloudSaveQueued(){
  _saveChain = _saveChain.then(cloudSave).catch(err=>{ console.error('cloudSave', err); if(window.toast) toast('No se pudo guardar en la nube','err'); });
  return _saveChain;
}

/* ---------- Auth (admin) ---------- */
async function cloudSession(){ const { data } = await sb.auth.getSession(); return data.session; }
async function cloudSignIn(email, password){ return await sb.auth.signInWithPassword({ email, password }); }
async function cloudSignOut(){ await sb.auth.signOut(); }

/* ---------- Helpers públicos (sin login, vía RPC seguras) ---------- */
async function cloudGetEventPublic(eid){
  const { data:e } = await sb.from('events').select('*').eq('id', eid).maybeSingle();
  if(!e) return null;
  const { data:types } = await sb.from('ticket_types').select('*').eq('event_id', eid).eq('active', true);
  const ev = rowToEvent(e); ev.types = (types||[]).map(rowToType); return ev;
}
async function cloudLookupTicket(eid, code){
  const { data, error } = await sb.rpc('lookup_ticket', { p_event_id:eid, p_code:code });
  if(error) throw error; return data && data[0];
}
async function cloudClaimTicket(id, holder, cabezaId){
  const { data, error } = await sb.rpc('claim_ticket', { p_id:id, p_name:holder.name||'', p_dni:holder.dni||'',
    p_email:holder.email||'', p_phone:holder.phone||'', p_cabeza_id:cabezaId||null });
  if(error) throw error; return data && data[0];
}
async function cloudGetTicket(id){
  const { data, error } = await sb.rpc('get_ticket', { p_id:id });
  if(error) throw error; return data && data[0];
}
async function cloudSubmitRequest(p){
  const { data, error } = await sb.rpc('submit_request', { p_event_id:p.eventId, p_cabeza_id:p.cabezaId||null,
    p_type_id:p.typeId||null, p_name:p.name||'', p_dni:p.dni||'', p_email:p.email||'', p_phone:p.phone||'', p_note:p.note||'' });
  if(error) throw error; return data;
}

/* ---------- Realtime (se activa más adelante) ---------- */
let _rtTimer = null;
function subscribeRealtime(){
  try{
    sb.channel('connect-sync')
      .on('postgres_changes', { event:'*', schema:'public' }, ()=>{
        clearTimeout(_rtTimer);
        _rtTimer = setTimeout(async ()=>{ try{ await cloudLoadAll(); if(window.render) render(); }catch(e){} }, 900);
      })
      .subscribe();
  }catch(e){ console.warn('realtime off', e); }
}
