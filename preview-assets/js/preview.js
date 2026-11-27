
(() => {
  const data = window.MANIA_PREVIEW || {};
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = cents => "R$ " + (Number(cents || 0) / 100).toFixed(2).replace(".", ",");
  const products = data.products || [];
  const featured = products.filter(p => p.featured).length ? products.filter(p => p.featured) : products;
  const image = p => p.image ? `<img class="pi" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : `<div class="pi">Imagem indisponível</div>`;
  const price = p => p.promo != null ? `<s>${money(p.price)}</s> <b>${money(p.promo)}</b>` : `<b>${money(p.price)}</b>`;
  const card = p => `<article class="card">
    <button class="preview-card-image" type="button" data-product="${p.id}" aria-label="Ver ${esc(p.name)}">
      ${image(p)}
    </button>
    <div class="cb"><small>${esc(p.category)}</small><b>${esc(p.name)}</b><span>${price(p)}</span>
    <button class="btn dark" type="button" data-product="${p.id}">Ver detalhes</button></div>
  </article>`;

  const cats = $("#categories");
  cats.innerHTML = (data.categories || []).map(c => `<a href="#produtos" data-category-link="${esc(c)}">${esc(c)}</a>`).join("");
  const filter = $("#categoryFilter");
  filter.innerHTML += (data.categories || []).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");

  let currentSlide = 0, timer;
  function renderFeature() {
    const list = featured.slice(0, 8);
    if (!list.length) { $("#feature").innerHTML = '<div class="preview-empty">Nenhum produto cadastrado para exibição.</div>'; return; }
    $("#feature").innerHTML = `<div class="feature-carousel" id="featureCarousel">
      <div class="feature-track">${list.map((p,i) => `<article class="feature-slide ${i===0?'active':''}" data-slide="${i}">
        <div class="feature-images"><img src="${esc(p.image || './preview-assets/images/logo.png')}" alt="${esc(p.name)}"><img src="${esc(p.image2 || p.image || './preview-assets/images/logo.png')}" alt="${esc(p.name)} — segunda imagem"></div>
        <div class="feature-copy"><small>${esc(p.category)}</small><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><strong>${price(p)}</strong><button class="btn dark" data-product="${p.id}">Ver produto</button></div>
      </article>`).join("")}</div>
      <div class="feature-controls"><button class="btn" type="button" data-prev aria-label="Produto anterior">‹</button>
      <div class="feature-dots">${list.map((_,i)=>`<button type="button" data-dot="${i}" class="${i===0?'active':''}" aria-label="Ir para produto ${i+1}"></button>`).join("")}</div>
      <button class="btn" type="button" data-next aria-label="Próximo produto">›</button></div></div>`;
    const root = $("#featureCarousel"), slides = [...root.querySelectorAll(".feature-slide")], dots = [...root.querySelectorAll("[data-dot]")];
    const show = n => { currentSlide=(n+slides.length)%slides.length; slides.forEach((s,i)=>s.classList.toggle("active",i===currentSlide)); dots.forEach((d,i)=>d.classList.toggle("active",i===currentSlide)); };
    root.querySelector("[data-prev]").onclick=()=>show(currentSlide-1);
    root.querySelector("[data-next]").onclick=()=>show(currentSlide+1);
    dots.forEach((d,i)=>d.onclick=()=>show(i));
    if (timer) clearInterval(timer);
    if (slides.length>1) timer=setInterval(()=>show(currentSlide+1),5500);
  }

  function renderProducts() {
    const q=$("#search").value.trim().toLocaleLowerCase("pt-BR");
    const category=filter.value, sort=$("#sort").value;
    let list=products.filter(p=>(!category || p.category===category) && p.name.toLocaleLowerCase("pt-BR").includes(q));
    list.sort((a,b)=>sort==="asc" ? (a.promo??a.price)-(b.promo??b.price) : sort==="desc" ? (b.promo??b.price)-(a.promo??a.price) : a.name.localeCompare(b.name,"pt-BR"));
    $("#productGrid").innerHTML=list.length ? `<div class="grid">${list.map(card).join("")}</div>` : '<div class="preview-empty">Nenhum produto encontrado.</div>';
  }

  function openProduct(id) {
    const p=products.find(x=>x.id===Number(id)); if(!p)return;
    const backdrop=document.createElement("div"); backdrop.className="product-modal-backdrop";
    backdrop.innerHTML=`<section class="product-modal" role="dialog" aria-modal="true" aria-label="Detalhes do produto">
      <button class="btn modal-close" type="button">Fechar ✕</button>
      <div class="product-gallery">${image(p)}${p.image2?`<img class="pi" src="${esc(p.image2)}" alt="${esc(p.name)} — segunda imagem">`:""}</div>
      <small>${esc(p.category)}</small><h2>${esc(p.name)}</h2><p>${esc(p.description)}</p><h3>${price(p)}</h3>
      <p class="muted">Esta é uma demonstração visual. Para consultar disponibilidade ou comprar, acesse os canais oficiais da loja.</p>
      ${data.instagram?`<a class="btn dark" href="https://instagram.com/${encodeURIComponent(data.instagram)}" target="_blank" rel="noopener">Falar com a loja no Instagram</a>`:""}
    </section>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click",e=>{if(e.target===backdrop || e.target.closest(".modal-close"))backdrop.remove();});
    document.addEventListener("keydown", function close(e){if(e.key==="Escape"){backdrop.remove();document.removeEventListener("keydown",close);}});
  }

  document.addEventListener("click", e=>{
    const p=e.target.closest("[data-product]"); if(p){openProduct(p.dataset.product);return;}
    const c=e.target.closest("[data-category-link]"); if(c){filter.value=c.dataset.categoryLink;renderProducts();}
  });
  ["input","change"].forEach(ev=>{$("#search").addEventListener(ev,renderProducts);filter.addEventListener(ev,renderProducts);$("#sort").addEventListener(ev,renderProducts);});
  const applyTheme = theme => {document.documentElement.dataset.theme=theme;localStorage.setItem("mania-theme-preview",theme);$("#themeToggle").innerHTML=theme==="dark"?"☀ <span>Claro</span>":"☾ <span>Escuro</span>";};
  applyTheme(localStorage.getItem("mania-theme-preview")||"light");
  $("#themeToggle").addEventListener("click",()=>applyTheme(document.documentElement.dataset.theme==="dark"?"light":"dark"));

  $("#stores").innerHTML = [data.address,data.address2].filter(Boolean).map((address,i)=>`<div class="store"><h3>Loja ${i+1}</h3><p>${esc(address)}</p><a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}" target="_blank" rel="noopener">Ver no Google Maps</a></div>`).join("");
  $("#about").textContent=data.about || "Perfumes, cosméticos e maquiagem.";
  $("#hours").textContent=data.hours ? "Atendimento: "+data.hours : "";
  if(data.instagram){$("#instagram").href="https://instagram.com/"+encodeURIComponent(data.instagram);$("#instagram").textContent="@"+data.instagram;}
  else{$("#instagram").hidden=true;}
  renderFeature();
  renderProducts();
})();
