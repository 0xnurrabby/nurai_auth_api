// index.js - Appwrite Function (Node 22 runtime)
// Routes:
// POST /register  -> create DB doc { email, approved: false, createdAt }
// GET  /status?docId= -> check approved and return token if approved
// POST /proxy -> validate token, check approval, forward request to OpenAI (server-side key)

const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const { Client, Databases } = require("appwrite");

const app = express();
app.use(bodyParser.json());

// ENV vars (set in Appwrite function environment)
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY; // secret, set in env
const DATABASE_ID = process.env.DATABASE_ID;
const COLLECTION_ID = process.env.COLLECTION_ID;

const EXT_SECRET = process.env.EXT_SECRET || "CHANGE_THIS_TO_A_LONG_RANDOM_STRING";
const PREFERRED_TOKEN_LIFETIME_DAYS = parseInt(process.env.PREFERRED_TOKEN_LIFETIME_DAYS || "30", 10);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // your server-side OpenAI key (required)
if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !DATABASE_ID || !COLLECTION_ID) {
  console.error("Missing Appwrite env config. Set APPWRITE_PROJECT_ID, APPWRITE_API_KEY, DATABASE_ID, COLLECTION_ID");
  // don't exit — Appwrite function will show logs
}

// init Appwrite client
const client = new Client();
client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
const databases = new Databases(client);

function signToken(payload) {
  const exp = Math.floor(Date.now() / 1000) + (PREFERRED_TOKEN_LIFETIME_DAYS * 24 * 3600);
  return jwt.sign({ ...payload, exp }, EXT_SECRET);
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, EXT_SECRET);
    return { ok: true, decoded };
  } catch (err) {
    return { ok: false, err };
  }
}

// POST /register
app.post("/register", async (req, res) => {
  try {
    const { email, source } = req.body;
    if (!email) return res.status(400).json({ error: "email_required" });

    // create document in Appwrite DB (owner is server; admin will approve later)
    const doc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, undefined, {
      email,
      source: source || "chrome_extension",
      approved: false,
      createdAt: new Date().toISOString()
    });
    return res.json({ docId: doc.$id });
  } catch (err) {
    console.error("register err:", err);
    return res.status(500).json({ error: "register_failed", detail: err.toString() });
  }
});

// GET /status?docId=...
app.get("/status", async (req, res) => {
  try {
    const docId = req.query.docId;
    if (!docId) return res.status(400).json({ error: "docId_required" });

    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, docId);
    if (!doc) return res.status(404).json({ error: "not_found" });

    if (doc.approved) {
      // sign token for this doc (so extension can call proxy)
      const token = signToken({ docId: doc.$id, email: doc.email });
      return res.json({ approved: true, token });
    } else {
      return res.json({ approved: false });
    }
  } catch (err) {
    console.error("status err:", err);
    return res.status(500).json({ error: "status_failed", detail: err.toString() });
  }
});

// POST /proxy
// Body: { request: { ... } }    Headers: Authorization: Bearer <token>
app.post("/proxy", async (req, res) => {
  try {
    const auth = (req.headers.authorization || "").trim();
    if (!auth.startsWith("Bearer ")) return res.status(401).json({ error: "no_token" });
    const token = auth.slice("Bearer ".length).trim();
    const v = verifyToken(token);
    if (!v.ok) return res.status(401).json({ error: "invalid_token", detail: v.err.toString() });

    const { docId } = v.decoded;
    // check approval again in DB (defense in depth)
    const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, docId);
    if (!doc || !doc.approved) return res.status(403).json({ error: "not_approved" });

    // Forward the request to OpenAI (server-side)
    if (!OPENAI_API_KEY) return res.status(500).json({ error: "openai_key_missing" });

    // Expect client to send a standard OpenAI-like request body
    const clientRequest = req.body.request;
    if (!clientRequest) return res.status(400).json({ error: "missing_request" });

    // Example: POST to OpenAI Chat completions / responses endpoint
    // adapt to your desired endpoint shape; we'll forward to v1/chat/completions or v1/responses
    const openaiUrl = clientRequest.url || "https://api.openai.com/v1/chat/completions";
    const openaiBody = clientRequest.body || {
      model: clientRequest.model || "gpt-4o-mini",
      messages: clientRequest.messages || [{ role: "user", content: clientRequest.prompt || "" }]
    };

    const openaiResp = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(openaiBody)
    });

    const data = await openaiResp.text();
    // try parse
    try {
      const parsed = JSON.parse(data);
      return res.json({ ok: true, data: parsed });
    } catch (e) {
      return res.status(openaiResp.status).send(data);
    }

  } catch (err) {
    console.error("proxy err:", err);
    return res.status(500).json({ error: "proxy_failed", detail: err.toString() });
  }
});

// Start (Appwrite Function may provide its own server. But express app.listen is fine)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Nurai auth api running on port ${PORT}`);
});

// Export for function loader if required
module.exports = app;
