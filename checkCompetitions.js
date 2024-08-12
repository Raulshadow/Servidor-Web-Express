const axios = require('axios');
const DAO = require('./DAO');
const dao = new DAO();

const checkCompeticoes = async () => {
    console.log('Checando competições');
    const url1 = 'http://4.228.0.168:3001/executar';
    dao.get_all_competitions().then(response => {
        console.log('Competições de ontem:');
        console.log(response);
    });
    // const executarResponse = await axios.post(url1, null, { params: { competicao: 1 } }).then(async response => {
    //     console.log('Resposta do servidor:');
    //     console.log(response.data);
    //     const url2 = 'http://4.228.0.168:3001/resultados';
    //     const pegaResultados = await axios.get(url2, { params: { competicao: 1 } }).then(response => {
    //         console.log('Resposta do servidor:');
    //         console.log(response.data);
    //     })
    //         .catch(error => {
    //             console.error('Erro ao fazer a requisição:', error);
    //         });
    // })
    //     .catch(error => {
    //         console.error('Erro ao fazer a requisição:', error);
    //     });


};

module.exports = checkCompeticoes;
