// Importando módulos necessários
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const archiver = require('archiver');

const checkCompeticoes = require('./checkCompetitions');

const CORS = require('cors');
const PORT = 8080;
const DAO = require('./DAO');
const multer = require('multer');
const fs = require('fs');
const { default: axios } = require('axios');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: 'envoirement.env' });
}

const dao = new DAO();
// Carrega a chave privada do arquivo PEM
const privateKey = fs.readFileSync('./secretKey.pem');

// Crie uma instância do middleware multer com as configurações definidas
const upload = multer({ dest: './uploads/' });

// Função para gerar um token JWT com a chave privada
function gerarToken(usuario_id) {
    const id_texto = String(usuario_id);
    const token = jwt.sign({ id: id_texto }, privateKey, { algorithm: 'RS256', expiresIn: '24h' });
    return token;
}

app.use(CORS());
app.use(express.json()); // Middleware para analisar solicitações JSON

// Middleware para verificar o token JWT no cabeçalho da solicitação
const getTokenFromHeader = (req, res, next) => {
    if (
        req.headers.authorization &&
        req.headers.authorization.split(' ')[0] === 'Bearer'
    ) {
        const token = req.headers.authorization.split(' ')[1];
        const de = JSON.parse(
            Buffer.from(token.split('.')[1], 'base64').toString()
        );
        // a verificação é assíncrona
        jwt.verify(token, privateKey, (err, decoded) => {
            if (err) {
                res.status(401).send('Falha na Autenticação do token');
                next();
            }
            req.decoded = decoded;
        });
    }
    next();
};
app.use(getTokenFromHeader);

// Login de usuário
app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body; // Aqui acessamos o corpo da requisição para pegar o email e senha
        if (!email || !senha) {
            return res.status(400).send('Email ou senha não informados');
        }

        const resposta = await dao.get_usuario_por_email(email, senha);
        if (!resposta) {
            return res.status(404).send('Usuario não encontrado');
        } else {
            if (!resposta.senhaCorreta) {
                return res.status(401).send('Senha incorreta');
            } else {
                const usuario = resposta.usuario;
                // Gera o token JWT
                const token = gerarToken(usuario.ID);
                //Envia o token juntamente as informações do usuário
                return res.json({ usuario, token });
            }
        }
    } catch (error) {
        console.error('Erro ao realizar login:', error);
        return res.status(500).send('Erro ao realizar login');
    }
});

// Cadastro de novo usuário temporário, ainda haverá a necessidade de confirmar o email e a instituição
app.post('/api/cadastro', async (req, res) => {
    try {
        const { nome, email, instituicao, senha } = req.body; // Aqui acessamos o corpo da requisição para pegar o nome, email e senha
        
        if (!nome || !email || !senha || !instituicao) {
            return res.status(400).send('Nome, email ou senha não informados');
        }
        const resultado = await dao.create_usuario(nome, email, instituicao, senha);
        if (resultado) {
            return res.status(200).send('Usuário cadastrado com sucesso');
        } else {
            return res.status(400).send('Erro ao cadastrar usuário');
        }
    } catch (error) {
        console.error('Erro ao realizar cadastro:', error);
        return res.status(500).send('Erro ao realizar cadastro');
    }
});

// Rota para recupera informações do usuário logado
app.get('/api/user', async (req, res) => {
    try {
        const usuarioID = parseInt(req.decoded.id);
        const usuario = await dao.get_jogador_por_id(usuarioID);
        if (!usuario) {
            return res.status(404).send('Usuário não encontrado');
        } else {
            return res.json(usuario);
        }
    } catch (error) {
        console.error('Erro ao recuperar informações do usuário:', error);
        return res.status(500).send('Erro ao recuperar informações do usuário');
    }
});

// Rota para listagem das competições.
app.get('/api/competicoes', async (req, res) => {
    const competicoes = await dao.get_competicoes_disponiveis();
    return res.json(competicoes);
});

// Rota para obter informações de uma competição específica.
app.get('/api/competicao/:id', async (req, res) => {
    const id = req.params.id;
    const competicao = await dao.get_competicao(id);
    if (!competicao) {
        return res.status(404).send('Competição não encontrada');
    } else {
        return res.json(competicao);
    }
});

// Rota para realizar a inscrição de um usuário em uma competição Retorna o ID da competição inserida
app.post('/api/competicao/:competicaoId/realizarInscricao', async (req, res) => {
    const competicaoID = req.params.competicaoId;

    try {
        const usuarioID = parseInt(req.decoded.id);
        const resultado = await dao.inscrever_usuario(usuarioID, competicaoID);

        if (resultado) {
            return res.status(200).send({result:resultado, message:'Inscrição realizada com sucesso'});
        } else {
            return res.status(400).send('Erro ao realizar inscrição');
        }
    } catch (error) {
        console.error('Erro ao realizar inscrição:', error);
        return res.status(500).send('Erro ao realizar inscrição');
    }
});

