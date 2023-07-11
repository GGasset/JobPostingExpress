const sanitizer = require('sanitize-html');

const authentication = require('./authentication');

const dbFile = './models/db.db';

const sqlite3 = require('sqlite3');
const open = require('sqlite').open;

// For easier debugging
sqlite3.verbose();

// Open database
let db;

open({
  filename: dbFile,
  driver: sqlite3.Database
}).then((database) => {
    db = database;
}).then(() => {
    module.exports.database = db;
});

const comment_content_names = [
    'post',
    'profile/company',
    'profile/user',
]

const like_content_name = [
    'post',
    'comment'
]

const is_registered_email = async (email) => {
    let output = await db.all('SELECT id FROM users WHERE email = ?;', [email]);
    return output.length > 0;
};

module.exports.is_registered_email = is_registered_email;

const bcrypt = require('bcrypt');
const { post } = require('../../routes/resources');

/*
* Returns false if email/password don't match or the hashed password if they do
*/
const verify_credentials_with_database = function(email, password) {
    return db.get('SELECT password_hash FROM users WHERE email = ?;', [email])
    .then(function(row) {
        if (row === undefined)
            throw 'Email not found';

        credential = row["password_hash"];
        return credential;
    }).then((hashed_password) => {
        if (bcrypt.compareSync(password, hashed_password))
            return hashed_password;
        else
            throw 'Incorrect password';
    });
};

module.exports.verify_credentials = verify_credentials_with_database;

const get_user_id = async (email) => {
    let user_id = await db.get('SELECT id FROM users WHERE email = ?;', [email]);
    return user_id.id;
};

module.exports.get_user_id = get_user_id;

const get_user_info_by_email = async (email) => {
    let user_info = 
        await db.get('SELECT id, first_name, last_name, image_url, has_deactivated_comments FROM users WHERE email = ?;', 
            [email]);
    user_info.email = email;
    user_info.is_company = false;

    return user_info;
};

const get_user_info_by_id = async (id, is_company) => {
    let user_info;
    if (is_company)
        user_info = 
        await db.get('SELECT id, company_name, company_size FROM companies WHERE id = ?',
            [id]);
    else
        user_info = 
        await db.get('SELECT id, email, first_name, last_name, image_url, has_deactivated_comments FROM users WHERE id = ?;', 
            [id]);

    user_info['is_company'] = is_company;
    return user_info;
};

module.exports.get_user_info_by_id = get_user_info_by_id;
module.exports.get_user_info_by_email = get_user_info_by_email;

const get_user_follows = async (user_id, is_company) => {
    let output = 
    await db.all('SELECT follower_id, followed_is_company FROM follows WHERE follower_id = ? AND follower_is_company = ?;',
    [user_id, is_company]);
    return output;
};

module.exports.get_user_follows = get_user_follows;

const get_user_posts = async (user_id, is_company) => {
    let posts = 
    await db.all('SELECT id, poster_id, poster_is_company, text FROM posts WHERE poster_id = ? AND poster_is_company = ?;',
    [user_id, is_company]);

    const user_info = await get_user_info_by_id(user_id, is_company);
    for (let post of posts) {
        post['user'] = user_info;
        post['comment_count'] = await get_post_comment_count(post.id);
        post['like_count'] = await get_like_count_of_post(post.id);
    };
    console.log(posts)
    return posts;
};

module.exports.get_user_posts = get_user_posts;

const comment_on_post = async function(user_id, is_company, post_id, text) {
    await db.run(`INSERT INTO comments(to_id, poster_id, poster_is_company, comment, content_name) VALUES (?, ?, ?, ?, ?);`,
                                [post_id, user_id, is_company, text, "post"]);
}

const get_post_comments = async function(post_id) {
    let comments = 
    await db.all('SELECT * FROM comments WHERE content_name = "post" AND to_id = ?;',
        [post_id]);

    for (let comment of comments) {
        comment['user'] = await get_user_info_by_id(comment.poster_id, comment.poster_is_company);
        comment['like_count'] = await get_like_count_of_comment(comment.id);
    };
    return comments;
};

