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
    const loginTrim = document.querySelector('.login').value;
    const userType = document.getElementById('user-type').value;
    const messageDiv = document.getElementById('message');

    let isFirstLogin = true;

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
            body: JSON.stringify({ loginTrim, password, userType, isFirstLogin })
        });

        const result = await response.json();

        if (result.message) {
            alert('Usuário cadastrado com sucesso!');
            // Atualizar a página ou redirecionar para a página de login
            window.location.reload(); // Recarrega a página atual
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

function togglePasswordVisibility(event) {
    const eyeIcon = event.target;
    const input = eyeIcon.previousElementSibling;
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
    eyeIcon.src = type === 'text' ? '/images/invisible-eye.webp' : '/images/eye.webp';
    eyeIcon.alt = type === 'text' ? 'Esconder Senha' : 'Mostrar Senha';
}

