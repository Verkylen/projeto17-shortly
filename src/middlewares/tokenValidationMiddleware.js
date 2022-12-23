import joi from 'joi';

export async function tokenValidation(req, res, next) {
    const {authorization} = req.headers;

    const authorizationSchema = joi.string().pattern(new RegExp('^Bearer [a-f0-9-]+$')).required();

    const authorizationValidation = authorizationSchema.validate(authorization);

    if ('error' in authorizationValidation) {
        res.sendStatus(401);
        return;
    }

    const token = authorization.replace('Bearer ', '');

    req.token  = token;

    next();
}