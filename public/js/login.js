async function entrar() {
    const userInput = document.getElementById('user').value;
    const passInput = document.getElementById('pass').value;

    if (!userInput || !passInput) {
        alert("Preencha todos os campos!");
        return;
    }

    try {
        const response = await fetch('/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                user: userInput, 
                pass: passInput 
            })
        });

        const data = await response.json();

        if (data.success) {
            // Redireciona para /auth/professor ou /auth/aluno
            window.location.href = data.redirect;
        } else {
            alert("Usuário ou senha incorretos.");
        }
    } catch (error) {
        console.error("Erro:", error);
        alert("Erro ao conectar com o servidor.");
    }
}

// Atalho para o Enter
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') entrar();
});