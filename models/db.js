const sanitizer = require('sanitize-html');

const authentication = require('../public/server_side/authentication');
const functionality = require("../functionality");

const dbFile = './models/db.db';

const sqlite3 = require('sqlite3');
const open = require('sqlite').open;

// sqlite Notes
/*
* db.get must return a value for proper execution or you must use a .then() function
*/

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
const { post, use } = require('../routes/resources');

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
    if (await is_user_in_company(user_info.id))
    {
        user_info.company_id = await get_user_company_id(user_info.id);
        user_info.is_company_admin = await is_user_company_admin(user_info.id);
    }
    return user_info;
};

const get_user_info_by_id = async (id) => {
    let user_info = 
        await db.get('SELECT id, email, first_name, last_name, image_url, has_deactivated_comments FROM users WHERE id = ?;', 
            [id]);

    if (await is_user_in_company(id))
    {
        user_info.company_id = await get_user_company_id(user_info.id);
        user_info.is_company_admin = await is_user_company_admin(user_info.id);
    }
    user_info['is_company'] = false;
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

    const user_info = is_company ? 
        await get_company_info(user_id) :
        await get_user_info_by_id(user_id);
    for (let post of posts) {
        post['user'] = user_info;
        post['comment_count'] = await get_post_comment_count(post.id);
        post['like_count'] = await get_like_count_of_post(post.id);
    };
    return posts;
};

const post_exists = async function(post_id)
{
    let post = await db.get('SELECT COUNT(id) FROM posts WHERE id = ?;', 
        [post_id]);

    return post['COUNT(id)'] != 0;
}

module.exports.get_user_posts = get_user_posts;
module.exports.post_exists = post_exists;

const comment_on_post = async function(user_id, is_company, post_id, text) {
    await db.run(`INSERT INTO comments(to_id, poster_id, poster_is_company, comment, content_name) VALUES (?, ?, ?, ?, ?);`,
                                [post_id, user_id, is_company, text, "post"]);
}

const get_post_comments = async function(post_id, req) {
    let comments = 
    await db.all('SELECT * FROM comments WHERE content_name = "post" AND to_id = ?;',
        [post_id]);

    for (let comment of comments) {
        comment['user'] = comment.poster_is_company ? 
            await get_company_info(comment.poster_id): 
            await get_user_info_by_id(comment.poster_id, comment.poster_is_company);

        comment['like_count'] = await get_like_count_of_comment(comment.id);
        if (req.session.credentials) {
            comment['is_liked'] = await is_liked(req, comment.id, 'comment')
        }
    };
    return comments;
};

const get_post_comment_count = async function(post_id) {
    let comment_count = 
        await db.get('SELECT COUNT(id) FROM comments WHERE content_name = "post" AND to_id = ?;',
            [post_id]);
    
    return comment_count['COUNT(id)'];
};

const comment_exists = async function(comment_id) {
    let comment_count = 
        (await db.get('SELECT COUNT(id) FROM comments WHERE id = ?;',
            [comment_id]))['COUNT(id)'];
    return comment_count != 0
}

module.exports.get_post_comments = get_post_comments;
module.exports.get_post_comment_count = get_post_comment_count;
module.exports.comment_on_post = comment_on_post;
module.exports.comment_exists = comment_exists;

const get_latest_posts = async function(max_posts=100) {
    let posts = 
        await db.all(`SELECT * FROM posts ORDER BY id DESC LIMIT ${max_posts}`);

    for (const post of posts) {
        post['user'] = post.poster_is_company ?
            await get_company_info(post.poster_id):
            await get_user_info_by_id(post.poster_id);
        post['like_count'] = await get_like_count_of_post(post.id);
        post['comment_count'] = await get_post_comment_count(post.id);
    }

    return posts;
};

/*
* Returns false if user isn't properly authenticated
* If there aren't enough posts from following latest posts are retrieved
*/
const get_relevant_posts = async function(req, max_posts=100) {
    let posts = [];

    const user_info = req.session.user;
    const company_info = req.session.company;
    const as_company = req.session.as_company;
    const user_id = as_company?
        company_info.id:
        user_info.id;

    posts = posts.concat(await get_user_posts(user_id, as_company));

    let follows = await get_user_follows(user_id, as_company);
    for (const follow of follows) {
        posts = posts.concat(await get_user_posts(follow.followed_id, follow.followed_is_company));
    }

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
        
        if (posts.length > 0)
        {
            latest_posts = latest_posts.filter(new_post => {
                return posts.findIndex((post) => new_post.id == post.id) == -1;
            });
        }
        posts = posts.concat(latest_posts);
    }

    for (const post of posts) {
        post.is_liked = await is_liked(req, post.id, "post");
    }
    return posts;
};

module.exports.get_latest_posts = get_latest_posts;
module.exports.get_relevant_posts = get_relevant_posts;

