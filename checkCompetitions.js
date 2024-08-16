const axios = require('axios');

const checkCompeticoes = async (dao) => {
    console.log('Checando competições');
    const url1 = 'http://4.157.222.169:3001/executar';
    await dao.get_competicoes_ontem().then(response => {
        for (const competicao of response) {
            console.log('Executando competição:', competicao.ID);
            axios.post(url1, null, { params: { competicao: competicao.ID } }).then(async response => {
                console.log('Resposta do servidor:');
                console.log(response.data);
            })
                .catch(error => {
                    console.error('Erro ao fazer a requisição:', error);
                });
        }
    });
};

module.exports = checkCompeticoes;
