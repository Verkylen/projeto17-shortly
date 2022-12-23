import joi from 'joi';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import connection from '../database.js';

export async function signUp(req, res) {
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
}

export async function signIn(req, res) {
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
}