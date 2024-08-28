const OcorrenciaForm = document.getElementById('ocorrencia-form');
const CancelBtn = document.querySelector('.cancel-button');
const EditSection = document.querySelector('.edit-section');
const SaveButton = document.querySelector('.save-button');
const tableBody = document.getElementById('ocorrencias-table-body');
const PdfButton = document.getElementById('export-pdf-button');
const EditOCorrencia = document.getElementById('edit-ocorrencia');
const LoadMoreButton = document.querySelector('#load-more');
const EditPlacaVeiculo = document.getElementById('edit-placa-veiculo');
const EditPlacaCarreta = document.getElementById('edit-placa-carreta')
const EditMotorista = document.getElementById('edit-motorista');
const EditDescricao = document.getElementById('edit-descricao')
const EditStatus = document.getElementById('edit-status');
const EditDataOcorrencia = document.getElementById('edit-data-ocorrencia')
const EditHoraOcorrencia = document.getElementById('edit-hora-ocorrencia')
const EditUsuarioLogin = document.getElementById('edit-usuario-login')


$(document).ready(function () {
    // Inicializa o select2
    $('.select-client').select2();

    // Máscaras
    const maskAntiga = 'AAA9999'; // Máscara para placas antigas
    const maskMercosul = 'AAA9A99'; // Máscara para placas Mercosul
    const $placa = $('.placa');

    function applyMask($element) {
        const value = $element.val();
        const mask = value.length > 4 && isNaN(value.charAt(4)) ? maskMercosul : maskAntiga;
        $element.unmask().mask(mask);
    }

    // Aplica e atualiza a máscara
    $placa.mask(maskAntiga).on('input focus', function () {
        applyMask($placa);
    });
});

const handleOcorrenciaSubmit = async (event, isUpdate = false) => {
    event.preventDefault(); // Previne o envio padrão do formulário

    const form = event.target;
    const formData = new FormData(form);
    let url = '/insert-ocorrencia';
    let method = 'POST';

    // Se for uma atualização, modifique a URL e o método
    if (isUpdate) {
        const saveButton = form.querySelector('button.save-button');
        const ocorrenciaId = saveButton.getAttribute('data-id');
        url = `/update-ocorrencia/${ocorrenciaId}`;
        method = 'PUT';
    }

    try {
        const response = await fetch(url, {
            method: method,
            body: formData,
            credentials: 'same-origin' // Inclua se necessário para cookies
        });

        if (response.ok) {
            const successMessage = isUpdate
                ? 'Ocorrência atualizada com sucesso.'
                : 'Ocorrência cadastrada com sucesso!';
            alert(successMessage);
            if (isUpdate) {
                // Oculta a EditSection após uma atualização bem-sucedida
                const editSection = document.querySelector('.edit-section');
                if (editSection) {
                    editSection.style.display = 'none';
                }
            } else {
                form.reset(); // Limpa o formulário apenas para novos cadastros
            }
        } else {
            const errorData = await response.json();
            alert(`Erro: ${errorData.error}`);
        }
    } catch (error) {
        console.error('Erro ao enviar os dados:', error);
        alert('Ocorreu um erro ao processar a ocorrência.');
    }
};

// Associa os eventos aos formulários
EditOCorrencia.addEventListener('submit', (event) => handleOcorrenciaSubmit(event, true));
OcorrenciaForm.addEventListener('submit', handleOcorrenciaSubmit);



