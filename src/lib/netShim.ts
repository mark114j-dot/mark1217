// Client-safe string: the multiplayer bridge injected into every published game's HTML.
// The game iframe is sandboxed with connect-src 'none', so it cannot talk to the backend
// directly. Instead it talks to the host page via postMessage, and the host page performs
// all realtime networking (presence, broadcast, room state) with the platform backend.

export const NET_SHIM = `<script>(function(){
  if (window.NET) return;
  var listeners = {}, state = {}, me = null, players = [], started = false;
  function emit(t, d){ (listeners[t]||[]).forEach(function(f){ try{ f(d); }catch(e){ console.error(e); } }); }
  function post(t, p){ try{ parent.postMessage({ __net: true, type: t, payload: p }, '*'); }catch(e){} }
  window.addEventListener('message', function(e){
    var m = e.data; if (!m || m.__nethost !== true) return;
    if (m.type === 'init') { me = m.payload.me; players = m.payload.players || []; state = m.payload.state || {}; emit('ready', { me: me, players: players, state: state }); emit('players', players); }
    else if (m.type === 'players') { players = m.payload || []; emit('players', players); }
    else if (m.type === 'state') { state = m.payload || {}; emit('state', state); }
    else if (m.type === 'start') { started = true; emit('start', m.payload || {}); }
    else if (m.type === 'event') { var p = m.payload || {}; emit('event', p); if (p.type) emit(p.type, p); }
  });
  window.NET = {
    on: function(t, f){ (listeners[t] = listeners[t] || []).push(f); return this; },
    ready: function(f){ if (me) f({ me: me, players: players, state: state }); else this.on('ready', f); return this; },
    me: function(){ return me; },
    players: function(){ return players; },
    isHost: function(){ return !!(me && players[0] && players[0].id === me); },
    isStarted: function(){ return started; },
    send: function(type, data){ post('event', { type: type, data: data, from: me }); },
    getState: function(){ return state; },
    setState: function(patch){ state = Object.assign({}, state, patch || {}); post('state', state); },
    setReady: function(v){ post('ready', { ready: v !== false }); },
    start: function(d){ post('start', d || {}); },
    leave: function(){ post('leave', {}); }
  };
  post('init', {});
})();<\/script>`;

/** Assemble HTML/CSS/JS/multiplayer-JS blocks into a single runnable game document. */
export function composeGameHtml(opts: {
  title?: string;
  html: string;
  css: string;
  js: string;
  mp?: string;
}) {
  const { title = "Game", html, css, js, mp = "" } = opts;
  const mpBlock = mp.trim()
    ? `<script>(function(){try{${mp}}catch(e){console.error(e);}})();<\/script>`
    : "";
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>html,body{margin:0;padding:0;height:100%;font-family:system-ui,sans-serif;}${css}</style></head><body>${html}${NET_SHIM}${mpBlock}<script>(function(){try{${js}}catch(e){console.error(e);}})();<\/script></body></html>`;
}
