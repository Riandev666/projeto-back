const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/opinai_db";
mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Conectado"))
  .catch((err) => console.error("❌ Erro:", err));

const User = mongoose.model('User', new mongoose.Schema({
  nome: String,
  email: { type: String, unique: true },
  senha: String, 
  pontos: { type: Number, default: 0 }
}), 'Usuarios');

const Survey = mongoose.model('Survey', new mongoose.Schema({
  nome: String,
  tempo: String,
  valor: String,
  perguntas: [String]
}));

app.post('/api/register', async (req, res) => {
  try {
    const novoUsuario = new User(req.body);
    await novoUsuario.save();
    res.status(201).json({ message: "Usuário criado!" });
  } catch (err) {
    res.status(400).json({ error: "Email já existe" });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  const user = await User.findOne({ email, senha });
  if (user) {
    res.json({ success: true, user });
  } else {
    res.status(401).json({ message: "Credenciais inválidas" });
  }
});

app.get('/api/surveys', async (req, res) => {
  const surveys = await Survey.find();
  res.json(surveys);
});

app.post('/api/surveys', async (req, res) => {
  const nova = new Survey(req.body);
  await nova.save();
  res.json(nova);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});