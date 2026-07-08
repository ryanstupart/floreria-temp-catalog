require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Resend } = require("resend");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data", "inquiries.json");

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Flowers1234";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "temporary-admin-token-change-this";
const ADMIN_COOKIE = "floreria_admin_access";

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

function readInquiries() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    return [];
  }
}

function writeInquiries(inquiries) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(inquiries, null, 2));
}

function requireAdmin(req, res, next) {
  if (req.cookies[ADMIN_COOKIE] === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

function sanitize(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


function productImageHtml(inquiry) {
  if (!inquiry.productImage) return "";
  return `
    <tr>
      <td style="padding:16px 0;">
        <img src="${sanitize(inquiry.productImage)}" alt="${sanitize(inquiry.productTitle || "Product")}" style="width:100%;max-width:420px;border-radius:18px;display:block;">
      </td>
    </tr>
  `;
}

function emailShell(title, subtitle, bodyHtml) {
  return `
  <div style="margin:0;padding:0;background:#fff8f3;font-family:Arial,sans-serif;color:#2f2825;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8f3;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 34px rgba(47,40,37,.10);">
            <tr>
              <td style="background:linear-gradient(135deg,#7a4b57,#b85c68);padding:34px 28px;text-align:center;color:white;">
                <div style="font-family:Georgia,serif;font-size:34px;font-weight:800;line-height:1.05;">Floreria Florentina</div>
                <div style="margin-top:10px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">${title}</div>
                <div style="margin-top:8px;font-size:15px;opacity:.92;">${subtitle}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#fff8f3;padding:22px 28px;text-align:center;color:#6f625d;font-size:14px;line-height:1.6;">
                <strong>Floreria Florentina LLC</strong><br>
                3303 Chamblee Dunwoody Rd., Chamblee, Georgia 30341<br>
                770-837-3856 · floreriaflorentina4@gmail.com
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>`;
}

function detailTable(inquiry) {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:18px 0;background:#fff8f3;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #ead8d5;"><strong>Name / Nombre:</strong></td><td style="padding:12px 16px;border-bottom:1px solid #ead8d5;">${sanitize(inquiry.name)}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #ead8d5;"><strong>Email / Correo:</strong></td><td style="padding:12px 16px;border-bottom:1px solid #ead8d5;">${sanitize(inquiry.email)}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #ead8d5;"><strong>Phone / Teléfono:</strong></td><td style="padding:12px 16px;border-bottom:1px solid #ead8d5;">${sanitize(inquiry.phone || "N/A")}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #ead8d5;"><strong>Product / Producto:</strong></td><td style="padding:12px 16px;border-bottom:1px solid #ead8d5;">${sanitize(inquiry.productTitle || "General Contact / Contacto General")}</td></tr>
      <tr><td style="padding:12px 16px;"><strong>Message / Mensaje:</strong></td><td style="padding:12px 16px;">${sanitize(inquiry.message).replace(/\n/g, "<br>")}</td></tr>
    </table>
  `;
}

function adminPortalUrl() {
  const baseUrl = process.env.PUBLIC_SITE_URL || "https://floreriaflorentina.com";
  return `${baseUrl.replace(/\/$/, "")}/admin`;
}

async function sendInquiryEmail(inquiry) {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured. Inquiry saved only.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || "Floreria Florentina <contact@floreriaflorentina.com>";
  const adminTo = process.env.EMAIL_TO || "ryanstupart@gmail.com";

  const isProduct = inquiry.type === "product";
  const productLine = inquiry.productTitle ? ` about ${inquiry.productTitle}` : "";
  const productLineSpanish = inquiry.productTitle ? ` sobre ${inquiry.productTitle}` : "";

  const customerBody = emailShell(
    isProduct ? "Product Inquiry Received / Solicitud Recibida" : "Message Received / Mensaje Recibido",
    "Thank you for choosing Floreria Florentina · Gracias por elegir Floreria Florentina",
    `
      <h2 style="font-family:Georgia,serif;color:#7a4b57;margin:0 0 12px;">Thank you for contacting us.</h2>
      <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">
        Thank you for choosing Floreria Florentina. We received your ${isProduct ? "product inquiry" : "message"}${productLine}. Our team will review it and contact you soon.
      </p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 18px;color:#5d5552;">
        Gracias por elegir Floreria Florentina. Hemos recibido su ${isProduct ? "solicitud de producto" : "mensaje"}${productLineSpanish}. Nuestro equipo lo revisará y se comunicará con usted pronto.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${productImageHtml(inquiry)}
      </table>
      ${detailTable(inquiry)}
      <p style="font-size:15px;line-height:1.7;color:#5d5552;margin-top:20px;">
        If you need immediate assistance, please contact us directly.<br>
        Si necesita asistencia inmediata, comuníquese directamente con nosotros.
      </p>
    `
  );

  const adminBody = emailShell(
    isProduct ? "New Product Inquiry / Nueva Solicitud de Producto" : "New Contact Lead / Nuevo Lead de Contacto",
    "A new customer inquiry was submitted · Se recibió una nueva solicitud",
    `
      <h2 style="font-family:Georgia,serif;color:#7a4b57;margin:0 0 12px;">
        ${isProduct ? "You received a new product inquiry." : "You received a new contact lead."}
      </h2>
      <p style="font-size:16px;line-height:1.7;margin:0 0 14px;">
        A customer submitted a new ${isProduct ? "product inquiry" : "contact form message"}. Details are below.
      </p>
      <p style="font-size:16px;line-height:1.7;margin:0 0 18px;color:#5d5552;">
        Un cliente envió una nueva ${isProduct ? "solicitud de producto" : "solicitud de contacto"}. Los detalles están abajo.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${productImageHtml(inquiry)}
      </table>
      ${detailTable(inquiry)}
      <div style="text-align:center;margin-top:26px;">
        <a href="${sanitize(adminPortalUrl())}" style="display:inline-block;background:#b85c68;color:white;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:800;">
          View in Admin Portal / Ver en Portal Admin
        </a>
      </div>
    `
  );

  const sendTasks = [
    resend.emails.send({
      from,
      to: adminTo,
      subject: isProduct
        ? `New Product Inquiry: ${inquiry.productTitle || "Product"}`
        : "New Contact Lead: Floreria Florentina",
      html: adminBody
    })
  ];

  if (inquiry.email) {
    sendTasks.push(
      resend.emails.send({
        from,
        to: inquiry.email,
        replyTo: "floreriaflorentina4@gmail.com",
        subject: isProduct
          ? `We received your inquiry: ${inquiry.productTitle || "Floreria Florentina"}`
          : "Thank you for contacting Floreria Florentina",
        html: customerBody
      })
    );
  }

  await Promise.all(sendTasks);
}

app.post("/api/inquiries", async (req, res) => {
  const { type, productId, productTitle, productImage, name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      error: "Name, email, and message are required."
    });
  }

  const inquiry = {
    id: crypto.randomUUID(),
    type: type || "general",
    productId: productId || "",
    productTitle: productTitle || "",
    productImage: productImage || "",
    name,
    email,
    phone: phone || "",
    message,
    status: "new",
    statusLabel: "New / Nuevo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const inquiries = readInquiries();
  inquiries.unshift(inquiry);
  writeInquiries(inquiries);

  try {
    await sendInquiryEmail(inquiry);
  } catch (error) {
    console.error("Email send failed:", error);
  }

  return res.json({ success: true, inquiry });
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.cookie(ADMIN_COOKIE, ADMIN_TOKEN, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    });
    return res.json({ success: true });
  }

  return res.status(401).json({ error: "Invalid login." });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie(ADMIN_COOKIE);
  return res.json({ success: true });
});

app.get("/api/admin/inquiries", requireAdmin, (req, res) => {
  return res.json(readInquiries());
});

app.patch("/api/admin/inquiries/:id", requireAdmin, (req, res) => {
  const allowed = {
    new: "New / Nuevo",
    in_progress: "In Progress / En progreso",
    completed: "Completed / Completado"
  };

  const { status } = req.body;

  if (!allowed[status]) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const inquiries = readInquiries();
  const inquiry = inquiries.find((item) => item.id === req.params.id);

  if (!inquiry) {
    return res.status(404).json({ error: "Inquiry not found." });
  }

  inquiry.status = status;
  inquiry.statusLabel = allowed[status];
  inquiry.updatedAt = new Date().toISOString();

  writeInquiries(inquiries);

  return res.json({ success: true, inquiry });
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => {
  console.log(`Floreria Florentina app running at http://localhost:${PORT}`);
});