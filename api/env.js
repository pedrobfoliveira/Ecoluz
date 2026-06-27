// Função serverless que serve as variáveis de ambiente para o frontend.
// O Vercel injeta as env vars do dashboard em process.env.
module.exports = (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(
    `export const SUPABASE_URL = "${process.env.SUPABASE_URL}";\n` +
    `export const SUPABASE_KEY = "${process.env.SUPABASE_ANON_KEY}";`
  );
};
