const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordFeedback = document.getElementById('password-feedback');
const confirmPasswordFeedback = document.getElementById('confirm-password-feedback');



function isValidPassword(password) {
    // A senha deve ter pelo menos 6 caracteres, incluindo uma letra maiúscula, um número e um caractere especial
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return passwordPattern.test(password);
}

// Função para validar a senha
function validatePassword(passwordInput, passwordFeedback) {
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

// Função para validar a confirmação da senha
function validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback) {
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
    validatePassword(passwordInput, passwordFeedback);
    validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback);
});

confirmPasswordInput.addEventListener('input', function () {
    validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback);
});


// Função para adicionar listeners aos campos de senha e confirmação de senha da seção de edição
function addEditPasswordListeners(editSection) {

    const editPasswordInput = editSection.querySelector('.edit-password');
    const editPasswordFeedback = editSection.querySelector('.edit-password-feedback');
    const editConfirmPasswordInput = editSection.querySelector('.edit-confirmPassword');
    const editConfirmPasswordFeedback = editSection.querySelector('.edit-confirm-password-feedback');

    editPasswordInput.addEventListener('input', function () {
        validatePassword(editPasswordInput, editPasswordFeedback);
        validateConfirmPassword(editPasswordInput, editConfirmPasswordInput, editConfirmPasswordFeedback);
    });

    editConfirmPasswordInput.addEventListener('input', function () {
        validateConfirmPassword(editPasswordInput, editConfirmPasswordInput, editConfirmPasswordFeedback);
    });
}


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
            updateUserList();
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

// Função para excluir um usuário
async function deleteUser(buttonElement) {
    const clientId = buttonElement.getAttribute('data-id');
    const confirmation = confirm('Você tem certeza que deseja excluir este usuário?');

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
            alert('usuário excluído com sucesso.');
            // Remove o item da lista
            buttonElement.closest('li').remove();
        } else {
            alert('Erro ao excluir usuário: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de exclusão:', err);
        alert('Erro ao excluir usuário.');
    }
}

// Função para editar usuário
function editUser(userId) {
    const listItem = document.querySelector(`li[data-id='${userId}']`);
    const editSection = listItem.querySelector('.edit-section');
    editSection.style.display = editSection.style.display === 'none' ? 'flex' : 'none';

    // Adiciona os listeners para os campos de senha e confirmação de senha da seção de edição
    addEditPasswordListeners(editSection);
}

function renderUserList(users) {
    const resultDiv = document.querySelector('.resultado-pesquisa');
    resultDiv.innerHTML = ''; // Limpa a lista anterior

    if (users.length > 0) {
        const ul = document.createElement('ul');
        users.forEach(user => {
            const li = document.createElement('li');
            li.setAttribute('data-id', user.id_usu);
            li.innerHTML = `
                Login: ${user.login_usu}, Cargo: ${user.tipo}
                <button type="button" class="edit-button" onclick="editUser('${user.id_usu}')">
                    <img src="/images/edit.png" alt="Editar">
                </button>
                <button type="button" class="delete-button" data-id="${user.id_usu}" onclick="deleteUser(this)">
                    <img src="/images/delete.png" alt="Excluir">
                </button>
                <div class="edit-section" style="display: none;">
                    <label for="edit-login">Login:</label>
                    <input type="text" id="edit-login" class="edit-login" placeholder="Login" required value="${user.login_usu}">

                    <label for="edit-password">Senha:</label>
                    <div class="input-container">
                        <input type="password" class="edit-password" placeholder="Senha" required value="${user.senha_usu}">
                        <img class="toggle-password" src="/images/eye.webp" alt="Mostrar Senha" onclick="togglePasswordVisibility(event)">
                    </div>
                    <div class="edit-password-feedback"></div>

                    <label for="edit-confirmPassword">Confirmar Senha:</label>
                    <div class="input-container">
                        <input type="password" class="edit-confirmPassword" placeholder="Confirmar Senha" required value="${user.senha_usu}">
                        <img class="toggle-password" src="/images/eye.webp" alt="Mostrar Senha" onclick="togglePasswordVisibility(event)">
                    </div>
                    <div class="edit-confirm-password-feedback"></div>

                    <label for="edit-user-type">Tipo de Usuário:</label>
                    <select class="edit-user-type" id="edit-user-type" required>
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
}


async function updateUserList() {
    try {
        const response = await fetch('/usuario', {
            headers: {
                'Accept': 'application/json'
            }
        });
        const users = await response.json();
        renderUserList(users);
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
        renderUserList(users);
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
    }
}

function togglePasswordVisibility(event) {
    const eyeIcon = event.target;
    const input = eyeIcon.previousElementSibling;
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);

    // Alterna a imagem do olho
    if (type === 'text') {
        eyeIcon.src = '/images/invisible-eye.webp';
        eyeIcon.alt = 'Esconder Senha';
    } else {
        eyeIcon.src = '/images/eye.webp';
        eyeIcon.alt = 'Mostrar Senha';
    }
}

// Função para salvar as alterações do usuário
async function saveUser(button) {
    const listItem = button.closest('li');
    const userId = listItem.getAttribute('data-id');
    const userLogin = listItem.querySelector('.edit-login').value;
    const userPassword = listItem.querySelector('.edit-password').value;
    const userConfirmPassword = listItem.querySelector('.edit-confirmPassword').value;
    const userType = listItem.querySelector('.edit-user-type').value;

    if (userPassword !== userConfirmPassword) {
        alert('As senhas não coincidem.');
        return;
    }

    try {
        const response = await fetch(`/update-user/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                loginedit: userLogin,
                senhaedit: userPassword,
                tipoedit: userType,
                confirmarsenhaedit: userConfirmPassword
            })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Usuário atualizado com sucesso.');
            updateUserList();
        } else {
            alert('Erro ao atualizar usuário: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de atualização:', err);
        alert('Erro ao atualizar usuário.');
    }
}

