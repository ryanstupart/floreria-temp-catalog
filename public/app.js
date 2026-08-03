function formatPrice(value) {
  const num = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num) : "";
}
function cleanText(text, limit = 180) {
  const cleaned = String(text || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return cleaned.length > limit ? cleaned.slice(0, limit).trim() + "..." : cleaned;
}
function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}
const grid = document.getElementById("productsGrid");
const modal = document.getElementById("productModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");
let catalogProducts = [];
function productCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `<img src="${escapeHtml(product.image || "")}" alt="${escapeHtml(product.title)}"><div class="product-info"><div class="product-title">${escapeHtml(product.title)}</div><div class="product-description">${escapeHtml(cleanText(product.description))}</div><div class="product-price">${formatPrice(product.price)}</div></div>`;
  card.addEventListener("click", () => openProduct(product));
  return card;
}
function openProduct(product) {
  const images = product.images?.length ? product.images : [product.image].filter(Boolean);
  const gallery = images.length > 1 ? `<div class="product-thumbnails">${images.map((url, i) => `<button type="button" data-gallery-image="${escapeHtml(url)}" class="${i === 0 ? "active" : ""}"><img src="${escapeHtml(url)}" alt=""></button>`).join("")}</div>` : "";
  const emailSubject = encodeURIComponent(`Floreria Florentina Inquiry: ${product.title}`);
  const emailBody = encodeURIComponent(`Hello Floreria Florentina,

I am interested in ${product.title}.

Name:
Phone:
Event Date:

Hola Floreria Florentina,

Me interesa ${product.title}.

Nombre:
Teléfono:
Fecha del evento:`);
  const whatsappText = encodeURIComponent(`Hello! I'm interested in ${product.title}. / Hola, me interesa ${product.title}.`);
  modalBody.innerHTML = `<div class="product-detail"><div><img id="productMainImage" src="${escapeHtml(images[0] || "")}" alt="${escapeHtml(product.title)}">${gallery}</div><div><p class="eyebrow">Product Details / Detalles del Producto</p><h2>${escapeHtml(product.title)}</h2><div class="product-price">${formatPrice(product.price)}</div><p>${escapeHtml(cleanText(product.description, 900))}</p><div class="form-card product-contact-options"><h3>Interested in this product? / ¿Le interesa este producto?</h3><p>Contact us directly for availability, customizations, or ordering assistance.</p><p class="spanish">Contáctenos directamente para disponibilidad, personalizaciones o ayuda con su pedido.</p><a class="button" href="tel:+17708736614">📞 Call / Llamar</a><a class="button" target="_blank" rel="noopener noreferrer" href="https://wa.me/17708736614?text=${whatsappText}">💬 WhatsApp</a><a class="button" href="mailto:floreriaflorentina4@gmail.com?subject=${emailSubject}&body=${emailBody}">✉️ Email / Correo</a></div></div></div>`;
  modal.classList.add("show"); modal.setAttribute("aria-hidden", "false");
  modalBody.querySelectorAll("[data-gallery-image]").forEach((button) => button.addEventListener("click", () => {
    document.getElementById("productMainImage").src = button.dataset.galleryImage;
    modalBody.querySelectorAll("[data-gallery-image]").forEach((b) => b.classList.remove("active")); button.classList.add("active");
  }));
}
async function renderProducts() {
  grid.innerHTML = '<p class="catalog-loading">Loading products... / Cargando productos...</p>';
  try {
    const response = await fetch("/api/products");
    if (!response.ok) throw new Error("Unable to load products");
    const apiProducts = await response.json();
    catalogProducts = Array.isArray(apiProducts) && apiProducts.length
      ? apiProducts
      : (window.PRODUCTS || []);
  } catch (_error) {
    catalogProducts = window.PRODUCTS || [];
  }
  const products = catalogProducts;
  grid.innerHTML = "";
  if (!products.length) {
    grid.innerHTML = '<p class="catalog-loading">No products are available right now. / No hay productos disponibles en este momento.</p>';
    return;
  }
  products.forEach((product) => grid.appendChild(productCard({
    ...product,
    title: product.title || product.name,
    image: product.image || (Array.isArray(product.images) ? product.images[0] : "")
  })));
}
closeModal.addEventListener("click", () => { modal.classList.remove("show"); modal.setAttribute("aria-hidden", "true"); });
modal.addEventListener("click", (event) => { if (event.target === modal) { modal.classList.remove("show"); modal.setAttribute("aria-hidden", "true"); } });
renderProducts();
