require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve as variáveis do .env como módulo JS para o frontend.
// Esta rota precisa vir antes do express.static para ter prioridade.
app.get("/js/env.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(
    `export const SUPABASE_URL = "${process.env.SUPABASE_URL}";\n` +
    `export const SUPABASE_KEY = "${process.env.SUPABASE_ANON_KEY}";`
  );
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`EcoLuz rodando em http://localhost:${PORT}`);
});
