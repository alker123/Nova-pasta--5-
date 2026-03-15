// Configurações EmailJS
const EMAILJS_SERVICE_ID = "service_uixqqa8";
const EMAILJS_TEMPLATE_ID = "template_wz4dntg";
const EMAILJS_PUBLIC_KEY = "egSOdnOADSvUmFh6I";

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

let recoveryCode = null;
let recoveryUserKey = null;

window.showForgot = () => {
    document.getElementById("login-panel").style.display = "none";
    document.getElementById("forgot-panel").style.display = "block";
};

window.showLogin = () => {
    document.getElementById("login-panel").style.display = "block";
    document.getElementById("forgot-panel").style.display = "none";
};

// Passo 1: Buscar e-mail no servidor
window.sendRecoveryCode = async function() {
    const email = document.getElementById("forgot-email").value.trim();
    if (!email) { alert("Informe o e-mail."); return; }

    try {
        const response = await fetch('/api/buscar-usuario-por-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();

        if (data.success) {
            recoveryUserKey = data.userKey; // Salva o username retornado pelo server
            recoveryCode = Math.floor(100000 + Math.random() * 900000);

            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                user_email: email,
                passcode: recoveryCode
            });

            alert("Código enviado!");
            document.getElementById("recovery-step1").style.display = "none";
            document.getElementById("recovery-step2").style.display = "block";
        } else {
            alert("E-mail não encontrado.");
        }
    } catch (e) { alert("Erro de conexão. O servidor está rodando?"); }
};

// Passo 2: Validar código
window.verifyRecoveryCode = function() {
    const input = document.getElementById("recovery-code-input").value;
    if (input == recoveryCode) {
        document.getElementById("recovery-step2").style.display = "none";
        document.getElementById("recovery-step3").style.display = "block";
    } else { alert("Código inválido."); }
};

// Passo 3: Salvar nova senha
window.saveNewPassword = async function() {
    const newPass = document.getElementById("new-password").value;
    if (newPass !== document.getElementById("confirm-new-password").value) {
        alert("Senhas não conferem."); return;
    }

    try {
        const response = await fetch('/api/atualizar-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userKey: recoveryUserKey, newPass })
        });
        const data = await response.json();
        if (data.success) {
            alert("Senha alterada!");
            location.reload();
        }
    } catch (e) { alert("Erro ao salvar."); }
};

//
//

// Variáveis para o cadastro
let registerEmailCode = null;

// --- FUNÇÕES DE NAVEGAÇÃO (Para os links funcionarem) ---

window.showRegister = () => {
    document.getElementById("login-panel").style.display = "none";
    document.getElementById("forgot-panel").style.display = "none";
    document.getElementById("register-step1").style.display = "block";
    document.getElementById("register-step2").style.display = "none";
};

window.showLogin = () => {
    document.getElementById("login-panel").style.display = "block";
    document.getElementById("forgot-panel").style.display = "none";
    document.getElementById("register-step1").style.display = "none";
    document.getElementById("register-step2").style.display = "none";
};

// --- LOGICA DE CADASTRO ---

// 1. Confirmar Email e enviar código
window.confirmEmail = async function() {
    const email = document.getElementById("register-email").value.trim();
    const nome = document.getElementById("full-name").value.trim();
    
    if (!email || !nome) { alert("Preencha nome e email!"); return; }

    try {
        registerEmailCode = Math.floor(100000 + Math.random() * 900000);
        
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            user_email: email,
            user_name: nome,
            passcode: registerEmailCode
        });

        alert("Código enviado para o e-mail!");
        document.getElementById("email-code-section").style.display = "block";
    } catch (error) {
        alert("Erro ao enviar e-mail.");
    }
};

// 2. Validar código e ir para Etapa 2
window.nextStep = function() {
    const code = document.getElementById("email-code").value.trim();
    if (code == registerEmailCode) {
        document.getElementById("register-step1").style.display = "none";
        document.getElementById("register-step2").style.display = "block";
    } else {
        alert("Código incorreto!");
    }
};

// 3. Finalizar Cadastro (Salvar no Firebase via Servidor)
window.registerUser = async function() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const confirmPass = document.getElementById("confirm-password").value;
    const email = document.getElementById("register-email").value.trim();
    const nome = document.getElementById("full-name").value.trim();
    const telefone = document.getElementById("telefone").value.trim();

    if (password !== confirmPass) { alert("As senhas não conferem!"); return; }

    try {
        const response = await fetch('/api/cadastrar-usuario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username, password, email, nome, telefone,
                rota: "aluno.html" // Padrão
            })
        });

        const data = await response.json();
        if (data.success) {
            alert("Cadastro realizado!");
            window.location.reload();
        } else {
            alert("Erro: " + data.message);
        }
    } catch (error) {
        alert("Erro ao conectar com o servidor.");
    }
};