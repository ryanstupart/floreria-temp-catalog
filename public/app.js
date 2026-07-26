function showSuccessPopup(type = "contact") {
  const popup = document.getElementById("successPopup");
  const title = document.getElementById("successTitle");
  const message = document.getElementById("successMessage");
  if (!popup || !title || !message) return;
  if (type === "product") {
    title.textContent = "Inquiry Sent Successfully / Solicitud enviada correctamente";
    message.innerHTML = "Thank you for choosing Floreria Florentina. We received your product inquiry and will contact you soon.<br><br>Gracias por elegir Floreria Florentina. Hemos recibido su solicitud de producto y nos comunicaremos pronto.";
  } else {
    title.textContent = "Message Sent Successfully / Mensaje enviado correctamente";
    message.innerHTML = "Thank you for contacting Floreria Florentina. We received your message and will reach out soon.<br><br>Gracias por contactar a Floreria Florentina. Hemos recibido su mensaje y nos comunicaremos pronto.";
  }
  popup.classList.add("show");
  popup.setAttribute("aria-hidden", "false");
}
function closeSuccessPopup() {
  const popup = document.getElementById("successPopup");
  if (!popup) return;
  popup.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
}
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
  modalBody.innerHTML = `<div class="product-detail"><div><img id="productMainImage" src="${escapeHtml(images[0] || "")}" alt="${escapeHtml(product.title)}">${gallery}</div><div><p class="eyebrow">Product Inquiry / Solicitud de Producto</p><h2>${escapeHtml(product.title)}</h2><div class="product-price">${formatPrice(product.price)}</div><p>${escapeHtml(cleanText(product.description, 900))}</p><form class="form-card inquiry-form"><h3>I'm Interested / Me Interesa</h3><input type="hidden" name="type" value="product"><input type="hidden" name="productId" value="${escapeHtml(product.id)}"><input type="hidden" name="productTitle" value="${escapeHtml(product.title)}"><input type="hidden" name="productImage" value="${escapeHtml(images[0] || "")}"><label>Name / Nombre<input name="name" required></label><label>Email / Correo<input type="email" name="email" required></label><label>Phone / Teléfono<input name="phone"></label><label>Message / Mensaje<textarea name="message" required>I am interested in ${escapeHtml(product.title)}.</textarea></label><button type="submit">I'm Interested / Me Interesa</button><p class="form-status"></p></form></div></div>`;
  modal.classList.add("show"); modal.setAttribute("aria-hidden", "false");
  modalBody.querySelector("form").addEventListener("submit", submitInquiry);
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
async function submitInquiry(event) {
  event.preventDefault(); const form = event.target; const status = form.querySelector(".form-status"); const data = Object.fromEntries(new FormData(form).entries()); status.textContent = "Sending... / Enviando...";
  try { const response = await fetch("/api/inquiries", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) }); if (!response.ok) throw new Error("Failed"); const inquiryType = data.type === "product" ? "product" : "contact"; form.reset(); status.textContent = ""; showSuccessPopup(inquiryType); }
  catch (_error) { status.textContent = "There was an error. Please try again. / Hubo un error. Inténtelo de nuevo."; }
}
closeModal.addEventListener("click", () => { modal.classList.remove("show"); modal.setAttribute("aria-hidden", "true"); });
modal.addEventListener("click", (event) => { if (event.target === modal) { modal.classList.remove("show"); modal.setAttribute("aria-hidden", "true"); } });
document.getElementById("contactForm").addEventListener("submit", submitInquiry);
renderProducts();
const successClose = document.getElementById("successClose"); const successPopup = document.getElementById("successPopup");
if (successClose) successClose.addEventListener("click", closeSuccessPopup);
if (successPopup) successPopup.addEventListener("click", (event) => { if (event.target === successPopup) closeSuccessPopup(); });
