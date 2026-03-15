const express = require('express');
const path = require('path');
const session = require('express-session');
const admin = require('firebase-admin');
const cors = require('cors'); 
const app = express();

// --- 1. CONFIGURAÇÃO DO FIREBASE ---
let serviceAccount;

try {
    if (process.env.FIREBASE_CONFIG) {
        serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);
    } else {
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
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'segredo-capoeira',
    resave: true,
    saveUninitialized: false,
    rolling: true,
    cookie: { 
        maxAge: 900000,
        secure: false 
    } 
}));

// --- 3. ROTAS DE NAVEGAÇÃO ---

// NOVA ROTA: Redireciona quem acessa a URL pura para o login
app.get('/', (req, res) => {
    res.redirect('/auth');
});

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
            const tipo = usuarioEncontrado.rota.replace('.html', '');
            req.session.tipo = tipo;
            req.session.nome = usuarioEncontrado.username;
            res.json({ success: true, redirect: `/auth/${tipo}` });
        } else {
            res.status(401).json({ success: false, message: "Dados incorretos" });
        }
    } catch (error) {
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

app.get('/auth/:pagina', (req, res) => {
    const pagina = req.params.pagina;
    if (req.session.tipo === pagina) {
        res.sendFile(path.join(__dirname, `views/${pagina}.html`));
    } else {
        res.redirect('/auth');
    }
});

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

app.post('/api/cadastrar-usuario', async (req, res) => {
    const { username, password, email, nome, telefone, rota } = req.body;
    try {
        const userRef = db.ref('usuarios/' + username);
        const snapshot = await userRef.once('value');
        if (snapshot.exists()) return res.status(400).json({ success: false, message: "Usuário já existe." });

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

// --- 6. INICIALIZAÇÃO ---
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
});