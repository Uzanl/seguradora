const path = require('path');
//const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const generatePdf = (pdfData) => {
    return new Promise((resolve, reject) => {
        try {
            // Cria uma nova instância de jsPDF com orientação paisagem
            const doc = new jsPDF('landscape');

            // Adiciona a tabela ao PDF
            doc.autoTable({
                head: [pdfData.headers],
                body: pdfData.rows,
                margin: { top: 10, left: 10, right: 10, bottom: 10 },
            });

            // Define o caminho para salvar o PDF
            const filePath = path.join(__dirname, 'pdfs', 'ocorrencias.pdf');

            // Salva o PDF
            doc.save(filePath, { returnPromise: true })
                .then(() => resolve('PDF gerado com sucesso.'))
                .catch(err => reject('Erro ao gerar o PDF: ' + err.message));
        } catch (err) {
            reject('Erro ao gerar o PDF: ' + err.message);
        }
    });
};

module.exports = generatePdf;