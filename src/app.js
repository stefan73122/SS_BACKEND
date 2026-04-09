if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const requestQueueMiddleware = require('./middlewares/requestQueue');
const runMigrations = require('./migrate');

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://ssbackend-production-133b.up.railway.app'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(requestQueueMiddleware);

app.use('/api', routes);


app.get('/', (req, res) => {
  res.json({ message: 'API funcionando 🚀' });
});

const PORT = process.env.PORT || 10000;

// Ejecutar migraciones y luego iniciar servidor
(async () => {
  await runMigrations();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${PORT}`);
  });
})();
