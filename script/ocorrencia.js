const OcorrenciaForm = document.getElementById('ocorrencia-form');


OcorrenciaForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Previne o envio padrão do formulário

    // Coleta os dados do formulário
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        // Envia os dados para o servidor
        const response = await fetch('/inserir-ocorrencia', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        // Verifica se a resposta foi bem-sucedida
        if (!response.ok) {
            throw new Error('Erro ao enviar os dados.');
        }

        // Trata a resposta do servidor
        const result = await response.json();
        console.log('Dados enviados com sucesso:', result);

        // Exibe uma mensagem de sucesso ou redireciona o usuário, conforme necessário
        alert('Ocorrência cadastrada com sucesso!');
        event.target.reset(); // Limpa o formulário

    } catch (error) {
        console.error('Erro:', error);
        alert('Ocorreu um erro ao cadastrar a ocorrência.');
    }
});