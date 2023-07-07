const sanitizer = require('sanitize-html');

const authentication = require('./authentication');

const dbFile = './models/db.db';

const sqlite = require('sqlite3').verbose();

const db = new sqlite.Database(dbFile);

const comment_content_names = [
    'post',
    'profile/company',
    'profile/user',
    'jobPost'
]

module.exports.database = db;

const is_registered_email = (email) => {
    let output;
    db.all('SELECT id FROM users WHERE email = ?;', [email], (err, rows) => {
        if (err)
        {
            console.log(`${err} while checking if email ${email} exists`);
            output = true;
            return true;
        }
        output = rows.length > 0;
    });
    return output;
};

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
                console.log(`${err} while trying to get password_hash for email ${email}`);
                reject(err);
            }
            resolve(row);
        })
    }).then((row) => {

        if (row === undefined)
            throw 'Email not found';

        credential = row["password_hash"];
        return credential;
    }).then((hashed_password) => {
        if (hashed_password === false)
            return false;

        if (bcrypt.compareSync(password, hashed_password))
            return hashed_password;
        else
            throw 'Incorrect password';
    });

    return promise;
};

module.exports.verify_credentials = verify_credentials_with_database;

const get_user_id = (email) => {
    let user_id = undefined;
    db.get('SELECT id FROM users WHERE email = ?;', [email], (err, row) => {
        if (err)
            console.log(`${err} while getting user id with email (${email})`)
        else
            user_id = row.id;
    })
    return user_id;
};

module.exports.get_user_id = get_user_id;

const get_user_info_by_email = (email) => {
    let user_info;
    db.get('SELECT id, first_name, last_name, image_url, has_deactivated_comments FROM users WHERE email = ?;', [email], (err, row) => {
        if (err)
        {
            console.log(`${err} while getting data for user with email ${email}`);
            return;
        }
        if (!row)
        {
            user_info = undefined;
            return user_info;
        }

        user_info = row;
        user_info.email = email;
    })
    return user_info;
};

const get_user_info_by_id = (id, is_company) => {
    let user_info;
    if (!is_company)
        db.get('SELECT email, first_name, last_name, image_url, has_deactivated_comments FROM users WHERE id = ?;', [id], (err, row) => {
            if (err)
            {
                console.log(`${err} while getting data for user with id ${id}`);
                return;
            }
            if (!row)
            {
                user_info = undefined;
                return user_info;
            }

            user_info = row;
            user_info.id = id;
        });
    else
        db.get('SELECT id, company_name, company_size FROM companies WHERE id = ?',
        [id], function(err, row) {
            if (err)
            {
                console.log(`${err} while getting basic data for company with id ${id}`);
                user_info = undefined;
                return user_info;
            }
            user_info = row;
        });
    return user_info;
};

module.exports.get_user_info_by_id = get_user_info_by_id;
module.exports.get_user_info_by_email = get_user_info_by_email;

const get_user_follows = (user_id, is_company) => {
    let output = [];
    db.all('SELECT follower_id, followed_is_company FROM follows WHERE follower_id = ? AND follower_is_company = ?;',
        [user_id, is_company], function (err, rows) {
            if (err)
            {
                console.log(`${err} while getting user follows -> parameters: user_id = ${user_id}, is_company = ${is_company}`);
                return output;
            }
            output = rows;
        });
    return output;
};

module.exports.get_user_follows = get_user_follows;

const get_user_posts = (user_id, is_company) => {
    let output;
    db.all('SELECT id, poster_id, is_company, text FROM posts WHERE poster_id = ? AND is_company = ?;',
        [user_id, is_company], function (err, rows) {
            if (err)
            {
                console.log(`Error while getting user posts -> params: user_id=${user_id}, is_company=${is_company}`)
                output = [];
                return output;
            }

            output = rows;
    });
    if (output.length == 0)
        return output;

    const user_info = get_user_info_by_id(user_id, is_company);
    output.forEach(post => {
        post['user'] = user_info;
        post['comment_count'] = get_post_comment_count(post.id);
    });

    return output;
};

module.exports.get_user_posts = get_user_posts;

const get_post_comments = function(post_id, is_company) {
    let output;
    db.all('SELECT * FROM comments WHERE content_name = "post" AND to_id = ? AND is_company = ?;',
        [post_id, is_company], function(err, rows) {
            if (err)
            {
                console.log(`${err} while getting post comments -> parameters: post_id=${post_id}, is_company=${is_company}`)
                output = [];
                return output;
            }
            output = rows;
    });
    return output;
};

const get_post_comment_count = function(post_id, is_company) {
    let output;
    db.get('SELECT COUNT(id) FROM comments WHERE content_name = "post" AND to_id = ? AND is_company = ?;',
    [post_id, is_company], function(err, row) {
        if (err)
        {
            console.log(`${err} while getting comments for post -> parameters: post_id=${post_id}`);
            output = 'error';
            return output;
        }
        output = row['COUNT(id)'];
    });
    return output;
};

module.exports.get_post_comments = get_post_comments;
module.exports.get_post_comment_count = get_post_comment_count;

const get_latest_posts = function(max_posts=100) {
    let posts = [];
    db.all(`SELECT * FROM posts ORDER BY id DESC LIMIT ${max_posts}`, function(err, rows) {
        if (err)
        {
            console.log()
            return posts;
        }
        rows.forEach(post => {
            post['user'] = get_user_info_by_id(post['poster_id'], post['is_company']);
            post['comment_count'] = get_post_comment_count(post['id'], post['is_company']);
        });
    });
    return posts;
};

/*
* Returns false if user isn't properly authenticated
* If there aren't enough posts from following 
*/
const get_relevant_posts = function(req, res, max_posts=100) {
    let posts = [];
    if (!authentication.require_authentication(req, res))
        return false;
    const user_id = get_user_id(email);
    posts += get_user_posts(user_id, false);
    let follows = get_user_follows(user_id, false);
    follows.forEach(follow => {
        posts += get_user_posts(follow.followed_id, follow.followed_is_company);
    });
    
    // Sort in descending (if the id is higher the post has been created recently)
    posts.sort((post_a, post_b) => post_b.id - post_a.id);

    if (posts.length > max_posts)
    {
        all_posts = posts;
        posts = [];
        for (let i = max_posts; i >= 0; i--) {
            posts.push(all_posts[i]);
        }
    }
    else if (posts.length < max_posts)
    {
        posts += get_latest_posts(max_posts=max_posts - posts.length);
    }
    return posts;
};

module.exports.get_latest_posts = get_latest_posts;
module.exports.get_relevant_posts = get_relevant_posts;

const post = function(user_id, is_company, text) {
    return new Promise(function(resolve, reject) {
        const sanitized_text = sanitizer(text);
        resolve(sanitized_text);
    }).then(function(post_text) {
        // Check if post text contains forbidden words
        return post_text;
    }).then(function(post_text) {
        db.run('INSERT INTO posts (poster_id, is_company, text) VALUES (?, ?, ?);',
        [user_id, is_company, post_text], function(err) {
            if (err)
            {
                console.log(`Error inserting post "${text}"`);
                throw "Error while inserting post";
            }
        });
    });
}

module.exports.post = post;