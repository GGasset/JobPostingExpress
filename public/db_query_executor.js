const sqlite = require('sqlite3').verbose();

// query queue item example
/*
    {
        "query": "SELECT * FROM users",
        "req": req,
        "res": res,
        "output": Promise // No need to provide it.
        
        // Promise output
        [
            {
                "id": 0,
                "username": "...",
                "password_hash": "...",
                ...
            },
            {
                ...
            },
            ...
        ]
    }
*/
let query_queue = [];

module.exports = query_queue;

new  Promise(async (resolve, reject) => {
    const db = new sqlite.Database('../models/db.db');
    while (true) {
        if (query_queue.length === 0)
            continue;

        let copied = false;
        query_queue[0]['output'] = new Promise((resolve, reject) => {
            let query_object = query_queue[0];
            copied = true;
            console.log(`${query_object.res.statusCode} ${query_object.req.path} ${query_object.query}`);
            db.all(query_object['query'], (err, rows) => {
                if (err)
                    reject(err);

                resolve(rows);
            });
        })

        while (!copied)
        {
            await sleep(10);
        }
        query_queue.shift();
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}