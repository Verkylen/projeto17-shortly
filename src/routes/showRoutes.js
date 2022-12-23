import { Router } from 'express';
import { getUrlsId, ranking, urlsOpenShortUrl, usersMe } from '../controllers/showControllers.js';
import { tokenValidation } from '../middlewares/tokenValidationMiddleware.js';

const showRouter = Router();

showRouter.get('/urls/:id', getUrlsId);

showRouter.get('/urls/open/:shortUrl', urlsOpenShortUrl);

showRouter.get('/users/me', tokenValidation, usersMe);

showRouter.get('/ranking', ranking);

export default showRouter;