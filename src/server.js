import express from 'express';
import authRouter from './routes/authRoutes.js';
import showRouter from './routes/showRoutes.js';
import urlRouter from './routes/urlRoutes.js';

const server = express();
server.use(express.json());
server.use(authRouter);
server.use(showRouter);
server.use(urlRouter);

const port = process.env.PORT;
server.listen(port, () => console.log('Express server listening on localhost:' + port));