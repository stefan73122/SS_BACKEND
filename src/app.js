require('dotenv').config();
const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const requestQueueMiddleware = require('./middlewares/requestQueue');

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestQueueMiddleware);

app.use('/api', routes);


app.get('/', (req, res) => {
  res.json({ message: 'API funcionando 🚀' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
