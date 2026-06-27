import { supabase } from "./supabaseClient.js";

/* === CABEÇALHO === */
const menuButton = document.getElementById("menuButton");
const closeMenu = document.getElementById("closeMenu");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");
const header = document.querySelector(".header");
const loginButton = document.getElementById("loginButton");
const protectedLinks = document.querySelectorAll(".protected-link");

/* === PERFIL DO USUÁRIO === */
const perfilForm = document.getElementById("perfilForm");
const perfilUsername = document.getElementById("perfilUsername");
const perfilEmail = document.getElementById("perfilEmail");
const perfilMensagem = document.getElementById("perfilMensagem");
const perfilAvatar = document.getElementById("perfilAvatar");

/* === PERFIL FAMILIAR === */
const perfilFamiliarForm = document.getElementById("perfilFamiliarForm");
const perfilMensagemFamiliar = document.getElementById("perfilMensagemFamiliar");

/* === ABAS === */
const tabBtns = document.querySelectorAll(".tab-btn");
const tabConteudos = document.querySelectorAll(".tab-conteudo");

/* === LOGOUT === */
const logoutBtn = document.getElementById("logoutBtn");

/* Guarda o usuário logado para usar nas funções do perfil familiar */
let usuarioAtual = null;

/* === INICIALIZAÇÃO === */
async function inicializar() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  usuarioAtual = session.user;
  const username = usuarioAtual.user_metadata?.username || "";

  perfilEmail.value = usuarioAtual.email;
  perfilUsername.value = username;
  perfilAvatar.textContent = (username || usuarioAtual.email).charAt(0).toUpperCase();

  await carregarPerfilFamiliar();
}

inicializar();

/* === CONTADORES DE EQUIPAMENTOS === */
document.querySelectorAll(".equip-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const equip = btn.dataset.equip;
    const span = document.querySelector(`.equip-qtd[data-equip="${equip}"]`);
    let qty = parseInt(span.textContent) || 0;
    if (btn.dataset.action === "mais") qty = Math.min(qty + 1, 10);
    if (btn.dataset.action === "menos") qty = Math.max(qty - 1, 0);
    span.textContent = qty;
  });
});

/* === ABAS === */
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabBtns.forEach((b) => b.classList.remove("active"));
    tabConteudos.forEach((c) => c.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

/* === MENU LATERAL === */
menuButton.addEventListener("click", () => {
  sideMenu.classList.add("open");
  menuOverlay.classList.add("open");
});

closeMenu.addEventListener("click", fecharMenu);
menuOverlay.addEventListener("click", fecharMenu);

function fecharMenu() {
  sideMenu.classList.remove("open");
  menuOverlay.classList.remove("open");
}

loginButton.addEventListener("click", () => {
  window.location.href = "./perfil.html";
});

protectedLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const page = link.dataset.page;
    if (page === "dados-consumo") window.location.href = "./dados-consumo.html";
    if (page === "formulario") window.location.href = "./formulario.html";
  });
});

/* === DEGRADÊ DO CABEÇALHO NO SCROLL === */
window.addEventListener("scroll", controlarHeaderNoScroll);

function controlarHeaderNoScroll() {
  const progresso = Math.min(window.scrollY / 360, 1);
  header.style.setProperty("--header-bg-opacity", progresso);
  header.style.setProperty("--header-line-opacity", progresso * 0.8);
}

controlarHeaderNoScroll();

/* === SALVAR PERFIL DO USUÁRIO === */
perfilForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = perfilUsername.value.trim();

  if (!username) {
    mostrarMensagem(perfilMensagem, "Preencha o nome de usuário.", "error");
    return;
  }

  const btn = perfilForm.querySelector("button[type='submit']");
  btn.disabled = true;
  btn.textContent = "Salvando...";

  const { error } = await supabase.auth.updateUser({
    data: { username },
  });

  btn.disabled = false;
  btn.textContent = "Salvar alterações";

  if (error) {
    mostrarMensagem(perfilMensagem, "Erro ao salvar. Tente novamente.", "error");
    return;
  }

  perfilAvatar.textContent = username.charAt(0).toUpperCase();
  mostrarMensagem(perfilMensagem, "Alterações salvas com sucesso.", "success");
});

/* === CARREGAR PERFIL FAMILIAR DO SUPABASE === */
async function carregarPerfilFamiliar() {
  const { data } = await supabase
    .from("perfil_familiar")
    .select("*")
    .eq("user_id", usuarioAtual.id)
    .maybeSingle();

  /* Se ainda não foi preenchido, não faz nada */
  if (!data) return;

  if (data.moradores) document.getElementById("moradores").value = data.moradores;
  if (data.renda) document.getElementById("renda").value = data.renda;
  if (data.tipo_residencia) document.getElementById("tipoResidencia").value = data.tipo_residencia;

  /* Preenche as quantidades dos equipamentos salvos */
  if (data.equipamentos) {
    Object.entries(data.equipamentos).forEach(([nome, qty]) => {
      const span = document.querySelector(`.equip-qtd[data-equip="${nome}"]`);
      if (span) span.textContent = qty;
    });
  }
}

/* === SALVAR PERFIL FAMILIAR NO SUPABASE === */
perfilFamiliarForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const moradores = document.getElementById("moradores").value;
  const renda = document.getElementById("renda").value;
  const tipoResidencia = document.getElementById("tipoResidencia").value;

  /* Coleta as quantidades dos equipamentos (somente os que têm qty > 0) */
  const equipamentos = {};
  document.querySelectorAll(".equip-qtd").forEach((span) => {
    const qty = parseInt(span.textContent) || 0;
    if (qty > 0) equipamentos[span.dataset.equip] = qty;
  });

  if (!moradores || !renda || !tipoResidencia) {
    mostrarMensagem(perfilMensagemFamiliar, "Preencha todos os campos obrigatórios.", "error");
    return;
  }

  const btn = perfilFamiliarForm.querySelector("button[type='submit']");
  btn.disabled = true;
  btn.textContent = "Salvando...";

  /*
    upsert: insere se não existir, atualiza se já existir.
    onConflict: "user_id" garante que cada usuário tenha apenas um perfil familiar.
  */
  const { error } = await supabase
    .from("perfil_familiar")
    .upsert(
      {
        user_id: usuarioAtual.id,
        moradores: parseInt(moradores),
        renda,
        tipo_residencia: tipoResidencia,
        equipamentos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  btn.disabled = false;
  btn.textContent = "Salvar perfil familiar";

  if (error) {
    mostrarMensagem(perfilMensagemFamiliar, "Erro ao salvar. Tente novamente.", "error");
    return;
  }

  mostrarMensagem(perfilMensagemFamiliar, "Perfil familiar salvo com sucesso.", "success");
});

/* === LOGOUT === */
logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "./index.html";
});

/* === AUXILIAR === */
function mostrarMensagem(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = "perfil-mensagem " + tipo;
}
