const path = require('path');
const fs = require('fs');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const generatePdf = (pdfData) => {
    return new Promise((resolve, reject) => {
        const doc = new jsPDF();

        doc.autoTable({
            head: [pdfData.headers],
            body: pdfData.rows,
        });

        const filePath = path.join(__dirname, 'pdfs', 'ocorrencias.pdf');

        doc.save(filePath, { returnPromise: true })
            .then(() => resolve('PDF gerado com sucesso.'))
            .catch(err => reject('Erro ao gerar o PDF: ' + err.message));
    });
};

module.exports = generatePdf;