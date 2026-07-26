require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Resend } = require("resend");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data", "inquiries.json");
const LEGACY_PRODUCTS_FILE = path.join(__dirname, "public", "products.js");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only JPEG, PNG, and WebP images are allowed."), allowed.includes(file.mimetype));
  }
});

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Flowers1234";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "temporary-admin-token-change-this";
const ADMIN_COOKIE = "floreria_admin_access";
const ADMIN_NAME_COOKIE = "floreria_admin_name";

const ADMIN_USERS = [
  {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
    name: "Admin"
  },
  {
    username: "Yajaira123",
    password: "Flowers1234",
    name: "Yajaira"
  }
];

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));


function ensureSupabase(res) {
  if (supabase) return true;
  res.status(503).json({ error: "Supabase is not configured on this environment." });
  return false;
}

function loadLegacyProducts() {
  try {
    const source = fs.readFileSync(LEGACY_PRODUCTS_FILE, "utf8");
    const match = source.match(/window\.PRODUCTS\s*=\s*(\[[\s\S]*\]);?\s*$/);
    return match ? JSON.parse(match[1]) : [];
  } catch (error) {
    console.error("Unable to read legacy products:", error.message);
    return [];
  }
}

function mapDbProduct(row) {
  const images = (row.product_images || [])
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .map((item) => item.image_url);
  return {
    id: row.id,
    title: row.name,
    name: row.name,
    description: row.description || "",
    price: Number(row.price),
    image: images[0] || "",
    images,
    isVisible: row.is_visible
  };
}

async function fetchDbProducts({ includeHidden = false } = {}) {
  let query = supabase
    .from("products")
    .select("id,name,description,price,is_visible,created_at,updated_at,product_images(id,image_url,storage_path,display_order)")
    .order("created_at", { ascending: false });
  if (!includeHidden) query = query.eq("is_visible", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapDbProduct);
}

