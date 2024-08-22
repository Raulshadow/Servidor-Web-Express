const bcrypt = require('bcrypt');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: 'envoirement.env' });// Carrega as variáveis de ambiente
}
const saltRounds = 10; // Número de "salt rounds" para o hashing
const pepper = process.env.PEPPER; // O "pepper" é uma string aleatória que é concatenada com a senha antes de hashing

/**
 * Gera um hash para a senha fornecida, incluindo um pepper.
 * @param {string} password - A senha a ser criptografada.
 * @returns {Promise<string>} - O hash da senha.
 */
async function hashPassword(password) {
    try {
        const pepperedPassword = password + pepper;
        const hash = await bcrypt.hash(pepperedPassword, saltRounds);
        return hash;
    } catch (error) {
        console.error('Erro ao gerar hash da senha:', error);
        throw error;
    }
}

/**
 * Compara uma senha fornecida com um hash armazenado, incluindo um pepper.
 * @param {string} password - A senha fornecida para verificação.
 * @param {string} hash - O hash da senha armazenado.
 * @returns {Promise<boolean>} - Retorna verdadeiro se a senha corresponder ao hash, falso caso contrário.
 */
async function comparePassword(password, hash) {
    try {
        const pepperedPassword = password + pepper;
        const match = await bcrypt.compare(pepperedPassword, hash);
        return match;
    } catch (error) {
        console.error('Erro ao comparar senha:', error);
        throw error;
    }
}

module.exports = {
    hashPassword,
    comparePassword
};
