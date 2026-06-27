import { supabase } from "./supabaseClient.js";

const menuButton = document.getElementById("menuButton");
const closeMenu = document.getElementById("closeMenu");
const sideMenu = document.getElementById("sideMenu");
const menuOverlay = document.getElementById("menuOverlay");
const floatingLogo = document.getElementById("floatingLogo");
const loginButton = document.getElementById("loginButton");
const protectedLinks = document.querySelectorAll(".protected-link");
const typedSlogan = document.getElementById("typedSlogan");
const header = document.querySelector(".header");

let usuarioLogado = false;

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    usuarioLogado = true;
    loginButton.textContent = "Perfil";
    loginButton.classList.add("login-button--perfil");
  }
});

/* Abrir menu lateral */
menuButton.addEventListener("click", () => {
  sideMenu.classList.add("open");
  menuOverlay.classList.add("open");
});

/* Fechar menu lateral */
closeMenu.addEventListener("click", fecharMenu);
menuOverlay.addEventListener("click", fecharMenu);

function fecharMenu() {
  sideMenu.classList.remove("open");
  menuOverlay.classList.remove("open");
}

/* Botão Entrar/Cadastrar ou Perfil */
loginButton.addEventListener("click", () => {
  window.location.href = usuarioLogado ? "./perfil.html" : "./login.html";
});

/* Links que só podem ser acessados após login */
protectedLinks.forEach((link) => {
  link.addEventListener("click", () => {
    if (!usuarioLogado) {
      alert("Você precisa estar logado para acessar essa seção.");
      window.location.href = "./login.html";
      return;
    }

    const page = link.dataset.page;

    if (page === "dados-consumo") {
      window.location.href = "/dados-consumo.html";
    }

    if (page === "formulario") {
      window.location.href = "/formulario.html";
    }
  });
});

/* Logo diminuindo ao rolar a página */
window.addEventListener("scroll", () => {
  controlarLogoNoScroll();
  controlarHeaderNoScroll();
});

function controlarLogoNoScroll() {
  const scrollAtual = window.scrollY;

  const progresso = Math.min(scrollAtual / 420, 1);

  const larguraInicial = 340;
  const larguraFinal = 80;

  const topoInicial = 140;
  const topoFinal = 13;

  const novaLargura =
    larguraInicial - (larguraInicial - larguraFinal) * progresso;

  const novoTopo =
    topoInicial - (topoInicial - topoFinal) * progresso;

  floatingLogo.style.width = `${novaLargura}px`;
  floatingLogo.style.top = `${novoTopo}px`;
}

/* Animações das seções quando aparecem na tela */
const elementosAnimados = document.querySelectorAll(".scroll-reveal");

const observer = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("is-visible");
      }
    });
  },
  {
    threshold: 0.25,
  }
);

elementosAnimados.forEach((elemento) => {
  observer.observe(elemento);
});

/* Efeito de digitação do slogan */
const sloganParts = [
  { text: "Entenda", bold: true },
  { text: " seu consumo,\n", bold: false },
  { text: "reduza", bold: true },
  { text: " seus gastos!", bold: false },
];

let partIndex = 0;
let charIndex = 0;
let sloganHTML = "";

function typeSlogan() {
  if (!typedSlogan) return;

  if (partIndex >= sloganParts.length) {
    typedSlogan.innerHTML = sloganHTML;
    return;
  }

  const currentPart = sloganParts[partIndex];
  const currentText = currentPart.text;

  if (charIndex < currentText.length) {
    const char = currentText[charIndex];

    if (char === "\n") {
      sloganHTML += "<br>";
    } else if (currentPart.bold) {
      if (charIndex === 0) {
        sloganHTML += "<strong>";
      }

      sloganHTML += char;

      if (charIndex === currentText.length - 1) {
        sloganHTML += "</strong>";
      }
    } else {
      sloganHTML += char;
    }

    typedSlogan.innerHTML =
      sloganHTML + '<span class="typing-cursor"></span>';

    charIndex++;

    setTimeout(typeSlogan, 65);
  } else {
    partIndex++;
    charIndex = 0;

    setTimeout(typeSlogan, 80);
  }
}

function controlarHeaderNoScroll() {
  const scrollAtual = window.scrollY;

  const progresso = Math.min(scrollAtual / 360, 1);

  header.style.setProperty("--header-bg-opacity", progresso);
  header.style.setProperty("--header-line-opacity", progresso * 0.8);
}

controlarLogoNoScroll();
controlarHeaderNoScroll();
setTimeout(typeSlogan, 1800);
