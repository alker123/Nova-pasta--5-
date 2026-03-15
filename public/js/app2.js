import { db } from "./firebase.js";
import { ref, set, get, update } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// --- Variáveis Globais ---
let emailCode = null;
let emailExpireTime = null;

// Configuração EmailJS
const EMAILJS_SERVICE_ID = "service_uixqqa8";
const EMAILJS_TEMPLATE_ID = "template_wz4dntg";
const EMAILJS_PUBLIC_KEY = "egSOdnOADSvUmFh6I";

emailjs.init({
    publicKey: EMAILJS_PUBLIC_KEY,
});

// --- Funções de Navegação (Expostas ao Window) ---
window.hideAll = function() {
    document.getElementById("login-panel").style.display = "none";
    document.getElementById("forgot-panel").style.display = "none";
    document.getElementById("register-step1").style.display = "none";
    document.getElementById("register-step2").style.display = "none";
};

window.showLogin = () => { window.hideAll(); document.getElementById("login-panel").style.display = "block"; };
window.showRegister = () => { window.hideAll(); document.getElementById("register-step1").style.display = "block"; };
window.showForgot = () => { window.hideAll(); document.getElementById("forgot-panel").style.display = "block"; };

// --- Mostrar/Ocultar Senha ---
window.togglePassword = (id) => {
    const input = document.getElementById(id);
    if (input) input.type = input.type === "password" ? "text" : "password";
};

// Atribuindo eventos aos botões de olho após carregar o DOM
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("toggle-password").onclick = () => window.togglePassword("login-password");
    document.getElementById("toggle-password2").onclick = () => window.togglePassword("password");
    document.getElementById("toggle-password3").onclick = () => window.togglePassword("confirm-password");
});

// --- ETAPA 1: Envio de E-mail ---
window.confirmEmail = function() {
    const email = document.getElementById("register-email").value.trim();
    if (!email) { alert("Digite um e-mail válido."); return; }

    emailCode = Math.floor(100000 + Math.random() * 900000);
    emailExpireTime = Date.now() + 15 * 60 * 1000;

    const templateParams = {
        user_email: email, // Deve ser {{user_email}} no seu template EmailJS
        passcode: emailCode,
        time: "15 minutos"
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(() => {
        document.getElementById("email-code-section").style.display = "block";
        alert(`Código enviado para ${email}.`);
    })
    .catch(err => {
        console.error("Erro EmailJS:", err);
        alert("Falha ao enviar e-mail. Verifique sua conexão e chaves.");
    });
};

window.nextStep = function() {
    const codeInput = document.getElementById("email-code").value.trim();
    if (!emailCode) return;
    if (Date.now() > emailExpireTime) { alert("Código expirado! Gere um novo."); return; }
    
    if (codeInput == emailCode) {
        window.hideAll();
        document.getElementById("register-step2").style.display = "block";
    } else {
        alert("Código incorreto!");
    }
};

// --- ETAPA 2: Salvar no Firebase ---
window.registerUser = async function() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm-password").value;
    const email = document.getElementById("register-email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();

    if (!username || !password || !telefone) { alert("Preencha todos os campos."); return; }
    if (password !== confirm) { alert("As senhas não conferem."); return; }

    try {
        const userRef = ref(db, 'usuarios/' + username);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            alert("Este nome de usuário já está em uso.");
            return;
        }

        await set(userRef, {
            username,
            email,
            telefone,
            password,
            rota: "professor.html", // <--- Define a página de destino
            dataCriacao: new Date().toISOString()
        });

        alert("Cadastro realizado com sucesso!");
        window.showLogin();
    } catch (error) {
        console.error("Erro Firebase:", error);
        alert("Erro ao salvar no banco. Verifique suas regras do Firebase.");
    }
};



let recoveryCode = null;
let recoveryUserPath = null; // Para saber qual usuário atualizar no final

// 1. Enviar código de recuperação
window.sendRecoveryCode = async function() {
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) { alert("Informe o e-mail."); return; }

    try {
        // Verificar se o e-mail existe no Firebase
        const snapshot = await get(ref(db, 'usuarios'));
        let userKey = null;

        if (snapshot.exists()) {
            const users = snapshot.val();
            for (let key in users) {
                if (users[key].email === email) {
                    userKey = key;
                    break;
                }
            }
        }

        if (!userKey) {
            alert("E-mail não encontrado no sistema.");
            return;
        }

        recoveryUserPath = userKey; // Guarda o nome de usuário para o update depois
        recoveryCode = Math.floor(100000 + Math.random() * 900000);

        // Enviar via EmailJS (usando o mesmo template do cadastro ou um novo)
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            user_email: email,
            passcode: recoveryCode,
            time: "10 minutos"
        });

        alert("Código de recuperação enviado!");
        document.getElementById("recovery-step1").style.display = "none";
        document.getElementById("recovery-step2").style.display = "block";

    } catch (error) {
        console.error(error);
        alert("Erro ao processar recuperação.");
    }
};

// 2. Verificar se o código digitado está certo
window.verifyRecoveryCode = function() {
    const input = document.getElementById("recovery-code-input").value.trim();
    if (input == recoveryCode) {
        document.getElementById("recovery-step2").style.display = "none";
        document.getElementById("recovery-step3").style.display = "block";
    } else {
        alert("Código incorreto!");
    }
};

// 3. Salvar a nova senha no Firebase
window.saveNewPassword = async function() {
    const newPass = document.getElementById("new-password").value;
    const confirmPass = document.getElementById("confirm-new-password").value;

    if (newPass.length < 4) { alert("Senha muito curta!"); return; }
    if (newPass !== confirmPass) { alert("As senhas não conferem!"); return; }

    try {
        // Referência do usuário específico no Firebase
        const userRef = ref(db, 'usuarios/' + recoveryUserPath);
        
        // Atualiza apenas o campo password
        await update(userRef, {
            password: newPass
        });

        alert("Senha alterada com sucesso!");
        location.reload(); // Recarrega para limpar variáveis e voltar ao login
    } catch (error) {
        alert("Erro ao salvar nova senha.");
    }
};

// Iniciar na tela de login
window.showLogin();