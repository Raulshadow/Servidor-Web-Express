const axios = require('axios');
const DAO = require('./DAO');
const dao = new DAO();

const checkCompeticoes = async () => {
    console.log('Checando competições');
    const url1 = 'https://0807-2804-2090-8100-c7dc-29-9ef6-c7bc-a7c3.ngrok-free.app/executar';
    const executarResponse = await axios.post(url1, null, { params: { competicao: 1 } }).then(async response => {
        console.log('Resposta do servidor:');
        console.log(response.data);
        const url2 = 'https://0807-2804-2090-8100-c7dc-29-9ef6-c7bc-a7c3.ngrok-free.app/resultados';
        const pegaResultados = await axios.get(url2, { params: { competicao: 1 } }).then(response => {
            console.log('Resposta do servidor:');
            console.log(response.data);
        })
            .catch(error => {
                console.error('Erro ao fazer a requisição:', error);
            });
    })
        .catch(error => {
            console.error('Erro ao fazer a requisição:', error);
        });


};

module.exports = checkCompeticoes;
