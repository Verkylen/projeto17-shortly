import joi from 'joi';
import { nanoid } from 'nanoid';
import connection from '../database.js';

export async function urlsShorten(req, res) {
    const {body} = req;

    try {
        const {rows: session} = await connection.query('SELECT * FROM sessions WHERE token = $1;', [req.token]);

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

        const {rows: shortenedUrl} = await connection.query('SELECT * FROM "shortenedUrls" WHERE "userId" = $1 AND url = $2;', [userId, body.url]);

        let shortUrl = '';

        if (shortenedUrl.length === 0) {
            shortUrl = nanoid();

            await connection.query(`
                INSERT INTO "shortenedUrls" ("userId", url, "shortUrl") VALUES ($1, $2, $3);
            `, [userId, body.url, shortUrl]);
        } else {
            shortUrl = shortenedUrl[0].shortUrl;
        }

        res.status(201).send({shortUrl});
    } catch {
        res.sendStatus(500);
    }
}

export async function deleteUrlsId(req, res) {
    try {
        const {rows: session} = await connection.query('SELECT * FROM sessions WHERE token = $1;', [req.token]);

        if (session.length === 0) {
            res.sendStatus(401);
            return;
        }

        const {userId} = session[0];

        const {id} = req.params;

        const idRegExp = new RegExp('^[1-9][0-9]*$');
    
        if (idRegExp.test(id) === false) {
            res.sendStatus(404);
            return;
        }

        const {rows: shortenedUrls} = await connection.query('SELECT * FROM "shortenedUrls" WHERE id = $1;', [id]);

        if (shortenedUrls.length === 0) {
            res.sendStatus(404);
            return;
        }

        if (shortenedUrls[0].userId !== userId) {
            res.sendStatus(401);
            return;
        }

        await connection.query('DELETE FROM "shortenedUrls" WHERE id = $1;', [id]);

        res.sendStatus(204);
    } catch {
        res.sendStatus(500);
    }
}