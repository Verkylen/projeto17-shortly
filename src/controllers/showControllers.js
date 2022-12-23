import connection from '../database.js';

export async function getUrlsId(req, res) {
    const {id} = req.params;

    const idRegExp = new RegExp('^[1-9][0-9]*$');

    if (idRegExp.test(id) === false) {
        res.sendStatus(404);
        return;
    }

    try {
        const {rows} = await connection.query('SELECT id, "shortUrl", url FROM "shortenedUrls" WHERE id = $1;', [id]);

        if (rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        res.send(rows[0]);
    } catch {
        res.sendStatus(500);
    }
}

export async function urlsOpenShortUrl(req, res) {
    const {shortUrl} = req.params;

    try {
        const {rows} = await connection.query('SELECT * FROM "shortenedUrls" WHERE "shortUrl" = $1;', [shortUrl]);

        if (rows.length === 0) {
            res.sendStatus(404);
            return;
        }

        const {url, visitCount} = rows[0];

        await connection.query('UPDATE "shortenedUrls" SET "visitCount" = $1 WHERE "shortUrl" = $2;', [visitCount + 1, shortUrl]);

        res.redirect(url);
    } catch {
        res.sendStatus(500);
    }
}

export async function usersMe(req, res) {
    try {
        const {rows: session} = await connection.query('SELECT * FROM sessions WHERE token = $1;', [req.token]);

        if (session.length === 0) {
            res.sendStatus(404);
            return;
        }

        const {rows: user} = await connection.query(`
            SELECT users.id, users.name, SUM("shortenedUrls"."visitCount") AS "visitCount", JSON_AGG("shortenedUrls") AS "shortenedUrls"
            FROM users LEFT JOIN "shortenedUrls"
            ON users.id = "shortenedUrls"."userId"
            WHERE users.id = $1
            GROUP BY users.id;
        `, [session[0].userId]);

        if (user.length !== 0) {
            const {shortenedUrls} = user[0];

            if (shortenedUrls[0] !== null) {
                for (const shortenedUrl of shortenedUrls) {
                    delete shortenedUrl.userId;
                    delete shortenedUrl.createAt;
                }
            }
        }

        res.send(user[0]);
    } catch {
        res.sendStatus(500);
    }
}

export async function ranking({}, res) {
    try {
        const {rows} = await connection.query(`
            SELECT
                users.id,
                users.name,
                COUNT("shortenedUrls"."shortUrl") AS "linksCount",
                SUM("shortenedUrls"."visitCount") AS "visitCount"
            FROM users JOIN "shortenedUrls"
            ON users.id = "shortenedUrls"."userId"
            GROUP BY users.id
            ORDER BY "visitCount" DESC
            LIMIT 10;
        `);

        res.send(rows);
    } catch {
        res.sendStatus(500);
    }
}