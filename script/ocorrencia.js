const OcorrenciaForm = document.getElementById('ocorrencia-form');

$(document).ready(function () {

    $('.select-client').select2();
    // Máscaras
    var maskAntiga = 'AAA9999'; // Máscara para placas antigas
    var maskMercosul = 'AAA9A99'; // Máscara para placas Mercosul

    var $placaVeiculo = $('#placa-veiculo');
    var $placaCarreta = $('#placa-carreta');

    // Função para aplicar a máscara com base na condição
    function applyMask($element) {
        var value = $element.val();
        if (value.length > 4 && isNaN(value.charAt(4))) {
            $element.unmask().mask(maskMercosul);
        } else {
            $element.unmask().mask(maskAntiga);
        }
    }

    // Aplica a máscara inicial
    $placaVeiculo.mask(maskAntiga);
    $placaCarreta.mask(maskAntiga);

    // Atualiza a máscara com base na entrada
    $placaVeiculo.on('input', function () {
        applyMask($placaVeiculo);
    });

    $placaCarreta.on('input', function () {
        applyMask($placaCarreta);
    });

    // Atualiza a máscara se o campo estiver vazio
    $placaVeiculo.on('focus', function () {
        applyMask($placaVeiculo);
    });

    $placaCarreta.on('focus', function () {
        applyMask($placaCarreta);
    });
});

document.getElementById('ocorrencia-form').addEventListener('submit', async (event) => {
    event.preventDefault(); // Previne o envio padrão do formulário

    const placaVeiculo = document.getElementById("placa-veiculo").value;
    const placaCarreta = document.getElementById("placa-carreta").value;
    const idCliente = document.getElementById("id-cliente").value;
    const nomeMotorista = document.getElementById("nome-motorista").value;
    const descricao = document.getElementById("descricao").value;
    const status = document.getElementById("status").value;


    try {
        // Envia os dados para o servidor
        const response = await fetch('/insert-ocorrencia', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                placaVeiculo,
                placaCarreta,
                idCliente,
                nomeMotorista,
                descricao,
                status
            })
        });

        // Verifica se a resposta foi bem-sucedida
       /* if (!response.ok) {
            throw new Error('Erro ao enviar os dados.');
        }*/

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

