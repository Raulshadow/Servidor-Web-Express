const axios = require('axios');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: 'envoirement.env' });
}

const checkCompeticoes = async (dao) => {
    console.log('Checando competições');
    const url1 = `${process.env.EXECUTION_SERVER}/executar`;
    await dao.get_competicoes_ontem().then(response => {
        for (const competicao of response) {
            console.log('Executando competição:', competicao.ID);
            axios.post(url1, null, { params: { competicao: competicao.ID } })
                .then(async response => {
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
