/* Florería Florentina · Bouquet Atelier · development-only pricing prototype.
   Client-side, no checkout, no automatic message sending, no product mutations. */
(() => {
  'use strict';

  const PRICE = Object.freeze({
    base: 60, rose: 5, baby: 12, eucalyptus: 9, butterflies: 7,
    crown: 18, ribbon: 5, card: 5,
    kraft: 0, cream: 6, blush: 6, burgundy: 8
  });
  const WRAPS = Object.freeze({
    kraft: { name:'Natural kraft', color:'#c3a17b', shade:'#a98461', light:'#e0c49f' },
    cream: { name:'Ivory paper', color:'#eee4d2', shade:'#ccbaa6', light:'#fff8e9' },
    blush: { name:'Blush paper', color:'#e3b3bc', shade:'#c98f9c', light:'#f4d7da' },
    burgundy: { name:'Burgundy paper', color:'#865161', shade:'#603a4b', light:'#ad7383' }
  });
  const ROSES = Object.freeze({
    rose:{name:'Ruby roses', outer:'#aa3d59', base:'#c94d6b', light:'#ec9ba9', dark:'#862f4b'},
    blush:{name:'Blush roses', outer:'#d99096', base:'#eeb7b1', light:'#ffe0d7', dark:'#b96f7d'},
    ivory:{name:'Ivory roses', outer:'#d4bfa4', base:'#f3e6cf', light:'#fff8e8', dark:'#b99e8b'},
    sunset:{name:'Sunset roses', outer:'#b85c3b', base:'#e18a54', light:'#f3b375', dark:'#a34638'}
  });
  const ADDONS = Object.freeze({
    baby: ['Baby’s breath','Baby’s breath / Nube de flores'],
    eucalyptus: ['Eucalyptus','Eucalyptus / Eucalipto'],
    butterflies: ['Butterfly accents','Butterfly accents / Mariposas'],
    crown: ['Golden crown','Golden crown / Corona'],
    ribbon: ['Satin ribbon','Satin ribbon / Listón'],
    card: ['Gift message card','Gift card / Tarjeta']
  });
  const INITIAL = {roses:6, roseColor:'rose',wrap:'kraft',addons:{baby:false,eucalyptus:false,butterflies:false,crown:false,ribbon:false,card:false}};
  let state = cloneInitial();
  const $ = id => document.getElementById(id);
  const money = amount => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(amount);
  const safe = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const addOnOrder=['baby','eucalyptus','butterflies','crown','ribbon','card'];
  const positions = [
    [300,167,.93],[221,214,.97],[373,211,1.01],[169,271,.92],[300,279,1.05],[430,267,.94],
    [256,139,.8],[343,135,.79],[131,214,.87],[468,216,.84],[240,306,.97],[372,313,.98],
    [198,155,.77],[420,164,.8],[302,224,.83],[164,335,.81],[452,327,.82],[350,349,.87],
    [257,354,.91],[112,292,.8],[493,292,.77],[214,362,.73],[406,365,.73],[302,105,.74]
  ];
  function cloneInitial(){return {...INITIAL,addons:{...INITIAL.addons}};}
  function calc() {
    const extraRoseCount=state.roses-6;
    const extras = addOnOrder.filter(id=>state.addons[id]).map(id=>({label:ADDONS[id][0],amount:PRICE[id],id}));
    if(state.wrap!=='kraft')extras.push({label:WRAPS[state.wrap].name,amount:PRICE[state.wrap],id:'wrap'});
    if(extraRoseCount>0)extras.unshift({label:'Additional roses ('+extraRoseCount+' × $5)',amount:extraRoseCount*PRICE.rose,id:'rose'});
    return {extras,total:PRICE.base+extras.reduce((sum,item)=>sum+item.amount,0)};
  }
  function setActive(groupSelector,attribute,value){
    document.querySelectorAll(groupSelector).forEach(el=>{
      const active=el.getAttribute(attribute)===value;
      el.classList.toggle('active',active);
      el.setAttribute('aria-pressed',String(active));
    });
  }
  function updateControls() {
    $('roseCount').textContent=String(state.roses);
    $('roseMinus').disabled=state.roses<=6;
    $('rosePlus').disabled=state.roses>=20;
    setActive('[data-rose]','data-rose',state.roseColor);
    setActive('[data-wrap]','data-wrap',state.wrap);
    document.querySelectorAll('[data-addon]').forEach(el=>el.setAttribute('aria-pressed',String(state.addons[el.dataset.addon])));
  }
  function renderPricing() {
    const quote=calc();
    $('totalPrice').textContent=money(quote.total);
    const container=$('priceBreakdown');
    container.replaceChildren();
    const row=(title,amount,sub,cls='')=>{
      const div=document.createElement('div');div.className='breakdown-row '+cls;
      const label=document.createElement('span');label.textContent=title;
      if(sub){const small=document.createElement('small');small.textContent=sub;label.appendChild(small);}
      const cost=document.createElement('span');cost.textContent=money(amount);
      div.append(label,cost);container.append(div);
    };
    row('Signature base bouquet',PRICE.base,'6 roses · standard greenery · kraft paper','breakdown-base');
    quote.extras.forEach(item=>row(item.label,item.amount));
    row('Estimated total',quote.total,'Subject to florist confirmation','breakdown-subtotal');
    const name=state.addons.crown?'The Royal Florentina':state.roses>=12?'The Grand Bouquet':state.addons.baby?'The Cloud of Roses':'The Florentina Classic';
    $('bouquetNickname').textContent=name;
    $('svgDesc').textContent=state.roses+' '+ROSES[state.roseColor].name+', '+WRAPS[state.wrap].name+
      (addOnOrder.filter(id=>state.addons[id]).length?' with '+addOnOrder.filter(id=>state.addons[id]).map(id=>ADDONS[id][0]).join(', '):'')+'.';
  }
  const lerp=(a,b,t)=>a+(b-a)*t;
  function shade(hex,amount){
    const base=hex.replace('#','');
    const rgb=[0,2,4].map(i=>parseInt(base.slice(i,i+2),16));
    return '#'+rgb.map(n=>Math.round(Math.max(0,Math.min(255,amount>0?lerp(n,255,amount):lerp(n,0,-amount)))).toString(16).padStart(2,'0')).join('');
  }
  function roseSVG(x,y,scale,index) {
    const palette=ROSES[state.roseColor];
    let outer='';
    for(let k=0;k<9;k++){
      const angle=360*k/9+index*13;
      const c=k%3===0?palette.light:k%2===0?palette.base:palette.outer;
      outer+='<ellipse cx="0" cy="-17" rx="16.5" ry="24" fill="'+c+'" stroke="'+palette.dark+'" stroke-opacity=".16" stroke-width="1.4" transform="rotate('+angle+')"/>';
    }
    let inner='';
    for(let k=0;k<6;k++){
      const angle=360*k/6+24;
      inner+='<ellipse cx="0" cy="-10" rx="10" ry="15" fill="'+(k%2?palette.outer:palette.base)+'" stroke="'+palette.dark+'" stroke-opacity=".12" stroke-width="1.2" transform="rotate('+angle+')"/>';
    }
    return '<g transform="translate('+x+' '+y+') scale('+scale+')" filter="url(#roseShadow)">'+
      '<circle r="39" fill="'+palette.dark+'" opacity=".24"/>'+outer+
      '<circle r="19" fill="'+palette.outer+'" stroke="'+palette.dark+'" stroke-opacity=".24" stroke-width="1.7"/>'+inner+
      '<path d="M-10 1 C-5-13 13-12 13 0 C12 11-7 15-10 4 C-12-4 2-11 6-3 C8 2 2 5-2 2" fill="none" stroke="'+palette.light+'" stroke-width="4.5" stroke-linecap="round"/>'+
      '<path d="M-8 -3 C-3-13 10-11 11-3" fill="none" stroke="'+palette.dark+'" stroke-opacity=".45" stroke-width="2.1" stroke-linecap="round"/>'+
      '<ellipse cx="-17" cy="-20" rx="9" ry="4" transform="rotate(-43 -17 -20)" fill="#fff" opacity=".11"/>'+
      '</g>';
  }
  function eucalyptusSVG(){
    if(!state.addons.eucalyptus)return '';
    let out='';
    const sprays=[[153,246,-30],[435,236,32],[206,177,-17],[392,179,17]];
    sprays.forEach(([x,y,angle],i)=>{
      out+='<g transform="translate('+x+' '+y+') rotate('+angle+')" opacity=".96">';
      out+='<path d="M 0 45 Q -10 -22 0 -128" fill="none" stroke="#64785f" stroke-width="3.4" stroke-linecap="round"/>';
      for(let n=0;n<5;n++){
        const cy=12-n*31;const side=n%2?-1:1;
        out+='<ellipse cx="'+(side*20)+'" cy="'+cy+'" rx="23" ry="15" transform="rotate('+(side*22)+' '+(side*20)+' '+cy+')" fill="'+(n%2?'#a2b5a5':'#859e90')+'" stroke="#688c78" stroke-width="1.2"/>';
      }
      out+='</g>';
    });
    return out;
  }
  function babysBreathSVG(){
    if(!state.addons.baby)return '';
    let out='';
    [[174,180,-18],[390,162,22],[127,291,-27],[462,286,21],[268,120,-9],[339,118,7]].forEach(([x,y,angle],j)=>{
      out+='<g transform="translate('+x+' '+y+') rotate('+angle+')"><path d="M0 75Q-4 18 0-52 M0 16L-26-29 M0 4L28-37 M0 34L-28 0" fill="none" stroke="#7a946b" stroke-width="2.5"/>';
      const dots=[[-1,-55],[27,-39],[-25,-31],[-30,-2],[8,-23],[25,-18],[-6,13]];
      dots.forEach(([a,b],k)=>out+='<circle cx="'+a+'" cy="'+b+'" r="'+(k%2?7:6)+'" fill="#fffdf2" stroke="#d9cfbc" stroke-width="1.1"/><circle cx="'+(a+1)+'" cy="'+(b-1)+'" r="2.2" fill="#e5c8a9"/>');
      out+='</g>';
    });
    return out;
  }
  function greenerySVG(){
    let out='';
    positions.slice(0,state.roses).forEach(([x,y],i)=>{
      const dx=(x-300)*.38;const branchAngle=((i%2)?-1:1);
      out+='<path d="M'+(x+4)+' '+(y+12)+' Q'+(x+dx)+' '+(y+160)+' 301 563" fill="none" stroke="'+(i%2?'#667960':'#728363')+'" stroke-width="5" stroke-linecap="round"/>';
      if(i<13){
        out+='<ellipse cx="'+(x+branchAngle*33)+'" cy="'+(y+49)+'" rx="26" ry="11" transform="rotate('+(branchAngle*35)+' '+(x+branchAngle*33)+' '+(y+49)+')" fill="'+(i%2?'#819e78':'#6f8a66')+'" opacity=".9"/>';
        out+='<ellipse cx="'+(x-branchAngle*27)+'" cy="'+(y+62)+'" rx="21" ry="9" transform="rotate('+(-branchAngle*30)+' '+(x-branchAngle*27)+' '+(y+62)+')" fill="#8faa83" opacity=".93"/>';
      }
    });
    return out;
  }
  function wrapperSVG(){
    const p=WRAPS[state.wrap];
    return '<g filter="url(#wrapShadow)">'+
      '<path d="M143 293L306 414L458 290L431 474L309 589L170 468Z" fill="'+p.shade+'" stroke="'+shade(p.shade,-.16)+'" stroke-width="2"/>'+
      '<path d="M146 294L302 387L301 581Q210 508 163 405Z" fill="'+p.light+'" opacity=".94"/>'+
      '<path d="M451 295L305 389L311 579Q404 504 438 403Z" fill="'+p.color+'" opacity=".98"/>'+
      '<path d="M125 300L303 392L219 470Z" fill="'+p.color+'" stroke="'+p.shade+'" stroke-width="2.5"/>'+
      '<path d="M478 304L306 391L399 472Z" fill="'+p.light+'" stroke="'+p.shade+'" stroke-width="2.5"/>'+
      '<path d="M173 390Q225 463 304 589Q379 469 433 389" fill="none" stroke="'+p.shade+'" opacity=".38" stroke-width="2.3"/>'+
      '</g>';
  }
  function butterflySVG(x,y,rot,scale){
    return '<g transform="translate('+x+' '+y+') rotate('+rot+') scale('+scale+')" stroke="#b79350" stroke-width="1.6">'+
      '<path d="M0 0Q-31-50-39-10Q-37 7-1 5Z" fill="#f8db9f"/><path d="M0 1Q26-49 39-12Q40 6 2 5Z" fill="#eed09a"/>'+
      '<path d="M-1 5Q-34 8-19 26Q-10 29 0 10Z" fill="#dbb477"/><path d="M2 4Q34 8 20 26Q11 27 0 10Z" fill="#e7c586"/>'+
      '<ellipse rx="3" ry="14" fill="#917448"/><path d="M0-10Q-12-21-13-25M0-10Q12-21 13-25" stroke="#917448" stroke-width="2" fill="none"/>'+
      '</g>';
  }
  function accessorySVG(){
    let result='';
    if(state.addons.crown){
      result+='<g transform="translate(300 114)" filter="url(#roseShadow)">'+
        '<path d="M-80 10L-65-30L-31-4L0-59L31-4L64-30L81 10L76 31Q0 44-76 31Z" fill="#dfb96c" stroke="#a78139" stroke-width="4"/>'+
        '<path d="M-72 18Q0 32 73 18" fill="none" stroke="#fff2bf" stroke-width="5" opacity=".75"/>'+
        '<path d="M-57 -8L-32 11L-12-17L0 9L14-18L32 11L56-8" fill="none" stroke="#f6db96" stroke-width="3"/>'+
        '<circle cx="0" cy="-45" r="10" fill="#b75e72" stroke="#ffdf91" stroke-width="3"/>'+
        '<circle cx="-60" cy="-20" r="6" fill="#fbecc1"/><circle cx="60" cy="-20" r="6" fill="#fbecc1"/>'+
        '<circle cx="-31" cy="17" r="5" fill="#d48596"/><circle cx="0" cy="19" r="5" fill="#d48596"/><circle cx="31" cy="17" r="5" fill="#d48596"/></g>';
    }
    if(state.addons.butterflies){
      result+=butterflySVG(141,146,-15,.72)+butterflySVG(457,177,23,.62)+butterflySVG(392,100,18,.51);
    }
    if(state.addons.card){
      result+='<g transform="translate(389 510) rotate(13)" filter="url(#roseShadow)">'+
        '<path d="M-25 0Q-12-25-20-50" fill="none" stroke="#b39271" stroke-width="2.7"/>'+
        '<rect x="-5" y="-8" width="62" height="54" rx="5" fill="#fff9e9" stroke="#d6baa0" stroke-width="2"/>'+
        '<path d="M14 15Q24 7 29 18Q38 7 45 17L29 33Z" fill="#be7a89"/>'+
        '</g>';
    }
    return result;
  }
  function ribbonSVG(){
    const color=state.addons.ribbon?'#b96982':'#97765c';
    const highlight=state.addons.ribbon?'#e7a6b6':'#c5ad96';
    return '<g transform="translate(306 490)" filter="url(#wrapShadow)">'+
      '<path d="M-4 3Q-38-25-70-15Q-78 17-39 20L0 7Z" fill="'+color+'" stroke="'+shade(color,-.12)+'" stroke-width="2"/>'+
      '<path d="M5 4Q41-26 70-15Q76 18 36 21L0 7Z" fill="'+color+'" stroke="'+shade(color,-.12)+'" stroke-width="2"/>'+
      '<path d="M-17 12L-45 72L-10 57L4 18" fill="'+color+'"/><path d="M19 12L53 69L17 59L3 18" fill="'+color+'"/>'+
      '<ellipse rx="17" ry="12" fill="'+highlight+'" stroke="'+shade(color,-.18)+'" stroke-width="2"/>'+
      '<ellipse cx="-36" cy="1" rx="22" ry="4" fill="'+highlight+'" opacity=".34"/>'+
      '<ellipse cx="37" cy="2" rx="21" ry="4" fill="'+highlight+'" opacity=".34"/></g>';
  }
  function bouquetSVG(){
    const roses=positions.slice(0,state.roses);
    const shadow='<defs>'+
      '<filter id="roseShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="3.4" flood-color="#6e4651" flood-opacity=".17"/></filter>'+
      '<filter id="wrapShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#6e4651" flood-opacity=".19"/></filter>'+
      '</defs>';
    let svg=shadow+'<g opacity=".4"><ellipse cx="300" cy="592" rx="124" ry="24" fill="#a58677" opacity=".18"/></g>';
    svg+='<g id="bouquet-stems">'+greenerySVG()+eucalyptusSVG()+babysBreathSVG()+'</g>';
    svg+='<g id="bouquet-wrap">'+wrapperSVG()+'</g>';
    // Rows render back-to-front, with lower flowers above the wrapper's top edge.
    const sorted=roses.map(([x,y,s],i)=>({x,y,s,i})).sort((a,b)=>a.y-b.y);
    sorted.forEach(p=>svg+=roseSVG(p.x,p.y,p.s,p.i));
    svg+='<g id="bouquet-accessories">'+accessorySVG()+ribbonSVG()+'</g>';
    svg+='<g opacity=".45"><circle cx="118" cy="166" r="3" fill="#c99da5"/><circle cx="489" cy="131" r="2.3" fill="#caab86"/><path d="M94 202l5-7 5 7-5 7Z" fill="#d1b19a"/><path d="M506 361l5-7 5 7-5 7Z" fill="#bfa49a"/></g>';
    return svg;
  }
  function updateArtwork(){
    const svg=$('bouquetArt');
    const title='<title id="svgTitle">Your custom bouquet visual preview</title>';
    const desc='<desc id="svgDesc">Roses, paper and accessories update as you build.</desc>';
    svg.innerHTML=title+desc+bouquetSVG();
    svg.classList.remove('is-blooming');
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      void svg.getBoundingClientRect().width;
      svg.classList.add('is-blooming');
    }
  }
  function update(){updateControls();renderPricing();updateArtwork();$('actionStatus').textContent='';}
  $('roseMinus').addEventListener('click',()=>{if(state.roses>6){state.roses--;update();}});
  $('rosePlus').addEventListener('click',()=>{if(state.roses<20){state.roses++;update();}});
  document.querySelectorAll('[data-rose]').forEach(btn=>btn.addEventListener('click',()=>{state.roseColor=btn.dataset.rose;update();}));
  document.querySelectorAll('[data-wrap]').forEach(btn=>btn.addEventListener('click',()=>{state.wrap=btn.dataset.wrap;update();}));
  document.querySelectorAll('[data-addon]').forEach(btn=>btn.addEventListener('click',()=>{state.addons[btn.dataset.addon]=!state.addons[btn.dataset.addon];update();}));
  $('resetButton').addEventListener('click',()=>{state=cloneInitial();$('occasion').value='Just because';$('personalNote').value='';update();$('actionStatus').textContent='Bouquet reset / Ramo reiniciado.';});
  $('surpriseButton').addEventListener('click',()=>{
    const colors=Object.keys(ROSES),wraps=Object.keys(WRAPS);
    state.roses=6+Math.floor(Math.random()*8);
    state.roseColor=colors[Math.floor(Math.random()*colors.length)];
    state.wrap=wraps[Math.floor(Math.random()*wraps.length)];
    addOnOrder.forEach((id,index)=>{state.addons[id]=Math.random()<(index===0?.7:.28);});
    update();
    $('actionStatus').textContent='A fresh combination, made for you / ¡Una nueva combinación!';
  });
  function specs(){
    const quote=calc();
    const occasion=$('occasion').value;
    const note=$('personalNote').value.trim();
    const lines=[
      'FLORERIA FLORENTINA - CUSTOM BOUQUET REQUEST',
      'DEVELOPMENT / DEMO - SAMPLE PRICING ONLY',
      '',
      'Base bouquet: 6 roses + standard greenery + kraft wrap - '+money(PRICE.base),
      'Roses: '+state.roses+' stems ('+ROSES[state.roseColor].name+')',
      'Wrapping: '+WRAPS[state.wrap].name,
      ...quote.extras.map(item=>item.label+': +'+money(item.amount)),
      '',
      'ESTIMATED TOTAL: '+money(quote.total),
      'Occasion / Ocasión: '+occasion,
      ...(note?['Special notes / Notas: '+note]:[]),
      '',
      'Illustrated concept; actual flowers and materials may vary.',
      'Estimate only. Please confirm stock, taxes, timing, and final price before ordering.',
      'Nothing is ordered or sent automatically from the demo.'
    ];
    return {quote,lines,occasion,note};
  }
  $('emailButton').addEventListener('click',()=>{
    const {lines}=specs();
    const subject='Bouquet Builder DEMO | Custom Arrangement Request';
    const href='mailto:floreriaflorentina4@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.join('\n'));
    window.location.href=href;
    $('actionStatus').textContent='Email draft opened. Review and send manually / Revise y envíe.';
  });
  $('whatsappButton').addEventListener('click',()=>{
    const {lines}=specs();
    const url='https://wa.me/17708736614?text='+encodeURIComponent(lines.join('\n'));
    window.open(url,'_blank','noopener,noreferrer');
    $('actionStatus').textContent='WhatsApp draft opened. Nothing sent yet / Mensaje sin enviar.';
  });

  // Generate a real, standalone, one-page PDF from a canvas + embedded JPEG.
  // No third-party PDF library, remote service, or server-side customer data.
  function imageToPdf(canvas) {
    const data=canvas.toDataURL('image/jpeg',.92).split(',')[1];
    const binary=atob(data),jpeg=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)jpeg[i]=binary.charCodeAt(i);
    const encoder=new TextEncoder();
    const chunks=[];const offsets=[];let bytes=0;
    function append(s){const part=typeof s==='string'?encoder.encode(s):s;chunks.push(part);bytes+=part.length;}
    function obj(id,content){offsets[id]=bytes;append(id+' 0 obj\n');append(content);append('\nendobj\n');}
    append('%PDF-1.4\n%Floreria Bouquets\n');
    obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
    obj(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>');
    offsets[4]=bytes;
    append('4 0 obj\n<< /Type /XObject /Subtype /Image /Width '+canvas.width+' /Height '+canvas.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n');
    append(jpeg);
    append('\nendstream\nendobj\n');
    const commands='q 612 0 0 792 0 0 cm /Im0 Do Q\n';
    obj(5,'<< /Length '+commands.length+' >>\nstream\n'+commands+'endstream');
    const startXref=bytes;
    append('xref\n0 6\n0000000000 65535 f \n');
    for(let i=1;i<=5;i++)append(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    append('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+startXref+'\n%%EOF\n');
    return new Blob(chunks,{type:'application/pdf'});
  }
  function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines=7) {
    const words=String(text).split(/\s+/),lines=[];
    let line='';
    for(const word of words){
      const test=line?line+' '+word:word;
      if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;
    }
    if(line)lines.push(line);
    lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
    return y+Math.min(lines.length,maxLines)*lineHeight;
  }
  async function renderPdfCanvas() {
    const canvas=document.createElement('canvas');
    canvas.width=1224;canvas.height=1584;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Canvas unsupported');
    ctx.scale(2,2);
    ctx.fillStyle='#fdf8f1';ctx.fillRect(0,0,612,792);
    ctx.fillStyle='#603a49';ctx.fillRect(0,0,612,112);
    ctx.fillStyle='#efcfaa';ctx.font='bold 13px Georgia';ctx.fillText('✿  FLORERÍA FLORENTINA',34,37);
    ctx.fillStyle='#fff7ea';ctx.font='bold 30px Georgia';ctx.fillText('Your custom bouquet',34,75);
    ctx.fillStyle='#ead6d2';ctx.font='11px Arial';ctx.fillText('A little floral magic, designed by you · DEMO ESTIMATE',35,96);
    ctx.strokeStyle='#d5bbab';ctx.strokeRect(30,130,331,460);
    ctx.fillStyle='#f7eee6';ctx.fillRect(31,131,329,458);
    // Paint the same vector preview into the PDF at print resolution.
    const svg=$('bouquetArt');
    const source=new XMLSerializer().serializeToString(svg);
    const objectUrl=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
    try {
      const img=new Image();
      await new Promise((resolve,reject)=>{
        img.onload=resolve;img.onerror=()=>reject(Error('Could not render bouquet illustration'));
        img.src=objectUrl;
      });
      ctx.drawImage(img,24,142,342,411);
    } finally{URL.revokeObjectURL(objectUrl);}
    ctx.fillStyle='#7c5c60';ctx.textAlign='center';ctx.font='italic 15px Georgia';ctx.fillText($('bouquetNickname').textContent,196,567);ctx.textAlign='left';
    const {quote,occasion,note}=specs();
    const right=388,boxWidth=188;
    ctx.fillStyle='#a5797f';ctx.font='bold 9px Arial';ctx.fillText('YOUR SELECTIONS',right,145);
    ctx.strokeStyle='#dac8bf';ctx.beginPath();ctx.moveTo(right,157);ctx.lineTo(575,157);ctx.stroke();
    ctx.fillStyle='#513a3d';ctx.font='bold 12px Arial';
    let y=180;
    y=wrapCanvasText(ctx,state.roses+' '+ROSES[state.roseColor].name,right,y,boxWidth,15,2)+8;
    ctx.fillStyle='#70585a';ctx.font='11px Arial';
    y=wrapCanvasText(ctx,WRAPS[state.wrap].name+' wrap',right,y,boxWidth,15,2)+12;
    const active=addOnOrder.filter(id=>state.addons[id]);
    for(const id of active) {
      y=wrapCanvasText(ctx,'+ '+ADDONS[id][0],right,y,boxWidth,15,2)+4;
    }
    ctx.fillStyle='#a5797f';ctx.font='bold 9px Arial';ctx.fillText('ESTIMATED PRICE',right,Math.max(364,y+26));
    ctx.fillStyle='#613c48';ctx.font='bold 33px Arial';ctx.fillText(money(quote.total),right,Math.max(401,y+64));
    const afterTotal=Math.max(422,y+85);
    ctx.fillStyle='#80696a';ctx.font='11px Arial';
    let bottom=wrapCanvasText(ctx,'Occasion: '+occasion,right,afterTotal,boxWidth,16,3);
    if(note){ctx.font='10px Arial';bottom=wrapCanvasText(ctx,'Notes: '+note,right,bottom+12,boxWidth,14,6);}
    ctx.fillStyle='#614349';ctx.font='bold 11px Arial';ctx.fillText('Itemized estimate',34,630);
    ctx.strokeStyle='#d5b6b0';ctx.beginPath();ctx.moveTo(34,639);ctx.lineTo(575,639);ctx.stroke();
    ctx.fillStyle='#5f4c4c';ctx.font='10px Arial';
    const itemLabels=['Base bouquet  '+money(PRICE.base),...quote.extras.map(item=>item.label+'  +'+money(item.amount))];
    let iy=656;
    for(const str of itemLabels.slice(0,4)){ctx.fillText(str,34,iy);iy+=15;}
    ctx.fillStyle='#8d7372';ctx.font='9px Arial';
    ctx.fillText('DEVELOPMENT CONCEPT · NOT A CONFIRMED ORDER',34,738);
    ctx.fillText('Final price, availability and taxes must be confirmed by the florist.',34,754);
    ctx.fillText('770-873-6614 · floreriaflorentina4@gmail.com',34,771);
    ctx.fillStyle='#bf8a94';ctx.font='bold 11px Georgia';ctx.fillText('DESIGNED WITH LOVE  ✿',425,771);
    return canvas;
  }
  $('pdfButton').addEventListener('click',async()=>{
    const button=$('pdfButton');button.disabled=true;
    $('actionStatus').textContent='Preparing your PDF / Preparando PDF…';
    try{
      const canvas=await renderPdfCanvas();
      const pdf=imageToPdf(canvas);
      if(pdf.size<3000)throw Error('Unexpectedly small PDF');
      const link=document.createElement('a');
      const url=URL.createObjectURL(pdf);
      link.href=url;
      link.download='Florentina-Custom-Bouquet-Demo.pdf';
      document.body.append(link);
      link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      $('actionStatus').textContent='PDF ready! Sample estimate only / PDF listo.';
    }catch(err){
      console.error('Bouquet PDF generation failed',err);
      $('actionStatus').textContent='PDF could not be created in this browser / No se pudo crear el PDF.';
    }finally{button.disabled=false;}
  });
  update();
})();
