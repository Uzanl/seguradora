const express = require('express');
const compression = require('compression');
const session = require('express-session')
const path = require('path');
const https = require('https');
const fs = require('fs');
const mysql = require('mysql2');
const port = 3000;
const app = express();
const dbConfig = require('./config/db');
const cors = require('cors');
const zlib = require('zlib');
const { promisify } = require('util');

app.use(
    session({
        secret: 'key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: true } // Configuração para HTTPS
    })
);

app.use(cors());

app.use(compression({
    brotli: {
        enabled: true,
        zlib: {
            params: {
                [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
            }
        }
    }
}));

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
app.use('/script', express.static(path.join(__dirname, 'script')));

// Create a connection to the MySQL database
const connection = mysql.createConnection(dbConfig);

// Connect to the database
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database!');
});

app.set('view engine', 'ejs');


app.get('/ocorrencia', asyncHandler(async (req, res, next) => {
    try {
        const query = promisify(connection.query).bind(connection);
        const selectQuery = 'SELECT id_cliente, nome FROM cliente';
        const rows = await query(selectQuery);

        res.render('ocorrencia.ejs', { clients: rows });
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        next(err); // Passa o erro para o middleware de tratamento de erros
    }
}));

app.get('/cliente', asyncHandler(async (req, res, next) => {
    try {
        const query = promisify(connection.query).bind(connection);
        const selectQuery = 'SELECT id_cliente, nome, cnpj FROM cliente ORDER BY id_cliente DESC LIMIT 50';
        const clients = await query(selectQuery);

        // Verifica se a solicitação é para JSON (feita via fetch)
        if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            res.json(clients); // Retorna os dados como JSON
        } else {
            // Formate o CNPJ de cada cliente
            clients.forEach(client => {
                client.formattedCNPJ = formatCNPJ(client.cnpj);
            });
            res.render('cliente.ejs', { clients }); // Renderiza a página com os dados
        }
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        next(err); // Passa o erro para o middleware de tratamento de erros
    }
}));

// Função para formatar o CNPJ
function formatCNPJ(cnpj) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

app.get('/usuario', asyncHandler(async (req, res, next) => {
    try {
        const query = promisify(connection.query).bind(connection);
        const selectQuery = 'SELECT id_usu, login_usu, senha_usu, tipo FROM usuario ORDER BY id_usu DESC LIMIT 50';
        const users = await query(selectQuery);

        // Verifica se a solicitação é para JSON (feita via fetch)
        if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            res.json(users); // Retorna os dados como JSON
        } else {

            res.render('usuario.ejs', { users }); // Renderiza a página com os dados
        }
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        next(err); // Passa o erro para o middleware de tratamento de erros
    }
}));

app.get('/login', asyncHandler(async (req, res, next) => {
    res.render('login.ejs')
}));

