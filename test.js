// Importa o módulo DAO do arquivo DAO.js
const DAO = require('./DAO');
let dao;

dao = new DAO().get_jogador_por_id('1').then((jogador) => {
        console.log(jogador);
    }
).catch((error) => {
    console.error('Erro ao obter jogador por ID:', error);
}
);