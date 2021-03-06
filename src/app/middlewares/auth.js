import jwt from 'jsonwebtoken';
import { promisify } from 'util';

import authConfig from '../../config/auth';

export default async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const [, token] = authHeader.split(' '); // Com a virgula descarta primeira posição do array que seria o bearer.

  try {
    const decoded = await promisify(jwt.verify)(token, authConfig.secret);
    // console.log(decoded); Retorna no console informações do usuario logado/autenticado.
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid' });
  }
};
