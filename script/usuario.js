const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordFeedback = document.getElementById('password-feedback');
const confirmPasswordFeedback = document.getElementById('confirm-password-feedback');

function isValidPassword(password) {
    // A senha deve ter pelo menos 6 caracteres, incluindo uma letra maiúscula, um número e um caractere especial
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return passwordPattern.test(password);
}

function validatePassword() {
    const password = passwordInput.value;
    if (password === '') {
        passwordFeedback.innerHTML = '';
    } else if (!isValidPassword(password)) {
        passwordFeedback.innerHTML = 'A senha deve ter pelo menos 6 caracteres, incluindo uma letra maiúscula, um número e um caractere especial.';
        passwordFeedback.style.color = 'red';
    } else {
        passwordFeedback.innerHTML = 'Senha válida.';
        passwordFeedback.style.color = 'green';
    }
}

function validateConfirmPassword() {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (password === '' && confirmPassword === '') {
        confirmPasswordFeedback.innerHTML = '';
    } else if (password !== confirmPassword) {
        confirmPasswordFeedback.innerHTML = 'As senhas não coincidem.';
        confirmPasswordFeedback.style.color = 'red';
    } else {
        confirmPasswordFeedback.innerHTML = 'As senhas coincidem.';
        confirmPasswordFeedback.style.color = 'green';
    }
}

passwordInput.addEventListener('input', function () {
    validatePassword();
    validateConfirmPassword();
});

confirmPasswordInput.addEventListener('input', validateConfirmPassword);

async function registerUser(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const login = document.getElementById('login').value;
    const userType = document.getElementById('user-type').value;
    const messageDiv = document.getElementById('message');

    // Verifica se a senha é válida e se as senhas coincidem
    if (!isValidPassword(password)) {
        passwordFeedback.innerHTML = 'A senha deve ter pelo menos 6 caracteres, incluindo uma letra maiúscula, um número e um caractere especial.';
        passwordFeedback.style.color = 'red';
        return;
    }

    if (password !== confirmPassword) {
        confirmPasswordFeedback.innerHTML = 'As senhas não coincidem.';
        confirmPasswordFeedback.style.color = 'red';
        return;
    }

    try {
        const response = await fetch('/insert-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                login: login,
                password: password,
                userType: userType
            })
        });

        const result = await response.json();  // Recebe o resultado do servidor

        if (result.message) {
            alert('Usuário cadastrado com sucesso!');
            document.getElementById('user-form').reset();
            passwordFeedback.innerHTML = '';
            confirmPasswordFeedback.innerHTML = '';
        } else {
            messageDiv.textContent = 'Erro ao cadastrar usuário: ' + result.error;
            messageDiv.className = 'message error';
        }
    } catch (err) {
        console.error('Erro ao enviar o formulário:', err);
    }
}
// Adiciona o evento de envio ao formulário
document.getElementById('user-form').addEventListener('submit', registerUser);

function validateInput(input) {
    // Remove qualquer caractere que não seja letra ou espaço
    input.value = input.value.replace(/[^A-Za-z\s]/g, '');
}


