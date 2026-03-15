

// firebase.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// 🔧 Configuração do Banco 1
const configBanco1 = {
  databaseURL: "https://aulas1-9044b-default-rtdb.firebaseio.com/"
};

// 🔧 Configuração do Banco 2
const configBanco2 = {
  databaseURL: "https://sengu-abc16-default-rtdb.firebaseio.com/"
};

// ✅ Inicializa dois apps (usa getApps para evitar duplicações)
const app1 = getApps().find(app => app.name === 'banco1') || initializeApp(configBanco1, 'banco1');
const app2 = getApps().find(app => app.name === 'banco2') || initializeApp(configBanco2, 'banco2');

// 📦 Exporta os dois bancos
const db = getDatabase(app1); // dados-teste
const db1 = getDatabase(app2); // testes2

export { db, db1 };
