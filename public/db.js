const dbFile = './models/db.db';

const sqlite = require('sqlite3').verbose();

const db = new sqlite.Database(dbFile);

module.exports.database = db;

const is_registered_email = (email) => {

}

module.exports.is_registered_email = is_registered_email;

const bcrypt = require('bcrypt');

/*
* Returns false if email/password don't match or the hashed password if they do
*/
const verify_credentials_with_database = (email, password) => {
    const promise = new Promise((resolve, reject) => {
        db.get('SELECT password_hash FROM users WHERE email = ?;', [email], (err, row) => {
            if (err)
            {
                console.log(err);
                reject(err);
            }
            resolve(row);
        })
    }).then((row) => {

        if (row === undefined)
            return false;

        credential = row["password_hash"];
        return credential;
    }).then((hashed_password) => {
        if (hashed_password === false)
            return false;

        if (bcrypt.compareSync(password, hashed_password))
            return hashed_password;
        else
            return false;
    });

    return promise;
}

module.exports.verify_credentials = verify_credentials_with_database;