const get_post_comment_count = async function(post_id) {
    let comment_count = 
        await db.get('SELECT COUNT(id) FROM comments WHERE content_name = "post" AND to_id = ?;',
            [post_id]);
    
    return comment_count['COUNT(id)'];
};

module.exports.get_post_comments = get_post_comments;
module.exports.get_post_comment_count = get_post_comment_count;
module.exports.comment_on_post = comment_on_post;

const get_latest_posts = async function(max_posts=100) {
    let posts = 
        await db.all(`SELECT * FROM posts ORDER BY id DESC LIMIT ${max_posts}`);

    for (const post of posts) {
        post['user'] = await get_user_info_by_id(post.poster_id, post.poster_is_company);
        post['like_count'] = await get_like_count_of_post(post.id);
        post['comment_count'] = await get_post_comment_count(post.id);
    }

    return posts;
};

/*
* Returns false if user isn't properly authenticated
* If there aren't enough posts from following latest posts are retrieved
*/
const get_relevant_posts = async function(req, res, max_posts=100) {
    let posts = [];
    if (!authentication.require_authentication(req, res)) {
        return false;
    }
    const user_id = req.session.credentials.user.id;
    posts = posts.concat(await get_user_posts(user_id, false));
    let follows = await get_user_follows(user_id, false);
    for (const follow of follows) {
        posts = posts.concat(await get_user_posts(follow.followed_id, follow.followed_is_company));
    };

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
        let latest_posts = await get_latest_posts(max_posts=max_posts - posts.length);
        latest_posts = latest_posts.filter(new_post => {
            posts.findIndex((post) => new_post.id == post.id) == -1;
        });
        posts = posts.concat(latest_posts);
    }
    return posts;
};

module.exports.get_latest_posts = get_latest_posts;
module.exports.get_relevant_posts = get_relevant_posts;

const get_post = async function(post_id)
{
    let post = 
        await db.get('SELECT * FROM posts WHERE id = ?;',
            [post_id]);

    post['like_count'] = await get_like_count_of_post(post.id);
    post['user'] = await get_user_info_by_id(post.poster_id, post.poster_is_company);
    post['comments'] = await get_post_comments(post.id);
    return post;
}

const insert_post = async function(user_id, is_company, text) {
    return new Promise(function(resolve, reject) {
        const sanitized_text = sanitizer(text);
        resolve(sanitized_text);
    }).then(function(post_text) {
        // Check if post text contains forbidden words
        return post_text;
    }).then(async function(post_text) {
        await db.run('INSERT INTO posts (poster_id, poster_is_company, text) VALUES (?, ?, ?);',
            [user_id, is_company, post_text])
            .catch((reason) => {
                console.log(reason);
            });
    });
}

module.exports.get_post = get_post;
module.exports.insert_post = insert_post;

const is_liked = async function(user_id, user_is_company, post_id, is_comment) {
    let content_name;
    if (is_comment)
        content_name = 'comment';
    else
        content_name = 'post';

    let like =
    await db.get(`SELECT * FROM likes WHERE user_id=? AND user_is_company=? AND content_id=? AND content_name=${content_name};`, 
        [user_id, user_is_company, post_id]);

    if (like)
    {
        return true;
    }
    else
    {
        return false;
    }
}

const get_like_count_of_post = async function(post_id)
{
    let like_count = (await db.get("SELECT COUNT(content_id) FROM likes WHERE content_id = ? AND content_name = ?;",
        [post_id, "post"]))['COUNT(content_id)'];
    return like_count;
}

const get_like_count_of_comment = async function(comment_id)
{
    let like_count = (await db.get("SELECT COUNT(content_id) FROM likes WHERE content_id = ? AND content_name = ?;",
        [comment_id, "comment"]))['COUNT(content_id)'];
    return like_count;
}

const like_post = async function(user_info, post_id)
{
    await db.run('INSERT INTO likes(user_id, user_is_company, content_id, content_name) VALUES (?, ?, ?, ?);',
        [user_info.id, user_info.is_company, post_id, "post"]);
}

module.exports.is_liked = is_liked;
module.exports.get_like_count_of_post = get_like_count_of_post;
module.exports.get_like_count_of_comment = get_like_count_of_comment;
module.exports.like_post = like_post;