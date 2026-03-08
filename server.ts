import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const db = new Database("clinic.db");

// Initialize Database
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      username TEXT UNIQUE,
      password TEXT,
      clinic_code TEXT,
      role TEXT, -- 'admin', 'patient_reg', 'clinic_reg'
      is_active INTEGER DEFAULT 1,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      age_value INTEGER NOT NULL,
      age_unit TEXT NOT NULL, -- 'year', 'month', 'week'
      phone TEXT,
      national_id TEXT,
      ticket_number INTEGER,
      complaint TEXT NOT NULL,
      chronic_illnesses TEXT,
      medications TEXT,
      clinic_type TEXT NOT NULL,
      status TEXT DEFAULT 'waiting', -- 'waiting', 'checked', 'referred'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      vitals_data TEXT,
      diagnosis TEXT,
      decision TEXT,
      treatment TEXT,
      referral TEXT,
      notes TEXT,
      doctor_signature TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('registration_enabled', '1');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('system_maintenance', '0');

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clinics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS registration_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label_en TEXT NOT NULL,
      label_ar TEXT NOT NULL,
      field_key TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'text', -- 'text', 'number', 'select'
      options TEXT, -- JSON array for select type
      is_required INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO clinics (name, code, type) VALUES ('General Medicine', 'MED01', 'medicine');
    INSERT OR IGNORE INTO clinics (name, code, type) VALUES ('Skin Care', 'DERM01', 'dermatology');
    INSERT OR IGNORE INTO clinics (name, code, type) VALUES ('Ear & Throat', 'ENT01', 'ent');
    INSERT OR IGNORE INTO clinics (name, code, type) VALUES ('Bone Clinic', 'ORTHO01', 'orthopedics');
    INSERT OR IGNORE INTO clinics (name, code, type) VALUES ('Kids Clinic', 'PED01', 'pediatrics');
  `);

  // Try to add column if it doesn't exist (for legacy DBs)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN last_login DATETIME;`);
  } catch (e) {}
} catch (e) {
  console.error("Database initialization error:", e);
}

const logActivity = (userId: number | null, username: string, action: string, details: string) => {
  db.prepare("INSERT INTO activity_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)")
    .run(userId, username, action, details);
};

