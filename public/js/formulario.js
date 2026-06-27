import { supabase } from "./supabaseClient.js";

/* === CABEÇALHO === */
const menuButton = document.getElementById("menuButton");
const closeMenu = document.getElementById("closeMenu");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");
const header = document.querySelector(".header");
const loginButton = document.getElementById("loginButton");

/* === FORMULÁRIO === */
const contaForm = document.getElementById("contaForm");
const mesSelect = document.getElementById("mes");
const anoSelect = document.getElementById("ano");
const consumoKwhInput = document.getElementById("consumoKwh");
const valorInput = document.getElementById("valor");
const emAtrasoInput = document.getElementById("emAtraso");
const formMensagem = document.getElementById("formMensagem");

/* === HISTÓRICO === */
const historicoDiv  = document.getElementById("historico");
const filtroSelect  = document.getElementById("filtroSelect");

/* Guarda os dados carregados para reordenar sem nova requisição */
let dadosContas = [];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

let usuarioAtual = null;

/* === INICIALIZAÇÃO === */
async function inicializar() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  usuarioAtual = session.user;

  preencherSelects();
  await carregarHistorico();
}

inicializar();

/* Preenche os selects de mês e ano dinamicamente */
function preencherSelects() {
  MESES.forEach((nome, index) => {
    const option = document.createElement("option");
    option.value = index + 1;
    option.textContent = nome;
    mesSelect.appendChild(option);
  });

  const anoAtual = new Date().getFullYear();
  for (let ano = anoAtual; ano >= 2020; ano--) {
    const option = document.createElement("option");
    option.value = ano;
    option.textContent = ano;
    anoSelect.appendChild(option);
  }
}

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

/* Links do menu lateral (usuário já está logado nesta página) */
document.querySelectorAll(".protected-link").forEach((link) => {
  link.addEventListener("click", () => {
    const page = link.dataset.page;
    if (page === "dados-consumo") window.location.href = "./dados-consumo.html";
    if (page === "formulario")    window.location.href = "./formulario.html";
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

/* === FILTRO DO HISTÓRICO === */
filtroSelect.addEventListener("change", () => {
  renderizarHistorico(ordenarContas(dadosContas, filtroSelect.value));
});

/* === CADASTRAR CONTA === */
contaForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const mes = parseInt(mesSelect.value);
  const ano = parseInt(anoSelect.value);
  const consumoKwh = parseFloat(consumoKwhInput.value);
  const valor = parseFloat(valorInput.value);
  const emAtraso = emAtrasoInput.checked;

  if (!mes || !ano || isNaN(consumoKwh) || isNaN(valor)) {
    mostrarMensagem("Preencha todos os campos.", "error");
    return;
  }

  const btn = contaForm.querySelector("button[type='submit']");
  btn.disabled = true;
  btn.textContent = "Cadastrando...";

  const { error } = await supabase.from("contas_luz").insert({
    user_id: usuarioAtual.id,
    mes,
    ano,
    consumo_kwh: consumoKwh,
    valor,
    em_atraso: emAtraso,
  });

  btn.disabled = false;
  btn.textContent = "Cadastrar conta";

  if (error) {
    /* Código 23505 = violação de unique constraint (mês/ano duplicado) */
    if (error.code === "23505") {
      mostrarMensagem("Já existe uma conta cadastrada para esse mês e ano.", "error");
    } else {
      mostrarMensagem("Erro ao cadastrar. Tente novamente.", "error");
    }
    return;
  }

  mostrarMensagem("Conta cadastrada com sucesso!", "success");
  contaForm.reset();
  await carregarHistorico();
});

/* === CARREGAR HISTÓRICO === */
async function carregarHistorico() {
  const { data, error } = await supabase
    .from("contas_luz")
    .select("*")
    .eq("user_id", usuarioAtual.id)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false });

  if (error || !data || data.length === 0) {
    dadosContas = [];
    historicoDiv.innerHTML = '<p class="historico-vazio">Nenhuma conta cadastrada ainda.</p>';
    return;
  }

  dadosContas = data;
  renderizarHistorico(ordenarContas(dadosContas, filtroSelect.value));
}

/* Renderiza o histórico com os dados já ordenados */
function renderizarHistorico(data) {
  if (!data || data.length === 0) {
    historicoDiv.innerHTML = '<p class="historico-vazio">Nenhuma conta cadastrada ainda.</p>';
    return;
  }

  historicoDiv.innerHTML = data.map((conta) => `
    <div class="historico-item">
      <div class="historico-info">
        <span class="historico-periodo">${MESES[conta.mes - 1]} ${conta.ano}</span>
        <span class="historico-detalhe">${conta.consumo_kwh} kWh</span>
        <span class="historico-detalhe">${formatarValor(conta.valor)}</span>
        ${conta.em_atraso
          ? '<span class="badge badge-atraso">Em atraso</span>'
          : '<span class="badge badge-dia">Em dia</span>'}
      </div>
      <button class="btn-excluir" data-id="${conta.id}" aria-label="Excluir conta">×</button>
    </div>
  `).join("");

  historicoDiv.querySelectorAll(".btn-excluir").forEach((btn) => {
    btn.addEventListener("click", () => excluirConta(btn.dataset.id));
  });
}

/* Ordena uma cópia dos dados conforme o filtro selecionado */
function ordenarContas(data, filtro) {
  const copia = [...data];
  switch (filtro) {
    case "antiga":
      return copia.sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
    case "maior_valor":
      return copia.sort((a, b) => Number(b.valor) - Number(a.valor));
    case "menor_valor":
      return copia.sort((a, b) => Number(a.valor) - Number(b.valor));
    default: /* recente */
      return copia.sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes);
  }
}

/* === EXCLUIR CONTA === */
async function excluirConta(id) {
  const { error } = await supabase
    .from("contas_luz")
    .delete()
    .eq("id", id)
    .eq("user_id", usuarioAtual.id);

  if (!error) await carregarHistorico();
}

/* === AUXILIARES === */
function formatarValor(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function mostrarMensagem(texto, tipo) {
  formMensagem.textContent = texto;
  formMensagem.className = "formulario-mensagem " + tipo;
}
