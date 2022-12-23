import { Router } from 'express';
import { deleteUrlsId, urlsShorten } from '../controllers/urlControllers.js';
import { tokenValidation } from '../middlewares/tokenValidationMiddleware.js';

const urlRouter = Router();
urlRouter.use(tokenValidation);

urlRouter.post('/urls/shorten', urlsShorten);

urlRouter.delete('/urls/:id', deleteUrlsId);

export default urlRouter;