const get_post = async function(post_id, req)
{
    let post = 
        await db.get('SELECT * FROM posts WHERE id = ?;',
            [post_id]);

    post['like_count'] = await get_like_count_of_post(post.id);
    post['user'] = post.poster_is_company ? await get_company_info(post.poster_id) : await get_user_info_by_id(post.poster_id);
    post['comments'] = await get_post_comments(post.id, req);
        
    if (!req.session.credentials)
    {
        return post;
    }
    if (!req.session.credentials.accessToken)
    {
        return post;
    }
    if (req.session.as_company) {
        post['is_liked'] = await is_liked(req, post_id, 'post')
    }
    else {
        post['is_liked'] = await is_liked(req, post_id, 'post');
    }
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

const is_liked = async function(req, content_id, content_name) {
    const as_company = req.session.as_company;
    const user_id = as_company ? 
        req.session.company.id : 
        req.session.user.id;
    let like =
    await db.get(`SELECT * FROM likes WHERE user_id=? AND user_is_company=? AND content_id=? AND content_name=?;`, 
        [user_id, as_company, content_id, content_name]);

    return like !== undefined;
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

const like = async function(req, post_id, content_name)
{
    const as_company = req.session.as_company;
    const user_id = as_company ? req.session.company.id :  req.session.user.id;
    await db.run('INSERT INTO likes(user_id, user_is_company, content_id, content_name) VALUES (?, ?, ?, ?);',
        [user_id, as_company, post_id, content_name]);
}

const unlike = async function(req, post_id, content_name)
{
    const as_company = req.session.as_company;
    const user_id = as_company ? req.session.company.id : req.session.user.id;

    await db.run('DELETE FROM likes WHERE user_id = ? AND user_is_company = ? AND content_id = ? AND content_name = ?;',
        [user_id, as_company, post_id, content_name]);
}

module.exports.is_liked = is_liked;
module.exports.get_like_count_of_post = get_like_count_of_post;
module.exports.get_like_count_of_comment = get_like_count_of_comment;
module.exports.like = like;
module.exports.unlike = unlike;

// Companies

const is_user_in_company = async function(user_id) {
    const is_user_in_company = (await db.get('SELECT COUNT(user_id) FROM users_from_company WHERE user_id = ?;',
        [user_id]))['COUNT(user_id)'];
    return is_user_in_company != 0;
}

const get_company_info = async function(company_id) {
    let company_info = await db.get('SELECT id, company_name, company_size, image_url FROM companies WHERE id = ?;',
        [company_id]);
    
    company_info['is_company'] = true;
    return company_info;
}

const get_user_company_id = async function(user_id) {
    const company_id = (await db.get('SELECT company_id FROM users_from_company WHERE user_id = ?;',
        [user_id]))['company_id'];
    
    if (!company_id)
        return null;

    return company_id;
}


const is_user_company_admin = async function(user_id) {
    const is_admin = (await db.get('SELECT is_admin FROM users_from_company WHERE user_id = ?;'),
        [user_id])['is_admin'];

    return is_admin != 0;
}

const register_company = async function(password_hash, company_name, company_size, creator_id)
{
    let company_id = (await db.get('SELECT MAX(id) FROM companies;'))['Max(id)'] + 1;
    if (!company_id)
        company_id = 1;

    await db.run('INSERT INTO companies(id, password_hash, company_name, company_size) VALUES (?, ?, ?, ?);',
        [company_id, password_hash, company_name, company_size]);

    await db.run('INSERT INTO users_from_company(user_id, company_id, is_admin) VALUES (?, ?, ?)',
        [creator_id, company_id, 1]);
}

const get_company_access_token_data = async function(company_id) {
    return await db.get('SELECT id, password_hash FROM companies WHERE id = ?;',
        [company_id]);
}

module.exports.is_user_in_company = is_user_in_company;
module.exports.get_company_info = get_company_info;
module.exports.get_user_company_id = get_user_company_id;
module.exports.is_user_company_admin = is_user_company_admin;
module.exports.register_company = register_company;
module.exports.get_company_access_token_data = get_company_access_token_data;

let jobs_per_page = 20;

const insert_job = async function(specifications) {
    for (let i = 0; i < specifications.keys.length; i++) {
        const key = specifications.keys[i];
        if (key === undefined)
            specifications.keys[i] = "NULL";
    }
}

const get_jobs_for_location_without_specifications = async function(location) {


}

const get_latest_jobs = async function(n_page) {
    date = functionality.get_date();
    jobs = await db.all("SELECT jobs.id, jobs.title, companies.company_size, companies.company_web_url, companies.image_url FROM jobs JOIN companies ON jobs.company_id = companies.id WHERE jobs.opening_date > ? AND is_closed = 0 LIMIT ? OFFSET ?;",
        (date, jobs_per_page, n_page * jobs_per_page));
}

const get_jobs_per_specifications = async function(specifications) {
  
}

module.exports.insert_job = insert_job;
module.exports.get_jobs_for_location_without_specifications = get_jobs_for_location_without_specifications;
module.exports.get_jobs_per_specifications = get_jobs_per_specifications;