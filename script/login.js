document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Impede o envio padrão do formulário

    const formData = new FormData(event.target);

    try {
        const response = await fetch('/login', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            // Redireciona para a rota /ocorrencia em caso de sucesso
            window.location.href = '/ocorrencia';
        } else {
            // Exibe a mensagem de erro
            alert(result.error || 'Erro ao fazer login');
        }
    } catch (error) {
        console.error('Erro ao enviar o formulário:', error);
        alert('Erro ao fazer login');
    }
});

function togglePasswordVisibility(event) {
    const eyeIcon = event.target;
    const input = eyeIcon.previousElementSibling;
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    eyeIcon.src = type === 'text' ? '/images/invisible-eye.webp' : '/images/eye.webp';
    eyeIcon.alt = type === 'text' ? 'Esconder Senha' : 'Mostrar Senha';
}