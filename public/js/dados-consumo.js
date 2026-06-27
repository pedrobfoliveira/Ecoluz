import { supabase } from "./supabaseClient.js";

/* === ELEMENTOS === */
const menuButton    = document.getElementById("menuButton");
const closeMenu     = document.getElementById("closeMenu");
const sideMenu      = document.getElementById("sideMenu");
const menuOverlay   = document.getElementById("menuOverlay");
const header        = document.getElementById("mainHeader");
const loginButton   = document.getElementById("loginButton");
const nomeUsuario   = document.getElementById("nomeUsuario");
const estadoVazio   = document.getElementById("estadoVazio");
const dadosGrid     = document.getElementById("dadosGrid");
const paginaNav     = document.getElementById("paginaNav");
const alertasSection = document.getElementById("alertasSection");
const resumoCard    = document.getElementById("resumoCard");
const diagnostico   = document.getElementById("diagnostico");
const grafico       = document.getElementById("grafico");

const MESES_ABREV = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

/* Pontos base por unidade de equipamento */
const PONTOS_EQUIP = {
  ar_condicionado:   4,
  chuveiro_eletrico: 3,
  maquina_lavar:     2,
  micro_ondas:       1,
  geladeira:         0.5,
  televisao:         0.5,
  computador:        0.5,
  ferro_eletrico:    0.5,
};

/*
  Fator de renda aplicado sobre os pontos de equipamentos.
  Quanto maior a renda, menor o impacto dos aparelhos no diagnóstico:
  ter 5 ACs com renda alta não é vulnerabilidade energética.
*/
const FATOR_RENDA_EQUIP = {
  ate_1000:    1.5,
  "1001_2000": 1.0,
  "2001_3000": 0.6,
  "3001_5000": 0.3,
  acima_5000:  0.1,
};

/* Pontos de referência para o cálculo de renda (valor médio de cada faixa) */
const RENDA_MIDPOINTS = {
  ate_1000:    800,
  "1001_2000": 1500,
  "2001_3000": 2500,
  "3001_5000": 4000,
  acima_5000:  6000,
};

/* === INICIALIZAÇÃO === */
async function inicializar() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "./login.html";
    return;
  }

  const usuario = session.user;

  /* Exibe o cabeçalho com fundo sempre visível */
  header.style.setProperty("--header-bg-opacity", "1");
  header.style.setProperty("--header-line-opacity", "0.8");

  /* Busca dados em paralelo */
  const [contas, perfilFamiliar] = await Promise.all([
    carregarContas(usuario.id),
    carregarPerfilFamiliar(usuario.id),
  ]);

  const username = usuario.user_metadata?.username || usuario.email.split("@")[0];
  renderizarSaudacao(username, contas, perfilFamiliar);

  if (contas.length === 0) {
    estadoVazio.style.display = "block";
    return;
  }

  paginaNav.style.display = "flex";
  dadosGrid.style.display = "grid";
  const alertas = calcularAlertas(contas);
  renderizarAlertasBanners(alertas);
  renderizarResumo(contas, alertas.length);
  renderizarGrafico(contas);

  if (!perfilFamiliar) {
    renderizarSemPerfil();
  } else {
    const risco = calcularRisco(perfilFamiliar, contas);
    renderizarDiagnostico(risco);
  }
}

inicializar();

/* === BUSCA DE DADOS === */
async function carregarContas(userId) {
  const { data } = await supabase
    .from("contas_luz")
    .select("*")
    .eq("user_id", userId)
    .order("ano",  { ascending: false })
    .order("mes",  { ascending: false });

  return data || [];
}

async function carregarPerfilFamiliar(userId) {
  const { data } = await supabase
    .from("perfil_familiar")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data || null;
}

/* === SAUDAÇÃO === */
function renderizarSaudacao(username, contas, perfilFamiliar) {
  nomeUsuario.textContent = username;
}

/* === RESUMO === */
function renderizarResumo(contas, totalAlertas) {
  const ultima = contas[0];

  /* Média dos últimos 3 meses */
  const ultimas3 = contas.slice(0, 3);
  const mediaKwh = ultimas3.reduce((s, c) => s + Number(c.consumo_kwh), 0) / ultimas3.length;

  const alertaTexto = totalAlertas === 0 ? "Nenhum" : totalAlertas === 1 ? "1 alerta" : `${totalAlertas} alertas`;

  resumoCard.innerHTML = `
    <div class="resumo-linha">
      <span class="resumo-label">Último consumo</span>
      <span class="resumo-valor">${ultima.consumo_kwh} kWh</span>
    </div>
    <div class="resumo-linha">
      <span class="resumo-label">Última conta</span>
      <span class="resumo-valor">${formatarValor(ultima.valor)}</span>
    </div>
    <div class="resumo-linha">
      <span class="resumo-label">Média (últimos 3 meses)</span>
      <span class="resumo-valor">${mediaKwh.toFixed(0)} kWh</span>
    </div>
    <div class="resumo-linha">
      <span class="resumo-label">Alertas ativos</span>
      <span class="resumo-valor">${alertaTexto}</span>
    </div>
  `;
}

