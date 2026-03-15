const express = require('express');
const path = require('path');
const session = require('express-session');
const admin = require('firebase-admin');
const app = express();

// 1. Inicializar Firebase Admin
// Certifique-se de que o arquivo "firebase-key.json" está na mesma pasta que este server.js
const serviceAccount = require("./firebase-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://aulas1-9044b-default-rtdb.firebaseio.com/"
});

const db = admin.database();

// Configurações do Express
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de Sessão (15 minutos)
app.use(session({
    secret: 'segredo-capoeira',
    resave: true,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 900000 } // 15 minutos
}));

// Rota Principal de Login
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

// LOGIN DIRETO DO FIREBASE
app.post('/index', async (req, res) => {
    // Pegamos os dados e limpamos espaços extras
    const user = req.body.user ? req.body.user.trim().toLowerCase() : "";
    const pass = req.body.pass ? String(req.body.pass).trim() : "";

    try {
        const usersRef = db.ref('usuarios');
        const snapshot = await usersRef.once('value');
        const usuarios = snapshot.val();

        let usuarioEncontrado = null;

        if (usuarios) {
            for (let id in usuarios) {
                const u = usuarios[id];

                // Preparando dados do banco para comparação idêntica
                const dbUser = u.username ? String(u.username).trim().toLowerCase() : "";
                const dbEmail = u.email ? String(u.email).trim().toLowerCase() : "";
                const dbPass = u.password ? String(u.password).trim() : "";

                if ((dbUser === user || dbEmail === user) && dbPass === pass) {
                    usuarioEncontrado = u;
                    break;
                }
            }
        }

        if (usuarioEncontrado) {
            // Se no banco estiver "professor.html", salva apenas "professor"
            const tipo = usuarioEncontrado.rota.split('.')[0];
            req.session.tipo = tipo;
            req.session.nome = usuarioEncontrado.username;

            console.log(`✅ Sucesso: ${req.session.nome} logado como ${tipo}`);
            res.json({ success: true, redirect: `/auth/${tipo}` });
        } else {
            console.log(`❌ Falha: Credenciais incorretas para "${user}"`);
            res.status(401).json({ success: false, message: "Dados incorretos" });
        }
    } catch (error) {
        console.error("Erro no servidor:", error);
        res.status(500).json({ success: false });
    }
});

// API para a página saber quem está logado
app.get('/api/usuario-logado', (req, res) => {
    if (req.session.nome) {
        res.json({ nome: req.session.nome });
    } else {
        res.status(401).json({ erro: "Não logado" });
    }
});

// Rota de Logout
app.get('/sair', (req, res) => {
    req.session.destroy();
    res.redirect('/auth');
});

// Proteção de Rota Genérica (Ex: /auth/professor, /auth/aluno)
app.get('/auth/:pagina', (req, res) => {
    const pagina = req.params.pagina;
    // Só deixa entrar se o tipo na sessão for igual à página pedida
    if (req.session.tipo === pagina) {
        res.sendFile(path.join(__dirname, `views/${pagina}.html`));
    } else {
        res.redirect('/auth');
    }
});

// Monitor de Conexão Firebase
db.ref('.info/connected').on('value', (snap) => {
    if (snap.val() === true) {
        console.log("✅ CONECTADO AO FIREBASE!");
    } else {
        console.log("❌ DESCONECTADO DO FIREBASE!");
    }
});

//
//
//
//

// --- ROTAS DE RECUPERAÇÃO DE SENHA ---
// --- NOVAS ROTAS PARA RECUPERAÇÃO DE SENHA ---

// 1. Verificar se o e-mail existe no Firebase e retornar a chave do usuário
app.post('/api/buscar-usuario-por-email', async (req, res) => {
    const { email } = req.body;
    try {
        const snapshot = await db.ref('usuarios').once('value');
        const usuarios = snapshot.val();
        let userKey = null;

        if (usuarios) {
            for (let key in usuarios) {
                if (usuarios[key].email === email) {
                    userKey = key; // Nome de usuário/Chave no Firebase
                    break;
                }
            }
        }

        if (userKey) {
            res.json({ success: true, userKey });
        } else {
            res.status(404).json({ success: false, message: "E-mail não encontrado." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. Atualizar a senha (sobrescrever a antiga)
app.post('/api/atualizar-senha', async (req, res) => {
    const { userKey, newPass } = req.body;
    try {
        // O Firebase Admin usa .update para mudar apenas o campo password
        await db.ref(`usuarios/${userKey}`).update({
            password: newPass
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

//
//
//
//
// --- ROTA DE CADASTRO ---
app.post('/api/cadastrar-usuario', async (req, res) => {
    const { username, password, email, nome, telefone, rota } = req.body;
    
    try {
        // Referência para o novo usuário usando o username como chave (ex: usuarios/admin)
        const userRef = db.ref('usuarios/' + username);
        
        // Verifica se o username já existe para não sobrescrever
        const snapshot = await userRef.once('value');
        if (snapshot.exists()) {
            return res.status(400).json({ success: false, message: "Este nome de usuário já está em uso." });
        }

        // Grava os dados no Firebase conforme sua estrutura
        await userRef.set({
            username: username,
            password: password,
            email: email,
            nome: nome,
            telefone: telefone,
            rota: rota || "aluno.html", // Define uma rota padrão caso não venha no corpo
            dataCriacao: new Date().toISOString()
        });

        console.log(`✅ Novo usuário cadastrado: ${username}`);
        res.json({ success: true });
    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        res.status(500).json({ success: false, message: "Erro interno no servidor." });
    }
});

app.listen(5500, () => {
    console.log("🚀 Servidor rodando em http://localhost:5500");
});