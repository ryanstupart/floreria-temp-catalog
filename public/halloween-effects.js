/* Lightweight Halloween effects — public storefront only. */
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const selector = '.halloween-catalog .section-title, .halloween-catalog .product-card, .halloween-custom .story-card, .halloween-about > div, .halloween-contact > div, .halloween-contact > form';
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08 })
    : null;
  const decorate = () => {
    document.querySelectorAll(selector).forEach(el => {
      if (el.dataset.halloweenAnimated) return;
      el.dataset.halloweenAnimated = 'true';
      if (observer) {
        el.classList.add('halloween-reveal');
        observer.observe(el);
      }
    });
  };
  decorate();
  const grid = document.getElementById('productsGrid');
  if (grid && 'MutationObserver' in window) {
    new MutationObserver(decorate).observe(grid, { childList: true, subtree: false });
  }
  let ambientOn = true;
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'halloween-ambient-toggle';
  toggle.setAttribute('aria-pressed','true');
  toggle.textContent = '✦ Effects On / Efectos';
  toggle.addEventListener('click', () => {
    ambientOn = !ambientOn;
    toggle.setAttribute('aria-pressed',String(ambientOn));
    toggle.textContent = ambientOn ? '✦ Effects On / Efectos' : '✦ Effects Off / Sin efectos';
    if (!ambientOn) document.querySelectorAll('.halloween-floating-leaf').forEach(el => el.remove());
  });
  document.body.appendChild(toggle);
  const hero = document.querySelector('.hero');
  if (hero) {
    const mist = document.createElement('div');
    mist.className = 'halloween-mist';
    mist.setAttribute('aria-hidden','true');
    hero.appendChild(mist);
  }
  setInterval(() => {
    if (!ambientOn || document.hidden || document.querySelectorAll('.halloween-floating-leaf').length >= 7) return;
    const leaf = document.createElement('span');
    leaf.className = 'halloween-floating-leaf';
    leaf.setAttribute('aria-hidden','true');
    leaf.textContent = ['🍂','✦','🍁'][Math.floor(Math.random()*3)];
    leaf.style.left = Math.random()*100+'vw';
    leaf.style.setProperty('--drift',(Math.random()*180-90)+'px');
    leaf.style.setProperty('--fall-duration',(12+Math.random()*7)+'s');
    document.body.appendChild(leaf);
    leaf.addEventListener('animationend',() => leaf.remove(),{once:true});
  },2700);
  let lastSpark = 0;
  document.addEventListener('pointerdown', event => {
    if (!ambientOn || event.pointerType === 'touch' || Date.now() - lastSpark < 220) return;
    if (event.target.closest('input, textarea, select, .modal, .site-header')) return;
    lastSpark = Date.now();
    const spark = document.createElement('span');
    spark.className = 'halloween-spark';
    spark.textContent = ['✨', '🎃', '✦'][Math.floor(Math.random() * 3)];
    spark.setAttribute('aria-hidden', 'true');
    spark.style.left = (event.clientX - 10) + 'px';
    spark.style.top = (event.clientY - 10) + 'px';
    document.body.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
    setTimeout(() => spark.remove(), 1000);
  });
})();