/* === GRÁFICO === */
function renderizarGrafico(contas) {
  /* Pega os 5 mais recentes e reverte para ordem cronológica */
  const ultimos5 = [...contas].slice(0, 5).reverse();

  const maxKwh = Math.max(...ultimos5.map((c) => Number(c.consumo_kwh)));

  const barras = ultimos5.map((c) => {
    const altura = Math.max((Number(c.consumo_kwh) / maxKwh) * 95, 5);
    const label  = `${MESES_ABREV[c.mes - 1]}/${String(c.ano).slice(2)}`;
    return { altura, label };
  });

  grafico.innerHTML = `
    <div class="grafico-area">
      ${barras.map((b) => `
        <div class="grafico-barra" style="height: ${b.altura}%;"></div>
      `).join("")}
    </div>
    <div class="grafico-labels">
      ${barras.map((b) => `
        <span class="grafico-label">${b.label}</span>
      `).join("")}
    </div>
  `;
}

/* === DIAGNÓSTICO === */
function renderizarDiagnostico(risco) {
  const descricoes = {
    baixo: "Sua residência apresenta baixo risco energético. Continue acompanhando seu consumo para manter esse resultado.",
    medio: "Sua residência apresenta alguns sinais de vulnerabilidade energética. Veja recomendações para reduzir gastos e acompanhar melhor seu consumo.",
    alto:  "Sua residência apresenta sinais de alto risco energético. Recomendamos atenção urgente ao seu consumo e à situação das contas.",
  };

  diagnostico.innerHTML = `
    <div class="risco-badge risco-${risco.nivel}">${risco.label}</div>
    <p class="risco-descricao">${descricoes[risco.nivel]}</p>
  `;
}

function renderizarSemPerfil() {
  diagnostico.innerHTML = `
    <div class="sem-perfil-aviso">
      <p>Para calcular seu diagnóstico energético, preencha o perfil familiar.</p>
      <a href="./perfil.html" class="btn-acao btn-acao--pequeno">Preencher perfil familiar</a>
    </div>
  `;
}

/* === COR DO NOME === */
function aplicarCorNome(nivel) {
  nomeUsuario.classList.add(`nome-${nivel}`);
}

/* === CÁLCULO DE RISCO === */
function calcularRisco(perfil, contas) {
  let pontos = 0;

  const renda = RENDA_MIDPOINTS[perfil.renda] || 2500;
  const moradores = perfil.moradores || 1;
  const rendaPerCapita = renda / moradores;

  /* Pontuação por renda per capita */
  if (rendaPerCapita < 300)       pontos += 45;
  else if (rendaPerCapita < 600)  pontos += 30;
  else if (rendaPerCapita < 1000) pontos += 15;
  else                             pontos += 5;

  /* Pontuação pelo percentual da renda gasto na última conta */
  const ultimaConta = contas[0];
  if (ultimaConta) {
    const percentual = (Number(ultimaConta.valor) / renda) * 100;
    if (percentual > 50)      pontos += 60; // conta supera metade da renda: situação crítica
    else if (percentual > 15) pontos += 35;
    else if (percentual > 10) pontos += 25;
    else if (percentual > 5)  pontos += 15;
  }

  /* Pontuação por contas em atraso */
  const emAtraso = contas.filter((c) => c.em_atraso).length;
  if (emAtraso > 0) pontos += Math.min(emAtraso * 5, 20);

  /* Pontuação por equipamentos: pontos × quantidade × fator de renda, teto de 20 pts */
  const equip = perfil.equipamentos || {};
  const fatorEquip = FATOR_RENDA_EQUIP[perfil.renda] || 1.0;
  let pontosEquip = 0;
  for (const [nome, pts] of Object.entries(PONTOS_EQUIP)) {
    pontosEquip += (equip[nome] || 0) * pts;
  }
  pontos += Math.min(Math.round(pontosEquip * fatorEquip), 20);

  if (pontos <= 30) return { nivel: "baixo", label: "BAIXO RISCO" };
  if (pontos <= 60) return { nivel: "medio", label: "RISCO MÉDIO" };
  return               { nivel: "alto",  label: "ALTO RISCO"  };
}

/* === ALERTAS === */
function calcularAlertas(contas) {
  const alertas = [];

  /* Alerta 1: contas em atraso */
  const emAtraso = contas.filter((c) => c.em_atraso);
  if (emAtraso.length > 0) {
    const n = emAtraso.length;
    alertas.push({
      tipo: "atraso",
      titulo: n === 1 ? "Conta em atraso" : `${n} contas em atraso`,
      descricao: "Regularize sua situação para evitar multas e juros.",
    });
  }

  /*
    Alerta 2: aumento de consumo ≥ 30% em relação à média dos meses anteriores.
    Requer pelo menos 2 registros para comparar.
  */
  if (contas.length >= 2) {
    const ultimaKwh  = Number(contas[0].consumo_kwh);
    const anteriores = contas.slice(1, 4);
    const media      = anteriores.reduce((s, c) => s + Number(c.consumo_kwh), 0) / anteriores.length;
    const variacao   = ((ultimaKwh - media) / media) * 100;

    if (variacao >= 30) {
      alertas.push({
        tipo: "consumo",
        titulo: "Aumento de consumo detectado",
        descricao: `Seu último consumo (${ultimaKwh} kWh) está ${variacao.toFixed(0)}% acima da média recente (${media.toFixed(0)} kWh).`,
      });
    }
  }

  return alertas;
}

function renderizarAlertasBanners(alertas) {
  if (alertas.length === 0) {
    alertasSection.style.display = "none";
    return;
  }

  alertasSection.style.display = "flex";
  alertasSection.innerHTML = alertas.map((a) => `
    <div class="alerta alerta-${a.tipo}">
      <div class="alerta-conteudo">
        <span class="alerta-titulo">${a.titulo}</span>
        <span class="alerta-descricao">${a.descricao}</span>
      </div>
    </div>
  `).join("");
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

/* === AUXILIAR === */
function formatarValor(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