function safeStorageName(originalName) {
  const ext = path.extname(originalName || "").toLowerCase() || ".jpg";
  const base = path.basename(originalName || "image", ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "image";
  return `${Date.now()}-${crypto.randomUUID()}-${base}${ext}`;
}

async function uploadProductFiles(productId, files) {
  const rows = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const storagePath = `${productId}/${safeStorageName(file.originalname)}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    rows.push({
      product_id: productId,
      image_url: publicData.publicUrl,
      storage_path: storagePath,
      display_order: index
    });
  }
  if (rows.length) {
    const { error } = await supabase.from("product_images").insert(rows);
    if (error) throw error;
  }
}

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
                770-873-6614 · floreriaflorentina4@gmail.com
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
  const from = process.env.EMAIL_FROM || "Floreria Florentina <floreriaflorentina4@gmail.com>";
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


// Public product catalog. Uses Supabase when configured and falls back to the bundled catalog.
app.get("/api/products", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  const legacyProducts = loadLegacyProducts();
  try {
    if (!supabase) return res.json(legacyProducts);
    const products = await fetchDbProducts();
    return res.json(products.length ? products : legacyProducts);
  } catch (error) {
    console.error("Product load failed:", error);
    return res.json(legacyProducts);
  }
});

app.get("/api/products/legacy", (_req, res) => {
  res.set("Cache-Control", "no-store");
  return res.json(loadLegacyProducts());
});

app.get("/api/admin/products", requireAdmin, async (_req, res) => {
  if (!ensureSupabase(res)) return;
  try {
    return res.json(await fetchDbProducts({ includeHidden: true }));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/products", requireAdmin, upload.array("photos", 8), async (req, res) => {
  if (!ensureSupabase(res)) return;
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  const price = Number(req.body.price);
  const isVisible = String(req.body.is_visible) !== "false";
  if (!name || !Number.isFinite(price) || price < 0) {
    return res.status(400).json({ error: "A product name and valid price are required." });
  }
  try {
    const { data: product, error } = await supabase
      .from("products")
      .insert({ name, description, price, is_visible: isVisible })
      .select()
      .single();
    if (error) throw error;
    await uploadProductFiles(product.id, req.files || []);
    const products = await fetchDbProducts({ includeHidden: true });
    return res.status(201).json(products.find((item) => item.id === product.id));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

app.patch("/api/admin/products/:id", requireAdmin, upload.array("photos", 8), async (req, res) => {
  if (!ensureSupabase(res)) return;
  const updates = {};
  if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
  if (req.body.description !== undefined) updates.description = String(req.body.description).trim();
  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: "Enter a valid price." });
    updates.price = price;
  }
  if (req.body.is_visible !== undefined) updates.is_visible = String(req.body.is_visible) === "true";
  try {
    if (Object.keys(updates).length) {
      const { error } = await supabase.from("products").update(updates).eq("id", req.params.id);
      if (error) throw error;
    }
    await uploadProductFiles(req.params.id, req.files || []);
    const products = await fetchDbProducts({ includeHidden: true });
    const product = products.find((item) => item.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });
    return res.json(product);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/products/:id/images", requireAdmin, async (req, res) => {
  if (!ensureSupabase(res)) return;
  const imageUrl = String(req.body.imageUrl || "");
  try {
    const { data: image, error: findError } = await supabase
      .from("product_images").select("id,storage_path").eq("product_id", req.params.id).eq("image_url", imageUrl).maybeSingle();
    if (findError) throw findError;
    if (!image) return res.status(404).json({ error: "Image not found." });
    if (image.storage_path) await supabase.storage.from(STORAGE_BUCKET).remove([image.storage_path]);
    const { error } = await supabase.from("product_images").delete().eq("id", image.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
  if (!ensureSupabase(res)) return;
  try {
    const { data: images, error: imageError } = await supabase.from("product_images").select("storage_path").eq("product_id", req.params.id);
    if (imageError) throw imageError;
    const paths = (images || []).map((item) => item.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from(STORAGE_BUCKET).remove(paths);
    const { error } = await supabase.from("products").delete().eq("id", req.params.id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/products/import-legacy", requireAdmin, async (_req, res) => {
  if (!ensureSupabase(res)) return;
  try {
    const legacy = loadLegacyProducts().filter((p) => !/test/i.test(p.title || ""));
    const { count, error: countError } = await supabase.from("products").select("id", { count: "exact", head: true });
    if (countError) throw countError;
    if (count > 0) return res.status(409).json({ error: "Supabase already contains products. Import was stopped to prevent duplicates." });
    let imported = 0;
    for (const item of legacy) {
      const { data: product, error } = await supabase.from("products").insert({
        name: item.title,
        description: item.description || "",
        price: Number(item.price) || 0,
        is_visible: true
      }).select().single();
      if (error) throw error;
      if (item.image) {
        const { error: imageError } = await supabase.from("product_images").insert({
          product_id: product.id,
          image_url: item.image,
          storage_path: null,
          display_order: 0
        });
        if (imageError) throw imageError;
      }
      imported += 1;
    }
    return res.json({ success: true, imported });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

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
  const user = ADMIN_USERS.find((item) => item.username === username && item.password === password);

  if (user) {
    res.cookie(ADMIN_COOKIE, ADMIN_TOKEN, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    });
    res.cookie(ADMIN_NAME_COOKIE, user.name, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    });
    return res.json({ success: true, name: user.name });
  }

  return res.status(401).json({ error: "Invalid login." });
});

app.post("/api/admin/logout", (req, res) => {
  res.clearCookie(ADMIN_COOKIE);
  res.clearCookie(ADMIN_NAME_COOKIE);
  return res.json({ success: true });
});

app.get("/api/admin/inquiries", requireAdmin, (req, res) => {
  const visibleInquiries = readInquiries().filter((item) => item.status !== "completed");
  return res.json(visibleInquiries);
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

app.delete("/api/admin/inquiries/:id", requireAdmin, (req, res) => {
  const inquiries = readInquiries();
  const filtered = inquiries.filter((item) => item.id !== req.params.id);

  if (filtered.length === inquiries.length) {
    return res.status(404).json({ error: "Inquiry not found." });
  }

  writeInquiries(filtered);
  return res.json({ success: true });
});


app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => {
  console.log(`Floreria Florentina app running at http://localhost:${PORT}`);
});