$(document).ready(function () {
    $('#client-cnpj').mask('00.000.000/0000-00');
    $('#search-cnpj').mask('00.000.000/0000-00');
    $('.edit-client-cnpj').mask('00.000.000/0000-00');
});

function removeMask(cnpj) {
    return cnpj.replace(/\D/g, ''); // Remove todos os caracteres não numéricos
}

document.getElementById('client-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    // Limpa a mensagem anterior
    document.getElementById('message').textContent = '';

    const nome = document.getElementById('client-name').value;
    const cnpj = document.getElementById('client-cnpj').value;
    const cleanedCnpj = removeMask(cnpj);
    const messageDiv = document.getElementById('message');

    // Função de validação do nome do cliente
    function isValidName(name) {
        // Permite letras, números, espaços e caracteres especiais comuns em português
        const namePattern = /^[A-Za-z0-9\sçÇáàãâéèêíìîóòõôú'-]+$/;
        return namePattern.test(name);
    }

    // Verifica se o nome é válido
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
            body: JSON.stringify({
                nome: nome,
                cnpj: cleanedCnpj
            })
        });

        const result = await response.json();
        if (response.ok) {
            alert('Cliente cadastrado com sucesso');
            document.getElementById('client-form').reset(); // Limpa os campos do formulário
            // Atualiza a lista de clientes
            updateClientList();
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

async function updateClientList() {
    try {
        const response = await fetch('/cliente', {
            headers: {
                'Accept': 'application/json'
            }
        });
        const clients = await response.json();

        const resultDiv = document.querySelector('.resultado-pesquisa');
        resultDiv.innerHTML = ''; // Limpa a lista anterior

        if (clients.length > 0) {
            const ul = document.createElement('ul');
            clients.forEach(client => {
                const li = document.createElement('li');
                li.setAttribute('data-id', client.id_cliente);
                li.innerHTML = `
                    Nome: ${client.nome}, CNPJ: ${formatCNPJ(client.cnpj)}
                    <button type="button" class="edit-button" onclick="editClient(${client.id_cliente})">
                        <img src="/images/edit.png" alt="Editar">
                    </button>
                    <button type="button" class="delete-button" data-id="${client.id_cliente}" onclick="deleteClient(this)">
                        <img src="/images/delete.png" alt="Excluir">
                    </button>
                    <div class="edit-section" style="display: none;">
                        <label for="edit-client-name">Nome do Cliente:</label>
                        <input type="text" class="edit-client-name" name="nomeedit" placeholder="Digite o nome do cliente" value="${client.nome}" required>
                        <label for="edit-client-cnpj">CNPJ:</label>
                        <input type="text" class="edit-client-cnpj" name="cnpjedit" placeholder="Digite o CNPJ do cliente" value="${client.cnpj}" required>
                        <button type="button" onclick="saveClient(this)">Salvar</button>
                    </div>
                `;
                ul.appendChild(li);
            });
            resultDiv.appendChild(ul);
            // Reaplicar máscara após atualizar a lista
            $('.edit-client-cnpj').mask('00.000.000/0000-00');
        } else {
            resultDiv.innerHTML = '<p>Nenhum cliente encontrado.</p>';
        }
    } catch (err) {
        console.error('Erro ao atualizar a lista de clientes:', err);
    }
}



// Função para excluir um cliente
async function deleteClient(buttonElement) {
    const clientId = buttonElement.getAttribute('data-id');
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
            buttonElement.closest('li').remove();
        } else {
            alert('Erro ao excluir cliente: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de exclusão:', err);
        alert('Erro ao excluir cliente.');
    }
}

async function searchClients() {
    const nome = document.getElementById('search-name').value;
    const cnpj = document.getElementById('search-cnpj').value;

    try {
        const response = await fetch(`/search-client?nome=${encodeURIComponent(nome)}&cnpj=${encodeURIComponent(cnpj)}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar clientes');
        }

        const clients = await response.json();
        const clientList = document.querySelector('.resultado-pesquisa');
        clientList.innerHTML = '';

        if (clients.length > 0) {
            const ul = document.createElement('ul');
            clients.forEach(client => {
                const li = document.createElement('li');
                li.setAttribute('data-id', client.id_cliente);
                li.innerHTML = `
                    Nome: ${client.nome}, CNPJ: ${formatCNPJ(client.cnpj)}
                    <button type="button" class="edit-button" onclick="editClient(${client.id_cliente})">
                        <img src="/images/edit.png" alt="Editar">
                    </button>
                    <button type="button" class="delete-button" data-id="${client.id_cliente}" onclick="deleteClient(this)">
                        <img src="/images/delete.png" alt="Excluir">
                    </button>
                    <div class="edit-section" style="display: none;">
                        <label for="edit-client-name">Nome do Cliente:</label>
                        <input type="text" class="edit-client-name" name="nomeedit" placeholder="Digite o nome do cliente" value="${client.nome}" required>
                        <label for="edit-client-cnpj">CNPJ:</label>
                        <input type="text" class="edit-client-cnpj" name="cnpjedit" placeholder="Digite o CNPJ do cliente" value="${client.cnpj}" required>
                        <button type="button" onclick="saveClient(this)">Salvar</button>
                    </div>
                `;
                ul.appendChild(li);
            });
            clientList.appendChild(ul);
            // Reaplicar máscara após atualizar a lista
            $('.edit-client-cnpj').mask('00.000.000/0000-00');
        } else {
            clientList.innerHTML = '<p>Nenhum cliente encontrado.</p>';
        }
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
    }
}


// Função para alternar a exibição da seção de edição
function editClient(clientId) {
    // Encontra o item da lista e a seção de edição correspondente
    const listItem = document.querySelector(`li[data-id="${clientId}"]`);
    const editSection = listItem.querySelector('.edit-section');

    // Alterna o display entre flex e none
    if (editSection.style.display === 'none' || editSection.style.display === '') {
        editSection.style.display = 'flex';
    } else {
        editSection.style.display = 'none';
    }
}

// Adicione event listeners para os campos de pesquisa
document.getElementById('search-name').addEventListener('input', searchClients);
document.getElementById('search-cnpj').addEventListener('input', searchClients);

// Função para salvar as alterações do cliente
async function saveClient(button) {
    const listItem = button.closest('li');
    const clientId = listItem.getAttribute('data-id');
    const clientName = listItem.querySelector('.edit-client-name').value;
    const clientCnpj = listItem.querySelector('.edit-client-cnpj').value;

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
            //listItem.querySelector('.client-name').textContent = clientName;
            //listItem.querySelector('.client-cnpj').textContent = clientCnpj;
            // editClient(clientId); // Oculta a seção de edição após salvar
        } else {
            alert('Erro ao atualizar cliente: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de atualização:', err);
        alert('Erro ao atualizar cliente.');
    }
}

function formatCNPJ(cnpj) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

