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
            if (!isUpdate) form.reset(); // Limpa o formulário apenas para novos cadastros
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

    if (EditPlacaVeiculo) {
        EditPlacaVeiculo.value = listItem.querySelector('.placa-veiculo').innerText;
    }

    if (EditPlacaCarreta) {
        EditPlacaCarreta.value = listItem.querySelector('.placa-carreta').innerText;
    }

    if (EditMotorista) {
        EditMotorista.value = listItem.querySelector('.motorista').innerText;
    }

    if (EditDescricao) {
        EditDescricao.value = listItem.querySelector('.descricao').innerText;
    }

    if (EditStatus) {
        EditStatus.value = listItem.querySelector('.status').innerText;
    }

    const dataOcorrencia = listItem.querySelector('.data-ocorrencia').innerText;
    const formattedDataOcorrencia = formatDateForInput(dataOcorrencia);

    if (EditDataOcorrencia) {
        EditDataOcorrencia.value = formattedDataOcorrencia;
    }

    if (EditHoraOcorrencia) {
        // Preencher o campo de hora
        EditHoraOcorrencia.value = listItem.querySelector('.hora-ocorrencia').innerText;
    }



    // Definir o data-id da div de edição
    EditSection.dataset.id = ocorrenciaId;
    SaveButton.dataset.id = ocorrenciaId;

    // Preencher o select de usuário
    const usuarioId = listItem.querySelector('.usuario-login').dataset.id;
    if (EditUsuarioLogin) {
        EditUsuarioLogin.value = usuarioId;
    }


    // Supondo que você tem o `clientId` disponível
    const clientId = listItem.querySelector('.cliente-nome').dataset.id;

    // Atualiza o Select2 com o valor do `clientId`
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

const formEditor = document.querySelector('.form-editor');
const btnExpand = document.getElementById('btn-cad-expand');

btnExpand.addEventListener('click', function() {
    const isActive = formEditor.classList.toggle('active');
    btnExpand.classList.toggle('active');

    const isExpanded = btnExpand.getAttribute('aria-expanded') === 'true';
    btnExpand.setAttribute('aria-expanded', !isExpanded);

     // Trocar a imagem do botão
     const img = btnExpand.querySelector('img');
     if (!isExpanded) {
         img.src = '/images/collapse-right.png';
     } else {
         img.src = '/images/collapse-left.png';
     }
});


const searchEditor = document.querySelector('.form-search');
const btnExpandSearch = document.getElementById('btn-search-expand');

btnExpandSearch.addEventListener('click', function() {
    const isActive = searchEditor.classList.toggle('active');
    btnExpandSearch.classList.toggle('active');

    const isExpanded = btnExpandSearch.getAttribute('aria-expanded') === 'true';
    btnExpandSearch.setAttribute('aria-expanded', !isExpanded);

      // Trocar a imagem do botão
      const img = btnExpandSearch.querySelector('img');
      if (!isExpanded) {
    
          img.src = '/images/collapse-left.png';
      } else {
        img.src = '/images/collapse-right.png';
      }

});

const ws = new WebSocket('wss://localhost:3000');

ws.onopen = () => {
    console.log('Conexão WebSocket segura estabelecida.');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'new-ocorrencia') {
        console.log('Nova ocorrência recebida:', data.ocorrencia);

        // Atualiza a lista de ocorrências chamando a função updateOcorrenciaList
        updateOcorrenciaList();

    } else if (data.type === 'update-ocorrencia') {
        console.log('Ocorrência atualizada:', data.ocorrencia);

        // Atualiza a lista de ocorrências ou manipula a atualização específica
        updateOcorrenciaList();  // Esta função pode recarregar a lista ou apenas manipular a atualização específica
    } else if (data.type === 'delete-ocorrencia') {
        console.log('Ocorrência atualizada:', data.ocorrencia);

        // Atualiza a lista de ocorrências ou manipula a atualização específica
        updateOcorrenciaList();  // Esta função pode recarregar a lista ou apenas manipular a atualização específica
    }
};


ws.onclose = () => {
    console.log('Conexão WebSocket fechada.');
};

ws.onerror = (error) => {
    console.error('Erro na conexão WebSocket:', error);
};
