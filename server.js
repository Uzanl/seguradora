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
    res.render('cliente.ejs')
}));

app.get('/usuario', asyncHandler(async (req, res, next) => {
    res.render('usuario.ejs')
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