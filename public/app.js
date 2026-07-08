
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
  const raw = String(value || "").replace(/[^0-9.]/g, "");
  const num = Number(raw);
  if (!raw || Number.isNaN(num)) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

function cleanText(text, limit = 180) {
  const cleaned = String(text || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  return cleaned.length > limit ? cleaned.slice(0, limit).trim() + "..." : cleaned;
}

const grid = document.getElementById("productsGrid");
const modal = document.getElementById("productModal");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

function productCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.innerHTML = `
    <img src="${product.image || ""}" alt="${product.title}">
    <div class="product-info">
      <div class="product-title">${product.title}</div>
      <div class="product-description">${cleanText(product.description)}</div>
      <div class="product-price">${formatPrice(product.price)}</div>
    </div>
  `;
  card.addEventListener("click", () => openProduct(product));
  return card;
}

function openProduct(product) {
  modalBody.innerHTML = `
    <div class="product-detail">
      <img src="${product.image || ""}" alt="${product.title}">
      <div>
        <p class="eyebrow">Product Inquiry / Solicitud de Producto</p>
        <h2>${product.title}</h2>
        <div class="product-price">${formatPrice(product.price)}</div>
        <p>${cleanText(product.description, 900)}</p>

        <form class="form-card inquiry-form">
          <h3>I'm Interested / Me Interesa</h3>
          <input type="hidden" name="type" value="product">
          <input type="hidden" name="productId" value="${product.id}">
          <input type="hidden" name="productTitle" value="${product.title}">
          <input type="hidden" name="productImage" value="${product.image || ""}">
          <label>Name / Nombre<input name="name" required></label>
          <label>Email / Correo<input type="email" name="email" required></label>
          <label>Phone / Teléfono<input name="phone"></label>
          <label>Message / Mensaje<textarea name="message" required>I am interested in ${product.title}.</textarea></label>
          <button type="submit">I'm Interested / Me Interesa</button>
          <p class="form-status"></p>
        </form>
      </div>
    </div>
  `;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  modalBody.querySelector("form").addEventListener("submit", submitInquiry);
}

function renderProducts() {
  const products = (window.PRODUCTS || []).filter((p) => !/test/i.test(p.title || ""));
  grid.innerHTML = "";
  products.forEach((product) => grid.appendChild(productCard(product)));
}

async function submitInquiry(event) {
  event.preventDefault();

  const form = event.target;
  const status = form.querySelector(".form-status");
  const data = Object.fromEntries(new FormData(form).entries());

  status.textContent = "Sending... / Enviando...";

  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error("Failed");

    const inquiryType = data.type === "product" ? "product" : "contact";
    form.reset();
    status.textContent = "";
    showSuccessPopup(inquiryType);
  } catch (error) {
    status.textContent = "There was an error. Please try again. / Hubo un error. Inténtelo de nuevo.";
  }
}

closeModal.addEventListener("click", () => {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }
});

document.getElementById("contactForm").addEventListener("submit", submitInquiry);

renderProducts();

const successClose = document.getElementById("successClose");
const successPopup = document.getElementById("successPopup");
if (successClose) successClose.addEventListener("click", closeSuccessPopup);
if (successPopup) {
  successPopup.addEventListener("click", (event) => {
    if (event.target === successPopup) closeSuccessPopup();
  });
}
