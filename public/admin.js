const loginForm = document.getElementById("loginForm");
const dashboard = document.getElementById("dashboard");
const inquiriesDiv = document.getElementById("inquiries");
const logoutBtn = document.getElementById("logoutBtn");
const welcomeTitle = document.getElementById("welcomeTitle");

const labels = {
  new: "New / Nuevo",
  in_progress: "In Progress / En progreso",
  completed: "Completed / Completado"
};

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

function setWelcome(name) {
  const cleanName = decodeURIComponent(name || "Admin");
  welcomeTitle.textContent = `Welcome, ${cleanName} / Bienvenido, ${cleanName}`;
}

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
    const result = await response.json();
    loginForm.style.display = "none";
    dashboard.style.display = "block";
    setWelcome(result.name);
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

  document.getElementById("newCount").textContent = items.filter((item) => item.status === "new").length;
  document.getElementById("progressCount").textContent = items.filter((item) => item.status === "in_progress").length;
  document.getElementById("totalCount").textContent = items.length;

  if (!items.length) {
    inquiriesDiv.innerHTML = `<div class="admin-card empty"><h2>No active inquiries / No hay solicitudes activas</h2><p>New customer inquiries will appear here.</p><p class="spanish">Las nuevas solicitudes aparecerán aquí.</p></div>`;
    return;
  }

  inquiriesDiv.innerHTML = "";

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "inquiry";
    div.innerHTML = `
      <div class="inquiry-top">
        <div>
          <span class="status">${labels[item.status] || item.statusLabel}</span>
          <h2>${item.productTitle || "General Contact / Contacto General"}</h2>
          <p class="meta">${new Date(item.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <label>Status / Estado
            <select data-id="${item.id}">
              <option value="new" ${item.status === "new" ? "selected" : ""}>New / Nuevo</option>
              <option value="in_progress" ${item.status === "in_progress" ? "selected" : ""}>In Progress / En progreso</option>
              <option value="completed" ${item.status === "completed" ? "selected" : ""}>Completed / Completado</option>
            </select>
          </label>
        </div>
      </div>

      <p><strong>Name / Nombre:</strong> ${item.name}</p>
      <p><strong>Email:</strong> ${item.email}</p>
      <p><strong>Phone / Teléfono:</strong> ${item.phone || ""}</p>
      <p><strong>Message / Mensaje:</strong><br>${item.message}</p>

      <div class="actions">
        <button class="delete-btn" data-delete="${item.id}">Delete / Eliminar</button>
      </div>
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

  document.querySelectorAll("button[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const confirmed = confirm("Delete this inquiry? / ¿Eliminar esta solicitud?");
      if (!confirmed) return;

      await fetch(`/api/admin/inquiries/${button.dataset.delete}`, {
        method: "DELETE"
      });
      loadInquiries();
    });
  });
}

// If already logged in, try loading dashboard
if (getCookie("floreria_admin_name")) {
  loginForm.style.display = "none";
  dashboard.style.display = "block";
  setWelcome(getCookie("floreria_admin_name"));
  loadInquiries();
}