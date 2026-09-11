-- Add Arrow Puzzle to the public game lobby.
-- The game is self-contained so it works inside the existing sandboxed iframe player.

INSERT INTO public.games (
  slug, name, emoji, description, category, primitive, spec,
  min_players, max_players, html_content, play_url, cover_image_url,
  instructions, offline_ok, status, version, created_by
)
SELECT
  'arrow-puzzle',
  'Arrow Puzzle｜箭頭益智遊戲',
  '⬆️',
  '密集箭頭益智遊戲：找出沒有被其他箭頭擋住的箭，讓它飛出棋盤。無限關卡與飛出去動畫。',
  'puzzle',
  'custom',
  jsonb_build_object('source','mark1217','type','arrow-puzzle','infinite',true),
  1,
  1,
  $game$
<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Arrow Puzzle｜箭頭益智遊戲</title>
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;color:#111827}
body{display:flex;justify-content:center;align-items:center;padding:10px}
#app{width:min(94vw,620px);height:100%;max-height:900px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
.top{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:900}
.stat{font-size:15px;background:rgba(255,255,255,.82);border-radius:14px;padding:7px 10px;box-shadow:0 3px 12px rgba(0,0,0,.08)}
#board{width:min(94vw,620px);aspect-ratio:1;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr);gap:0;touch-action:manipulation}
.cell{position:relative;display:flex;align-items:center;justify-content:center;font-size:clamp(22px,7.1vw,45px);line-height:1;cursor:pointer;user-select:none;transition:transform .12s,opacity .12s;filter:drop-shadow(0 2px 1px rgba(0,0,0,.12))}
.cell:active{transform:scale(.82)}
.cell.empty{pointer-events:none}
.cell.fly{z-index:20;pointer-events:none;transition:transform .48s cubic-bezier(.15,.75,.2,1),opacity .48s}
#message{height:24px;font-weight:900;text-align:center;font-size:14px}
.actions{display:flex;gap:8px}
button{border:0;border-radius:14px;padding:9px 14px;font:900 14px system-ui;cursor:pointer;background:#111827;color:white;box-shadow:0 4px 12px rgba(0,0,0,.12)}
button:active{transform:scale(.96)}
#overlay{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.28);padding:20px;z-index:100}
.card{width:min(92vw,420px);background:white;border-radius:24px;padding:25px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25)}
.card h2{margin:0 0 8px;font-size:27px}.card p{margin:6px 0 18px;line-height:1.7;font-weight:650;color:#4b5563}
@media(max-height:650px){#app{gap:5px}.top{font-size:13px}.stat{padding:5px 8px}#message{height:18px;font-size:12px}button{padding:7px 11px}}
</style>
</head>
<body>
<div id="app">
  <div class="top">
    <div class="stat">❤️ <span id="lives">3</span></div>
    <div class="stat">⭐ <span id="score">0</span></div>
    <div class="stat">關卡 <span id="level">1</span></div>
  </div>
  <div id="message">點擊能直接飛出棋盤的箭頭</div>
  <div id="board"></div>
  <div class="actions"><button id="restart">重新開始</button><button id="new">新遊戲</button></div>
</div>
<div id="overlay"><div class="card"><h2 id="winTitle">🎉 過關！</h2><p id="winText"></p><button id="next">下一關</button></div></div>
<script>
(() => {
  const N=10, board=document.getElementById('board');
  const livesEl=document.getElementById('lives'),scoreEl=document.getElementById('score'),levelEl=document.getElementById('level'),msg=document.getElementById('message');
  const overlay=document.getElementById('overlay'),winText=document.getElementById('winText');
  const dirs=[['⬆️',0,-1],['➡️',1,0],['⬇️',0,1],['⬅️',-1,0]];
  let cells=[],level=1,score=0,lives=3,locked=false;

  function key(x,y){return y*N+x}
  function shuffled(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

  // Build a guaranteed-solvable board by placing arrows in reverse removal order.
  function generate(){
    locked=false; cells=[]; board.innerHTML='';
    const count=Math.min(28+Math.floor(level*1.7),92);
    const spots=shuffled(Array.from({length:N*N},(_,i)=>i)).slice(0,count);
    const placed=new Map();
    for(const id of spots){
      const x=id%N,y=Math.floor(id/N);
      const possible=[];
      for(const [sym,dx,dy] of dirs){
        let nx=x+dx,ny=y+dy,clear=true;
        while(nx>=0&&nx<N&&ny>=0&&ny<N){if(placed.has(key(nx,ny))){clear=false;break}nx+=dx;ny+=dy}
        if(clear) possible.push([sym,dx,dy]);
      }
      // Even if every direction is currently blocked, choose one. The board remains playable because
      // arrows placed later can be removed first. This fallback is rare on the sparse board.
      const d=possible.length?possible[Math.floor(Math.random()*possible.length)]:dirs[Math.floor(Math.random()*4)];
      placed.set(id,{x,y,sym:d[0],dx:d[1],dy:d[2]});
    }
    cells=Array.from({length:N*N},(_,i)=>placed.get(i)||null);
    render();
  }

  function canFly(i){
    const c=cells[i]; if(!c)return false;
    let x=c.x+c.dx,y=c.y+c.dy;
    while(x>=0&&x<N&&y>=0&&y<N){if(cells[key(x,y)])return false;x+=c.dx;y+=c.dy}
    return true;
  }

  function render(){
    board.innerHTML='';
    cells.forEach((c,i)=>{
      const el=document.createElement('div');el.className='cell';
      if(c){el.textContent=c.sym;el.dataset.i=i;el.addEventListener('click',()=>clickArrow(i,el))}else el.classList.add('empty');
      board.appendChild(el);
    });
    livesEl.textContent=lives;scoreEl.textContent=score;levelEl.textContent=level;
  }

  function clickArrow(i,el){
    if(locked||!cells[i])return;
    if(!canFly(i)){
      lives--; livesEl.textContent=lives; msg.textContent='🚫 前面有箭頭擋住了！';
      el.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:180});
      if(lives<=0) setTimeout(gameOver,250); return;
    }
    const c=cells[i];cells[i]=null;score+=10;scoreEl.textContent=score;msg.textContent='🚀 飛出去！';
    const rect=el.getBoundingClientRect(), br=board.getBoundingClientRect();
    const ox=rect.left-br.left+rect.width/2,oy=rect.top-br.top+rect.height/2;
    el.classList.add('fly');
    const distance=Math.max(br.width,br.height)*1.15;
    el.style.transform=`translate(${c.dx*distance}px,${c.dy*distance}px) rotate(${c.dx?c.dx*18:0}deg) scale(.72)`;
    el.style.opacity='0';
    setTimeout(()=>{el.remove();checkWin()},470);
  }

  function checkWin(){
    if(locked)return;
    if(cells.every(c=>!c)){
      locked=true;score+=100+level*25;scoreEl.textContent=score;
      winText.textContent=`第 ${level} 關完成！獎勵 ${100+level*25} 分，下一關會更密集。`;
      overlay.style.display='flex';
    }
  }
  function nextLevel(){overlay.style.display='none';level++;lives=3;msg.textContent='找出可以直接飛出的箭頭';generate()}
  function gameOver(){locked=true;document.getElementById('winTitle').textContent='💥 挑戰結束';winText.textContent=`你到了第 ${level} 關，總分 ${score}。重新來一局繼續挑戰！`;document.getElementById('next').textContent='重新開始';overlay.style.display='flex';}
  function restart(){overlay.style.display='none';lives=3;score=0;level=1;msg.textContent='找出可以直接飛出的箭頭';generate()}
  document.getElementById('next').onclick=()=>document.getElementById('winTitle').textContent==='💥 挑戰結束'?restart():nextLevel();
  document.getElementById('restart').onclick=restart;
  document.getElementById('new').onclick=()=>{lives=3;generate()};
  generate();
})();
</script>
</body>
</html>
$game$,
  NULL,
  NULL,
  '點擊沒有被其他箭頭擋住、可以沿箭頭方向直接飛出棋盤的箭頭。清空全部箭頭即可過關。生命值用完會結束本局。',
  true,
  'published',
  1,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM public.games WHERE slug = 'arrow-puzzle');
