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

async function sendInquiryEmail(inquiry) {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured. Inquiry saved only.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "Floreria Florentina <onboarding@resend.dev>",
    to: process.env.EMAIL_TO || "ryanstupart@gmail.com",
    subject: `New Floreria Inquiry: ${inquiry.productTitle || "General Contact"}`,
    html: `
      <h2>New Floreria Florentina Inquiry</h2>
      <p><strong>Status:</strong> New / Nuevo</p>
      <p><strong>Type:</strong> ${sanitize(inquiry.type)}</p>
      <p><strong>Product:</strong> ${sanitize(inquiry.productTitle || "General Contact")}</p>
      <p><strong>Name:</strong> ${sanitize(inquiry.name)}</p>
      <p><strong>Email:</strong> ${sanitize(inquiry.email)}</p>
      <p><strong>Phone:</strong> ${sanitize(inquiry.phone || "N/A")}</p>
      <p><strong>Message:</strong></p>
      <p>${sanitize(inquiry.message).replace(/\n/g, "<br>")}</p>
      <p><strong>Created:</strong> ${sanitize(inquiry.createdAt)}</p>
    `
  });
}

app.post("/api/inquiries", async (req, res) => {
  const { type, productId, productTitle, name, email, phone, message } = req.body;

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