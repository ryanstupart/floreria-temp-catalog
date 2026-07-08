const loginForm = document.getElementById("loginForm");
const dashboard = document.getElementById("dashboard");
const inquiriesDiv = document.getElementById("inquiries");
const logoutBtn = document.getElementById("logoutBtn");

const labels = {
  new: "New / Nuevo",
  in_progress: "In Progress / En progreso",
  completed: "Completed / Completado"
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const status = loginForm.querySelector(".form-status");
  const data = Object.fromEntries(new FormData(loginForm).entries());

  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  if (response.ok) {
    loginForm.style.display = "none";
    dashboard.style.display = "block";
    loadInquiries();
  } else {
    status.textContent = "Invalid login. / Acceso incorrecto.";
  }
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  location.reload();
});

async function loadInquiries() {
  const response = await fetch("/api/admin/inquiries");
  if (!response.ok) return;

  const items = await response.json();
  inquiriesDiv.innerHTML = `<div class="admin-card"><h3>${items.length} Inquiries / Solicitudes</h3></div>`;

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "inquiry";
    div.innerHTML = `
      <p class="status">${labels[item.status] || item.statusLabel}</p>
      <p><strong>Product / Producto:</strong> ${item.productTitle || "General Contact / Contacto General"}</p>
      <p><strong>Name / Nombre:</strong> ${item.name}</p>
      <p><strong>Email:</strong> ${item.email}</p>
      <p><strong>Phone / Teléfono:</strong> ${item.phone || ""}</p>
      <p><strong>Message / Mensaje:</strong><br>${item.message}</p>
      <p><strong>Created / Creado:</strong> ${new Date(item.createdAt).toLocaleString()}</p>
      <label>Status / Estado
        <select data-id="${item.id}">
          <option value="new" ${item.status === "new" ? "selected" : ""}>New / Nuevo</option>
          <option value="in_progress" ${item.status === "in_progress" ? "selected" : ""}>In Progress / En progreso</option>
          <option value="completed" ${item.status === "completed" ? "selected" : ""}>Completed / Completado</option>
        </select>
      </label>
    `;
    inquiriesDiv.appendChild(div);
  });

  document.querySelectorAll("select[data-id]").forEach((select) => {
    select.addEventListener("change", async () => {
      await fetch(`/api/admin/inquiries/${select.dataset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: select.value })
      });
      loadInquiries();
    });
  });
}