// Seed Super Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("hazem");
if (!adminExists) {
  db.prepare("INSERT INTO users (name, username, password, role, clinic_code) VALUES (?, ?, ?, ?, ?)")
    .run("Hazem Admin", "hazem", "1234", "admin", "SUPER");
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // Real-time broadcasting
  const broadcast = (data: any) => {
    try {
      const payload = JSON.stringify(data);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    } catch (e) {
      console.error("Broadcast error:", e);
    }
  };

  // Settings Endpoints
  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare("SELECT * FROM settings").all();
      const settingsObj = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsObj);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", (req, res) => {
    try {
      const { key, value } = req.body;
      db.prepare("UPDATE settings SET value = ? WHERE key = ?").run(value, key);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Registration Fields Management
  app.get("/api/admin/registration-fields", (req, res) => {
    const fields = db.prepare("SELECT * FROM registration_fields WHERE is_active = 1").all();
    res.json(fields.map(f => ({ ...f, options: JSON.parse(f.options || '[]') })));
  });

  app.post("/api/admin/registration-fields", (req, res) => {
    const { label_en, label_ar, field_key, type, options, is_required } = req.body;
    try {
      db.prepare(`
        INSERT INTO registration_fields (label_en, label_ar, field_key, type, options, is_required)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(label_en, label_ar, field_key, type, JSON.stringify(options || []), is_required ? 1 : 0);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Field key already exists" });
    }
  });

  app.delete("/api/admin/registration-fields/:id", (req, res) => {
    db.prepare("UPDATE registration_fields SET is_active = 0 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Clinic Management Endpoints
  app.get("/api/clinics", (req, res) => {
    try {
      const clinics = db.prepare("SELECT * FROM clinics").all();
      res.json(clinics);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch clinics" });
    }
  });

  app.post("/api/clinics", (req, res) => {
    const { name, code, type } = req.body;
    try {
      db.prepare("INSERT INTO clinics (name, code, type) VALUES (?, ?, ?)")
        .run(name, code, type);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Clinic code already exists" });
    }
  });

  app.delete("/api/clinics/:id", (req, res) => {
    db.prepare("DELETE FROM clinics WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Auth Endpoints
  app.post("/api/auth/login", (req, res) => {
    const { username, password, clinicCode } = req.body;
    const maintenance = db.prepare("SELECT value FROM settings WHERE key = 'system_maintenance'").get();
    if (maintenance.value === '1' && username !== 'hazem') {
      return res.status(503).json({ error: "System is under maintenance" });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.is_active) return res.status(403).json({ error: "Account disabled" });
    if (user.username !== "hazem" && user.clinic_code !== clinicCode) return res.status(401).json({ error: "Invalid clinic code" });

    db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);
    logActivity(user.id, user.username, "LOGIN", `User logged in from ${user.clinic_code}`);
    res.json({ user: { id: user.id, name: user.name, username: user.username, role: user.role, clinicCode: user.clinic_code } });
  });

  app.post("/api/auth/register", (req, res) => {
    const { name, username, password, clinicCode, role } = req.body;
    const regEnabled = db.prepare("SELECT value FROM settings WHERE key = 'registration_enabled'").get();
    if (regEnabled.value === '0') return res.status(403).json({ error: "Registration is currently disabled" });

    try {
      db.prepare("INSERT INTO users (name, username, password, clinic_code, role) VALUES (?, ?, ?, ?, ?)")
        .run(name, username, password, clinicCode, role);
      logActivity(null, username, "REGISTER", `New user registered as ${role}`);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  // Patient Endpoints
  app.post("/api/patients", (req, res) => {
    const { 
      name_ar, age_value, age_unit, phone, national_id, 
      complaint, chronic_illnesses, medications, clinic_type, vitals_data 
    } = req.body;

    const lastTicket = db.prepare("SELECT MAX(ticket_number) as max_ticket FROM patients WHERE date(created_at) = date('now')").get();
    const ticket_number = (lastTicket.max_ticket || 0) + 1;

    const result = db.prepare(`
      INSERT INTO patients (
        name_ar, age_value, age_unit, phone, national_id, 
        ticket_number, complaint, chronic_illnesses, medications, 
        clinic_type, vitals_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name_ar, age_value, age_unit, phone, national_id, 
      ticket_number, complaint, chronic_illnesses, medications, 
      clinic_type, JSON.stringify(vitals_data)
    );

    const newPatient = { id: result.lastInsertRowid, ticket_number, name_ar, clinic_type, status: 'waiting', created_at: new Date().toISOString() };
    broadcast({ type: 'NEW_PATIENT', patient: newPatient });
    logActivity(null, "SYSTEM", "PATIENT_REGISTERED", `Patient ${name_ar} registered (Ticket #${ticket_number})`);
    res.json({ id: result.lastInsertRowid, ticket_number });
  });

  app.get("/api/patients", (req, res) => {
    try {
      const { clinic_type, search, status, date_range } = req.query;
      let query = "SELECT * FROM patients WHERE 1=1";
      const params: any[] = [];

      if (clinic_type) {
        query += " AND clinic_type = ?";
        params.push(clinic_type);
      }
      if (status) {
        query += " AND status = ?";
        params.push(status);
      }
      if (search) {
        query += " AND (name_ar LIKE ? OR ticket_number LIKE ? OR national_id LIKE ?)";
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (date_range === 'today') {
        query += " AND date(created_at) = date('now')";
      } else if (date_range === 'week') {
        query += " AND created_at >= date('now', '-7 days')";
      }

      query += " ORDER BY created_at DESC";
      const patients = db.prepare(query).all(...params);
      res.json(patients.map(p => ({ ...p, vitals_data: JSON.parse(p.vitals_data || '{}') })));
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch patients" });
    }
  });

  app.patch("/api/patients/:id", (req, res) => {
    const { id } = req.params;
    const { diagnosis, decision, treatment, referral, notes, doctor_signature, status } = req.body;
    db.prepare(`
      UPDATE patients SET 
        diagnosis = ?, decision = ?, treatment = ?, 
        referral = ?, notes = ?, doctor_signature = ?, 
        status = ?
      WHERE id = ?
    `).run(diagnosis, decision, treatment, referral, notes, doctor_signature, status || 'checked', id);
    broadcast({ type: 'PATIENT_UPDATED', patientId: id, status: status || 'checked' });
    res.json({ success: true });
  });

  app.delete("/api/patients/:id", (req, res) => {
    db.prepare("DELETE FROM patients WHERE id = ?").run(req.params.id);
    broadcast({ type: 'PATIENT_DELETED', patientId: req.params.id });
    res.json({ success: true });
  });

  // Admin User Management
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, name, username, role, clinic_code, is_active, last_login FROM users WHERE username != 'hazem'").all();
    res.json(users);
  });

  app.patch("/api/admin/users/:id", (req, res) => {
    const { id } = req.params;
    const { name, role, clinic_code, is_active, password } = req.body;
    if (password) {
      db.prepare("UPDATE users SET password = ? WHERE id = ?").run(password, id);
    } else {
      db.prepare("UPDATE users SET name = ?, role = ?, clinic_code = ?, is_active = ? WHERE id = ?")
        .run(name, role, clinic_code, is_active ? 1 : 0, id);
    }
    res.json({ success: true });
  });

  app.get("/api/admin/stats", (req, res) => {
    const stats = db.prepare("SELECT clinic_type, COUNT(*) as count FROM patients GROUP BY clinic_type").all();
    res.json(stats);
  });

  app.get("/api/admin/performance", (req, res) => {
    const performance = db.prepare(`
      SELECT date(created_at) as date, clinic_type, COUNT(*) as count
      FROM patients
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date, clinic_type
      ORDER BY date ASC
    `).all();
    res.json(performance);
  });

  app.get("/api/admin/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100").all();
    res.json(logs);
  });

  // AI Proxy Endpoints (OpenRouter)
  app.post("/api/ai/chat", async (req, res) => {
    const { message, history } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "OpenRouter API key not configured" });
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://clinicflow.app", // Optional
          "X-Title": "ClinicFlow", // Optional
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:free",
          messages: [
            { role: "system", content: "You are a medical assistant for ClinicFlow. Help users with system navigation, medical terminology, and general clinic management advice. Keep responses professional and concise." },
            ...history.map((h: any) => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.text })),
            { role: "user", content: message }
          ]
        })
      });

      const data = await response.json();
      res.json({ text: data.choices?.[0]?.message?.content || "No response from AI" });
    } catch (e) {
      console.error("OpenRouter Chat Error:", e);
      res.status(500).json({ error: "Failed to connect to AI" });
    }
  });

  app.post("/api/ai/extract", async (req, res) => {
    const { rawText } = req.body;
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "OpenRouter API key not configured" });
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:free",
          messages: [
            { 
              role: "system", 
              content: "Extract patient information from the provided text. Return ONLY a valid JSON object. Do not include any other text or markdown formatting. Fields: name_ar, age_value, age_unit (year/month/week), phone, national_id, complaint, chronic_illnesses, medications, clinic_type (medicine/dermatology/ent/orthopedics/pediatrics)." 
            },
            { role: "user", content: rawText }
          ]
        })
      });

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '{}';
      // Clean up markdown code blocks if present
      content = content.replace(/```json\n?|```/g, '').trim();
      res.json(JSON.parse(content));
    } catch (e) {
      console.error("OpenRouter Extract Error:", e);
      res.status(500).json({ error: "Failed to extract data" });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
