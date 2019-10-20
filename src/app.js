import express from 'express';
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
  }

  routes() {
    this.server.use(routes);
  }
}

export default new App().server; // Exporta diretamente o server, unica coisa acessivel.
// Sera importada em server.js
