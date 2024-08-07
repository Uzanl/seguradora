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
const { jsPDF } = require('jspdf');
const bodyParser = require('body-parser');
require('jspdf-autotable');
const generatePdf = require('./generatePdf');
const multer = require('multer');
const upload = multer();


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

// Aumentar o limite de tamanho para 200mb, por exemplo
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ limit: '200mb', extended: true }));

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

        // Consulta para buscar ocorrências
        const ocorrenciasQuery = `
            SELECT
                ocorrencia.id_ocorrencia, 
                ocorrencia.placa_veiculo,
                ocorrencia.placa_carreta,
                cliente.nome AS cliente_nome,
                ocorrencia.motorista,
                ocorrencia.descricao,
                ocorrencia.status,
                DATE_FORMAT(ocorrencia.data, '%d/%m/%Y') AS data_ocorrencia,
                DATE_FORMAT(ocorrencia.data, '%H:%i') AS hora_ocorrencia,
                usuario.login_usu AS usuario_login,
                ocorrencia.id_usuario,
                ocorrencia.id_cliente
            FROM 
                ocorrencia
            INNER JOIN 
                usuario ON ocorrencia.id_usuario = usuario.id_usu
            INNER JOIN 
                cliente ON ocorrencia.id_cliente = cliente.id_cliente
            ORDER BY 
                ocorrencia.data DESC
            LIMIT 100;
        `;

        // Consulta para buscar todos os clientes
        const clientesQuery = 'SELECT id_cliente, nome FROM cliente';

        // Consulta para buscar todos os usuários
        const usuariosQuery = 'SELECT id_usu, login_usu FROM usuario';

        // Executar as consultas em paralelo
        const [ocorrencias, clients, usuarios] = await Promise.all([
            query(ocorrenciasQuery),
            query(clientesQuery),
            query(usuariosQuery)
        ]);

        // Verifica se a solicitação é para JSON (feita via fetch)
        if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
            res.json({ ocorrencias, clients, usuarios }); // Retorna os dados como JSON
        } else {
            res.render('ocorrencia.ejs', { ocorrencias, clients, usuarios }); // Renderiza a página com os dados
        }
    } catch (err) {
        console.error('Erro ao buscar ocorrências:', err);
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

app.delete('/delete-ocorrencia/:id', async (req, res) => {
    const clientId = req.params.id;

    try {
        // Conectar ao banco de dados e executar a consulta
        const query = promisify(connection.query).bind(connection);
        const deleteQuery = 'DELETE FROM ocorrencia WHERE id_ocorrencia = ?';
        const result = await query(deleteQuery, [clientId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Ocorrência não encontrada.' });
        }

        res.status(200).json({ message: 'Ocorrência excluída com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir ocorrência:', err);
        res.status(500).json({ error: 'Erro ao excluir ocorrência.' });
    }
});

app.put('/update-ocorrencia/:id', asyncHandler(async (req, res) => {
    const ocorrenciaId = req.params.id;
    const {
        'placa-veiculo-edit': placaVeiculo,
        'placa-carreta-edit': placaCarreta,
        'id-cliente-edit': idCliente,
        'motorista-edit': motorista,
        'descricao-edit': descricao,
        'status-edit': status,
        'data-edit': data, // Data e Hora combinados
        'hora-edit': hora, // Hora separada
        'id-usuario-edit': idUsuario
    } = req.body;

    // Verificação dos campos obrigatórios
    const missingFields = [];

    if (!placaVeiculo) missingFields.push('Placa do Veículo');
    if (!placaCarreta) missingFields.push('Placa da Carreta');
    if (!idCliente) missingFields.push('ID do Cliente');
    if (!motorista) missingFields.push('Motorista');
    if (!descricao) missingFields.push('Descrição');
    if (!status) missingFields.push('Status');
    if (!data) missingFields.push('Data'); // Data e Hora combinados
    if (!hora) missingFields.push('Hora'); // Hora separada
    if (!idUsuario) missingFields.push('ID do Usuário');

    if (missingFields.length > 0) {
        const errorMessage = `Os seguintes campos devem ser preenchidos: ${missingFields.join(', ')}`;
        return res.status(400).json({ error: errorMessage });
    }

    try {
        const query = promisify(connection.query).bind(connection);

        // Combina a data e a hora no campo data
        const dataHora = `${data} ${hora}`;

        // Atualize a consulta SQL
        const updateQuery = `
            UPDATE ocorrencia
            SET placa_veiculo = ?, placa_carreta = ?, id_cliente = ?, motorista = ?, descricao = ?, status = ?, data = ?, id_usuario = ?
            WHERE id_ocorrencia = ?
        `;
        const result = await query(updateQuery, [
            placaVeiculo,
            placaCarreta,
            idCliente,
            motorista,
            descricao,
            status,
            dataHora, // Data e Hora combinados
            idUsuario,
            ocorrenciaId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Ocorrência não encontrada.' });
        }

        res.status(200).json({ message: 'Ocorrência atualizada com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar ocorrência:', err);
        res.status(500).json({ error: 'Erro ao atualizar ocorrência.' });
    }
}));

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

app.post('/insert-ocorrencia',  upload.none(), async (req, res) => {
    const { placaveiculo, placacarreta, idcliente, nomemotorista, descricao, status } = req.body;

    // Verificação dos campos obrigatórios
    const missingFields = [];

    if (!placaveiculo) missingFields.push('Placa do Veículo');
    if (!placacarreta) missingFields.push('Placa da Carreta');
    if (!idcliente) missingFields.push('ID do Cliente');
    if (!nomemotorista) missingFields.push('Nome do Motorista');
    if (!descricao) missingFields.push('Descrição');
    if (!status) missingFields.push('Status');

    if (missingFields.length > 0) {
        const errorMessage = `Os seguintes campos devem ser preenchidos: ${missingFields.join(', ')}`;
        console.log(errorMessage);
        return res.status(400).json({ error: errorMessage });
    }

    // Validação das placas (exatamente 7 caracteres, apenas letras e números)
    const placaRegex = /^[A-Za-z0-9]{7}$/;

    // Validação da Placa do Veículo
    if (!placaRegex.test(placaveiculo)) {
        console.log("placaVeiculo");
        return res.status(400).json({ error: 'Placa do Veículo inválida. A placa deve conter exatamente 7 caracteres, apenas letras e números.' });
    }

    // Validação da Placa da Carreta
    if (!placaRegex.test(placacarreta)) {
        console.log("placaCarreta");
        return res.status(400).json({ error: 'Placa da Carreta inválida. A placa deve conter exatamente 7 caracteres, apenas letras e números.' });
    }

    // Validação do nome do motorista
    if (nomemotorista.length > 50) {
        console.log("motorista")
        return res.status(400).json({ error: 'Nome do Motorista deve ter no máximo 50 caracteres.' });
    }

    const idUsuario = 3; // Temporariamente considerando o id_usuario como 1

    try {
        // Conecte-se ao banco de dados e insira a ocorrência
        const query = promisify(connection.query).bind(connection);
        const insertQuery = 'INSERT INTO ocorrencia (id_usuario, id_cliente, status, data, placa_veiculo, placa_carreta, motorista, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

        // Obter a data e hora atuais no horário de Brasília
        const dataHoraAtual = new Date();
        const offset = -3 * 60; // Horário de Brasília (GMT-3)
        const localDate = new Date(dataHoraAtual.getTime() + (offset * 60000));

        // Formatar a data e hora para YYYY-MM-DD HH:MM
        const formattedDataHora = localDate.toISOString().slice(0, 16).replace('T', ' ');

        await query(insertQuery, [idUsuario, idcliente, status, formattedDataHora, placaveiculo, placacarreta, nomemotorista, descricao]);

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

app.get('/search-ocorrencia', async (req, res) => {
    
    const {
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
    } = req.query;

    try {
        const query = promisify(connection.query).bind(connection);

        let searchQuery = `
            SELECT
                ocorrencia.id_ocorrencia,
                ocorrencia.placa_veiculo,
                ocorrencia.placa_carreta,
                cliente.nome AS cliente_nome,
                ocorrencia.motorista,
                ocorrencia.descricao,
                ocorrencia.status,
                DATE_FORMAT(ocorrencia.data, '%d/%m/%Y') AS data_ocorrencia,
                DATE_FORMAT(ocorrencia.data, '%H:%i') AS hora_ocorrencia,
                usuario.login_usu AS usuario_login,
                ocorrencia.id_usuario,
                ocorrencia.id_cliente
            FROM 
                ocorrencia
            INNER JOIN 
                usuario ON ocorrencia.id_usuario = usuario.id_usu
            INNER JOIN 
                cliente ON ocorrencia.id_cliente = cliente.id_cliente
            WHERE 
                ocorrencia.placa_veiculo LIKE ? AND
                ocorrencia.placa_carreta LIKE ? AND
                cliente.nome LIKE ? AND
                ocorrencia.motorista LIKE ? AND
                ocorrencia.descricao LIKE ? AND
                ocorrencia.status LIKE ?
        `;

        const queryParams = [
            `${placaVeiculo || ''}%`,
            `${placaCarreta || ''}%`,
            `${nomeCliente || ''}%`,
            `${nomeMotorista || ''}%`,
            `${descricao || ''}%`,
            `${status || ''}%`
        ];

        if (dataDe && dataAte) {
            searchQuery += ' AND DATE(ocorrencia.data) BETWEEN DATE(?) AND DATE(?)';
            queryParams.push(dataDe, dataAte);
        } else if (dataDe) {
            searchQuery += ' AND DATE(ocorrencia.data) = DATE(?)';
            queryParams.push(dataDe);
        } else if (dataAte) {
            searchQuery += ' AND DATE(ocorrencia.data) <= DATE(?)';
            queryParams.push(dataAte);
        }

        if (horaDe && horaAte) {
            searchQuery += ' AND TIME(ocorrencia.data) BETWEEN TIME(?) AND TIME(?)';
            queryParams.push(horaDe, horaAte);
        } else if (horaDe) {
            searchQuery += ' AND TIME(ocorrencia.data) = TIME(?)';
            queryParams.push(horaDe);
        } else if (horaAte) {
            searchQuery += ' AND TIME(ocorrencia.data) <= TIME(?)';
            queryParams.push(horaAte);
        }

        const rows = await query(searchQuery, queryParams);

        // Envie a resposta JSON com os dados ao cliente
        res.json(rows);

        // Gere o PDF em segundo plano
        const pdfData = {
            headers: ['Placa Veículo', 'Placa Carreta', 'Cliente', 'Motorista', 'Descrição', 'Status', 'Data', 'Hora', 'Usuário'],
            rows: rows.map(row => [
                row.placa_veiculo,
                row.placa_carreta,
                row.cliente_nome,
                row.motorista,
                row.descricao,
                row.status,
                row.data_ocorrencia,
                row.hora_ocorrencia,
                row.usuario_login
            ])
        };

        generatePdf(pdfData)
            .then(message => console.log(message))
            .catch(err => console.error(err));

    } catch (err) {
        console.log("caí aqui!!!")
        console.error('Erro ao buscar ocorrências:', err);
        res.status(500).json({ error: 'Erro ao buscar ocorrências' });
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

app.get('/download-pdf', (req, res) => {
    const pdfPath = path.join(__dirname, 'pdfs', 'ocorrencias.pdf');

    // Verifique se o arquivo existe e se está pronto
    fs.access(pdfPath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('Arquivo não encontrado:', err);
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        // Faça o download do arquivo
        res.download(pdfPath, 'ocorrencias.pdf', (err) => {
            if (err) {
                console.error('Erro ao fazer download do arquivo:', err);
                return res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
            }

            // Após o download, exclua o arquivo
            fs.unlink(pdfPath, (err) => {
                if (err) {
                    console.error('Erro ao excluir o arquivo:', err);
                } else {
                    console.log('Arquivo excluído com sucesso');
                }
            });
        });
    });
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