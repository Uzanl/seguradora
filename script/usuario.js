const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const passwordFeedback = document.getElementById('password-feedback');
const confirmPasswordFeedback = document.getElementById('confirm-password-feedback');

function isValidPassword(password) {
    const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
    return passwordPattern.test(password);
}

function setFeedback(element, message, color) {
    element.innerHTML = message;
    element.style.color = color;
}

function validatePassword(passwordInput, passwordFeedback) {
    const password = passwordInput.value;
    if (password === '') {
        setFeedback(passwordFeedback, '', '');
    } else if (!isValidPassword(password)) {
        setFeedback(passwordFeedback, 'A senha deve ter pelo menos 6 caracteres, incluindo uma letra maiúscula, um número e um caractere especial.', 'red');
    } else {
        setFeedback(passwordFeedback, 'Senha válida.', 'green');
    }
}

function validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback) {
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (password === '' && confirmPassword === '') {
        setFeedback(confirmPasswordFeedback, '', '');
    } else if (password !== confirmPassword) {
        setFeedback(confirmPasswordFeedback, 'As senhas não coincidem.', 'red');
    } else {
        setFeedback(confirmPasswordFeedback, 'As senhas coincidem.', 'green');
    }
}

function addInputEventListeners(passwordInput, confirmPasswordInput, passwordFeedback, confirmPasswordFeedback) {
    passwordInput.addEventListener('input', () => {
        validatePassword(passwordInput, passwordFeedback);
        validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback);
    });
    confirmPasswordInput.addEventListener('input', () => {
        validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordFeedback);
    });
}

addInputEventListeners(passwordInput, confirmPasswordInput, passwordFeedback, confirmPasswordFeedback);

function addEditPasswordListeners(editSection) {
    const editPasswordInput = editSection.querySelector('.edit-password');
    const editPasswordFeedback = editSection.querySelector('.edit-password-feedback');
    const editConfirmPasswordInput = editSection.querySelector('.edit-confirmPassword');
    const editConfirmPasswordFeedback = editSection.querySelector('.edit-confirm-password-feedback');

    addInputEventListeners(editPasswordInput, editConfirmPasswordInput, editPasswordFeedback, editConfirmPasswordFeedback);
}

async function registerUser(event) {
    event.preventDefault();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const login = document.querySelector('.login').value;
    const loginTrim =  login.trimEnd();
    const userType = document.getElementById('user-type').value;
    const messageDiv = document.getElementById('message');

    if (!isValidPassword(password)) {
        setFeedback(passwordFeedback, 'A senha deve ter pelo menos 6 caracteres, incluindo uma letra maiúscula, um número e um caractere especial.', 'red');
        return;
    }

    if (password !== confirmPassword) {
        setFeedback(confirmPasswordFeedback, 'As senhas não coincidem.', 'red');
        return;
    }

    try {
        const response = await fetch('/insert-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ loginTrim, password, userType })
        });

        const result = await response.json();

        if (result.message) {
            alert('Usuário cadastrado com sucesso!');
            updateUserList();
            document.getElementById('user-form').reset();
            setFeedback(passwordFeedback, '', '');
            setFeedback(confirmPasswordFeedback, '', '');
        } else {
            setFeedback(messageDiv, 'Erro ao cadastrar usuário: ' + result.error, 'error');
        }
    } catch (err) {
        console.error('Erro ao enviar o formulário:', err);
    }
}

document.getElementById('user-form').addEventListener('submit', registerUser);

function validateInput(input) {
    input.value = input.value.replace(/[^A-Za-z\s]/g, '');
}

async function deleteUser(buttonElement) {
    const clientId = buttonElement.getAttribute('data-id');
    if (!confirm('Você tem certeza que deseja excluir este usuário?')) return;

    try {
        const response = await fetch(`/delete-user/${clientId}`, { method: 'DELETE' });
        const result = await response.json();

        if (response.ok) {
            alert('Usuário excluído com sucesso.');
            buttonElement.closest('li').remove();
        } else {
            alert('Erro ao excluir usuário: ' + result.error);
        }
    } catch (err) {
        console.error('Erro ao enviar a solicitação de exclusão:', err);
        alert('Erro ao excluir usuário.');
    }
}

function editUser(userId) {
    const listItem = document.querySelector(`li[data-id='${userId}']`);
    const editSection = listItem.querySelector('.edit-section');
    editSection.style.display = editSection.style.display === 'none' ? 'flex' : 'none';
    addEditPasswordListeners(editSection);
}

function renderUserList(users) {
    const resultDiv = document.querySelector('.resultado-pesquisa');
    resultDiv.innerHTML = '';

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
                    <input type="text" class="login" placeholder="Login" required value="${user.login_usu}">

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
                        <option value="Administrador" ${user.tipo === 'Administrador' ? 'selected' : ''}>Administrador</option>
                        <option value="Funcionário" ${user.tipo === 'Funcionário' ? 'selected' : ''}>Funcionário</option>
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
        const response = await fetch('/usuario', { headers: { 'Accept': 'application/json' } });
        const users = await response.json();
        renderUserList(users);
    } catch (err) {
        console.error('Erro ao atualizar a lista de usuários:', err);
    }
}

document.getElementById('search-name').addEventListener('input', searchUsers);
document.getElementById('search-user-type').addEventListener('input', searchUsers);

async function searchUsers() {
    const login = document.getElementById('search-name').value;
    const tipo = document.getElementById('search-user-type').value;

    try {
        const response = await fetch(`/search-user?login=${encodeURIComponent(login)}&tipo=${encodeURIComponent(tipo)}`);
        if (!response.ok) throw new Error('Erro ao buscar usuários');
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
    eyeIcon.src = type === 'text' ? '/images/invisible-eye.webp' : '/images/eye.webp';
    eyeIcon.alt = type === 'text' ? 'Esconder Senha' : 'Mostrar Senha';
}

async function saveUser(button) {
    const listItem = button.closest('li');
    const userId = listItem.getAttribute('data-id');
    const userLogin = listItem.querySelector('.login').value;
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