// Função para excluir um cliente
async function deleteUser(buttonElement) {
    const clientId = buttonElement.getAttribute('data-id');
    const confirmation = confirm('Você tem certeza que deseja excluir este cliente?');

    if (!confirmation) {
        return; // Se o usuário cancelar, não faz nada
    }

    try {
        const response = await fetch(`/delete-user/${clientId}`, {
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

// Função para alternar a exibição da seção de edição
function editUser(userId) {
    // Encontra o item da lista e a seção de edição correspondente
    const listItem = document.querySelector(`li[data-id="${userId}"]`);
    const editSection = listItem.querySelector('.edit-section');

    // Alterna o display entre flex e none
    if (editSection.style.display === 'none' || editSection.style.display === '') {
        editSection.style.display = 'flex';
    } else {
        editSection.style.display = 'none';
    }
}

async function updateUserList() {
    try {
        const response = await fetch('/usuario', {
            headers: {
                'Accept': 'application/json'
            }
        });
        const users = await response.json();

        const resultDiv = document.querySelector('.resultado-pesquisa');
        resultDiv.innerHTML = ''; // Limpa a lista anterior

        if (users.length > 0) {
            const ul = document.createElement('ul');
            users.forEach(user => {
                const li = document.createElement('li');
                li.setAttribute('data-id', user.id_usu);
                li.innerHTML = `
                    Login: ${user.login_usu}, Tipo: ${user.tipo}
                    <button type="button" class="edit-button" onclick="editUser(${user.id_usuario})">
                        <img src="/images/edit.png" alt="Editar">
                    </button>
                    <button type="button" class="delete-button" data-id="${user.id_usuario}" onclick="deleteUser(this)">
                        <img src="/images/delete.png" alt="Excluir">
                    </button>
                    <div class="edit-section" style="display: none;">
                        <label for="edit-login">Login:</label>
                        <input type="text" class="edit-login" name="loginedit" placeholder="Digite o login" value="${user.login_usu}" required>
                        
                        <label for="edit-password">Senha:</label>
                        <input type="password" class="edit-password" name="senhaedit" placeholder="Digite a senha" value="${user.senha_usu}" required>
                        <span class="toggle-password" onclick="togglePasswordVisibility('edit-password')">👁️</span>

                        <label for="edit-confirmPassword">Confirmar Senha:</label>
                        <input type="password" class="edit-confirmPassword" name="confirmarsenhaedit" placeholder="Confirme a senha" value="${user.senha_usu}" required>
                        <span class="toggle-password" onclick="togglePasswordVisibility('edit-confirmPassword')">👁️</span>

                        <label for="edit-user-type">Tipo de Usuário:</label>
                        <select class="edit-user-type" name="tipoedit" required>
                            <option value="administrador" ${user.tipo === 'administrador' ? 'selected' : ''}>Administrador</option>
                            <option value="funcionario" ${user.tipo === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                        </select>

                        <button type="button" onclick="saveUser(this)">Salvar</button>
                    </div>
                `;
                ul.appendChild(li);
            });
            resultDiv.appendChild(ul);
        } else {
            resultDiv.innerHTML = '<p>Nenhum usuário encontrado.</p>';
        }
    } catch (err) {
        console.error('Erro ao atualizar a lista de usuários:', err);
    }
}

async function searchUsers() {
    const login = document.getElementById('search-login').value;
    const tipo = document.getElementById('search-tipo').value;

    try {
        const response = await fetch(`/search-user?login=${encodeURIComponent(login)}&tipo=${encodeURIComponent(tipo)}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar usuários');
        }

        const users = await response.json();
        const userList = document.querySelector('.resultado-pesquisa');
        userList.innerHTML = '';

        if (users.length > 0) {
            const ul = document.createElement('ul');
            users.forEach(user => {
                const li = document.createElement('li');
                li.setAttribute('data-id', user.id_usu);
                li.innerHTML = `
                    Login: ${user.login_usu}, Tipo: ${user.tipo}
                    <button type="button" class="edit-button" onclick="editUser(${user.id_usu})">
                        <img src="/images/edit.png" alt="Editar">
                    </button>
                    <button type="button" class="delete-button" data-id="${user.id_usu}" onclick="deleteUser(this)">
                        <img src="/images/delete.png" alt="Excluir">
                    </button>
                    <div class="edit-section" style="display: none;">
                        <label for="edit-login">Login:</label>
                        <input type="text" class="edit-login" name="loginedit" placeholder="Digite o login" value="${user.login_usu}" required>
                        
                        <label for="edit-password">Senha:</label>
                        <input type="password" class="edit-password" name="senhaedit" placeholder="Digite a senha" value="${user.senha_usu}" required>
                        <span class="toggle-password" onclick="togglePasswordVisibility('edit-password')">👁️</span>

                        <label for="edit-confirmPassword">Confirmar Senha:</label>
                        <input type="password" class="edit-confirmPassword" name="confirmarsenhaedit" placeholder="Confirme a senha" value="${user.senha_usu}" required>
                        <span class="toggle-password" onclick="togglePasswordVisibility('edit-confirmPassword')">👁️</span>

                        <label for="edit-user-type">Tipo de Usuário:</label>
                        <select class="edit-user-type" name="tipoedit" required>
                            <option value="administrador" ${user.tipo === 'administrador' ? 'selected' : ''}>Administrador</option>
                            <option value="funcionario" ${user.tipo === 'funcionario' ? 'selected' : ''}>Funcionário</option>
                        </select>

                        <button type="button" onclick="saveUser(this)">Salvar</button>
                    </div>
                `;
                ul.appendChild(li);
            });
            userList.appendChild(ul);
        } else {
            userList.innerHTML = '<p>Nenhum usuário encontrado.</p>';
        }
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
    }
}

function togglePasswordVisibility(inputClass) {
    const inputs = document.querySelectorAll(`.${inputClass}`);
    inputs.forEach(input => {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
    });
}