document.addEventListener('DOMContentLoaded', function () {
    const inputs = document.querySelectorAll('.form-search input, .form-search select, .form-search textarea');
    inputs.forEach(input => {
        input.addEventListener('input', searchOcorrencias);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.form-search input, .form-search select, .form-search textarea')
        .forEach(input => input.addEventListener('input', searchOcorrencias));
});

function renderOcorrencias(ocorrencias, isAdmin) {
    const tableBody = document.querySelector('#ocorrencias-table-body'); // Certifique-se de que #ocorrencias-table-body é o ID correto

    ocorrencias.forEach(ocorrencia => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', ocorrencia.id_ocorrencia);
        row.innerHTML = `
            <td>${ocorrencia.id_ocorrencia}</td>
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
                ${isAdmin || (ocorrencia.status !== 'Resolvido' && !isAdmin) ? `
                    <button type="button" class="edit-button" data-id="${ocorrencia.id_ocorrencia}">
                        <img width="30" height="30" src="/images/edit.png" alt="Editar">
                    </button>
                ` : ''}
                ${isAdmin ? `
                    <button type="button" class="delete-button" data-id="${ocorrencia.id_ocorrencia}">
                        <img width="30" height="30" src="/images/delete.png" alt="Excluir">
                    </button>
                ` : ''}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

let offsetSearch = 0; // Offset para pesquisa com filtros
let offsetNoFilter = 100; // Offset para pesquisa sem filtros

async function searchOcorrencias(event, loadMore = false) {
    if (event) event.preventDefault();

    offsetNoFilter = 100;

    // Define o offset baseado na condição
    let offset = loadMore ? offsetSearch : 0;

    const form = document.querySelector('.form-search');
    const queryParams = new URLSearchParams(new FormData(form));
    queryParams.append('offset', offset);

    try {
        const response = await fetch(`/search-ocorrencia?${queryParams}`, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Erro ao buscar ocorrências');

        const data = await response.json();
        const { isAdmin, ocorrencias } = data;

        if (loadMore) {
            renderOcorrencias(ocorrencias, isAdmin); // Adiciona as novas ocorrências
        } else {
            tableBody.innerHTML = ''; // Limpa a tabela existente
            renderOcorrencias(ocorrencias, isAdmin); // Renderiza as novas ocorrências
        }

        // Incrementa o offset apenas se "Carregar Mais" foi clicado
        if (ocorrencias.length === 100) {
            offsetSearch += 100;
        }

        // Esconde o botão se menos de 100 resultados forem retornados
        if (LoadMoreButton) {
            if (ocorrencias.length < 100) {
                LoadMoreButton.style.display = 'none';
            } else {
                LoadMoreButton.style.display = 'block';
            }
        }

    } catch (err) {
        console.error('Erro ao buscar ocorrências:', err);
    }
}

async function fetchOcorrenciasSemFiltro() {
    try {
        const response = await fetch(`/ocorrencia?offset=${offsetNoFilter}`, {
            headers: { 'Accept': 'application/json' } // Adiciona o cabeçalho Accept
        });

        if (!response.ok) throw new Error('Erro ao buscar ocorrências');

        const data = await response.json();


        renderOcorrencias(data.ocorrencias, data.isAdmin);

        // Incrementa o offset apenas se "Carregar Mais" foi clicado
        if (data.ocorrencias.length === 100) {
            offsetNoFilter += 100;
        }

        // Esconde o botão se menos de 100 resultados forem retornados
        if (LoadMoreButton) {
            if (data.ocorrencias.length < 100) {
                LoadMoreButton.style.display = 'none';
            } else {
                LoadMoreButton.style.display = 'block';
            }
        }


    } catch (err) {
        console.error('Erro ao buscar ocorrências:', err);
    }
}
// Função principal que decide qual função chamar com base no preenchimento do formulário
async function handleSearchOrFetch(event, loadMore = false) {
    const form = document.querySelector('.form-search');
    const isFormEmpty = [...form.elements].every(input => input.value.trim() === '');

    if (isFormEmpty) {
        console.log("caí aqui")
        await fetchOcorrenciasSemFiltro(); // Chama a função para buscar ocorrências com formulário vazio
    } else {
        await searchOcorrencias(event, loadMore); // Chama a função de busca com parâmetros
    }
}

// Adicione um listener ao botão de "Carregar Mais"
if (LoadMoreButton) {
    LoadMoreButton.addEventListener('click', (event) => {
        handleSearchOrFetch(event, true); // Passa `true` para indicar "Carregar Mais"
    });
}

async function updateOcorrenciaList() {

    // Limpa o conteúdo existente
    tableBody.innerHTML = '';

    try {
        const response = await fetch('/ocorrencia', { headers: { 'Accept': 'application/json' } });
        const data = await response.json();
        renderOcorrencias(data.ocorrencias, data.isAdmin);
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
            //  document.querySelector(`tr[data-id="${ocorrenciaId}"]`).remove();
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de exclusão:', err);
        alert('Erro ao excluir ocorrência.');
    }
}

function addEventListenersToOcorrenciaButtons() {
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

function editOcorrencia(ocorrenciaId) {
    const listItem = document.querySelector(`tr[data-id="${ocorrenciaId}"]`);

    // Função auxiliar para verificar e atribuir valores
    function setValueIfExists(element, selector) {
        if (element) {
            element.value = listItem.querySelector(selector).innerText;
        }
    }

    // Preencher os campos de edição
    setValueIfExists(EditPlacaVeiculo, '.placa-veiculo');
    setValueIfExists(EditPlacaCarreta, '.placa-carreta');
    setValueIfExists(EditMotorista, '.motorista');
    setValueIfExists(EditDescricao, '.descricao');
    setValueIfExists(EditStatus, '.status');

    // Formatando a data e hora
    const dataOcorrencia = listItem.querySelector('.data-ocorrencia').innerText;
    setValueIfExists(EditDataOcorrencia, '.data-ocorrencia');
    setValueIfExists(EditHoraOcorrencia, '.hora-ocorrencia');

    // Atualizar data e hora se os elementos existirem
    if (EditDataOcorrencia) {
        EditDataOcorrencia.value = formatDateForInput(dataOcorrencia);
    }

    // Definir data-id e usuário
    EditSection.dataset.id = ocorrenciaId;
    SaveButton.dataset.id = ocorrenciaId;

    // Preencher o select de usuário
    const usuarioId = listItem.querySelector('.usuario-login').dataset.id;
    if (EditUsuarioLogin) {
        EditUsuarioLogin.value = usuarioId;
    }


    const clientId = listItem.querySelector('.cliente-nome').dataset.id;
    $('#edit-cliente-nome').val(clientId).trigger('change');

    // Exibir a seção de edição
    EditSection.style.display = 'flex';
}


if (CancelBtn) {
    CancelBtn.addEventListener('click', () => {
        EditSection.style.display = 'none';
    });
}

function formatDateForInput(dateString) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
}

addEventListenersToOcorrenciaButtons();

PdfButton.addEventListener('click', () => {

    window.location.href = '/download-pdf';

});

function toggleExpand(editorSelector, buttonSelector, expandImage, collapseImage) {
    const editor = document.querySelector(editorSelector);
    const button = document.getElementById(buttonSelector);

    button.addEventListener('click', function () {
        editor.classList.toggle('active');
        button.classList.toggle('active');

        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', !isExpanded);

        // Trocar a imagem do botão
        const img = button.querySelector('img');
        img.src = isExpanded ? collapseImage : expandImage;
    });
}

// Uso da função para cada editor
toggleExpand('.form-editor', 'btn-cad-expand', '/images/collapse-right.png', '/images/collapse-left.png');
toggleExpand('.form-search', 'btn-search-expand', '/images/collapse-right.png', '/images/collapse-left.png');

// main.js ou outro arquivo JS que você usa no cliente
async function initializeWebSocket() {
    try {
        const response = await fetch('/wssconfig');
        const config = await response.json();

        const ws = new WebSocket(config.wsURL);

        ws.onopen = () => {
            console.log('Conexão WebSocket segura estabelecida.');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'new-ocorrencia') {
                console.log('Nova ocorrência recebida:', data.ocorrencia);
                updateOcorrenciaList();
            } else if (data.type === 'update-ocorrencia') {
                console.log('Ocorrência atualizada:', data.ocorrencia);
                updateOcorrenciaList();
            } else if (data.type === 'delete-ocorrencia') {
                console.log('Ocorrência deletada:', data.ocorrencia);
                updateOcorrenciaList();
            }
        };

        ws.onclose = () => {
            console.log('Conexão WebSocket fechada.');
        };

        ws.onerror = (error) => {
            console.error('Erro na conexão WebSocket:', error);
        };
    } catch (error) {
        console.error('Erro ao obter configuração:', error);
    }
}

// Chama a função para inicializar o WebSocket
initializeWebSocket();

