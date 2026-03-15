// ─── PROXY ELEVENLABS — SoftCue ───────────────────────────────────────────
// INSTRUÇÕES:
// 1. No Replit, crie um Repl Node.js
// 2. Apague tudo do index.js e cole este código inteiro
// 3. Clique Run
// 4. Copie a URL pública e mande pro Claude

const http  = require("http");
const https = require("https");

const ELEVEN_KEY = "sk_c43ce7edc6b4e21d0807f2918ef5bfae0094bcc39ce33c8f";
const PORT       = process.env.PORT || 3000;

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = http.createServer(function(req, res) {
  setCORS(res);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check — GET /
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "SoftCue Proxy" }));
    return;
  }

  // Listar vozes — GET /voices
  if (req.method === "GET" && req.url === "/voices") {
    var opts = {
      hostname: "api.elevenlabs.io",
      path:     "/v1/voices",
      method:   "GET",
      headers:  { "xi-api-key": ELEVEN_KEY },
    };
    var pReq = https.request(opts, function(pRes) {
      res.writeHead(pRes.statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      pRes.pipe(res);
    });
    pReq.on("error", function(e) {
      res.writeHead(502);
      res.end(JSON.stringify({ error: e.message }));
    });
    pReq.end();
    return;
  }

  // Converter texto em voz — POST /speak
  if (req.method === "POST" && req.url === "/speak") {
    var body = "";
    req.on("data", function(chunk) { body += chunk; });
    req.on("end", function() {
      var payload, text, voiceId;
      try {
        payload = JSON.parse(body);
        text    = (payload.text    || "").trim();
        voiceId = (payload.voiceId || "rdBSfr2PAUTCe39SX2fo");
      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "JSON inválido" }));
        return;
      }

      if (!text) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "text vazio" }));
        return;
      }

      var postData = JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability:         0.65,
          similarity_boost:  0.80,
          style:             0.25,
          use_speaker_boost: true,
        },
      });

      var opts = {
        hostname: "api.elevenlabs.io",
        path:     "/v1/text-to-speech/" + voiceId,
        method:   "POST",
        headers: {
          "xi-api-key":     ELEVEN_KEY,
          "Content-Type":   "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      };

      var pReq = https.request(opts, function(pRes) {
        console.log("ElevenLabs →", pRes.statusCode, text.slice(0, 40));
        res.writeHead(pRes.statusCode, {
          "Content-Type":  pRes.headers["content-type"] || "audio/mpeg",
          "Access-Control-Allow-Origin": "*",
        });
        pRes.pipe(res);
      });

      pReq.on("error", function(e) {
        console.error("Erro proxy:", e.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: e.message }));
      });

      pReq.write(postData);
      pReq.end();
    });
    return;
  }

  // Rota não encontrada
  res.writeHead(404);
  res.end(JSON.stringify({ error: "Rota não encontrada" }));
});

server.listen(PORT, function() {
  console.log("✅ SoftCue Proxy rodando na porta " + PORT);
});