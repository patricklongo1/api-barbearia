import multer from 'multer'; // Manipula arquivos recebidos via multpartform data
import crypto from 'crypto'; // lib do js que gera criptografias
import { extname, resolve } from 'path'; // Resolve diretorios de diferentes S.Os.

export default {
  storage: multer.diskStorage({
    destination: resolve(__dirname, '..', '..', 'temp', 'uploads'),
    filename: (req, file, cb) => {
      // Recebe nome do arquivo e dados da requisição, e uma function que vai tratar isso.
      crypto.randomBytes(16, (err, res) => {
        // Gera um nome random.
        if (err) return cb(err);

        return cb(null, res.toString('hex') + extname(file.originalname)); // concatena o nome random com a extensao do arquivo.
      });
    },
  }),
};
