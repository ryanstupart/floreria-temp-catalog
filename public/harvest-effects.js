/* Florería Florentina — November gratitude interactions. Storefront only; no API writes. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const grid = document.getElementById('productsGrid');
  const search = document.getElementById('harvestProductSearch');
  const clear = document.getElementById('harvestClearSearch');
  const counter = document.getElementById('harvestResultCount');
  const noResults = document.getElementById('harvestNoResults');
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const allCards = () => grid ? Array.from(grid.querySelectorAll('.product-card')) : [];

  // Search existing rendered catalog cards; do not alter product records or prices.
  let pending = false;
  function updateCatalog() {
    pending = false;
    const cards = allCards();
    const query = normalize(search && search.value);
    let matches = 0;
    cards.forEach(card => {
      if (!card.dataset.harvestKeyboardReady) {
        card.dataset.harvestKeyboardReady = 'true';
        card.tabIndex = 0;
        card.setAttribute('role','button');
        const productName = card.querySelector('.product-title');
        card.setAttribute('aria-label', (productName ? productName.textContent : 'View product') + ' — View details / Ver detalles');
        card.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            card.click();
          }
        });
      }
      const found = !query || normalize(card.textContent).includes(query);
      card.hidden = !found;
      if (found) matches += 1;
    });
    if (counter) counter.textContent = cards.length
      ? (query ? matches + ' of ' + cards.length + ' arrangements / arreglos' : cards.length + ' arrangements / arreglos')
      : '';
    if (noResults) noResults.hidden = !(query && cards.length && !matches);
    if (clear) clear.disabled = !query;
    if (window.harvestRevealDecorate) window.harvestRevealDecorate();
  }
  function scheduleCatalog() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(updateCatalog);
  }
  if (search) search.addEventListener('input', scheduleCatalog);
  if (clear) clear.addEventListener('click', () => { if (search) {search.value='';search.focus();} scheduleCatalog(); });
  if (grid && 'MutationObserver' in window) new MutationObserver(scheduleCatalog).observe(grid, {childList:true});
  scheduleCatalog();

  const notes = [
    ['Thank you for making ordinary days feel extraordinary.', 'Gracias por hacer que los días ordinarios se sientan extraordinarios.'],
    ['Some people make the world brighter just by being in it. Thank you.', 'Hay personas que iluminan el mundo solo con estar presentes. Gracias.'],
    ['Grateful for the laughter, the memories, and every moment we share.', 'Agradezco las risas, los recuerdos y cada momento que compartimos.'],
    ['A little bouquet, a whole lot of gratitude.', 'Un pequeño ramo, un enorme agradecimiento.'],
    ['Home is wherever we gather with the people we love.', 'El hogar está donde nos reunimos con quienes amamos.'],
    ['For all the little things you do that mean so much: thank you.', 'Por cada pequeño gesto que significa tanto: gracias.']
  ];
  const english = document.getElementById('harvestGratitudeEnglish');
  const spanish = document.getElementById('harvestGratitudeSpanish');
  const next = document.getElementById('harvestNextNote');
  const copy = document.getElementById('harvestCopyNote');
  const feedback = document.getElementById('harvestCopyFeedback');
  let noteIndex = 0;

  function celebrateNote() {
    if (reducedMotion || !next) return;
    for (let i=0;i<6;i++) {
      const el = document.createElement('span');
      el.className='harvest-note-petal';
      el.textContent=['✦','❧','✧'][i%3];
      el.setAttribute('aria-hidden','true');
      el.style.setProperty('--petal-x', ((i-2.5)*22)+'px');
      el.style.setProperty('--petal-y', (-50-Math.abs(i-2.5)*16)+'px');
      next.appendChild(el);
      el.addEventListener('animationend',()=>el.remove(),{once:true});
    }
  }
  if (next) next.addEventListener('click',()=>{
    noteIndex=(noteIndex+1)%notes.length;
    if (english) english.textContent=notes[noteIndex][0];
    if (spanish) spanish.textContent=notes[noteIndex][1];
    if (feedback) feedback.textContent='';
    celebrateNote();
  });
  if (copy) copy.addEventListener('click', async ()=>{
    const content=notes[noteIndex].join('\n');
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(content);
      if (feedback) feedback.textContent='Copied with gratitude / Copiado con gratitud ✓';
    } catch (_error) {
      // Clipboard APIs may be unavailable in an insecure or restricted preview.
      if (feedback) feedback.textContent='Copy not available here. Please select the note to copy. / Seleccione la nota para copiar.';
    }
  });

  if (reducedMotion) return;
  const revealSelector = '.harvest-catalog .section-title, .harvest-catalog .product-card, .harvest-custom .story-card, .harvest-about > div, .harvest-contact > div, .harvest-contact > form, .harvest-gratitude, .harvest-feature';
  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {threshold:0.06, rootMargin:'0px 0px 35px 0px'})
    : null;
  function decorate() {
    document.querySelectorAll(revealSelector).forEach(el => {
      if (el.dataset.harvestAnimated) return;
      el.dataset.harvestAnimated='true';
      if (revealObserver) {
        el.classList.add('harvest-reveal');
        revealObserver.observe(el);
      }
    });
  }
  window.harvestRevealDecorate = decorate;
  decorate();

  // Small, interruptible leaf animation, with a user-controlled effects switch.
  let enabled=true;
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='harvest-ambient-toggle';
  toggle.setAttribute('aria-pressed','true');
  toggle.setAttribute('aria-label','Turn falling leaves off / Desactivar hojas');
  toggle.textContent='🍂 Leaves on / Hojas';
  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-label',enabled ? 'Turn falling leaves off / Desactivar hojas' : 'Turn falling leaves on / Activar hojas');
    toggle.textContent=enabled ? '🍂 Leaves on / Hojas' : '🍂 Leaves off / Sin hojas';
    if(!enabled)document.querySelectorAll('.harvest-floating-leaf').forEach(el=>el.remove());
  });
  document.body.appendChild(toggle);

  setInterval(()=>{
    if(!enabled || document.hidden || document.querySelectorAll('.harvest-floating-leaf').length>=5)return;
    const leaf=document.createElement('span');
    leaf.className='harvest-floating-leaf';
    leaf.setAttribute('aria-hidden','true');
    leaf.textContent=['🍂','🍁','✦'][Math.floor(Math.random()*3)];
    leaf.style.left=(Math.random()*96+2)+'vw';
    leaf.style.setProperty('--drift',(Math.random()*140-70)+'px');
    leaf.style.setProperty('--fall-duration',(13+Math.random()*7)+'s');
    document.body.appendChild(leaf);
    leaf.addEventListener('animationend',()=>leaf.remove(),{once:true});
  },3400);

  const progress=document.createElement('div');
  progress.className='harvest-scroll-progress';
  progress.setAttribute('aria-hidden','true');
  document.body.appendChild(progress);
  let scrollQueued=false;
  const updateProgress=()=>{
    scrollQueued=false;
    const max=document.documentElement.scrollHeight-window.innerHeight;
    progress.style.transform='scaleX('+(max>0?window.scrollY/max:0)+')';
  };
  window.addEventListener('scroll',()=>{
    if(scrollQueued)return;
    scrollQueued=true;
    requestAnimationFrame(updateProgress);
  },{passive:true});
  window.addEventListener('resize',updateProgress,{passive:true});
  updateProgress();
})();