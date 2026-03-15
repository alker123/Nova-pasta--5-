const express = require('express');
const path = require('path');
const session = require('express-session');
const admin = require('firebase-admin');
const cors = require('cors'); // Adicionado para evitar erros de conexão entre portas
const app = express();

// --- 1. CONFIGURAÇÃO DO FIREBASE (HÍBRIDA: LOCAL + CLOUD) ---
let serviceAccount;

try {
    if (process.env.FIREBASE_CONFIG) {
        // Se estiver no Render, usa a variável de ambiente que você vai criar
        serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    } else {
        // Se estiver no seu PC, usa o arquivo local
        serviceAccount = require("./firebase-key.json");
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://aulas1-9044b-default-rtdb.firebaseio.com/"
    });
} catch (error) {
    console.error("❌ Erro fatal ao carregar chave do Firebase:", error.message);
}

const db = admin.database();

// --- 2. MIDDLEWARES ---
app.use(cors()); // Permite que o frontend converse com o backend sem bloqueios
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'segredo-capoeira',
    resave: true,
    saveUninitialized: false,
    rolling: true,
    cookie: { 
        maxAge: 900000,
        secure: false // Mantenha false para localhost; mude para true se usar HTTPS no futuro
    } 
}));

// --- 3. ROTAS DE NAVEGAÇÃO ---
app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

// --- 4. LÓGICA DE LOGIN ---
app.post('/index', async (req, res) => {
    const user = req.body.user ? req.body.user.trim().toLowerCase() : "";
    const pass = req.body.pass ? String(req.body.pass).trim() : "";

    try {
        const snapshot = await db.ref('usuarios').once('value');
        const usuarios = snapshot.val();

        let usuarioEncontrado = null;

        if (usuarios) {
            for (let id in usuarios) {
                const u = usuarios[id];
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
            // Garante que a rota seja apenas o nome (ex: "aluno" em vez de "aluno.html")
            const tipo = usuarioEncontrado.rota.replace('.html', '');
            req.session.tipo = tipo;
            req.session.nome = usuarioEncontrado.username;

            console.log(`✅ Sucesso: ${req.session.nome} logado como ${tipo}`);
            res.json({ success: true, redirect: `/auth/${tipo}` });
        } else {
            res.status(401).json({ success: false, message: "Dados incorretos" });
        }
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false });
    }
});

// --- 5. APIs E OUTRAS ROTAS ---
app.get('/api/usuario-logado', (req, res) => {
    if (req.session.nome) {
        res.json({ nome: req.session.nome });
    } else {
        res.status(401).json({ erro: "Não logado" });
    }
});

app.get('/sair', (req, res) => {
    req.session.destroy();
    res.redirect('/auth');
});

// Rota dinâmica protegida
app.get('/auth/:pagina', (req, res) => {
    const pagina = req.params.pagina;
    if (req.session.tipo === pagina) {
        res.sendFile(path.join(__dirname, `views/${pagina}.html`));
    } else {
        res.redirect('/auth');
    }
});

// Recuperação de Senha
app.post('/api/buscar-usuario-por-email', async (req, res) => {
    const { email } = req.body;
    try {
        const snapshot = await db.ref('usuarios').once('value');
        const usuarios = snapshot.val();
        let userKey = null;

        if (usuarios) {
            for (let key in usuarios) {
                if (usuarios[key].email === email) {
                    userKey = key;
                    break;
                }
            }
        }

        if (userKey) res.json({ success: true, userKey });
        else res.status(404).json({ success: false, message: "E-mail não encontrado." });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/atualizar-senha', async (req, res) => {
    const { userKey, newPass } = req.body;
    try {
        await db.ref(`usuarios/${userKey}`).update({ password: newPass });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Cadastro
app.post('/api/cadastrar-usuario', async (req, res) => {
    const { username, password, email, nome, telefone, rota } = req.body;
    try {
        const userRef = db.ref('usuarios/' + username);
        const snapshot = await userRef.once('value');
        if (snapshot.exists()) {
            return res.status(400).json({ success: false, message: "Usuário já existe." });
        }

        await userRef.set({
            username, password, email, nome, telefone,
            rota: rota || "aluno.html",
            dataCriacao: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Monitor de Conexão
db.ref('.info/connected').on('value', (snap) => {
    console.log(snap.val() === true ? "✅ FIREBASE CONECTADO" : "❌ FIREBASE DESCONECTADO");
});

// --- 6. INICIALIZAÇÃO DO SERVIDOR (PORTA DINÂMICA) ---
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});