app.delete('/delete-client/:id', async (req, res) => {
    const clientId = req.params.id;

    try {
        // Conectar ao banco de dados e executar a consulta
        const query = promisify(connection.query).bind(connection);
        const deleteQuery = 'DELETE FROM cliente WHERE id_cliente = ?';
        const result = await query(deleteQuery, [clientId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        res.status(200).json({ message: 'Cliente excluído com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir cliente:', err);
        res.status(500).json({ error: 'Erro ao excluir cliente.' });
    }
});

app.post('/insert-client', async (req, res) => {
    const { nome, cnpj } = req.body;

    // Verificação dos campos obrigatórios
    const missingFields = [];

    if (!nome) missingFields.push('Nome');
    if (!cnpj) missingFields.push('CNPJ');

    if (missingFields.length > 0) {
        const errorMessage = `Os seguintes campos devem ser preenchidos: ${missingFields.join(', ')}`;
        return res.status(400).json({ error: errorMessage });
    }

    // Limpeza e validação do CNPJ
    const cleanedCNPJ = cnpj.replace(/\D/g, '');

    if (!/^\d{14}$/.test(cleanedCNPJ)) {
        return res.status(400).json({ error: 'CNPJ deve conter 14 dígitos numéricos.' });
    }

    // Limpeza e validação do nome
    const namePattern = /^[A-Za-z0-9\sçÇáàãâéèêíìîóòõôú'-]+$/;
    if (!namePattern.test(nome)) {
        return res.status(400).json({ error: 'Nome do cliente contém caracteres inválidos. Apenas letras, espaços e alguns caracteres especiais são permitidos.' });
    }

    try {
        // Conecte-se ao banco de dados e insira o cliente (exemplo simplificado)
        const query = promisify(connection.query).bind(connection);
        const insertQuery = 'INSERT INTO cliente (nome, cnpj) VALUES (?, ?)';
        await query(insertQuery, [nome, cleanedCNPJ]);

        res.status(200).json({ message: 'Cliente cadastrado com sucesso.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            // Trata o erro de entrada duplicada
            return res.status(400).json({ error: 'CNPJ já cadastrado no sistema.' });
        } else {
            console.error('Erro ao cadastrar cliente:', err);
            res.status(500).json({ error: 'Erro ao cadastrar cliente.' });
        }
    }
});

app.post('/insert-ocorrencia', async (req, res) => {
    console.log("cheguei aqui!!!!");
    console.log('Body da requisição:', req.body);
    const { placaVeiculo, placaCarreta, idCliente, nomeMotorista, descricao, status } = req.body;

    // Verificação dos campos obrigatórios
    const missingFields = [];

    if (!placaVeiculo) missingFields.push('Placa do Veículo');
    if (!placaCarreta) missingFields.push('Placa da Carreta');
    if (!idCliente) missingFields.push('ID do Cliente');
    if (!nomeMotorista) missingFields.push('Nome do Motorista');
    if (!descricao) missingFields.push('Descrição');
    if (!status) missingFields.push('Status');

    if (missingFields.length > 0) {
        console.log("algum campo vazio")
        const errorMessage = `Os seguintes campos devem ser preenchidos: ${missingFields.join(', ')}`;
        return res.status(400).json({ error: errorMessage });
    }

    // Validação das placas (exemplo de regex para placas no formato Mercosul e antigo)
   /* const placaRegex = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/; // Adapte conforme necessário
    if (!placaRegex.test(placaVeiculo)) {
        console.log("placa")
        return res.status(400).json({ error: 'Placa do Veículo inválida.' });
    }
    if (!placaRegex.test(placaCarreta)) {
        console.log("placa")
        return res.status(400).json({ error: 'Placa da Carreta inválida.' });
    }*/

    // Validação do nome do motorista
    if (nomeMotorista.length > 50) {
        console.log("motorista")
        return res.status(400).json({ error: 'Nome do Motorista deve ter no máximo 50 caracteres.' });
    }

    const idUsuario = 1; // Temporariamente considerando o id_usuario como 1

    try {
        // Conecte-se ao banco de dados e insira a ocorrência
        const query = promisify(connection.query).bind(connection);
        const insertQuery = 'INSERT INTO ocorrencia (id_usuario, id_cliente, status, data, placa_veiculo, placa_carreta, motorista, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        // Obter a data e hora atuais
        const dataHoraAtual = new Date().toISOString().slice(0, 19).replace('T', ' ');

        console.log(dataHoraAtual);

        await query(insertQuery, [idUsuario, idCliente, status, dataHoraAtual, placaVeiculo, placaCarreta, nomeMotorista, descricao]);

        res.status(200).json({ message: 'Ocorrência cadastrada com sucesso.' });
    } catch (err) {
        console.error('Erro ao cadastrar ocorrência:', err);
        res.status(500).json({ error: `Erro ao cadastrar ocorrência: ${err.code} - ${err.sqlMessage}` });
    }
});


app.get('/search-client', async (req, res) => {
    const { nome, cnpj } = req.query;

    try {
        const query = promisify(connection.query).bind(connection);
        const searchQuery = `
            SELECT id_cliente, nome, cnpj 
            FROM cliente 
            WHERE nome LIKE ? AND cnpj LIKE ?
            ORDER BY id_cliente DESC
            LIMIT 50
        `;
        const clients = await query(searchQuery, [`${nome}%`, `${cnpj}%`]);

        res.json(clients);
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
});

app.get('/search-user', async (req, res) => {
    const { login, tipo } = req.query;

    try {
        const query = promisify(connection.query).bind(connection);
        const searchQuery = `
            SELECT id_usu, login_usu, tipo, senha_usu
            FROM usuario 
            WHERE login_usu LIKE ? AND tipo LIKE ?
            ORDER BY id_usu DESC
            LIMIT 50
        `;
        const users = await query(searchQuery, [`${login}%`, `${tipo}%`]);

        res.json(users);
    } catch (err) {
        console.error('Erro ao buscar usuários:', err);
        res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
});

app.put('/update-client/:id', asyncHandler(async (req, res) => {
    const clientId = req.params.id;
    const { nomeedit, cnpjedit } = req.body;

    // Limpeza e validação do CNPJ
    const cleanedCNPJ = cnpjedit.replace(/\D/g, '');

    if (!/^\d{14}$/.test(cleanedCNPJ)) {
        return res.status(400).json({ error: 'CNPJ deve conter 14 dígitos numéricos.' });
    }

    // Limpeza e validação do nome
    const namePattern = /^[A-Za-z\s'-]+$/;
    if (!namePattern.test(nomeedit)) {
        return res.status(400).json({ error: 'Nome do cliente contém caracteres inválidos. Apenas letras, espaços e alguns caracteres especiais são permitidos.' });
    }

    try {
        const query = promisify(connection.query).bind(connection);
        const updateQuery = 'UPDATE cliente SET nome = ?, cnpj = ? WHERE id_cliente = ?';
        const result = await query(updateQuery, [nomeedit, cleanedCNPJ, clientId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado.' });
        }

        res.status(200).json({ message: 'Cliente atualizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar cliente:', err);
        res.status(500).json({ error: 'Erro ao atualizar cliente.' });
    }
}));

app.put('/update-user/:id', asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { loginedit, senhaedit, confirmarsenhaedit, tipoedit } = req.body;

    // Verificação dos campos obrigatórios
    const missingFields = [];

    if (!loginedit) missingFields.push('Login');
    if (!senhaedit) missingFields.push('Senha');
    if (!confirmarsenhaedit) missingFields.push('Confirmar Senha');
    if (!tipoedit) missingFields.push('Tipo de Usuário');

    if (missingFields.length > 0) {
        const errorMessage = `Os seguintes campos devem ser preenchidos: ${missingFields.join(', ')}`;
        return res.status(400).json({ error: errorMessage });
    }

    // Validação da senha
    if (senhaedit !== confirmarsenhaedit) {
        return res.status(400).json({ error: 'Senhas não coincidem.' });
    }

    // Validação do tipo de usuário
    const validUserTypes = ['Administrador', 'Funcionário'];
    if (!validUserTypes.includes(tipoedit)) {
        return res.status(400).json({ error: 'Tipo de usuário inválido.' });
    }

    try {
        const query = promisify(connection.query).bind(connection);
        const updateQuery = `
            UPDATE usuario 
            SET login_usu = ?, senha_usu = ?, tipo = ? 
            WHERE id_usu = ?
        `;
        const result = await query(updateQuery, [loginedit, senhaedit, tipoedit, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar usuário:', err);
        res.status(500).json({ error: 'Erro ao atualizar usuário.' });
    }
}));

app.post('/insert-user', async (req, res) => {
    const { login, password, userType } = req.body;

    // Verificação dos campos obrigatórios
    const missingFields = [];

    if (!login) missingFields.push('Login');
    if (!password) missingFields.push('Senha');
    if (!userType) missingFields.push('Tipo de Usuário');

    if (missingFields.length > 0) {
        const errorMessage = `Os seguintes campos devem ser preenchidos: ${missingFields.join(', ')}`;
        return res.status(400).json({ error: errorMessage });
    }

    // Validação do login
    if (!/^[A-Za-z]{1,12}$/.test(login)) {
        return res.status(400).json({ error: 'Login deve ter no máximo 12 letras e conter apenas letras.' });
    }

    // Validação da senha
    if (password.length > 16 || !/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/.test(password)) {
        return res.status(400).json({
            error: 'A senha deve ter no máximo 16 caracteres, incluindo uma letra maiúscula, um número e um caractere especial.'
        });
    }

    try {
        // Conecte-se ao banco de dados e insira o usuário
        const query = promisify(connection.query).bind(connection);
        const insertQuery = 'INSERT INTO usuario (login_usu, senha_usu, tipo) VALUES (?, ?, ?)';
        await query(insertQuery, [login, password, userType]);

        res.status(200).json({ message: 'Usuário cadastrado com sucesso.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.log("Cheguei aqui!!!")
            // Trata o erro de entrada duplicada
            return res.status(400).json({ error: 'Login já cadastrado no sistema.' });
        } else {
            console.error('Erro ao cadastrar usuário:', err);
            res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
        }
    }
});

app.delete('/delete-user/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        // Conectar ao banco de dados e executar a consulta
        const query = promisify(connection.query).bind(connection);
        const deleteQuery = 'DELETE FROM usuario WHERE id_usu = ?';
        const result = await query(deleteQuery, [userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.status(200).json({ message: 'Usuário excluído com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        res.status(500).json({ error: 'Erro ao excluir usuário.' });
    }
});

// Middleware de Tratamento de Erros Global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno no servidor' });
});

// Middleware para capturar 404 - Página não encontrada
app.use((req, res, next) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

const options = {
    key: fs.readFileSync('./config/server.key', 'utf-8'), // Caminho para sua chave privada
    cert: fs.readFileSync('./config/server.cert', 'utf-8') // Caminho para seu certificado SSL
};

const server = https.createServer(options, app);

server.listen(port, () => {
    console.log(`Servidor HTTPS rodando em https://localhost:${port}/ocorrencia`);
});