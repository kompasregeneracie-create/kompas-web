/* =========================================================
   KOMPONENT: JADRO · semienko, čas, dych
   Vložiť raz, pred ostatné komponenty.
   ========================================================= */
(function(){
  var K = window.Kompas = window.Kompas || {};
  var koren = document.documentElement;

  K.menejPohybu = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // semienko: pri každej návšteve iné
  K.semienko = Math.floor(Math.random()*90000)+10000;
  K.nahoda = function(semienko){           // mulberry32
    var a = semienko>>>0;
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a>>>15, 1 | a);
      t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t;
      return ((t ^ t>>>14)>>>0)/4294967296;
    };
  };
  K.ukazSemienko = function(){
    var el = document.querySelectorAll('[data-semienko]');
    for(var i=0;i<el.length;i++) el[i].textContent = K.semienko;
  };

  // čas a ročné obdobie podľa hodín návštevníka
  // hranice: [ráno od, deň od, večer od, noc od]
  var HRANICE = {zima:[7,10,15,18], jar:[6,10,17,20], leto:[5,10,19,22], jesen:[6,10,16,19]};
  K.nastavCas = function(cas, obdobie){
    var d = new Date(), m = d.getMonth(), h = d.getHours();
    var o = obdobie || (m<2||m===11 ? 'zima' : m<5 ? 'jar' : m<8 ? 'leto' : 'jesen');
    var hr = HRANICE[o];
    var c = cas || (h<hr[0]||h>=hr[3] ? 'noc' : h<hr[1] ? 'rano' : h<hr[2] ? 'den' : 'vecer');
    koren.setAttribute('data-cas', c);
    koren.setAttribute('data-obdobie', o);
    if(K.podhubie) K.podhubie.prefarbi();
  };
  K.nastavCas();
  setInterval(function(){ if(!K.rucnyCas) K.nastavCas(); }, 10*60*1000);

  // dych: všetky animácie sa zosynchronizujú s hodinami, aj medzi komponentmi
  koren.style.setProperty('--dych-posun', -(Date.now()%10000)+'ms');

  document.addEventListener('DOMContentLoaded', K.ukazSemienko);
})();

/* =========================================================
   KOMPONENT: PODHUBIE
   Potrebuje: <canvas id="podhubie"> hneď za <body>, JADRO.
   Vlákna rastú len tam, kde nie je text (mimo .obal a [data-ticho]).
   ========================================================= */
