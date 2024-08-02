// Aplicando a máscara de CNPJ
$('.cnpj').mask('00.000.000/0000-00');

// Função para remover a máscara do CNPJ
function removeMask(cnpj) {
    return cnpj.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
}

// Validação do nome do cliente
function isValidName(name) {
    const namePattern = /^[A-Za-z0-9\sçÇáàãâéèêíìîóòõôú'-]+$/;
    return namePattern.test(name);
}

// Função para formatação de CNPJ
function formatCNPJ(cnpj) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

// Função para atualizar a lista de clientes
async function updateClientList() {
    try {
        const response = await fetch('/cliente', {
            headers: {
                'Accept': 'application/json'
            }
        });
        const clients = await response.json();
        renderClientList(clients);
    } catch (err) {
        console.error('Erro ao atualizar a lista de clientes:', err);
    }
}

// Função para renderizar a lista de clientes
function renderClientList(clients) {
    const resultDiv = document.querySelector('.resultado-pesquisa');
    resultDiv.innerHTML = ''; // Limpa a lista anterior

    if (clients.length > 0) {
        const ul = document.createElement('ul');
        clients.forEach(client => {
            const li = document.createElement('li');
            li.setAttribute('data-id', client.id_cliente);
            li.innerHTML = `
                Nome: ${client.nome}, CNPJ: ${formatCNPJ(client.cnpj)}
                <button type="button" class="edit-button">
                    <img width="30" height="30" src="/images/edit.png" alt="Editar">
                </button>
                <button type="button" class="delete-button">
                    <img width="30" height="30" src="/images/delete.png" alt="Excluir">
                </button>
                <div class="edit-section">
                    <label for="edit-name-${client.id_cliente}">Nome do Cliente:</label>
                    <input type="text" id="edit-name-${client.id_cliente}" name="nomeedit" placeholder="Digite o nome do cliente" value="${client.nome}" required>
                    <label for="edit-cnpj-${client.id_cliente}">CNPJ:</label>
                    <input type="text" id="edit-cnpj-${client.id_cliente}" class="cnpj" name="cnpjedit" placeholder="Digite o CNPJ do cliente" value="${formatCNPJ(client.cnpj)}" required>
                    <button type="button" class="save-button">Salvar</button>
                </div>
            `;
            ul.appendChild(li);
        });
        resultDiv.appendChild(ul);
        // Reaplicar máscara após atualizar a lista
        $('.cnpj').mask('00.000.000/0000-00');

        addEventListenersToClientButtons();
    } else {
        resultDiv.innerHTML = '<p>Nenhum cliente encontrado.</p>';
    }
}

// Função para excluir um cliente
async function deleteClient(clientId) {
    const confirmation = confirm('Você tem certeza que deseja excluir este cliente?');

    if (!confirmation) {
        return; // Se o usuário cancelar, não faz nada
    }

    try {
        const response = await fetch(`/delete-client/${clientId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            alert('Cliente excluído com sucesso.');
            // Remove o item da lista
            document.querySelector(`li[data-id="${clientId}"]`).remove();
        } else {
            alert('Erro ao excluir cliente: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de exclusão:', err);
        alert('Erro ao excluir cliente.');
    }
}

// Função para alternar a exibição da seção de edição
function editClient(clientId) {
    const listItem = document.querySelector(`li[data-id="${clientId}"]`);
    const editSection = listItem.querySelector('.edit-section');
    editSection.style.display = (editSection.style.display === 'none' || editSection.style.display === '') ? 'flex' : 'none';
}

// Função para salvar as alterações do cliente
async function saveClient(clientId) {
    const clientName = document.getElementById(`edit-name-${clientId}`).value;
    const clientCnpj = document.getElementById(`edit-cnpj-${clientId}`).value;
    try {
        const response = await fetch(`/update-client/${clientId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nomeedit: clientName,
                cnpjedit: clientCnpj
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Cliente atualizado com sucesso.');
            updateClientList();
        } else {
            alert('Erro ao atualizar cliente: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de atualização:', err);
        alert('Erro ao atualizar cliente.');
    }
}

// Função de pesquisa de clientes
async function searchClients() {
    const nome = document.getElementById('search-name').value;
    const cnpj = document.getElementById('search-cnpj').value;

    try {
        const response = await fetch(`/search-client?nome=${encodeURIComponent(nome)}&cnpj=${encodeURIComponent(cnpj)}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar clientes');
        }

        const clients = await response.json();
        renderClientList(clients);
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
    }
}

// Event listener para envio do formulário de cliente
document.getElementById('client-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    document.getElementById('message').textContent = ''; // Limpa a mensagem anterior
    const nome = document.getElementById('client-name').value;
    const cnpj = document.getElementById('cnpj').value;
    const cleanedCnpj = removeMask(cnpj);
    const messageDiv = document.getElementById('message');

    if (!isValidName(nome)) {
        messageDiv.textContent = 'Nome do cliente contém caracteres inválidos. Apenas letras, espaços e alguns caracteres especiais são permitidos.';
        messageDiv.className = 'message error';
        return; // Impede o envio do formulário
    }

    try {
        const response = await fetch('/insert-client', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nome, cnpj: cleanedCnpj })
        });

        const result = await response.json();
        if (response.ok) {
            alert('Cliente cadastrado com sucesso');
            document.getElementById('client-form').reset(); // Limpa os campos do formulário
            updateClientList(); // Atualiza a lista de clientes
        } else {
            messageDiv.textContent = 'Erro ao cadastrar cliente: ' + result.error;
            messageDiv.className = 'message error';
        }
    } catch (err) {
        console.error('Erro ao enviar o formulário:', err);
        messageDiv.textContent = 'Erro ao enviar o formulário';
        messageDiv.className = 'message error';
    }
});



// Adiciona eventos aos campos de pesquisa dentro do formulário específico
document.getElementById('search-name').addEventListener('input', searchClients);
document.getElementById('search-cnpj').addEventListener('input', searchClients);

// Função para adicionar event listeners aos botões de editar, excluir e salvar
function addEventListenersToClientButtons() {
    document.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', () => {
            const clientId = button.closest('li').getAttribute('data-id');
            editClient(clientId);
        });
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', () => {
            const clientId = button.closest('li').getAttribute('data-id');
            deleteClient(clientId);
        });
    });

    document.querySelectorAll('.save-button').forEach(button => {
        button.addEventListener('click', () => {
            const clientId = button.closest('li').getAttribute('data-id');
            saveClient(clientId);
        });
    });
}

addEventListenersToClientButtons();


