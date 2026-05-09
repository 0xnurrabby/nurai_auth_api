<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,4&height=180&section=header&text=nurai_auth_api&fontSize=48&fontColor=000000&fontAlignY=38&desc=Appwrite-based+auth+and+OpenAI+proxy+API+with+JWT+approval+flow&descAlignY=58&descSize=14&animation=fadeIn" width="100%"/>

<div align="center">

[![License](https://img.shields.io/badge/MIT-bbf7d0?style=for-the-badge&logoColor=000)](LICENSE)
[![Platform](https://img.shields.io/badge/Appwrite%20Functions-bfdbfe?style=for-the-badge&logoColor=000)]()
[![Tech](https://img.shields.io/badge/Node.js%20%2B%20Express-fde68a?style=for-the-badge&logoColor=000)]()

</div>

<div align="center">
<i>An Appwrite serverless function that handles user registration with manual approval, issues JWT tokens, and proxies OpenAI requests so the API key stays server-side.</i>
</div>

---

## ✦ Features

<div align="center">

| | Feature | What it does |
|:---:|---|---|
| 📝 | Registration | Stores new user email in Appwrite DB with `approved: false` |
| ✅ | Approval check | Status endpoint lets users poll if they have been approved |
| 🔑 | JWT issuance | Issues a signed JWT token once a user is approved |
| 🔄 | OpenAI proxy | Validates token and forwards requests to OpenAI with the server-side key |
| 🛡️ | Key protection | OpenAI API key never leaves the server |

</div>

---

## ✦ Download & Run

**Step 1** .... Clone the repo

```bash
git clone https://github.com/0xnurrabby/nurai_auth_api
cd nurai_auth_api
```

**Step 2** .... Install dependencies

```bash
npm install
```

**Step 3** .... Configure environment and deploy to Appwrite

```bash
# Set the following in your Appwrite function environment variables:
# APPWRITE_ENDPOINT
# APPWRITE_PROJECT_ID
# APPWRITE_API_KEY
# DATABASE_ID
# COLLECTION_ID
# EXT_SECRET (long random string for JWT signing)
# OPENAI_API_KEY

# Deploy using Appwrite CLI
appwrite deploy function
```

---

## ✦ Setup

```
1. Clone the repo and run npm install
2. Create an Appwrite project at cloud.appwrite.io
3. Create a database with a collection containing:
   - email (string)
   - approved (boolean, default false)
   - createdAt (string/datetime)
4. Create an Appwrite Function (Node 22 runtime)
5. Set all required environment variables in the function settings
6. Deploy the function (appwrite deploy function or via Appwrite console)
7. Use the function URL as your API base endpoint

API Endpoints:
  POST /register   ->  register email (sets approved: false)
  GET  /status     ->  check approval by docId, get token if approved
  POST /proxy      ->  proxy OpenAI request with JWT validation
```

---

## ✦ Project Structure

```
nurai_auth_api/
  index.js      ->  full Express app: register, status, proxy routes
  package.json  ->  dependencies (express, jsonwebtoken, node-fetch, appwrite)
```

---

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,4&height=100&section=footer&animation=fadeIn" width="100%"/>

<div align="center">MIT License .... built by <a href="https://github.com/0xnurrabby">0xnurrabby</a></div>
