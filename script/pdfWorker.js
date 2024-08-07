
const { parentPort } = require('worker_threads');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

parentPort.on('message', (data) => {
    const { headers, rows } = data;
    const doc = new jsPDF();

    // Adiciona a tabela ao PDF
    doc.autoTable({
        head: [headers],
        body: rows,
        pageBreak: 'auto'
    });

    // Gera o PDF como um buffer e envia de volta
    const pdfBuffer = doc.output('arraybuffer');
    parentPort.postMessage(Buffer.from(pdfBuffer));
});