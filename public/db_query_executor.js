// query queue item example
/*
    {
        "query": "SELECT * FROM users",
        "req": req,
        "output": Promise
        
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

new Promise((resolve, reject) => {
    while (true) {
        if (query_queue.length === 0)
            continue;

        
    }
});