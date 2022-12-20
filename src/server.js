import express from 'express';
import connection from './database.js';
import joi from 'joi';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { nanoid } from 'nanoid';

// Como o token é recebido no front?
// Quantos caracteres deve ter o short url?
// O short url pode/deve ser único?

const server = express();
server.use(express.json());

server.post('/signup', async (req, res) => {
    const bodySchema = joi.object({
        name: joi.string().required(),
        email: joi.string().pattern(new RegExp('^[a-zA-Z0-9_+.-]+@[a-zA-Z0-9]+([.]{1}[a-zA-Z0-9]+)+$')).required(),
        password: joi.string().pattern(new RegExp('^[^ ]+$')).required(),
        confirmPassword: joi.ref('password')
    }).with('password', 'confirmPassword');

    const {body} = req;

    const validation = bodySchema.validate(body, {abortEarly: false});

    if ('error' in validation) {
        res.status(422).send(validation.error.details);
        return;
    }

    const {name, email, password} = body;

    try {
        const {rows} = await connection.query('SELECT * FROM users WHERE email = $1;', [email]);

        if (rows.length !== 0) {
            res.sendStatus(409);
            return;
        }

        const saltRounds = 10;
        const salt = bcrypt.genSaltSync(saltRounds);
        const passwordHash = bcrypt.hashSync(password, salt);

        await connection.query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3);', [name, email, passwordHash]);

        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

server.post('/signin', async (req, res) => {
    const bodySchema = joi.object({
        email: joi.string().pattern(new RegExp('^[a-zA-Z0-9_+.-]+@[a-zA-Z0-9]+([.]{1}[a-zA-Z0-9]+)+$')).required(),
        password: joi.string().pattern(new RegExp('^[^ ]+$')).required()
    });

    const {body} = req;

    const validation = bodySchema.validate(body, {abortEarly: false});

    if ('error' in validation) {
        res.status(422).send(validation.error.details);
        return;
    }

    const {email, password} = body;

    try {
        const {rows} = await connection.query(`
            SELECT users.id, users.password, sessions.token
            FROM users LEFT JOIN sessions
            ON users.id = sessions."userId"
            WHERE email = $1;
        `, [email]);


        if (rows.length === 0) {
            res.sendStatus(401);
            return;
        }

        const {id: userId, password: passwordHash, token} = rows[0];

        const valid = bcrypt.compareSync(password, passwordHash);

        if (valid === false) {
            res.sendStatus(401);
            return;
        }

        let theToken = token;

        if (theToken === null) {
            theToken = uuid();

            await connection.query('INSERT INTO sessions ("userId", token) VALUES ($1, $2);', [userId, theToken]);
        }

        res.send(theToken);
    } catch {
        res.sendStatus(500);
        return;
    }
});

server.post('/urls/shorten', async (req, res) => {
    const {headers, body} = req;

    const authorizationSchema = joi.string().pattern(new RegExp('^Bearer [a-f0-9-]+$')).required();

    const authorizationValidation = authorizationSchema.validate(headers.authorization);

    if ('error' in authorizationValidation) {
        res.sendStatus(401);
        console.log(authorizationValidation.error.details);
        return;
    }

    const token = headers.authorization.replace('Bearer ', '');

    try {
        const {rows: session} = await connection.query('SELECT * FROM sessions WHERE token = $1;', [token]);

        if (session.length === 0) {
            res.sendStatus(401);
            return;
        }

        const bodySchema = joi.object({
            url: joi.string().pattern(new RegExp('^https://[^ ]*$')).required()
        });

        const bodyValidation = bodySchema.validate(body, {abortEarly: false});

        if ('error' in bodyValidation) {
            res.status(422).send(bodyValidation.error.details);
            return;
        }

        const {userId} = session[0];

        const {rows: savedUrl} = await connection.query('SELECT * FROM urls WHERE "userId" = $1 AND url = $2;', [userId, body.url]);

        let shortUrl = '';

        if (savedUrl.length === 0) {
            shortUrl = nanoid();

            await connection.query(`
                INSERT INTO urls ("userId", url, "shortUrl") VALUES ($1, $2, $3);
            `, [userId, body.url, shortUrl]);
        } else {
            shortUrl = savedUrl[0].shortUrl;
        }

        res.status(201).send({shortUrl});
    } catch {
        res.sendStatus(500);
    }
});

server.get('/urls/:id', async (req, res) => {
    const {id} = req.params;

    const idRegExp = new RegExp('^[1-9][0-9]*$');

    if (idRegExp.test(id) === false) {
        res.sendStatus(404);
        return;
    }

    try {
        const {rows} = await connection.query('SELECT * FROM urls WHERE id = $1;', [id]);

        if (rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        delete rows[0].userId;

        res.send(rows[0]);
    } catch {
        res.sendStatus(500);
    }
});

server.get('/urls/open/:shortUrl', async (req, res) => {

});

const port = 4000;
server.listen(4000, () => console.log('Express server listening on localhost:' + port));