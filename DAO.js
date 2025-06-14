const sql = require('mssql');
const { hashPassword, comparePassword } = require('./authUtils');
const TAG = "[Jogos_DAO] ";
const { format, subDays } = require('date-fns');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: 'envoirement.env' });
}

const sqlConfig = {
    user: 'usr_plataforma',
    password: process.env.PASSWORD_DB,
    database: 'plataforma',
    server: process.env.DATABASE_URL,
    options: {
        encrypt: true, // for azure
        trustServerCertificate: false // change to true for local dev / self-signed certs
    }
}

class DAO {
    // DAO para lidar com acesso direto ao banco de dados
    constructor() {
        // Cria e mantem um objeto de acesso ao banco
        try {
            sql.connect(sqlConfig);
            console.log(TAG + 'Conectado ao banco de dados');
        } catch (err) {
            console.error(TAG + 'Erro ao se conectar ao banco de dados', err);
        }
    }

    async wake_up() {
        // Verifica se o banco de dados está acessível
        try {
            await sql.connect(sqlConfig);
            return true;
        } catch (error) {
            console.error(TAG + 'Erro ao acordar:', error);
            return false;
        }
    }

    async get_jogador_por_id(id) {
        // Dado o id do jogador, retorna suas informações
        try {
            await sql.connect(sqlConfig);  // Conectando ao pool de conexões
            const request = new sql.Request();
            request.input('ID', sql.Int, id);

            const result = await request.query(`
                SELECT ID, email, nome, instituicao FROM Usuario WHERE ID = @ID;
            `);

            if (result.recordset.length > 0) {
                const jogador = result.recordset[0];
                return jogador;
            } else {
                return null;
            }
        } catch (error) {
            console.error(TAG + 'Erro ao obter jogador por ID:', error);
            throw error;
        }
    }

    async get_usuario_por_email(email, senha) { //login
        // Dado o email do usuário, retorna suas informações se a senha estiver correta
        try {
            await sql.connect(sqlConfig);
            const request = new sql.Request();
            request.input('Email', sql.NVarChar, email);

            // Consulta
            const result = await request.query(`
                SELECT ID, email, nome, instituicao, senha 
                FROM Usuario 
                WHERE email = @Email;
            `);

            // Verifica se o usuário foi encontrado
            if (result.recordset.length > 0) {
                const usuario = result.recordset[0];
                const senhaCriptografada = usuario.senha;

                // Verifica se a senha fornecida corresponde
                const validation = await comparePassword(senha, senhaCriptografada);

                if (validation) {
                    // Remove a senha do objeto antes de retornar as informações do usuário
                    delete usuario.senha;
                    return {usuario: usuario, senhaCorreta: true};
                } else {
                    return {usuario: null, senhaCorreta: false};
                }
            } else {
                return null; // Retorna null se o usuário não for encontrado
            }
        } catch (error) {
            console.error('Erro ao obter usuário por email:', error);
            throw error;
        }
    }

    async create_usuario(nome, email, instituicao, senha) {
        // Cria um novo usuário no banco de dados
        try {
            await sql.connect(sqlConfig);
            const hash = await hashPassword(senha);
            const request = new sql.Request();
            request.input('Email', sql.NVarChar, email);
            request.input('Senha', sql.NVarChar, hash);
            request.input('Nome', sql.NVarChar, nome);
            request.input('Instituicao', sql.NVarChar, instituicao);

            const result = await request.query(`
                INSERT INTO Usuario (email, senha, nome, instituicao) 
                OUTPUT INSERTED.ID
                VALUES (@Email, @Senha, @Nome, @Instituicao);
            `);
            
            return result.recordset[0].ID; // Retorna o ID do usuário inserido
        } catch (error) {
            console.error(TAG + 'Erro ao criar usuário:', error);
            throw error;
        }
    }

    async get_competicoes_disponiveis() {
        try {
            await sql.connect(sqlConfig);
            const request = new sql.Request();
            const result = await request.query(`
                SELECT 
                    c.ID,
                    c.Nome,
                    c.Descricao,
                    c.Data_inicio,
                    c.Data_fim,
                    c.Imagem,
                    c.Data_ultima_exec,
                    c.Intervalo_execucao,
                    c.jogo_id,
                    c.Criador,
                    u.nome AS NomeCriador,
                    c.Regras,
                    c.Ativa,
                    j.nome as jogo
                FROM Competicao c
                INNER JOIN Usuario u ON c.Criador = u.ID
                LEFT JOIN Jogo j on c.jogo_id = j.ID
                WHERE c.Ativa = 1;
            `);
            return result.recordset;
        } catch (error) {
            console.error(TAG + 'Erro ao obter competições disponíveis:', error);
            throw error;
        }
    }

