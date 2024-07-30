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
    res.render('ocorrencia.ejs')
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
            res.render('cliente.ejs', { clients }); // Renderiza a página com os dados
        }
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        next(err); // Passa o erro para o middleware de tratamento de erros
    }
}));


app.get('/usuario', asyncHandler(async (req, res, next) => {
    res.render('usuario.ejs')
}));

app.get('/login', asyncHandler(async (req, res, next) => {
    res.render('login.ejs')
}));

app.delete('/delete-client/:id', (req, res) => {
    const clientId = req.params.id;

    // Conectar ao banco de dados e executar a consulta
    const query = promisify(connection.query).bind(connection);
    const deleteQuery = 'DELETE FROM cliente WHERE id_cliente = ?';

    query(deleteQuery, [clientId])
        .then(result => {
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Cliente não encontrado.' });
            }

            res.status(200).json({ message: 'Cliente excluído com sucesso.' });
        })
        .catch(err => {
            console.error('Erro ao excluir cliente:', err);
            res.status(500).json({ error: 'Erro ao excluir cliente.' });
        });
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
    const namePattern = /^[A-Za-z\s'-]+$/;
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
        const clients = await query(searchQuery, [`%${nome}%`, `%${cnpj}%`]);

        res.json(clients);
    } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
});

app.put('/update-client/:id', asyncHandler(async (req, res) => {
    console.log("cheguei aqui!!!")
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