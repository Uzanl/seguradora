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


        //os dados estão sendo tratados de forma errada aqui!!!

        // Trata a resposta do servidor
        const result = await response.json();
        console.log('Dados enviados com sucesso:', result);

        // Exibe uma mensagem de sucesso ou redireciona o usuário, conforme necessário
        alert('Ocorrência cadastrada com sucesso!');
        updateOcorrenciaList();
        event.target.reset(); // Limpa o formulário

    } catch (error) {
        console.error('Erro:', error);
        alert('Ocorreu um erro ao cadastrar a ocorrência.');
    }
});


document.addEventListener('DOMContentLoaded', function () {
    const inputs = document.querySelectorAll('.form-search input, .form-search select, .form-search textarea');
    inputs.forEach(input => {
        input.addEventListener('input', searchOcorrencias);
        input.addEventListener('change', searchOcorrencias);
    });
});

async function searchOcorrencias() {
    const placaVeiculo = document.getElementById('placa-veiculo-pesquisa').value;
    const placaCarreta = document.getElementById('placa-carreta-pesquisa').value;
    const nomeCliente = document.getElementById('nome-cliente-pesquisa').value;
    const nomeMotorista = document.getElementById('nome-motorista-pesquisa').value;
    const descricao = document.getElementById('descricao-pesquisa').value;
    const status = document.getElementById('status-pesquisa').value;
    const dataDe = document.getElementById('data-de-pesquisa').value;
    console.log(dataDe)
    const dataAte = document.getElementById('data-ate-pesquisa').value;
    const horaDe = document.getElementById('hora-de-pesquisa').value;
    const horaAte = document.getElementById('hora-ate-pesquisa').value;

    try {
        const query = new URLSearchParams({
            'placa-veiculo-pesquisa': placaVeiculo,
            'placa-carreta-pesquisa': placaCarreta,
            'nome-cliente-pesquisa': nomeCliente,
            'nome-motorista-pesquisa': nomeMotorista,
            'descricao-pesquisa': descricao,
            'status-pesquisa': status,
            'data-de-pesquisa': dataDe,
            'data-ate-pesquisa': dataAte,
            'hora-de-pesquisa': horaDe,
            'hora-ate-pesquisa': horaAte
        });

        const response = await fetch(`/search-ocorrencia?${query.toString()}`);
        if (!response.ok) throw new Error('Erro ao buscar ocorrências');
        const ocorrencias = await response.json();
        renderOcorrencias(ocorrencias);
    } catch (err) {
        console.error('Erro ao buscar ocorrências:', err);
    }
}

function renderOcorrencias(ocorrencias) {
    const tableBody = document.getElementById('ocorrencias-table-body');
    tableBody.innerHTML = '';

    ocorrencias.forEach(ocorrencia => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', ocorrencia.id_ocorrencia);
        row.innerHTML = `
            <td>${ocorrencia.placa_veiculo}</td>
            <td>${ocorrencia.placa_carreta}</td>
            <td>${ocorrencia.cliente_nome}</td>
            <td>${ocorrencia.motorista}</td>
            <td>${ocorrencia.descricao}</td>
            <td>${ocorrencia.status}</td>
            <td>${ocorrencia.data_ocorrencia}</td>
            <td>${ocorrencia.hora_ocorrencia}</td>
            <td>${ocorrencia.usuario_login}</td>
            <td class="td-button">
                <button type="button" class="edit-button">
                    <img width="30" height="30" src="/images/edit.png" alt="Editar">
                </button>
                <button type="button" class="delete-button" data-id="${ocorrencia.id_ocorrencia}">
                    <img width="30" height="30" src="/images/delete.png" alt="Excluir">
                </button>
            </td>
        `;
        tableBody.appendChild(row);

    });
    addEventListenersToClientButtons();
}

async function updateOcorrenciaList() {
    try {
        const response = await fetch('/ocorrencia', { headers: { 'Accept': 'application/json' } });
        const data = await response.json();
        renderOcorrencias(data.ocorrencias);
    } catch (err) {
        console.error('Erro ao atualizar a lista de ocorrências:', err);
    }
}

// Função para excluir um cliente
async function deleteOcorrencia(ocorrenciaId) {
    const confirmation = confirm('Você tem certeza que deseja excluir este ocorrência?');

    if (!confirmation) {
        return; // Se o usuário cancelar, não faz nada
    }

    try {
        const response = await fetch(`/delete-ocorrencia/${ocorrenciaId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert('Ocorrência excluída com sucesso.');
            // Remove o item da lista
            document.querySelector(`tr[data-id="${ocorrenciaId}"]`).remove();
        } else {
            alert('Erro ao excluir ocorrência: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de exclusão:', err);
        alert('Erro ao excluir ocorrência.');
    }
}

function addEventListenersToClientButtons() {

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', () => {
            const ocorrenciaId = button.closest('tr').getAttribute('data-id');
            deleteOcorrencia(ocorrenciaId);
        });
    });

}

document.getElementById('export-pdf-button').addEventListener('click', function () {
    console.time("uzx");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const table = document.getElementById('ocorrencias-table');

    // Prepare the header
    const headers = Array.from(table.querySelectorAll('thead th'))
        .map(th => th.innerText)
        .slice(0, -1); // Remove the last header

    // Prepare the data
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    const data = rows.map(tr =>
        Array.from(tr.querySelectorAll('td'))
            .map(td => td.innerText)
            .slice(0, -1) // Remove the last column
    );

    // Generate the PDF using autoTable
    doc.autoTable({
        head: [headers],
        body: data
    });

    doc.save('ocorrencias.pdf');

    console.timeEnd("uzx");
});

addEventListenersToClientButtons();
