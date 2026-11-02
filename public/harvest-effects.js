/* Thanksgiving and autumn seasonal storefront effects. No product or admin mutations. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return;
  const selector = '.harvest-catalog .section-title, .harvest-catalog .product-card, .harvest-custom .story-card, .harvest-about > div, .harvest-contact > div, .harvest-contact > form';
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, {threshold:0.08}) : null;
  const decorate = () => document.querySelectorAll(selector).forEach(el => {
    if (el.dataset.harvestAnimated) return;
    el.dataset.harvestAnimated = 'true';
    if (observer) {el.classList.add('harvest-reveal');observer.observe(el);}
  });
  decorate();
  const grid = document.getElementById('productsGrid');
  if (grid && 'MutationObserver' in window) new MutationObserver(decorate).observe(grid,{childList:true});
  let enabled = true;
  const toggle = document.createElement('button');
  toggle.type='button';toggle.className='harvest-ambient-toggle';
  toggle.setAttribute('aria-pressed','true');
  toggle.textContent='🍂 Leaves On / Hojas';
  toggle.addEventListener('click',()=>{
    enabled=!enabled;
    toggle.setAttribute('aria-pressed',String(enabled));
    toggle.textContent=enabled?'🍂 Leaves On / Hojas':'🍂 Leaves Off / Sin hojas';
    if(!enabled)document.querySelectorAll('.harvest-floating-leaf').forEach(el=>el.remove());
  });
  document.body.appendChild(toggle);
  setInterval(()=>{
    if(!enabled || document.hidden || document.querySelectorAll('.harvest-floating-leaf').length>=6)return;
    const leaf=document.createElement('span');
    leaf.className='harvest-floating-leaf';leaf.setAttribute('aria-hidden','true');
    leaf.textContent=['🍂','🍁','✦'][Math.floor(Math.random()*3)];
    leaf.style.left=Math.random()*100+'vw';
    leaf.style.setProperty('--drift',(Math.random()*160-80)+'px');
    leaf.style.setProperty('--fall-duration',(12+Math.random()*7)+'s');
    document.body.appendChild(leaf);
    leaf.addEventListener('animationend',()=>leaf.remove(),{once:true});
  },3200);
})();