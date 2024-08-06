const OcorrenciaForm = document.getElementById('ocorrencia-form');
const CancelBtn = document.querySelector('.cancel-button');

$(document).ready(function () {

    $('.select-client').select2();
    // Máscaras
    var maskAntiga = 'AAA9999'; // Máscara para placas antigas
    var maskMercosul = 'AAA9A99'; // Máscara para placas Mercosul

    var $placa = $('.placa');


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
    $placa.mask(maskAntiga);

    // Atualiza a máscara com base na entrada
    $placa.on('input', function () {
        applyMask($placa);
    });

    // Atualiza a máscara se o campo estiver vazio
    $placa.on('focus', function () {
        applyMask($placa);
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
            <td class="placa-veiculo">${ocorrencia.placa_veiculo}</td>
            <td class="placa-carreta">${ocorrencia.placa_carreta}</td>
            <td class="cliente-nome" data-id="${ocorrencia.id_cliente}">${ocorrencia.cliente_nome}</td>
            <td class="motorista">${ocorrencia.motorista}</td>
            <td class="descricao">${ocorrencia.descricao}</td>
            <td class="status">${ocorrencia.status}</td>
            <td class="data-ocorrencia">${ocorrencia.data_ocorrencia}</td>
            <td class="hora-ocorrencia">${ocorrencia.hora_ocorrencia}</td>
             <td class="usuario-login" data-id="${ocorrencia.id_usuario}">${ocorrencia.usuario_login}</td>
            <td class="td-button">
                <button type="button" class="edit-button" data-id="${ocorrencia.id_ocorrencia}">
                    <img width="30" height="30" src="/images/edit.png" alt="Editar">
                </button>
                <button type="button" class="delete-button" data-id="${ocorrencia.id_ocorrencia}">
                    <img width="30" height="30" src="/images/delete.png" alt="Excluir">
                </button>
            </td>
        `;
        tableBody.appendChild(row);

    });

}

async function updateOcorrenciaList() {
    console.log("cheguei aqui!!!")
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

function addEventListenersToOcorrenciaButtons() {
    const tableBody = document.getElementById('ocorrencias-table-body');

    tableBody.addEventListener('click', event => {
        const target = event.target.closest('button');
        if (!target) return; // Ignorar se o alvo não for um botão

        const ocorrenciaId = target.getAttribute('data-id');

        if (target.classList.contains('delete-button')) {
            deleteOcorrencia(ocorrenciaId);
        } else if (target.classList.contains('edit-button')) {
            editOcorrencia(ocorrenciaId);
        }
    });
}

// Adiciona um event listener separado para o botão de salvar
function addEventListenerToSaveButton() {
    document.addEventListener('click', event => {
        const target = event.target.closest('button.save-button');
        if (!target) return; // Ignorar se o alvo não for um botão de salvar

        const ocorrenciaId = target.getAttribute('data-id');
        saveOcorrencia(ocorrenciaId);
    });
}

addEventListenerToSaveButton();
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

function editOcorrencia(ocorrenciaId) {
    const listItem = document.querySelector(`tr[data-id="${ocorrenciaId}"]`);
    document.getElementById('edit-placa-veiculo').value = listItem.querySelector('.placa-veiculo').innerText;
    document.getElementById('edit-placa-carreta').value = listItem.querySelector('.placa-carreta').innerText;
    //document.getElementById('edit-cliente-nome').value = listItem.querySelector('.cliente-nome').innerText;
    document.getElementById('edit-motorista').value = listItem.querySelector('.motorista').innerText;
    document.getElementById('edit-descricao').value = listItem.querySelector('.descricao').innerText;
    document.getElementById('edit-status').value = listItem.querySelector('.status').innerText;


    const dataOcorrencia = listItem.querySelector('.data-ocorrencia').innerText;
    const formattedDataOcorrencia = formatDateForInput(dataOcorrencia);
    document.getElementById('edit-data-ocorrencia').value = formattedDataOcorrencia;

    // Preencher o campo de hora
    document.getElementById('edit-hora-ocorrencia').value = listItem.querySelector('.hora-ocorrencia').innerText;

    // Definir o data-id da div de edição
    document.querySelector('.edit-section').dataset.id = ocorrenciaId;
    document.querySelector('.save-button').dataset.id = ocorrenciaId;

    // Preencher o select de usuário
    const usuarioId = listItem.querySelector('.usuario-login').dataset.id;
    console.log(usuarioId)
    document.getElementById('edit-usuario-login').value = usuarioId;


    // Supondo que você tem o `clientId` disponível
    const clientId = listItem.querySelector('.cliente-nome').dataset.id;
    console.log(clientId);

    // Atualiza o Select2 com o valor do `clientId`
    $('#edit-cliente-nome').val(clientId).trigger('change');

    // Exibir a seção de edição
    document.querySelector('.edit-section').style.display = 'flex';
}



if (CancelBtn) {
    CancelBtn.addEventListener('click', () => {
        document.querySelector('.edit-section').style.display = 'none';
    });
}


function formatDateForInput(dateString) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
}

async function saveOcorrencia(ocorrenciaId) {

    const placaVeiculo = document.getElementById('edit-placa-veiculo').value;
    const placaCarreta = document.getElementById('edit-placa-carreta').value;
    const clienteNome = document.getElementById('edit-cliente-nome').value;
    const motorista = document.getElementById('edit-motorista').value;
    const descricao = document.getElementById('edit-descricao').value;
    const status = document.getElementById('edit-status').value;
    const dataOcorrencia = document.getElementById('edit-data-ocorrencia').value;
    const horaOcorrencia = document.getElementById('edit-hora-ocorrencia').value;
    const usuarioId = document.getElementById('edit-usuario-login').value;

    console.log(usuarioId)

    //const ocorrenciaId = document.querySelector('#edit-section').dataset.idOcorrencia;

    try {
        const response = await fetch(`/update-ocorrencia/${ocorrenciaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                'placa-veiculo-edit': placaVeiculo,
                'placa-carreta-edit': placaCarreta,
                'id-cliente-edit': clienteNome,
                'motorista-edit': motorista,
                'descricao-edit': descricao,
                'status-edit': status,
                'data-edit': dataOcorrencia,
                'hora-edit': horaOcorrencia,
                'id-usuario-edit': usuarioId
            })
        });

        if (response.ok) {
            alert('Ocorrência atualizada com sucesso.');
            location.reload(); // Recarregar a página para ver as atualizações
        } else {
            const errorData = await response.json();
            alert(`Erro: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Erro ao atualizar ocorrência:', error);
        alert('Erro ao atualizar ocorrência.');
    }

}

addEventListenersToOcorrenciaButtons();