    async get_competicao(ID) {
        // Retorna os dados da competição
        try {
            await sql.connect(sqlConfig);  // Conectando ao pool de conexões
            const request = new sql.Request();
            request.input('ID', sql.Int, ID);

            const result = await request.query(`
                SELECT c.ID AS id, c.nome, c.data_inicio, c.data_fim, c.descricao, c.Regras, c.jogo_id, j.nome as jogo, u.nome AS NomeCriador 
                FROM Competicao c 
                INNER JOIN Usuario u ON c.Criador = u.ID
                LEFT JOIN Jogo j on c.jogo_id = j.ID
                WHERE c.ID = @ID
            `);
            if (result.recordset.length > 0) {
                return result.recordset[0];
            }
            return null;
        } catch (error) {
            console.error(TAG + 'Erro ao obter a competição', error);
            throw error;
        }
    }

    async get_competicoes_ontem() {
        try {
            await sql.connect(sqlConfig);  // Conectando ao pool de conexões
            // Obter a data de ontem
            const yesterday = subDays(new Date(), 1);
            const formattedDate = format(yesterday, 'yyyy-MM-dd');

            const request = new sql.Request();
            const result = await request.query(`
                SELECT * 
                FROM Competicao
                WHERE CAST(Data_fim AS DATE) = CAST('${formattedDate}' AS DATE) AND Ativa=1;
            `);
            
            return result.recordset;
        } catch (error) {
            console.error('Erro ao obter competições com Data_fim igual a ontem:', error);
            throw error;
        }
    }

    async get_all_competitions() {
        // Retorna todas as competições
        try {
            await sql.connect(sqlConfig);
            const request = new sql.Request();
            const result = await request.query(`
                SELECT * FROM Competicao;
            `);
            return result.recordset;
        } catch (error) {
            console.error(TAG + 'Erro ao obter todas as competições:', error);
            throw error;
        }
    }

    async get_resultados(competicao_id) {
        // Retorna os resultados de determinada competicao ordenados pela pontuação
        try {
            await sql.connect(sqlConfig);  // Conectando ao pool de conexões
            const request = new sql.Request();
            request.input('Competicao_ID', sql.Int, competicao_id);

            const result = await request.query(`
                SELECT 
                    u.ID as usuario_id, 
                    u.nome as nome_usuario, 
                    COUNT(CASE WHEN p.vencedor = u.ID THEN 1 END) as vitorias,
                    COUNT(CASE WHEN p.vencedor = -1 THEN 1 END) as empates,
                    COUNT(CASE WHEN p.vencedor != u.ID AND p.vencedor != -1 THEN 1 END) as derrotas,
                    COALESCE(SUM(CAST(P.pontos AS INTEGER)), 0) AS total_pontos
                FROM 
                    Usuario u
                LEFT JOIN 
                    submissao s ON u.ID = s.Usuario_ID
                LEFT JOIN 
                    gera g ON s.ID = g.submissao_ID
                LEFT JOIN 
                    partida p ON g.partida_ID = p.ID
                WHERE 
                    s.Competicao_ID = @Competicao_ID
                GROUP BY 
                    u.ID, u.nome
                ORDER BY
                    total_pontos DESC;
            `);
            return result.recordset;
        } catch (error) {
            console.error(TAG + 'Erro ao obter resultados da competição:', error);
            throw error;
        }
    }

    async inscrever_usuario(Usuario_ID, Competicao_ID) {
        // Inscreve um usuário em uma competição
        try {
            await sql.connect(sqlConfig);  // Conectando ao pool de conexões
            const usuarioIdInt = parseInt(Usuario_ID, 10);
            const competicaoIdInt = parseInt(Competicao_ID, 10);

            if (isNaN(usuarioIdInt) || isNaN(competicaoIdInt)) {
                throw new Error(`Usuario_ID (${Usuario_ID}) ou Competicao_ID (${Competicao_ID}) não são números válidos`);
            }

            const request = new sql.Request();
            request.input('Usuario_ID', sql.Int, usuarioIdInt);
            request.input('Competicao_ID', sql.Int, competicaoIdInt);

            const result = await request.query(`
                INSERT INTO inscrito (Usuario_ID, Competicao_ID) 
                OUTPUT INSERTED.Competicao_ID
                VALUES (@Usuario_ID, @Competicao_ID);
            `);

            return result.recordset[0].Competicao_ID; // Retorna o ID da competição inserida
        } catch (error) {
            console.error(TAG + 'Erro ao inscrever usuário:', error);
            throw error;
        }
    }

