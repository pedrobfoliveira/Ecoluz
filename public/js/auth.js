import { supabase } from "./supabaseClient.js";

/* =======================
   ELEMENTOS DO CADASTRO
======================= */

const registerForm = document.getElementById("registerForm");
const registerUsername = document.getElementById("registerUsername");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerConfirmPassword = document.getElementById("registerConfirmPassword");
const registerMessage = document.getElementById("registerMessage");

/* =======================
   ELEMENTOS DO LOGIN
======================= */

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMessage = document.getElementById("loginMessage");

/* =======================
   FUNÇÕES AUXILIARES
======================= */

function showMessage(element, message, type) {
  if (!element) return;

  element.textContent = message;
  element.classList.remove("error", "success");

  if (type) {
    element.classList.add(type);
  }
}

function setButtonLoading(form, isLoading, loadingText, defaultText) {
  const button = form.querySelector("button[type='submit']");

  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

/* =======================
   CADASTRO
======================= */

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    showMessage(registerMessage, "", "");

    const username = registerUsername.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirmPassword = registerConfirmPassword.value;

    if (!username || !email || !password || !confirmPassword) {
      showMessage(registerMessage, "Preencha todos os campos.", "error");
      return;
    }

    if (password.length < 6) {
      showMessage(registerMessage, "A senha precisa ter pelo menos 6 caracteres.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showMessage(registerMessage, "As senhas não conferem.", "error");
      return;
    }

    setButtonLoading(registerForm, true, "Cadastrando...", "Cadastrar");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    setButtonLoading(registerForm, false, "Cadastrando...", "Cadastrar");

    if (error) {
      showMessage(registerMessage, error.message, "error");
      return;
    }

    showMessage(
      registerMessage,
      "Cadastro realizado. Agora faça login para continuar.",
      "success"
    );

    registerForm.reset();

    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1600);
  });
}

/* =======================
   LOGIN
======================= */

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    showMessage(loginMessage, "", "");

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
      showMessage(loginMessage, "Preencha e-mail e senha.", "error");
      return;
    }

    setButtonLoading(loginForm, true, "Entrando...", "Fazer login");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setButtonLoading(loginForm, false, "Entrando...", "Fazer login");

    if (error) {
      showMessage(loginMessage, "E-mail ou senha inválidos.", "error");
      return;
    }

    showMessage(loginMessage, "Login realizado com sucesso.", "success");

    setTimeout(() => {
      window.location.href = "./index.html";
    }, 1000);
  });
}