/* ============================================================
   CONNECT · ENTRADAS — client.js
   Mejoras SOLO de la parte visible para el cliente.
   Se carga DESPUÉS de app.js y "envuelve" funciones globales
   (submitRequest / confirmRedeem) para validar los datos ANTES
   de enviarlos, sin modificar app.js. Cero conflicto en Git.
   ============================================================ */
(function(){
  'use strict';

  function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function onlyDigits(v){ return (v||'').replace(/\D/g,''); }

  function fieldOf(input){ return input.closest('.field') || input.parentNode; }
  function clearErr(field){
    if(!field) return;
    field.classList.remove('cx-bad');
    var e = field.querySelector('.cx-err'); if(e) e.remove();
  }
  function setErr(input, msg){
    var field = fieldOf(input);
    field.classList.add('cx-bad');
    var e = field.querySelector('.cx-err');
    if(!e){
      e = document.createElement('div');
      e.className = 'cx-err';
      e.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12.5"/><line x1="12" y1="16" x2="12" y2="16"/></svg><span></span>';
      field.appendChild(e);
    }
    e.querySelector('span').textContent = msg;
    // se limpia solo en cuanto el usuario corrige
    input.addEventListener('input', function once(){ clearErr(field); input.removeEventListener('input', once); });
    return false;
  }

  // Valida el bloque de datos visible. prefix = 'cl' (solicitar) o 'rc' (canjear con código)
  function validateClaimData(prefix){
    var nm = document.getElementById(prefix + '-name');
    var em = document.getElementById(prefix + '-email');
    var ph = document.getElementById(prefix + '-phone');

    [nm, em, ph].forEach(function(i){ if(i) clearErr(fieldOf(i)); });

    var ok = true, firstBad = null;
    function fail(input, msg){ setErr(input, msg); ok = false; firstBad = firstBad || input; }

    if(nm && (nm.value || '').trim().length < 3) fail(nm, 'Poné tu nombre y apellido');

    var emv = em ? (em.value || '').trim() : '';
    var phv = ph ? (ph.value || '').trim() : '';

    if(em && emv && !emailOk(emv)) fail(em, 'Revisá tu email');
    if(ph && phv && onlyDigits(phv).length < 7) fail(ph, 'El celular está incompleto');

    // Hace falta al menos un contacto para enviarte la entrada
    if(em && ph && !emv && !phv) fail(ph, 'Dejá un email o celular para enviarte la entrada');

    if(firstBad) firstBad.focus();
    return ok;
  }

  // Envuelve una función global: valida primero; si falla, no la ejecuta.
  function wrap(name, prefix){
    var orig = window[name];
    if(typeof orig !== 'function') return;
    window[name] = function(){
      if(!validateClaimData(prefix)) return;
      return orig.apply(this, arguments);
    };
  }

  /* ----------------------------------------------------------
     CUENTA REGRESIVA al evento
     Se inyecta bajo los datos (fecha/hora/lugar) de la página
     del evento, leyendo la fecha del evento ya cargado.
     ---------------------------------------------------------- */
  function eventDateTime(e){
    if(!e || !e.dateISO) return null;
    var t = (e.time && /^\d{1,2}:\d{2}/.test(e.time)) ? e.time : '00:00';
    if(t.length === 4) t = '0' + t;                 // "9:00" -> "09:00"
    var dt = new Date(e.dateISO + 'T' + t + ':00');
    return isNaN(dt.getTime()) ? null : dt;
  }

  function tick(el, target){
    if(!document.body.contains(el)){ clearInterval(window.__cxCdTimer); return; }
    var diff = target.getTime() - Date.now();
    var grid = el.querySelector('.cx-cd-grid');
    var label = el.querySelector('.cx-cd-label');
    if(diff <= 0){
      if(label) label.textContent = '';
      grid.innerHTML = '<div class="cx-cd-live">El evento ya está en marcha</div>';
      clearInterval(window.__cxCdTimer);
      return;
    }
    var s = Math.floor(diff / 1000);
    var days = Math.floor(s / 86400); s -= days * 86400;
    var hrs  = Math.floor(s / 3600);  s -= hrs * 3600;
    var mins = Math.floor(s / 60);    var secs = s - mins * 60;
    var vals = [days, hrs, mins, secs];
    var nums = grid.querySelectorAll('.cx-cd-num');
    if(nums.length !== 4){
      grid.innerHTML = ['días','hs','min','seg'].map(function(u){
        return '<div class="cx-cd-cell"><div class="cx-cd-num">00</div><div class="cx-cd-unit">' + u + '</div></div>';
      }).join('');
      nums = grid.querySelectorAll('.cx-cd-num');
    }
    nums.forEach(function(n, i){ n.textContent = String(vals[i]).padStart(2, '0'); });
  }

  function mountCountdown(){
    try{
      if(typeof claimState === 'undefined' || !claimState || !claimState.eid) return;
      var info = document.querySelector('.evp-info'); if(!info) return;
      var meta = info.querySelector('.evp-meta'); if(!meta) return;
      var e = (typeof DB !== 'undefined' && DB.event) ? DB.event(claimState.eid) : null;
      var target = eventDateTime(e); if(!target) return;

      var old = info.querySelector('.cx-countdown'); if(old) old.remove();
      var el = document.createElement('div');
      el.className = 'cx-countdown';
      el.innerHTML = '<div class="cx-cd-label">Faltan</div><div class="cx-cd-grid"></div>';
      meta.insertAdjacentElement('afterend', el);

      tick(el, target);
      clearInterval(window.__cxCdTimer);
      window.__cxCdTimer = setInterval(function(){ tick(el, target); }, 1000);
    }catch(err){ /* silencioso: nunca romper la página por la cuenta regresiva */ }
  }

  // Envuelve renderClaim para montar la cuenta regresiva tras dibujar el evento.
  function wrapRenderClaim(){
    var orig = window.renderClaim;
    if(typeof orig !== 'function') return;
    window.renderClaim = async function(){
      var r = await orig.apply(this, arguments);
      mountCountdown();
      return r;
    };
  }

  function install(){
    wrap('submitRequest', 'cl');  // "Solicitar entrada"  → #cl-name / #cl-email / #cl-phone
    wrap('confirmRedeem', 'rc');  // datos al canjear      → #rc-name / #rc-email / #rc-phone
    wrapRenderClaim();
    mountCountdown();             // por si la página del evento ya está dibujada
  }

  // app.js ya está cargado (este script va después), así que las funciones existen.
  install();
})();