(function(){
  var K = window.Kompas;
  var platno = document.getElementById('podhubie');
  if(!platno || !platno.getContext) return;
  var ctx = platno.getContext('2d');

  var NASTAVENIA = {
    krok: 7,              // dĺžka jedného článku vlákna v px
    rychlostRastu: 300,   // px za sekundu
    hustota: 1,           // 0.5 redšie, 1.5 hustejšie
    dosahDotyku: 130,     // px okolo kurzora alebo prsta
    silaDotyku: 24,       // o koľko px vlákna uhnú
    maxBodov: 60000
  };
  if(platno.dataset.hustota) NASTAVENIA.hustota = parseFloat(platno.dataset.hustota);

  var W=0, H=0, vh=0, dpr=1, vrch=0, vyska=0;
  var ticho=[], tmave=[], stromy=[], vlakna=[], poStyle=[];
  var raf=0, vynut=true, prvy=true;
  var farby=null;
  var dotyk={x:-9999,y:-9999,sila:0,ciel:0,cas:0,cx:-9999,cy:-9999};

  function meraj(){
    var sy = window.pageYOffset;
    W = document.documentElement.clientWidth;
    H = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    vh = window.innerHeight;
    ticho = [];
    var el = document.querySelectorAll('.obal,[data-ticho]');
    for(var i=0;i<el.length;i++){
      var r = el[i].getBoundingClientRect(), cs = getComputedStyle(el[i]);
      var pl = parseFloat(cs.paddingLeft)||0, pr = parseFloat(cs.paddingRight)||0;
      ticho.push({x0:r.left+pl-12, x1:r.right-pr+12, y0:r.top+sy-26, y1:r.bottom+sy+26});
    }
    tmave = [];
    el = document.querySelectorAll('[data-tma]');
    for(i=0;i<el.length;i++){ r = el[i].getBoundingClientRect(); tmave.push({y0:r.top+sy, y1:r.bottom+sy}); }
  }
  function volno(x,y){
    if(x<2||x>W-2||y<2||y>H-2) return false;
    for(var i=0;i<ticho.length;i++){ var t=ticho[i]; if(y>t.y0&&y<t.y1&&x>t.x0&&x<t.x1) return false; }
    return true;
  }
  function jeTma(y){
    for(var i=0;i<tmave.length;i++){ if(y>=tmave[i].y0&&y<tmave[i].y1) return 1; }
    return 0;
  }

  function generuj(){
    meraj();
    var rnd = K.nahoda(K.semienko);
    var krok = NASTAVENIA.krok, maly = W<760;
    var hust = NASTAVENIA.hustota*(maly?0.7:1);
    stromy=[]; vlakna=[]; poStyle=[[],[],[],[],[],[],[],[]];
    var bodov=0, rad=[];

    function zasad(x,y,uhly){
      if(!volno(x,y)) return;
      var s = stromy.length; stromy.push({y:y, start:-1});
      for(var i=0;i<uhly.length;i++){
        var hl=y/H;
        rad.push({x:x,y:y,a:uhly[i],gen:0,d:0,zost:(260+rnd()*380)*(0.85+hl*hl*0.6),s:s});
      }
    }
    // 1) okraje stránky: smerom dole hustnú
    for(var y=40;y<H-20;y+=90){
      var hl=y/H, p=(0.13+hl*hl*hl*0.34)*hust;
      if(rnd()<p) zasad(3+rnd()*5, y+rnd()*80, [0.25+rnd()*0.9]);
      if(rnd()<p) zasad(W-3-rnd()*5, y+rnd()*80, [Math.PI-0.25-rnd()*0.9]);
    }
    // 2) pásy medzi sekciami a ich uzly
    var pasy = document.querySelectorAll('.pas'), sy=window.pageYOffset;
    for(var i=0;i<pasy.length;i++){
      var r = pasy[i].getBoundingClientRect(), y0=r.top+sy, hp=r.height, hl2=y0/H;
      var uz = pasy[i].querySelector('.uzol');
      if(uz){
        var ur = uz.getBoundingClientRect(), n=4+Math.floor(rnd()*3), uhly=[], z=rnd()*6.28;
        for(var j=0;j<n;j++) uhly.push(z+j*6.283/n+(rnd()-.5)*0.5);
        zasad(ur.left+ur.width/2, ur.top+sy+ur.height/2, uhly);
      }
      var pocet = Math.round((1+hl2*hl2*2.6)*hust);
      for(j=0;j<pocet;j++) zasad(20+rnd()*(W-40), y0+hp*(0.2+rnd()*0.6), [rnd()*6.283]);
    }

    function nove(x,y,d,sirka,tma,s){
      var v = {pts:[x,y], d0:d, w:sirka, tma:tma, s:s, hrot:false, y0:y, y1:y, vytrus:0};
      vlakna.push(v); poStyle[tma*4+sirka].push(v);
      return v;
    }
    // rast do šírky: staršie vetvy najprv
    while(rad.length && bodov<NASTAVENIA.maxBodov){
      var t = rad.shift();
      var x=t.x, y2=t.y, a=t.a, d=t.d, zost=t.zost, gen=t.gen, om=0;
      var hl3 = y2/H;
      var sirka = gen===0 ? (hl3>0.7?3:2) : gen===1 ? 1 : 0;
      var v = nove(x,y2,d,sirka,jeTma(y2),t.s);
      while(zost>0){
        hl3 = y2/H;
        om = om*0.8 + (rnd()-.5)*(gen?0.17:0.11);   // zotrvačnosť: vlákno sa vlní plynulo
        a += om;
        if(gen===0) a += Math.sin(Math.PI/2-a)*0.028*(0.4+hl3*2.2);     // ťah nadol, v hĺbke silnejší
        var nx=x+Math.cos(a)*krok, ny=y2+Math.sin(a)*krok;
        if(!volno(nx,ny)){
          if(rnd()<0.55) break;                       // pri texte vlákno väčšinou skončí, neobkresľuje ho
          var ok=false, st2=rnd()<.5?1:-1, skus=[1.1*st2,-1.1*st2,1.9*st2,-1.9*st2,2.6,3.14];
          for(var q=0;q<6;q++){
            var b=a+skus[q]; nx=x+Math.cos(b)*krok; ny=y2+Math.sin(b)*krok;
            if(volno(nx,ny)){ a=b; om=0; ok=true; break; }
          }
          if(!ok) break;
        }
        var tm = jeTma(ny);
        if(tm!==v.tma){ v = nove(x,y2,d,sirka,tm,t.s); }
        x=nx; y2=ny; d+=krok; zost-=krok; bodov++;
        v.pts.push(x,y2);
        if(y2<v.y0) v.y0=y2; if(y2>v.y1) v.y1=y2;
        if(gen<3 && rnd()<(gen===0?0.075:gen===1?0.07:0.1)*(0.75+hl3*hl3*0.7)*Math.min(hust,1.3)){
          // jemné rozvetvenie až po tenké chĺpky: tak vyzerá podhubie
          rad.push({x:x,y:y2,a:a+(rnd()<.5?-1:1)*(0.45+rnd()*0.75),gen:gen+1,d:d,
            zost:gen===0?(90+rnd()*200):gen===1?(28+rnd()*80):(10+rnd()*26), s:t.s});
        }
      }
      v.hrot = true;
      v.vytrus = rnd()<0.42 ? 1.1+rnd()*1.5 : 0;
    }
    for(i=0;i<vlakna.length;i++) vlakna[i].dlzka = (vlakna[i].pts.length/2-1)*krok;
  }

  function nacitajFarby(){
    var cs = getComputedStyle(document.documentElement);
    var vl = (cs.getPropertyValue('--vlakno')||'142,170,147').trim();
    var vy = (cs.getPropertyValue('--vytrus')||'142,170,147').trim();
    var s = parseFloat(cs.getPropertyValue('--vlakno-sila'))||1;
    farby = {
      ciara: [
        'rgba('+vl+','+(0.6*s)+')', 'rgba('+vl+','+(0.9*s)+')', 'rgba(98,130,106,'+(0.8*s)+')', 'rgba(24,53,51,'+(0.36*s)+')',
        'rgba('+vl+','+(0.3*s)+')', 'rgba('+vl+','+(0.5*s)+')', 'rgba('+vl+','+(0.7*s)+')', 'rgba('+vl+','+(0.9*s)+')'
      ],
      hrubka: [0.75,1.1,1.6,2.6, 0.75,1.1,1.6,2.6],
      vytrus: 'rgba('+vy+',.9)',
      vytrusTma: 'rgba('+vy+',.75)'
    };
  }

  function rozmer(){
    dpr = Math.min(window.devicePixelRatio||1, W<800?2:1.5);
    vyska = Math.min(Math.round(vh*1.9), H);
    platno.width = Math.round(W*dpr);
    platno.height = Math.round(vyska*dpr);
    platno.style.height = vyska+'px';
    vrch = -1;
  }
  function umiestni(sy){
    if(vrch<0 || sy<vrch+30 && vrch>0 || sy+vh>vrch+vyska-30 && vrch+vyska<H){
      vrch = Math.max(0, Math.min(H-vyska, Math.round(sy-(vyska-vh)/2)));
      platno.style.transform = 'translate3d(0,'+vrch+'px,0)';
      return true;
    }
    return false;
  }

  function kresli(teraz){
    raf = 0;
    if(!poStyle.length) return;            // les ešte nie je zasadený
    if(!farby) nacitajFarby();
    var sy = window.pageYOffset, i, j;
    var posun = umiestni(sy);
    var rastie = false;

    // stromy začnú rásť, keď sa k nim návštevník priblíži
    var hranica = sy+vh*0.94;
    for(i=0;i<stromy.length;i++){
      var st = stromy[i];
      if(st.start===-1 && st.y<hranica){
        if(K.menejPohybu || st.y<sy-60 && !prvy){ st.start = -1e9; st.hotovo = true; }
        else st.start = teraz + (prvy ? 250+Math.random()*900 : Math.random()*250);
      }
    }
    prvy = false;

    // dotyk: sila pomaly doznieva
    if(dotyk.ciel && teraz-dotyk.cas>700) dotyk.ciel = 0;
    dotyk.sila += (dotyk.ciel-dotyk.sila)*0.1;
    dotyk.cx += (dotyk.x-dotyk.cx)*0.25; dotyk.cy += (dotyk.y-dotyk.cy)*0.25;
    var aktivny = dotyk.sila>0.012;
    if(!aktivny && !dotyk.ciel) dotyk.sila = 0;

    var y0 = vrch-20, y1 = vrch+vyska+20;
    var krok = NASTAVENIA.krok, R = NASTAVENIA.dosahDotyku, R2=R*R, F=NASTAVENIA.silaDotyku*dotyk.sila;
    var px = dotyk.cx, py = dotyk.cy;
    var bodky=[[],[]];

    // najprv zistíme, či sa niečo mení; ak nie, neprekresľujeme
    if(!posun && !vynut && !aktivny){
      var zmena=false;
      for(i=0;i<stromy.length;i++){ st=stromy[i]; if(st.start>0 && st.y>y0-900 && st.y<y1+200 && !st.hotovo){ zmena=true; break; } }
      if(!zmena) return;
    }
    vynut = false;

    ctx.setTransform(dpr,0,0,dpr,0,-vrch*dpr);
    ctx.clearRect(0,vrch,W,vyska);
    ctx.lineCap='round'; ctx.lineJoin='round';
    var rastuce = {};

    for(var s=0;s<8;s++){
      var zoz = poStyle[s]; if(!zoz.length) continue;
      ctx.beginPath();
      for(i=0;i<zoz.length;i++){
        var v = zoz[i];
        if(v.y1<y0 || v.y0>y1) continue;
        var strom = stromy[v.s];
        if(strom.start===-1) continue;
        var vyrast = (teraz-strom.start)*NASTAVENIA.rychlostRastu/1000 - v.d0;
        if(vyrast<=0){ rastie=true; rastuce[v.s]=1; continue; }
        var p = v.pts, n = p.length/2, plne = vyrast>=v.dlzka;
        var kolko = plne ? n : Math.min(n, Math.floor(vyrast/krok)+1);
        var x, y, lx=0, ly=0;
        for(j=0;j<kolko;j++){
          x=p[j*2]; y=p[j*2+1];
          if(aktivny){
            var dx=x-px, dy=y-py, d2=dx*dx+dy*dy;
            if(d2<R2 && d2>0.01){ var dd=Math.sqrt(d2), f=(1-dd/R); f=f*f*F; x+=dx/dd*f; y+=dy/dd*f; }
          }
          if(j===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
          lx=x; ly=y;
        }
        if(!plne){
          rastie=true; rastuce[v.s]=1;
          if(kolko<n){
            var cast = (vyrast - (kolko-1)*krok)/krok;
            ctx.lineTo(lx+(p[kolko*2]-p[kolko*2-2])*cast, ly+(p[kolko*2+1]-p[kolko*2-1])*cast);
          }
        } else if(v.hrot && v.vytrus){
          bodky[v.tma].push(lx,ly,v.vytrus);
        }
      }
      ctx.strokeStyle = farby.ciara[s];
      ctx.lineWidth = farby.hrubka[s];
      ctx.stroke();
    }
    for(var t=0;t<2;t++){
      var b = bodky[t]; if(!b.length) continue;
      ctx.beginPath();
      for(i=0;i<b.length;i+=3){ ctx.moveTo(b[i]+b[i+2],b[i+1]); ctx.arc(b[i],b[i+1],b[i+2],0,6.283); }
      ctx.fillStyle = t ? farby.vytrusTma : farby.vytrus;
      ctx.fill();
    }
    // stromy v zábere, ktoré dorástli, si označíme
    for(i=0;i<stromy.length;i++){
      st = stromy[i];
      if(st.start>0 && !st.hotovo && !rastuce[i] && teraz-st.start>4500) st.hotovo = true;
      else if(st.start>0 && !st.hotovo) rastie = true;
    }
    if(rastie || aktivny || dotyk.ciel) ziadaj();
  }
  function ziadaj(){ if(!raf && !document.hidden) raf = requestAnimationFrame(kresli); }

  function zasadit(znova){
    generuj(); rozmer(); nacitajFarby();
    if(znova){ for(var i=0;i<stromy.length;i++) if(stromy[i].y<window.pageYOffset+vh) stromy[i].start=-1e9, stromy[i].hotovo=true; }
    vynut = true; ziadaj();
  }

  // dotyk: myš aj prst
  if(!K.menejPohybu){
    var pohyb = function(x,y){ dotyk.x=x; dotyk.y=y+window.pageYOffset; dotyk.ciel=1; dotyk.cas=performance.now(); if(dotyk.sila===0){dotyk.cx=dotyk.x;dotyk.cy=dotyk.y;} ziadaj(); };
    window.addEventListener('pointermove', function(e){ if(e.pointerType!=='touch') pohyb(e.clientX,e.clientY); }, {passive:true});
    window.addEventListener('touchstart', function(e){ var t=e.touches[0]; if(t) pohyb(t.clientX,t.clientY); }, {passive:true});
    window.addEventListener('touchmove', function(e){ var t=e.touches[0]; if(t) pohyb(t.clientX,t.clientY); }, {passive:true});
  }
  window.addEventListener('scroll', ziadaj, {passive:true});
  document.addEventListener('visibilitychange', function(){ if(!document.hidden){ vynut=true; ziadaj(); } });

  // zmena veľkosti: nový les z toho istého semienka
  var poslW=0, poslH=0, cakaj=0;
  function skontroluj(){
    var w=document.documentElement.clientWidth, h=document.body.scrollHeight;
    if(w!==poslW || Math.abs(h-poslH)>40){ var prve=!poslW; poslW=w; poslH=h; zasadit(!prve); }
    else if(window.innerHeight!==vh){ vh=window.innerHeight; rozmer(); vynut=true; ziadaj(); }   // len lišta prehliadača
  }
  function odloz(){ clearTimeout(cakaj); cakaj=setTimeout(skontroluj, 260); }
  window.addEventListener('resize', odloz);
  if(window.ResizeObserver) new ResizeObserver(odloz).observe(document.body);

  var hotovo=false;
  function start(){ if(hotovo) return; hotovo=true; skontroluj(); }
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  setTimeout(start, 1200);

  K.podhubie = {
    nastavenia: NASTAVENIA,
    prefarbi: function(){ nacitajFarby(); vynut=true; ziadaj(); },
    zasad: function(semienko){ if(semienko) K.semienko=semienko; prvy=true; poslW=0; skontroluj(); K.ukazSemienko(); }
  };
})();

/* =========================================================
   KOMPONENT: LES V REZE
   Potrebuje: <div class="les" data-les><div class="les__scena"><canvas></canvas></div>…</div>, JADRO.
   Nad zemou stoja stromy a ľudia, pod zemou ich spája podhubie.
   Po vláknach putujú svetielka: správy od jedného k druhému.
   ========================================================= */
(function(){
  var K = window.Kompas, vsetky = [];
  var sceny = document.querySelectorAll('[data-les]');
  for(var i=0;i<sceny.length;i++) zaloz(sceny[i]);
  K.les = { znova: function(){ for(var j=0;j<vsetky.length;j++) vsetky[j](); } };

  function zaloz(el){
    var sc = el.querySelector('.les__scena'), c = sc && sc.querySelector('canvas');
    if(!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var podklad = document.createElement('canvas'), pctx = podklad.getContext('2d');
    var NASTAVENIA = {
      roztec: parseFloat(el.dataset.roztec) || 0,   // px medzi postavami, 0 = automaticky
      podielLudi: parseFloat(el.dataset.ludia) || 0.42,
      svetielka: el.dataset.svetielka ? parseFloat(el.dataset.svetielka) : 1   // 0 vypne, 2 zdvojnásobí
    };
    var W=0, H=0, zem=0, dpr=1, bytosti=[], ciary=[], cesty=[], huby=[], uzly=[], iskry=[];
    var start=0, upecene=false, vidno=false, bezi=false, posl=0, dalsia=0, poslB=-1, poslCas=0;
    var RAST = 5400;   // ms: les vyrastie, potom sa podzemie už neprekresľuje
    var F = { les:'#183533', salvia:'#8eaa93', smrek:'#6b8c73', krem:'#fffbf6', broskyna:'#ffe6db', oranz:'#ff9c00',
      ciara:['rgba(142,170,147,.95)','rgba(255,230,219,.9)','rgba(255,251,246,.66)','rgba(255,251,246,.38)'] };

    function koren(x,y,a,dl,w0,w1,rnd){
      var p=[x,y], om=0, krok=5;
      for(var d=0; d<dl; d+=krok){
        om = om*0.8 + (rnd()-.5)*0.16; a += om + Math.sin(Math.PI/2-a)*0.035;
        x += Math.cos(a)*krok; y += Math.sin(a)*krok;
        if(y>H-14 || x<4 || x>W-4) break;
        p.push(x,y);
      }
      return {p:p, w0:w0, w1:w1, farba:0, t0:0, dur:900};
    }

    function postav(){
      var r = sc.getBoundingClientRect();
      W = r.width; H = r.height; zem = Math.round(H*0.38);
      if(W<10 || H<10) return;
      dpr = Math.min(window.devicePixelRatio||1, W<800?2:1.5);
      c.width = podklad.width = Math.round(W*dpr);
      c.height = podklad.height = Math.round(H*dpr);
      var rnd = K.nahoda(K.semienko+101);
      bytosti=[]; ciary=[]; cesty=[]; huby=[]; uzly=[]; iskry=[]; upecene=false;
      var maly = W<700, roztec = NASTAVENIA.roztec || (maly?80:124), n = Math.max(4, Math.round(W/roztec)), pod = H-zem, i, j, k;

      // 1) kto stojí na zemi: stromy a ľudia pomiešaní
      var typy=[];
      for(i=0;i<n;i++) typy.push(rnd()<NASTAVENIA.podielLudi ? 'clovek' : 'strom');
      for(i=2;i<n;i++) if(typy[i]===typy[i-1] && typy[i]===typy[i-2]) typy[i] = typy[i]==='strom' ? 'clovek' : 'strom';
      if(typy.indexOf('clovek')<0) typy[1]='clovek';
      if(typy.indexOf('strom')<0) typy[0]='strom';
      for(i=0;i<n;i++){
        var x = (i+0.5)*W/n + (rnd()-.5)*W/n*0.3;
        if(typy[i]==='strom'){
          var sm = rnd()<0.5;
          bytosti.push({typ:sm?'smrek':'listnac', x:x, h:zem*(sm ? 0.68+rnd()*0.26 : 0.54+rnd()*0.3), s:rnd()});
        } else {
          var hh = zem*(0.32+rnd()*0.06);
          bytosti.push({typ:'clovek', x:x, h:hh, s:rnd()});
          if(rnd()<0.4) bytosti.push({typ:'clovek', x:x+hh*0.44*(rnd()<.5?-1:1), h:hh*(rnd()<0.5?0.62:0.93), s:rnd()});
        }
      }
      bytosti.sort(function(a,b){ return a.x-b.x; });

      // 2) korene
      for(i=0;i<bytosti.length;i++){
        var b = bytosti[i], cl = b.typ==='clovek';
        b.ziara=0; b.korene=[]; b.cesty=[]; b.t0 = 150+i*(maly?110:75);
        var nr = cl ? 2 : 3+Math.floor(rnd()*2);
        for(k=0;k<nr;k++){
          var a = Math.PI*(0.16+0.68*(k+0.5)/nr) + (rnd()-.5)*0.3;
          var dl = pod*(cl ? 0.16+rnd()*0.12 : 0.3+rnd()*0.22);
          var kor = koren(b.x+(cl?0:(k-(nr-1)/2)*3), zem, a, dl, cl?1.5:3.4, cl?0.6:0.9, rnd);
          kor.t0 = b.t0+500; kor.dur = 1000; kor.farba = cl?1:0;
          b.korene.push(kor); ciary.push(kor);
          if(!cl && rnd()<0.85 && kor.p.length>12){
            var m = Math.floor(kor.p.length/2*(0.35+rnd()*0.3))*2;
            var bo = koren(kor.p[m], kor.p[m+1], a+(rnd()<.5?-1:1)*(0.5+rnd()*0.5), dl*0.42, 1.6, 0.6, rnd);
            bo.t0 = kor.t0+450; bo.dur = 700; ciary.push(bo);
          }
        }
      }

      // 3) podhubie: vlákna od koreňa ku koreňu
      function vyber(B, smer){
        var naj = B.korene[0];
        for(var q=1;q<B.korene.length;q++){
          var kp = B.korene[q].p, np = naj.p;
          if((kp[kp.length-2]-np[np.length-2])*smer > 0) naj = B.korene[q];
        }
        return naj;
      }
      function chlp(x,y,a,dl,t0){
        var h = koren(x,y,a,dl,0.6,0.6,rnd); h.farba=3; h.t0=t0; h.dur=420; ciary.push(h);
        if(dl>14 && rnd()<0.35){
          var mm = Math.floor(h.p.length/4)*2;
          var h2 = koren(h.p[mm],h.p[mm+1],a+(rnd()<.5?-1:1)*0.8,dl*0.6,0.6,0.6,rnd); h2.farba=3; h2.t0=t0+200; h2.dur=350; ciary.push(h2);
        }
      }
      function spoj(ia, ib, hlavne){
        var A = bytosti[ia], B = bytosti[ib];
        var ka = vyber(A,1), kb = vyber(B,-1), pa = ka.p, pb = kb.p;
        var ax=pa[pa.length-2], ay=pa[pa.length-1], bx=pb[pb.length-2], by=pb[pb.length-1];
        var dx = bx-ax, prehyb = Math.min(16+rnd()*Math.min(70,pod*0.3), Math.abs(dx)*0.4+6);
        var c1x=ax+dx*0.3, c1y=Math.min(H-18,ay+prehyb), c2x=bx-dx*0.3, c2y=Math.min(H-18,by+prehyb*(0.6+rnd()*0.8));
        var N = Math.max(8, Math.ceil((Math.abs(dx)+Math.abs(by-ay))/5)), p=[], f1=rnd()*6.28, f2=rnd()*6.28, amp=1.5+rnd()*3.5;
        for(var q=0;q<=N;q++){
          var t=q/N, u=1-t;
          var x1=u*u*u*ax+3*u*u*t*c1x+3*u*t*t*c2x+t*t*t*bx, y1=u*u*u*ay+3*u*u*t*c1y+3*u*t*t*c2y+t*t*t*by;
          p.push(x1, Math.min(H-8, y1+Math.sin(t*Math.PI)*amp*(Math.sin(t*9+f1)+0.6*Math.sin(t*21+f2))));
        }
        var t0 = 1900+rnd()*1000;
        ciary.push({p:p, w0:hlavne?1.35:0.95, w1:hlavne?1.35:0.95, farba:2, t0:t0, dur:1300});
        uzly.push(ax,ay,t0, bx,by,t0+1300);
        // jemné chĺpky pozdĺž vlákna
        for(q=3;q<N-2;q+=3+Math.floor(rnd()*3)){
          if(rnd()<0.75){
            var tg = Math.atan2(p[q*2+3]-p[q*2-1], p[q*2+2]-p[q*2-2]);
            var dolu = rnd()<0.14;
            chlp(p[q*2],p[q*2+1], dolu ? Math.PI/2+(rnd()-.5)*0.7 : tg+(rnd()<.5?-1:1)*(0.7+rnd()*0.7), dolu ? 30+rnd()*pod*0.3 : 8+rnd()*18, t0+1300*q/N);
          }
        }
        // celá cesta pre svetielko: koreň dole, vlákno, druhý koreň hore
        var cela = pa.slice();
        for(q=2;q<p.length;q++) cela.push(p[q]);
        for(q=pb.length-4;q>=0;q-=2) cela.push(pb[q],pb[q+1]);
        var dlz=[0];
        for(q=2;q<cela.length;q+=2){ var ex=cela[q]-cela[q-2], ey=cela[q+1]-cela[q-1]; dlz.push(dlz[dlz.length-1]+Math.sqrt(ex*ex+ey*ey)); }
        cesty.push({p:cela, dl:dlz, dlzka:dlz[dlz.length-1], a:ia, b:ib});
        A.cesty.push(cesty.length-1); B.cesty.push(cesty.length-1);
      }
      for(i=0;i<bytosti.length-1;i++){
        spoj(i,i+1,true);
        if(rnd()<0.45) spoj(i,i+1,false);
        if(i+2<bytosti.length && rnd()<0.5) spoj(i,i+2,false);
        if(i+3<bytosti.length && rnd()<0.14) spoj(i,i+3,false);
      }
      // chĺpky na koncoch koreňov
      for(i=0;i<bytosti.length;i++) for(k=0;k<bytosti[i].korene.length;k++){
        var kp2 = bytosti[i].korene[k].p, tx=kp2[kp2.length-2], ty=kp2[kp2.length-1];
        for(j=0;j<2;j++) chlp(tx,ty, Math.PI*(0.2+rnd()*0.6), 10+rnd()*20, 2600+rnd()*800);
      }

      // 4) huby: podľa nich každý spozná, že ide o podhubie
      var nh = Math.max(2, Math.round(n*0.45));
      for(i=0;i<nh;i++){
        var gi = Math.floor(rnd()*(bytosti.length-1)), x0 = bytosti[gi].x, x1b = bytosti[gi+1].x;
        if(x1b-x0<40) continue;
        var hx = x0+(x1b-x0)*(0.36+rnd()*0.28), ht = 1500+rnd()*900;
        huby.push({x:hx, v:8+rnd()*5, t0:ht, oranz:i===0});
        if(rnd()<0.55) huby.push({x:hx+10+rnd()*4, v:5+rnd()*2.5, t0:ht+250});
        var hk = koren(hx, zem, Math.PI/2+(rnd()-.5)*0.9, pod*(0.12+rnd()*0.16), 0.9, 0.5, rnd);
        hk.farba=2; hk.t0=ht-200; hk.dur=800; ciary.push(hk);
      }

      if(K.menejPohybu){
        for(i=0;i<Math.min(5,cesty.length);i++){ var ci=Math.floor(rnd()*cesty.length); iskry.push({c:ci, s:cesty[ci].dlzka*(0.25+rnd()*0.5), smer:1, v:0}); }
      }
    }

    function kresliCiaru(g, L, t){
      var pr = (t-L.t0)/L.dur; if(pr<=0) return;
      if(pr>1) pr=1; pr = 1-(1-pr)*(1-pr);
      var p=L.p, n=p.length/2, kolko=Math.max(2, Math.ceil(pr*(n-1))+1); if(kolko>n) kolko=n;
      g.strokeStyle = F.ciara[L.farba];
      var casti = L.w0===L.w1 ? 1 : 3, od=0;
      for(var q=0;q<casti;q++){
        var po = q===casti-1 ? kolko-1 : Math.min(kolko-1, Math.round((n-1)*(q+1)/casti));
        if(po<=od) break;
        g.beginPath(); g.moveTo(p[od*2],p[od*2+1]);
        for(var j=od+1;j<=po;j++) g.lineTo(p[j*2],p[j*2+1]);
        g.lineWidth = casti===1 ? L.w0 : L.w0+(L.w1-L.w0)*(q+0.5)/casti;
        g.stroke(); od=po;
      }
    }
    function kresliPodzemie(g, t){
      g.lineCap='round'; g.lineJoin='round';
      var i, f;
      for(f=3;f>=0;f--) for(i=0;i<ciary.length;i++) if(ciary[i].farba===f) kresliCiaru(g, ciary[i], t);
      g.fillStyle='rgba(255,251,246,.9)'; g.beginPath();
      for(i=0;i<uzly.length;i+=3) if(t>uzly[i+2]){ g.moveTo(uzly[i]+1.9,uzly[i+1]); g.arc(uzly[i],uzly[i+1],1.9,0,6.283); }
      g.fill();
      // dole sa sieť stráca do stránky
      var gr = g.createLinearGradient(0,H-50,0,H); gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(1,'rgba(0,0,0,1)');
      g.globalCompositeOperation='destination-out'; g.fillStyle=gr; g.fillRect(0,H-50,W,50); g.globalCompositeOperation='source-over';
    }
    function upec(){ pctx.setTransform(dpr,0,0,dpr,0,0); pctx.clearRect(0,0,W,H); kresliPodzemie(pctx, 1e12); upecene=true; }

    function bod(cs, s){
      var d=cs.dl, lo=0, hi=d.length-1;
      if(s<=0) return [cs.p[0],cs.p[1]]; if(s>=cs.dlzka) return [cs.p[hi*2],cs.p[hi*2+1]];
      while(hi-lo>1){ var m=(lo+hi)>>1; if(d[m]<=s) lo=m; else hi=m; }
      var k=(s-d[lo])/(d[hi]-d[lo]||1);
      return [cs.p[lo*2]+(cs.p[hi*2]-cs.p[lo*2])*k, cs.p[lo*2+1]+(cs.p[hi*2+1]-cs.p[lo*2+1])*k];
    }
    function vypust(ci, smer){
      if(iskry.length >= (W<700?5:10)*NASTAVENIA.svetielka) return;
      iskry.push({c:ci, s:smer>0?0:cesty[ci].dlzka, smer:smer, v:44+Math.random()*30});
    }
    function odBytosti(bi, okrem, max){
      var b=bytosti[bi], poc=0;
      for(var q=0;q<b.cesty.length && poc<max;q++){
        var ci=b.cesty[q]; if(ci===okrem) continue;
        vypust(ci, cesty[ci].a===bi ? 1 : -1); poc++;
      }
    }

    function kresliBytost(b, e, dych){
      var h=b.h, k, m = 1+0.012*dych+0.04*b.ziara;
      ctx.save(); ctx.translate(b.x, zem); ctx.scale(0.7+0.3*e, e);
      if(b.typ==='smrek'){
        ctx.fillStyle=F.les; ctx.fillRect(-2.5,-h*0.13,5,h*0.13+1);
        ctx.translate(0,-h*0.1); ctx.scale(m,m); ctx.fillStyle=F.smrek;
        var hc=h*0.9, sir=h*0.25;
        for(k=0;k<4;k++){
          var yb=-hc*k*0.215, wk=sir*(1-k*0.2), ya=Math.max(-hc, yb-hc*0.42);
          ctx.beginPath(); ctx.moveTo(-wk,yb); ctx.quadraticCurveTo(0,yb+wk*0.22,wk,yb); ctx.lineTo(0,ya); ctx.closePath(); ctx.fill();
        }
      } else if(b.typ==='listnac'){
        ctx.fillStyle=F.les; ctx.beginPath(); ctx.moveTo(-3.6,1); ctx.lineTo(3.6,1); ctx.lineTo(2,-h*0.55); ctx.lineTo(-2,-h*0.55); ctx.closePath(); ctx.fill();
        ctx.translate(0,-h*0.68); ctx.scale(m,m); ctx.fillStyle=F.salvia;
        var R=h*0.3, o=(b.s-.5)*0.3;
        ctx.beginPath();
        ctx.arc(0,0,R,0,6.283);
        ctx.moveTo(-R*0.75+R*0.66,R*0.26); ctx.arc(-R*0.75,R*0.26,R*0.66,0,6.283);
        ctx.moveTo(R*0.78+R*0.7,R*(0.2+o)); ctx.arc(R*0.78,R*(0.2+o),R*0.7,0,6.283);
        ctx.moveTo(-R*0.3+R*0.62,-R*(0.6-o)); ctx.arc(-R*0.3,-R*(0.6-o),R*0.62,0,6.283);
        ctx.moveTo(R*0.42+R*0.56,-R*0.54); ctx.arc(R*0.42,-R*0.54,R*0.56,0,6.283);
        ctx.fill();
      } else {
        var rh=h*0.15, ys=-h*0.68, ws=h*0.36, wb=h*0.27, rr=ws*0.42;
        ctx.fillStyle=F.les;
        ctx.beginPath(); ctx.arc(0,-h+rh,rh,0,6.283); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-wb/2,1); ctx.lineTo(-ws/2,ys+rr); ctx.quadraticCurveTo(-ws/2,ys,-ws/2+rr,ys);
        ctx.lineTo(ws/2-rr,ys); ctx.quadraticCurveTo(ws/2,ys,ws/2,ys+rr); ctx.lineTo(wb/2,1); ctx.closePath(); ctx.fill();
        // iskra v človeku: rozžiari sa, keď k nemu dorazí správa
        var iy=ys+h*0.2;
        if(b.ziara>0.02){ ctx.fillStyle='rgba(255,156,0,'+(0.3*b.ziara)+')'; ctx.beginPath(); ctx.arc(0,iy,h*0.3,0,6.283); ctx.fill(); }
        ctx.fillStyle=F.oranz; ctx.beginPath(); ctx.arc(0,iy,Math.max(1.8,h*0.045)+1.4*b.ziara,0,6.283); ctx.fill();
      }
      ctx.restore();
    }
    function kresliHubu(hb, e){
      var v=hb.v;
      ctx.save(); ctx.translate(hb.x, zem); ctx.scale(e,e);
      ctx.lineWidth=1.3; ctx.strokeStyle=F.les; ctx.lineJoin='round';
      ctx.fillStyle=F.krem; ctx.beginPath(); ctx.rect(-v*0.22,-v*0.95,v*0.44,v*0.95+1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = hb.oranz ? F.oranz : F.broskyna;
      ctx.beginPath(); ctx.ellipse(0,-v*0.9,v,v*0.78,0,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    function mekko(x){ if(x<=0) return 0; if(x>=1) return 1; x=1-x; return 1-x*x*x; }

    function kresli(t, dt){
      var i, q;
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
      if(t>=RAST){ if(!upecene) upec(); ctx.drawImage(podklad,0,0,W,H); }
      else kresliPodzemie(ctx, t);

      // svetielka: správy putujú od jedného k druhému
      if(t>3300 && !K.menejPohybu && NASTAVENIA.svetielka>0 && cesty.length){
        dalsia -= dt;
        if(dalsia<=0){ vypust(Math.floor(Math.random()*cesty.length), Math.random()<.5?1:-1); dalsia=(W<700?0.9:0.5)+Math.random()*1.3; }
      }
      for(i=iskry.length-1;i>=0;i--){
        var k=iskry[i], cs=cesty[k.c];
        k.s += k.smer*k.v*dt;
        if(k.s<0 || k.s>cs.dlzka){
          var ciel = k.smer>0 ? cs.b : cs.a;
          bytosti[ciel].ziara = 1;
          iskry.splice(i,1);
          if(Math.random()<0.4) odBytosti(ciel, k.c, 1);     // správa ide ďalej
          continue;
        }
        for(q=4;q>=0;q--){
          var bd = bod(cs, k.s-k.smer*q*7), al = 1-q*0.2;
          if(q===0){ ctx.fillStyle='rgba(255,156,0,.18)'; ctx.beginPath(); ctx.arc(bd[0],bd[1],9,0,6.283); ctx.fill(); }
          ctx.fillStyle='rgba(255,214,170,'+(0.5*al)+')'; ctx.beginPath(); ctx.arc(bd[0],bd[1],3.4*al+0.4,0,6.283); ctx.fill();
          if(q===0){ ctx.fillStyle='rgba(255,251,246,1)'; ctx.beginPath(); ctx.arc(bd[0],bd[1],1.7,0,6.283); ctx.fill(); }
        }
      }

      var dych = 0.5-0.5*Math.cos(6.283*((Date.now()%10000)/10000));
      for(i=0;i<huby.length;i++){ var eh=mekko((t-huby[i].t0)/600); if(eh>0) kresliHubu(huby[i], eh); }
      for(i=0;i<bytosti.length;i++){
        var b=bytosti[i], e=mekko((t-b.t0)/950);
        if(b.ziara>0) b.ziara = b.ziara<0.02 ? 0 : b.ziara*Math.pow(0.22,dt);
        if(e>0) kresliBytost(b, e, K.menejPohybu?0:dych);
      }
    }
    function slucka(teraz){
      if(!vidno || document.hidden){ bezi=false; return; }
      requestAnimationFrame(slucka);
      var dt=Math.min((teraz-posl)/1000,0.05); posl=teraz;
      kresli(teraz-start, dt);
    }
    function spusti(){
      if(K.menejPohybu || bezi || !vidno || document.hidden) return;
      if(!start) start=performance.now();
      bezi=true; posl=performance.now(); requestAnimationFrame(slucka);
    }
    function znova(){
      postav();
      if(K.menejPohybu){ kresli(1e12,0); return; }
      if(start) start = performance.now();     // nový les vyrastie odznova
      spusti();
    }
    vsetky.push(znova);

    postav();
    if(K.menejPohybu){ kresli(1e12,0); }
    else {
      if(window.IntersectionObserver) new IntersectionObserver(function(z){ vidno=z[0].isIntersecting; spusti(); },{threshold:0.05}).observe(sc);
      else { vidno=true; spusti(); }
      document.addEventListener('visibilitychange', spusti);
      // dotyk: kto sa dotkne stromu alebo človeka, pošle od neho správu ďalej
      var dotyk = function(cx){
        var t=performance.now()-start; if(!start || t<2600) return;
        var x=cx-sc.getBoundingClientRect().left, naj=-1, nd=48;
        for(var q=0;q<bytosti.length;q++){ var d=Math.abs(bytosti[q].x-x); if(d<nd){ nd=d; naj=q; } }
        if(naj<0 || (naj===poslB && performance.now()-poslCas<1500)) return;
        poslB=naj; poslCas=performance.now(); bytosti[naj].ziara=1; odBytosti(naj,-1,3);
      };
      sc.addEventListener('pointermove', function(e){ if(e.pointerType!=='touch') dotyk(e.clientX); }, {passive:true});
      sc.addEventListener('touchstart', function(e){ if(e.touches[0]) dotyk(e.touches[0].clientX); }, {passive:true});
    }
    var cak=0, poslW=W;
    window.addEventListener('resize', function(){ clearTimeout(cak); cak=setTimeout(function(){
      var w=sc.getBoundingClientRect().width; if(Math.abs(w-poslW)<2) return; poslW=w;
      postav(); if(K.menejPohybu) kresli(1e12,0); else if(start) start=performance.now()-RAST;
    },250); });
  }
})();

/* =========================================================
   KOMPONENT: OHEŇ · uhlíky
   Potrebuje: <div class="ohnisko" data-ohen><canvas></canvas></div>
   ========================================================= */
(function(){
  var K = window.Kompas;
  var ohne = document.querySelectorAll('[data-ohen]');
  for(var o=0;o<ohne.length;o++) zaloz(ohne[o]);

  function zaloz(el){
    var c = el.querySelector('canvas'); if(!c || !c.getContext) return;
    var ctx = c.getContext('2d'), W=0, H=0, dpr=1, uhliky=[], bezi=false, vidno=false, posl=0;
    var rnd = K.nahoda(K.semienko+7);
    var POCET = parseInt(el.dataset.pocet,10) || 0;

    function novy(u, odZaciatku){
      u.x = W/2 + (rnd()+rnd()+rnd()-1.5)*W*0.26;
      u.y = H + 4;
      u.vy = 9+rnd()*15;                 // px za sekundu, pomaly
      u.r = 0.8+rnd()*1.6;
      u.zivot = 5+rnd()*5;
      u.vek = odZaciatku ? rnd()*u.zivot : 0;
      u.faza = rnd()*6.28; u.kyv = 6+rnd()*14;
      return u;
    }
    function rozmer(){
      var r = el.getBoundingClientRect();
      W=r.width; H=r.height; dpr=Math.min(window.devicePixelRatio||1,2);
      c.width=Math.round(W*dpr); c.height=Math.round(H*dpr);
      var n = POCET || (W<700?10:20);
      uhliky=[]; for(var i=0;i<n;i++) uhliky.push(novy({},true));
    }
    function kresli(dt){
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,W,H);
      ctx.globalCompositeOperation='lighter';
      for(var i=0;i<uhliky.length;i++){
        var u=uhliky[i];
        u.vek+=dt; if(u.vek>u.zivot) novy(u,false);
        var t=u.vek/u.zivot, y=u.y-u.vy*u.vek, x=u.x+Math.sin(u.faza+u.vek*0.7)*u.kyv*t;
        if(y<H*0.12) { u.vek=u.zivot; continue; }
        var a=Math.sin(Math.PI*t); a*=a;
        ctx.fillStyle='rgba(255,156,0,'+(0.14*a)+')';
        ctx.beginPath(); ctx.arc(x,y,u.r*3.4,0,6.283); ctx.fill();
        ctx.fillStyle='rgba(255,214,170,'+(0.9*a)+')';
        ctx.beginPath(); ctx.arc(x,y,u.r,0,6.283); ctx.fill();
      }
      ctx.globalCompositeOperation='source-over';
    }
    function slucka(teraz){
      if(!vidno || document.hidden){ bezi=false; return; }
      requestAnimationFrame(slucka);
      if(teraz-posl<32) return;          // 30 snímok za sekundu stačí
      var dt=Math.min((teraz-posl)/1000,0.1); posl=teraz;
      kresli(dt);
    }
    function spusti(){ if(!bezi && vidno && !document.hidden && !K.menejPohybu){ bezi=true; posl=performance.now(); requestAnimationFrame(slucka); } }

    rozmer();
    if(K.menejPohybu){ kresli(0); return; }   // statické uhlíky
    if(window.IntersectionObserver){
      new IntersectionObserver(function(z){ vidno=z[0].isIntersecting; spusti(); }).observe(el);
    } else { vidno=true; spusti(); }
    document.addEventListener('visibilitychange', spusti);
    var cak=0; window.addEventListener('resize', function(){ clearTimeout(cak); cak=setTimeout(function(){ rozmer(); if(K.menejPohybu) kresli(0); },250); });
  }
})();

/* =========================================================
   KOMPONENT: RAST, FOTKY, UZLY
   Všetko, čo reaguje na príchod do záberu.
   ========================================================= */
(function(){
  var PAPRAD = '<svg class="paprad" viewBox="0 0 28 28" aria-hidden="true"><path pathLength="1" d="M3 26C3 13 9 5 17 5a7.5 7.5 0 0 1 7.5 7.5 5.6 5.6 0 0 1-5.6 5.6 4 4 0 0 1-4-4 2.6 2.6 0 0 1 2.6-2.6"/></svg>';
  var stitky = document.querySelectorAll('.stitok');
  for(var i=0;i<stitky.length;i++) stitky[i].insertAdjacentHTML('afterbegin', PAPRAD);

  var rast = document.querySelectorAll('[data-rast]'), fotky = document.querySelectorAll('.foto'), pasy = document.querySelectorAll('.pas');
  if(!window.IntersectionObserver){
    for(i=0;i<rast.length;i++) rast[i].classList.add('vyrastene');
    for(i=0;i<fotky.length;i++) fotky[i].classList.add('nadych');
    return;
  }
  function sleduj(prvky, trieda, okraj){
    var io = new IntersectionObserver(function(zaznamy){
      for(var j=0;j<zaznamy.length;j++){
        if(zaznamy[j].isIntersecting){ zaznamy[j].target.classList.add(trieda); io.unobserve(zaznamy[j].target); }
      }
    }, {rootMargin: okraj, threshold: 0.08});
    for(var j=0;j<prvky.length;j++) io.observe(prvky[j]);
  }
  sleduj(rast, 'vyrastene', '0px 0px -8% 0px');
  sleduj(fotky, 'nadych', '0px 0px -12% 0px');
  var uzly = []; for(i=0;i<pasy.length;i++){ var u=pasy[i].querySelector('.uzol'); if(u) uzly.push(u); }
  sleduj(uzly, 'svieti', '0px 0px -35% 0px');
})();

/* =========================================================
   Drobnosti stránky: formulár, predvoľba témy, náhľad
   ========================================================= */
(function(){
  var K = window.Kompas;
  var tema = document.getElementById('f-tema');
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[data-tema]');
    if(a && tema) tema.value = a.getAttribute('data-tema');
  });
  var f = document.getElementById('formular');
  if(f) f.addEventListener('submit', function(e){
    e.preventDefault();
    f.querySelector('.formular__sprava').textContent = f.getAttribute('data-sprava') || '';
  });

})();

/* =========================================================
   HLAVIČKA · pri skrolovaní nadol sa skryje, nahor sa vráti
   MOBILNÉ MENU · tri čiarky otvoria panel s odkazmi
   ========================================================= */
(function(){
  var h = document.querySelector('.hlavicka'); if(!h) return;
  var tl = h.querySelector('.menu-tl'), panel = document.getElementById('mobilne-menu');
  var posl = window.pageYOffset, cakaj = false;

  function otvorene(){ return tl && tl.getAttribute('aria-expanded') === 'true'; }
  function zavri(vratFokus){
    if(!otvorene()) return;
    tl.setAttribute('aria-expanded','false'); panel.hidden = true;
    if(vratFokus) tl.focus();
  }
  function otvor(){
    tl.setAttribute('aria-expanded','true'); panel.hidden = false;
    h.classList.remove('skryta');
    var prvy = panel.querySelector('a'); if(prvy) prvy.focus({preventScroll:true});
  }

  function skrol(){
    cakaj = false;
    var y = window.pageYOffset, dy = y - posl;
    h.classList.toggle('plava', y > 40);
    if(otvorene()){ posl = y; return; }
    if(y < 120 || dy < -6) h.classList.remove('skryta');
    else if(dy > 6) h.classList.add('skryta');
    if(Math.abs(dy) > 6) posl = y;
  }
  window.addEventListener('scroll', function(){ if(!cakaj){ cakaj = true; requestAnimationFrame(skrol); } }, {passive:true});
  // keď niekto prejde klávesnicou na hlavičku, ukáže sa
  h.addEventListener('focusin', function(){ h.classList.remove('skryta'); });
  skrol();

  if(!tl || !panel) return;
  tl.addEventListener('click', function(){ otvorene() ? zavri(false) : otvor(); });
  panel.addEventListener('click', function(e){ if(e.target.closest('a')) zavri(false); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') zavri(true); });
  document.addEventListener('click', function(e){ if(otvorene() && !h.contains(e.target)) zavri(false); });
  window.addEventListener('resize', function(){ if(window.innerWidth > 640) zavri(false); });
})();
