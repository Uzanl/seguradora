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
//const { jsPDF } = require('jspdf');
const bodyParser = require('body-parser');
require('jspdf-autotable');
const generatePdf = require('./generatePdf');
const multer = require('multer');
//const { Console, log } = require('console');
const upload = multer();
const WebSocket = require('ws');


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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
app.use('/script', express.static(path.join(__dirname, 'script')));

// Create a connection to the MySQL database
const pool = mysql.createPool(dbConfig);

// Connect to the database
pool.getConnection((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database!');
});

app.set('view engine', 'ejs');

app.get('/ocorrencia', asyncHandler(async (req, res, next) => {
   
    if (req.session.userId) {
        try {
            const userLoggedIn = true;
            const query = promisify(pool.query).bind(pool);
            const userid = req.session.userId;

            const offset = parseInt(req.query.offset) || 0;
            const limit = 100;

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
                    CASE 
                        WHEN ocorrencia.status = 'Não Resolvido' THEN 1
                        WHEN ocorrencia.status = 'Pendente' THEN 2
                        WHEN ocorrencia.status = 'Resolvido' THEN 3
                        ELSE 4
                    END,
                    ocorrencia.data DESC,
                    ocorrencia.id_ocorrencia DESC
                LIMIT ?, ?;
            `;

            // Consulta para buscar todos os clientes
            const clientesQuery = 'SELECT id_cliente, nome FROM cliente';

            // Consulta para buscar todos os usuários
            const usuariosQuery = 'SELECT id_usu, login_usu FROM usuario';

            // Executar as consultas necessárias para renderizar a página
            const [ocorrencias, clients, usuarios] = await Promise.all([
                query(ocorrenciasQuery, [offset, limit]),
                query(clientesQuery),
                query(usuariosQuery)
            ]);

      

            const isAdmin = req.session.userType === 'Administrador';
            console.log(req.session.userType);

            // Verifica se a solicitação é para JSON (feita via fetch)
            if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                res.json({ ocorrencias, clients, usuarios, isAdmin }); // Retorna os dados como JSON
            } else {
                res.render('ocorrencia.ejs', { ocorrencias, clients, usuarios, isAdmin, userLoggedIn }); // Renderiza a página com os dados
            }

            // Inicia a medição do tempo para gerar o PDF
            console.time('PDF Generation Time');

            // Executa a consulta allOcorrenciasQuery e gera o PDF após a resposta ser enviada
            const allOcorrenciasQuery = `
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
                    CASE 
                        WHEN ocorrencia.status = 'Não Resolvido' THEN 1
                        WHEN ocorrencia.status = 'Pendente' THEN 2
                        WHEN ocorrencia.status = 'Resolvido' THEN 3
                        ELSE 4
                    END,
                    ocorrencia.data DESC,
                    ocorrencia.id_ocorrencia DESC;
            `;

            const allOcorrencias = await query(allOcorrenciasQuery);

            const pdfData = {
                headers: ['ID', 'Placa Veículo', 'Placa Carreta', 'Cliente', 'Motorista', 'Descrição', 'Status', 'Data', 'Hora', 'Usuário'],
                rows: allOcorrencias.map(row => [
                    row.id_ocorrencia,
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

            generatePdf(pdfData, userid)
                .then(message => console.log(message))
                .catch(err => console.error('Erro ao gerar PDF:', err));

            // Finaliza a medição do tempo e exibe no console
            console.timeEnd('PDF Generation Time');


        } catch (err) {
            console.error('Erro ao buscar ocorrências:', err);
            next(err); // Passa o erro para o middleware de tratamento de erros
        }
    } else {
        res.redirect('login');
    }
}));

app.get('/cliente', asyncHandler(async (req, res, next) => {
    if (req.session.userId && req.session.userType === "Administrador") {
        try {
            const isAdmin = true;
            const userLoggedIn = true
            const query = promisify(pool.query).bind(pool);
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
                res.render('cliente.ejs', { clients, userLoggedIn, isAdmin }); // Renderiza a página com os dados
            }
        } catch (err) {
            console.error('Erro ao buscar clientes:', err);
            next(err); // Passa o erro para o middleware de tratamento de erros
        }
    } else {
        res.redirect('/ocorrencia')
    }

}));

// Função para formatar o CNPJ
function formatCNPJ(cnpj) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

app.get('/usuario', asyncHandler(async (req, res, next) => {
    if (req.session.userId && req.session.userType === "Administrador") {
        try {
            const isAdmin = true;
            const userLoggedIn = true;
            const query = promisify(pool.query).bind(pool);
            const selectQuery = 'SELECT id_usu, login_usu, senha_usu, tipo FROM usuario ORDER BY id_usu DESC LIMIT 50';
            const users = await query(selectQuery);

            // Verifica se a solicitação é para JSON (feita via fetch)
            if (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) {
                res.json(users); // Retorna os dados como JSON
            } else {

                res.render('usuario.ejs', { users, userLoggedIn, isAdmin }); // Renderiza a página com os dados
            }
        } catch (err) {
            console.error('Erro ao buscar usuários:', err);
            next(err); // Passa o erro para o middleware de tratamento de erros
        }
    } else {
        res.redirect('/ocorrencia')
    }

}));

app.get('/login', asyncHandler(async (req, res, next) => {
    try {
        const query = promisify(pool.query).bind(pool);

        // Verifica se existe pelo menos um usuário registrado
        const userExistsQuery = 'SELECT EXISTS(SELECT 1 FROM usuario) AS userExists';
        const result = await query(userExistsQuery);

        // Se existir pelo menos um usuário, renderiza a página de login
        if (result[0].userExists) {
            res.render('login.ejs');
        } else {
            // Caso contrário, redireciona para a página de primeiro login
            res.render('primeirologin.ejs');
        }
    } catch (err) {
        console.error('Erro ao verificar usuários:', err);
        next(err); // Passa o erro para o middleware de tratamento de erros
    }
}));

app.get('/', asyncHandler(async (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/ocorrencia')
    } else {
        res.redirect('/login')
    }
}));

app.delete('/delete-client/:id', async (req, res) => {

    if (req.session.userId && req.session.userType === "Administrador") {
        const clientId = req.params.id;

        try {
            // Conectar ao banco de dados e executar a consulta
            const query = promisify(pool.query).bind(pool);
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
    }
});

app.delete('/delete-ocorrencia/:id', async (req, res) => {
    if (req.session.userId && req.session.userType === "Administrador") {
        const ocorrenciaId = req.params.id;

        try {
            const query = promisify(pool.query).bind(pool);
            const deleteQuery = 'DELETE FROM ocorrencia WHERE id_ocorrencia = ?';
            const result = await query(deleteQuery, [ocorrenciaId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Ocorrência não encontrada.' });
            }

            // Enviar a exclusão da ocorrência para todos os clientes conectados
            broadcastDeleteOcorrencia(ocorrenciaId);

            res.status(200).json({ message: 'Ocorrência excluída com sucesso.' });
        } catch (err) {
            console.error('Erro ao excluir ocorrência:', err);
            res.status(500).json({ error: 'Erro ao excluir ocorrência.' });
        }
    }
});

app.put('/update-ocorrencia/:id', upload.none(), asyncHandler(async (req, res) => {

    if (req.session.userId) {
        const ocorrenciaId = req.params.id;
        const {
            placaveiculoedit,
            placacarretaedit,
            idclienteedit,
            motoristaedit,
            descricaoedit,
            statusedit,
            dataocorrenciaedit, // Data e Hora combinados
            horaocorrenciaedit, // Hora separada
            idusuarioedit
        } = req.body;

        // Supomos que o ID do usuário é enviado no corpo ou nos headers
        const userId = req.body.userId; // Ajuste conforme a sua implementação



        // Verifica se o usuário é admin
        const isAdmin = req.session.userType === "Administrador" // Função fictícia para verificar se o usuário é admin

        // Verifica quais campos são obrigatórios com base no tipo de usuário
        const missingFields = [];
        if (isAdmin) {
            if (!placaveiculoedit) missingFields.push('Placa do Veículo');
            if (!placacarretaedit) missingFields.push('Placa da Carreta');
            if (!idclienteedit) missingFields.push('ID do Cliente');
            if (!motoristaedit) missingFields.push('Motorista');
            if (!descricaoedit) missingFields.push('Descrição');
            if (!statusedit) missingFields.push('Status');
            if (!dataocorrenciaedit) missingFields.push('Data'); // Data e Hora combinados
            if (!horaocorrenciaedit) missingFields.push('Hora'); // Hora separada
            if (!idusuarioedit) missingFields.push('ID do Usuário');
        } else {
            if (!statusedit) missingFields.push('Status');
        }

        if (missingFields.length > 0) {
            const errorMessage = `Os seguintes campos devem ser preenchidos: ${missingFields.join(', ')}`;
            return res.status(400).json({ error: errorMessage });
        }

        try {
            const query = promisify(pool.query).bind(pool);

            // Combina a data e a hora no campo data
            const dataHora = `${dataocorrenciaedit} ${horaocorrenciaedit}`;

            // Atualiza a consulta SQL com base no tipo de usuário
            let updateQuery;
            let queryParams;

            if (isAdmin) {
                updateQuery = `
                    UPDATE ocorrencia
                    SET placa_veiculo = ?, placa_carreta = ?, id_cliente = ?, motorista = ?, descricao = ?, status = ?, data = ?, id_usuario = ?
                    WHERE id_ocorrencia = ?
                `;
                queryParams = [
                    placaveiculoedit,
                    placacarretaedit,
                    idclienteedit,
                    motoristaedit,
                    descricaoedit,
                    statusedit,
                    dataHora, // Data e Hora combinados
                    idusuarioedit,
                    ocorrenciaId
                ];
            } else {
                updateQuery = `
                    UPDATE ocorrencia
                    SET status = ?
                    WHERE id_ocorrencia = ?
                `;
                queryParams = [statusedit, ocorrenciaId];
            }

            const result = await query(updateQuery, queryParams);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Ocorrência não encontrada.' });
            }

            // Se a atualização foi bem-sucedida, enviar a ocorrência atualizada via WebSocket
            const updatedOcorrencia = {
                id: ocorrenciaId,
                placa_veiculo: placaveiculoedit,
                placa_carreta: placacarretaedit,
                id_cliente: idclienteedit,
                motorista: motoristaedit,
                descricao: descricaoedit,
                status: statusedit,
                data: dataHora,
                id_usuario: idusuarioedit
            };
            broadcastUpdatedOcorrencia(updatedOcorrencia);

            res.status(200).json({ message: 'Ocorrência atualizada com sucesso.' });
        } catch (err) {
            console.error('Erro ao atualizar ocorrência:', err);
            res.status(500).json({ error: 'Erro ao atualizar ocorrência.' });
        }
    }
}));

app.post('/insert-client', async (req, res) => {

    if (req.session.userId && req.session.userType === "Administrador") {
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
            const query = promisify(pool.query).bind(pool);
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
    }
});

app.post('/insert-ocorrencia', upload.none(), async (req, res) => {

    if (req.session.userId) {
        let { placaveiculo, placacarreta, idcliente, nomemotorista, descricao, status } = req.body;

        // Converter as placas para maiúsculas
        placaveiculo = placaveiculo.toUpperCase();
        placacarreta = placacarreta.toUpperCase();

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
            console.log("motorista");
            return res.status(400).json({ error: 'Nome do Motorista deve ter no máximo 50 caracteres.' });
        }

        const idUsuario = req.session.userId; // Temporariamente considerando o id_usuario como 1

        try {
            // Conecte-se ao banco de dados e insira a ocorrência
            const query = promisify(pool.query).bind(pool);
            const insertQuery = 'INSERT INTO ocorrencia (id_usuario, id_cliente, status, data, placa_veiculo, placa_carreta, motorista, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

            // Obter a data e hora atuais no horário de Brasília
            const dataHoraAtual = new Date();
            const offset = -3 * 60; // Horário de Brasília (GMT-3)
            const localDate = new Date(dataHoraAtual.getTime() + (offset * 60000));

            // Formatar a data e hora para YYYY-MM-DD HH:MM
            const formattedDataHora = localDate.toISOString().slice(0, 16).replace('T', ' ');

            const result = await query(insertQuery, [idUsuario, idcliente, status, formattedDataHora, placaveiculo, placacarreta, nomemotorista, descricao]);

            // Obter a ocorrência recém-inserida para enviar via WebSocket
            const ocorrenciaId = result.insertId;
            const ocorrenciaQuery = 'SELECT * FROM ocorrencia WHERE id_ocorrencia = ?';
            const [newOcorrencia] = await query(ocorrenciaQuery, [ocorrenciaId]);

            // Enviar a nova ocorrência a todos os clientes conectados
            broadcastNewOcorrencia(newOcorrencia);

            res.status(200).json({ message: 'Ocorrência cadastrada com sucesso.' });
        } catch (err) {
            console.error('Erro ao cadastrar ocorrência:', err);
            res.status(500).json({ error: `Erro ao cadastrar ocorrência: ${err.code} - ${err.sqlMessage}` });
        }
    }
});

app.get('/search-client', async (req, res) => {

    if (req.session.userId && req.session.userType === "Administrador") {
        const { nome, cnpj } = req.query;

        try {
            const query = promisify(pool.query).bind(pool);
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
    }


});

app.get('/search-user', async (req, res) => {

    if (req.session.userId && req.session.userType === "Administrador") {
        const { login, tipo } = req.query;

        try {
            const query = promisify(pool.query).bind(pool);
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
    }
});

app.get('/search-ocorrencia', upload.none(), async (req, res) => {

    if (req.session.userId) {

        let isAdmin;
        const userId = req.session.userId;


        const {
            idocorrencia,
            nomeusuario,
            placaveiculo,
            placacarreta,
            nomecliente,
            nomemotorista,
            descricao,
            status,
            datade,
            dataate,
            horade,
            horaate,
            offset = 0,
            // Adiciona suporte ao offset, com valor padrão 0
        } = req.query;

        console.log(req.query);

        if (req.session.userType === "Administrador") {
            isAdmin = true;
        }

        try {
            const query = promisify(pool.query).bind(pool);

            let searchQuery = `
    SELECT
        ocorrencia.id_ocorrencia,
        usuario.login_usu,
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
        (ocorrencia.id_ocorrencia = ? OR ? IS NULL) AND
        usuario.login_usu LIKE ? AND
        ocorrencia.placa_veiculo LIKE ? AND
        ocorrencia.placa_carreta LIKE ? AND
        cliente.nome LIKE ? AND
        ocorrencia.motorista LIKE ? AND
        ocorrencia.descricao LIKE ? AND
        ocorrencia.status LIKE ?
`;

            const queryParams = [
                idocorrencia || null,  // Aqui, se idocorrencia estiver vazio, passamos null
                idocorrencia || null,  // Para a condição OR
                `${nomeusuario || ''}%`,
                `${placaveiculo || ''}%`,
                `${placacarreta || ''}%`,
                `${nomecliente || ''}%`,
                `${nomemotorista || ''}%`,
                `${descricao || ''}%`,
                `${status || ''}%`
            ];


            // Adiciona as condições de data e hora
            if (datade && dataate) {
                searchQuery += ' AND DATE(ocorrencia.data) BETWEEN DATE(?) AND DATE(?)';
                queryParams.push(datade, dataate);
            } else if (datade) {
                searchQuery += ' AND DATE(ocorrencia.data) = DATE(?)';
                queryParams.push(datade);
            } else if (dataate) {
                searchQuery += ' AND DATE(ocorrencia.data) <= DATE(?)';
                queryParams.push(dataate);
            }

            if (horade && horaate) {
                searchQuery += ' AND TIME(ocorrencia.data) BETWEEN TIME(?) AND TIME(?)';
                queryParams.push(horade, horaate);
            } else if (horade) {
                searchQuery += ' AND TIME(ocorrencia.data) = TIME(?)';
                queryParams.push(horade);
            } else if (horaate) {
                searchQuery += ' AND TIME(ocorrencia.data) <= TIME(?)';
                queryParams.push(horaate);
            }

            // Adiciona o ORDER BY e LIMIT e OFFSET
            searchQuery += `
            ORDER BY
                CASE
                    WHEN ocorrencia.status = 'Não Resolvido' THEN 1
                    WHEN ocorrencia.status = 'Pendente' THEN 2
                    WHEN ocorrencia.status = 'Resolvido' THEN 3
                    ELSE 4
                END,
                ocorrencia.data DESC,
                ocorrencia.id_ocorrencia DESC
            LIMIT 100 OFFSET ?;
        `;
            queryParams.push(parseInt(offset, 10));

            // Executa a consulta principal

            const rows = await query(searchQuery, queryParams);

            // Incluindo o isAdmin na resposta
            res.json({
                isAdmin: isAdmin,
                ocorrencias: rows
            });

            let searchQueryPdf = `
            SELECT
                ocorrencia.id_ocorrencia,
                usuario.login_usu,
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
                (ocorrencia.id_ocorrencia = ? OR ? IS NULL) AND
                usuario.login_usu LIKE ? AND
                ocorrencia.placa_veiculo LIKE ? AND
                ocorrencia.placa_carreta LIKE ? AND
                cliente.nome LIKE ? AND
                ocorrencia.motorista LIKE ? AND
                ocorrencia.descricao LIKE ? AND
                ocorrencia.status LIKE ?
        `;


            // Reaplica as condições de data e hora na consulta do PDF
            if (datade && dataate) {
                searchQueryPdf += ' AND DATE(ocorrencia.data) BETWEEN DATE(?) AND DATE(?)';
            } else if (datade) {
                searchQueryPdf += ' AND DATE(ocorrencia.data) = DATE(?)';
            } else if (dataate) {
                searchQueryPdf += ' AND DATE(ocorrencia.data) <= DATE(?)';
            }

            if (horade || horaate) {
                searchQueryPdf += ' AND TIME(ocorrencia.data) BETWEEN TIME(?) AND TIME(?)';
            } else if (horade) {
                searchQueryPdf += ' AND TIME(ocorrencia.data) = TIME(?)';
            } else if (horaate) {
                searchQueryPdf += ' AND TIME(ocorrencia.data) <= TIME(?)';
            }

            searchQueryPdf += `
            ORDER BY
                CASE
                    WHEN ocorrencia.status = 'Não Resolvido' THEN 1
                    WHEN ocorrencia.status = 'Pendente' THEN 2
                    WHEN ocorrencia.status = 'Resolvido' THEN 3
                    ELSE 4
                END,
                ocorrencia.data DESC,
                ocorrencia.id_ocorrencia DESC;
            `;

            // Executa a consulta do PDF
            const rowsPdf = await query(searchQueryPdf, queryParams);

            const pdfData = {
                headers: ['ID', 'Placa Veículo', 'Placa Carreta', 'Cliente', 'Motorista', 'Descrição', 'Status', 'Data', 'Hora', 'Usuário'],
                rows: rowsPdf.map(row => [
                    row.id_ocorrencia,
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

            generatePdf(pdfData, userId)
                .then(message => console.log(message))
                .catch(err => console.error('Erro ao gerar PDF:', err));
        } catch (err) {
            console.error('Erro ao buscar ocorrências:', err);
            res.status(500).json({ error: 'Erro ao buscar ocorrências' });
        }

    }
});

app.put('/update-client/:id', asyncHandler(async (req, res) => {

    if (req.session.userId && req.session.userType === "Administrador") {
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
            const query = promisify(pool.query).bind(pool);
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
    }
}));

app.put('/update-user/:id', asyncHandler(async (req, res) => {

    if (req.session.userId && req.session.userType === "Administrador") {
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
            const query = promisify(pool.query).bind(pool);
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
    }
}));

app.post('/insert-user', async (req, res) => {
    const { loginTrim, password, userType } = req.body;

    try {
        // Conecte-se ao banco de dados e verifique se já existe um usuário cadastrado
        const query = promisify(pool.query).bind(pool);
        const checkUserExistsQuery = 'SELECT EXISTS(SELECT 1 FROM usuario) AS userExists';
        const result = await query(checkUserExistsQuery);

        const userExists = result[0].userExists;
        let isFirstLogin = !userExists; // isFirstLogin será true se nenhum usuário existir

        if ((req.session.userId && req.session.userType === "Administrador") || isFirstLogin) {
            // Verificação dos campos obrigatórios
            const missingFields = [];

            if (!loginTrim) missingFields.push('Login');
            if (!password) missingFields.push('Senha');
            if (!userType) missingFields.push('Tipo de Usuário');

            if (missingFields.length > 0) {
                const errorMessage = `Os seguintes campos devem ser preenchidos: ${missingFields.join(', ')}`;
                return res.status(400).json({ error: errorMessage });
            }

            // Validação do login
            if (!/^[A-Za-z]{1,12}$/.test(loginTrim)) {
                return res.status(400).json({ error: 'Login deve ter no máximo 12 letras e conter apenas letras.' });
            }

            // Validação da senha
            if (password.length > 16 || !/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/.test(password)) {
                return res.status(400).json({
                    error: 'A senha deve ter no máximo 16 caracteres, incluindo uma letra maiúscula, um número e um caractere especial.'
                });
            }

            const validUserTypes = isFirstLogin ? ['Administrador'] : ['Administrador', 'Funcionário'];

            if (!validUserTypes.includes(userType)) {
                return res.status(400).json({ error: `Tipo de Usuário inválido. Deve ser ${validUserTypes.join(' ou ')}.` });
            }
            
            // Inserção do usuário no banco de dados
            try {
                const insertQuery = 'INSERT INTO usuario (login_usu, senha_usu, tipo) VALUES (?, ?, ?)';
                await query(insertQuery, [loginTrim, password, userType]);

                res.status(200).json({ message: 'Usuário cadastrado com sucesso.' });
            } catch (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Login já cadastrado no sistema.' });
                } else {
                    console.error('Erro ao cadastrar usuário:', err);
                    res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
                }
            }
        } else {
            return res.status(403).json({ error: 'Ação não permitida.' });
        }
    } catch (err) {
        console.error('Erro ao verificar se usuário existe:', err);
        res.status(500).json({ error: 'Erro ao processar a solicitação.' });
    }
});

app.delete('/delete-user/:id', async (req, res) => {

    if (req.session.userId && req.session.userType === "Administrador") {
        const userId = req.params.id;

        try {
            // Conectar ao banco de dados e executar a consulta
            const query = promisify(pool.query).bind(pool);
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
    }
});

// Rota para download do PDF
app.get('/download-pdf', (req, res) => {
    if (req.session.userId) {

        const userId = req.session.userId;
        const fileName = `ocorrencias_${userId}.pdf`;
        const pdfPath = path.join(__dirname, 'pdfs', fileName);

        // Verifique se o arquivo existe e faça o download
        fs.access(pdfPath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error('Arquivo não encontrado:', err);
                return res.status(404).json({ error: 'Arquivo não encontrado' });
            }

            res.download(pdfPath, 'ocorrencias.pdf', (err) => {
                if (err) {
                    console.error('Erro ao fazer download do arquivo:', err);
                    return res.status(500).json({ error: 'Erro ao fazer download do arquivo' });
                }

                // Exclua o arquivo após o download
                fs.unlink(pdfPath, (err) => {
                    if (err) {
                        console.error('Erro ao excluir o arquivo:', err);
                    } else {
                        console.log('Arquivo excluído com sucesso');
                    }
                });
            });
        });


    } else {
        res.status(401).json({ error: 'Usuário não autenticado' });
    }
});

app.post('/login', upload.none(), async (req, res) => {
    const { login, password } = req.body;

    // Verificação dos campos obrigatórios
    if (!login || !password) {
        return res.status(400).json({ error: 'Login e senha são obrigatórios.' });
    }

    try {
        // Conecte-se ao banco de dados e verifique o usuário (exemplo simplificado)
        const query = promisify(pool.query).bind(pool);
        const selectQuery = 'SELECT id_usu, login_usu, senha_usu, tipo FROM usuario WHERE login_usu = ?';
        const results = await query(selectQuery, [login]);

        // Verifique se o usuário existe e se a senha está correta
        if (results.length === 0 || password !== results[0].senha_usu) {
            return res.status(401).json({ error: 'Login ou senha incorretos.' });
        }

        const user = results[0];

        // Armazenar informações na sessão
        req.session.userId = user.id_usu;
        req.session.username = user.login_usu;
        req.session.userType = user.tipo;

        res.status(200).json({ message: 'Login bem-sucedido' });

    } catch (err) {
        console.error('Erro ao realizar login:', err);
        res.status(500).json({ error: 'Erro ao realizar login.' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Erro ao finalizar sessão' });
        res.redirect('/login'); // Redireciona para a página de login após o logout
    });
});


// IP e porta do WebSocket definidos no servidor
const serverIP = 'localhost';
const serverPort = 3000;

app.get('/wssconfig', (req, res) => {
    res.json({
        wsURL: `wss://${serverIP}:${serverPort}`
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

const wss = new WebSocket.Server({ server });

// Manter as conexões WebSocket ativas
let clients = [];

wss.on('connection', (ws) => {
    clients.push(ws);

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

// Função para enviar a nova ocorrência a todos os clientes conectados
const broadcastNewOcorrencia = (ocorrencia) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'new-ocorrencia', ocorrencia }));
        }
    });
};

const broadcastUpdatedOcorrencia = (ocorrencia) => {
    clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'update-ocorrencia', ocorrencia }));
        }
    });
};

// Função para enviar a exclusão da ocorrência a todos os clientes conectados
const broadcastDeleteOcorrencia = (ocorrenciaId) => {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'delete-ocorrencia', id: ocorrenciaId }));
        }
    });
};

server.listen(port, '0.0.0.0', () => {
    console.log(`Servidor HTTPS rodando em https://0.0.0.0:${port}`);
});
