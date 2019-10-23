import express from 'express';
import path from 'path';
import routes from './routes';

import './database';

class App {
  constructor() {
    this.server = express();
    this.middlewares();
    this.routes();
  }

  middlewares() {
    this.server.use(express.json()); // Recebe reqs em JSON
    this.server.use(
      '/files', // Cria url para as imagens de temp/uploads
      express.static(path.resolve(__dirname, '..', 'temp', 'uploads'))
    );
  }

  routes() {
    this.server.use(routes);
  }
}

export default new App().server; // Exporta diretamente o server, unica coisa acessivel.
// Sera importada em server.js
