const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken'); 
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const JWT_SECRET = process.env.JWT_SECRET || "sua_chave_secreta_super_segura_123";

const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/opinai_db";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Conectado"))
  .catch((err) => console.error("❌ Erro:", err));

const UserSchema = new mongoose.Schema({
  nome: String,
  email: { type: String, unique: true },
  senha: String, 
  celular: String,
  cpf: String,
  foto: String, 
  isAdmin: { type: Boolean, default: false }, 
  pontos: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema, 'Usuarios');

// --- ATUALIZAÇÃO AQUI: Esquema para aceitar perguntas complexas ---
const SurveySchema = new mongoose.Schema({
  nome: String,
  tempo: String,
  valor: String,
  perguntas: [{
    texto: String,
    tipo: { type: String, default: 'texto' }, // 'texto', 'selecao' ou 'multipla'
    opcoes: [String] // Array de strings para as escolhas
  }]
});

const Survey = mongoose.model('Survey', SurveySchema);
// ------------------------------------------------------------------

const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Token não fornecido" });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user && user.isAdmin === true) {
      req.userId = decoded.id;
      next();
    } else {
      res.status(403).json({ error: "Acesso negado: Requer privilégios de admin" });
    }
  } catch (err) {
    res.status(401).json({ error: "Sessão inválida" });
  }
};

app.post('/api/register', async (req, res) => {
  try {
    const novoUsuario = new User(req.body);
    const usuarioSalvo = await novoUsuario.save();
    const token = jwt.sign({ id: usuarioSalvo._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: usuarioSalvo });
  } catch (err) {
    res.status(400).json({ error: "Erro ao registrar" });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  const user = await User.findOne({ email, senha });
  if (user) {
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } else {
    res.status(401).json({ message: "Credenciais inválidas" });
  }
});

app.get('/api/user/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-senha'); 
    res.json(user);
  } catch (err) {
    res.status(401).send();
  }
});

app.put('/api/user/update', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send();
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const updated = await User.findByIdAndUpdate(decoded.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(401).send();
  }
});

app.get('/api/surveys', async (req, res) => {
  const surveys = await Survey.find();
  res.json(surveys);
});

app.post('/api/surveys', verifyAdmin, async (req, res) => {
  try {
    const nova = new Survey(req.body);
    await nova.save();
    res.status(201).json(nova);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Erro ao criar pesquisa" });
  }
});

app.post('/api/surveys/complete', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { surveyId, valor } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Converte valor (R$ 3,50) para número (3.50) e multiplica para pontos
    const valorLimpo = String(valor).replace('R$', '').replace(',', '.').trim();
    const pontosGanhos = parseFloat(valorLimpo) * 10;

    const user = await User.findByIdAndUpdate(
      decoded.id,
      { $inc: { pontos: pontosGanhos } },
      { new: true }
    );

    res.json({ message: "Pontos adicionados!", novosPontos: user.pontos });
  } catch (err) {
    res.status(401).json({ error: "Erro ao processar recompensa" });
  }
});

const PORT = process.env.PORT || 10000; // Render usa porta 10000 geralmente
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});