    async checa_inscricao(Usuario_ID, Competicao_ID) {
        // Checa se um usuário está inscrito em uma competição
        try {
            await sql.connect(sqlConfig);  // Conectando ao pool de conexões
            const request = new sql.Request();
            request.input('Usuario_ID', sql.Int, Usuario_ID);
            request.input('Competicao_ID', sql.Int, Competicao_ID);

            const result = await request.query(`
                SELECT * FROM inscrito WHERE Usuario_ID = @Usuario_ID AND Competicao_ID = @Competicao_ID;
            `);
            return result.recordset.length > 0;
        } catch (error) {
            console.error(TAG + 'Erro ao checar inscrição:', error);
            throw error;
        }
    }

    async get_submissao_por_id_usuario_e_competicao(usuario_id, competicao_id) {
        // Retorna a submissão mais recente do usuário para a competição especificada
        try {
            await sql.connect(sqlConfig);  // Conectando ao pool de conexões
            const request = new sql.Request();
            request.input('Usuario_ID', sql.Int, usuario_id);
            request.input('Competicao_ID', sql.Int, competicao_id);

            const result = await request.query(`
                SELECT TOP 1
                    s.ID AS Submissao_ID,
                    s.Usuario_ID,
                    s.Competicao_ID,
                    s.data_submissao,
                    s.status_submissao,
                    p.pontos AS Pontuacao
                FROM
                    submissao s
                LEFT JOIN
                    gera g ON s.ID = g.submissao_ID
                LEFT JOIN
                    partida p ON g.partida_ID = p.ID
                WHERE
                    s.Usuario_ID = @Usuario_ID
                    AND s.Competicao_ID = @Competicao_ID
                ORDER BY
                    s.data_submissao DESC;
            `);

            if (result.recordset.length > 0) {
                const row = result.recordset[0];
                const submissao = {
                    id: row.Submissao_ID,
                    userId: row.Usuario_ID,
                    competitionId: row.Competicao_ID,
                    data_submissao: row.data_submissao,
                    status_submissao: row.status_submissao,
                    total_pontos: row.Pontuacao
                };
                return submissao;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Erro ao obter submissão:', error);
            throw error;
        }
    }


    async salvarSubmissao(usuarioId, competicaoId, codigoSubmissao, linguagemSubmissao) {
        try {
            await sql.connect(sqlConfig);  // Conectando ao pool de conexões
            const request = new sql.Request();
            request.input('Usuario_ID', sql.Int, usuarioId);
            request.input('Competicao_ID', sql.Int, competicaoId);
            request.input('Codigo', sql.NVarChar, codigoSubmissao);
            request.input('Linguagem', sql.NVarChar, linguagemSubmissao);

            // Verificar se já existe uma submissão para o usuário e competição específicos
            const checkResult = await request.query(`
                SELECT id FROM submissao 
                WHERE Usuario_ID = @Usuario_ID 
                AND Competicao_ID = @Competicao_ID;
            `);

            if (checkResult.recordset.length > 0) {
                // Se a submissão já existe, atualizar a submissão existente
                const submissionId = checkResult.recordset[0].id;

                // Definir o Submission_ID como um parâmetro de input
                request.input('Submission_ID', sql.Int, submissionId);

                await request.query(`
                    UPDATE submissao 
                    SET codigo = @Codigo, 
                        data_submissao = CURRENT_TIMESTAMP, 
                        status_submissao = 'Aguardando Execução',
                        linguagem = @Linguagem
                    WHERE id = @Submission_ID;
                `);

                // Retornar o id da submissão atualizada
                return submissionId;
            } else {
                // Se a submissão não existe, inserir uma nova submissão
                const insertResult = await request.query(`
                    INSERT INTO submissao (Usuario_ID, Competicao_ID, codigo, data_submissao, status_submissao, linguagem) 
                    VALUES (@Usuario_ID, @Competicao_ID, @Codigo, CURRENT_TIMESTAMP, 'Aguardando Execução', @Linguagem);
                    
                    SELECT SCOPE_IDENTITY() AS id;
                `);

                return insertResult.recordset[0].id;
            }
        } catch (err) {
            console.error('Erro ao salvar submissão:', err);
            throw err;
        }
    }

}

module.exports = DAO;