// Rota para verificar se um usuário está inscrito em uma competição, retorna os dados da tabela inscrito
app.get('/api/competicao/:competicaoId/checaInscricao', async (req, res) => {
    try {
        const usuarioID = parseInt(req.decoded.id);
        const competicaoID = req.params.competicaoId;

        const resultado = await dao.checa_inscricao(usuarioID, competicaoID);
        if (resultado) {
            return res.status(200).send(true);
        } else {
            return res.status(200).send(false);
        }
    } catch (error) {
        console.error('Erro ao verificar inscrição:', error);
        return res.status(500).send('Erro ao verificar inscrição');
    }
});

//recuperando uma submissão de um usuário em uma competição
app.get('/api/competicao/:competicaoId/submissao', async (req, res) => {
    const competicaoID = req.params.competicaoId;

    try {
        const usuarioID = parseInt(req.decoded.id);
        const submissao = await dao.get_submissao_por_id_usuario_e_competicao(usuarioID, competicaoID);

        if (submissao) {
            return res.json(submissao);
        } else {
            return res.status(404).send('Submissão não encontrada');
        }
    } catch (error) {
        console.error('Erro ao recuperar submissão:', error);
        return res.status(500).send('Erro ao recuperar submissão');
    }
});

// Rota para recuperar os resultados de uma competição
app.post('/api/competicao/resultado', async (req, res) => {
    const { competitionId } = req.body; // Ajuste para pegar do corpo da requisição

    try {
        const resultados = await dao.get_resultados(competitionId);
        return res.json(resultados);
    } catch (error) {
        console.error('Erro ao recuperar resultados:', error);
        return res.status(500).send('Erro ao recuperar resultados');
    }
});


// Rota para lidar com o upload de arquivos
app.post('/api/upload/:competicaoId', upload.array('file'), async (req, res) => {
    const competicaoID = req.params.competicaoId;
    const file_recieved = req.files[0];
    try {
        // Verifica o token JWT para obter o ID do usuário
        const usuarioID = parseInt(req.decoded.id);

        // Verifica se o arquivo foi enviado
        if (!file_recieved) {
            throw new Error('Nenhum arquivo enviado');
        }

        // Lê o arquivo e converte-o em uma string
        const fileContent = fs.readFileSync(file_recieved.path, 'utf-8');
        // Armazenando no Banco de Dados
        await dao.salvarSubmissao(usuarioID, competicaoID, fileContent);

        // Envia uma resposta de sucesso
        res.send('Arquivo enviado e armazenado com sucesso');
    } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        res.status(500).send('Erro ao processar arquivo');
    } finally {
        // Remove o arquivo temporário após o processamento
        if (file_recieved) {
            try {
                fs.unlinkSync(file_recieved.path);
                console.log(`Arquivo temporário removido: ${file_recieved.path}`);
            } catch (unlinkError) {
                console.error('Erro ao tentar remover o arquivo temporário:', unlinkError);
            }
        }
    }
});

// Rota para obter o template do código de uma competição
app.post('/api/template/:competicaoId', async (req, res) => {
    const competicaoID = req.params.competicaoId;
    const language = req.body.language || 'python'; // Obtendo a linguagem do corpo da requisição

    try {
        // Fazer a requisição para o endpoint externo usando GET com parâmetros na URL
        const response = await axios.get('http://40.88.251.186:3001/template', {
            params: {
                competicao: competicaoID,
                //language: language
            }
        });

        // Obtendo o código-fonte da resposta
        const code = response.data; // Supondo que a resposta é o código-fonte como texto

        // Define a extensão do arquivo com base na linguagem
        const fileExtension = language === 'csharp' ? '.cs' : '.py';
        const fileName = `template${fileExtension}`;

        // Cria um arquivo ZIP em memória
        const archive = archiver('zip', { zlib: { level: 9 } });

        res.attachment('template.zip'); // Nome do arquivo ZIP que será enviado ao cliente

        archive.pipe(res);

        // Adiciona o arquivo ao ZIP
        archive.append(code, { name: fileName });

        // Finaliza o arquivo ZIP
        await archive.finalize();
    } catch (error) {
        console.error('Erro ao criar template:', error);
        res.status(500).send('Erro ao criar template');
    }
});

app.get('/api/wake-up', async (req, res) => {
    res.send('Servidor acordado');
});

app.listen(PORT, () => {
    console.log(`Server running on PORT: ${PORT}`);
    checkCompeticoes(dao);
    setInterval(checkCompeticoes, 86400000); // 60000 = 1 minuto ; 86400000 = 24hrs
});

