const express = require('express');
const jwt = require('jsonwebtoken');

const authentication = require('../public/server_side/authentication');
const db = require('../models/db');

const API_router = express.Router();

API_router.get('/is_liked', function(req, res) {
    new Promise(async function(resolve, reject) {
        const post_id = req.params.post_id;
        const content_name = req.params.content_name;
    
        if (post_id === undefined || content_name === undefined)
        {
            res.status(400).contentType('text/html').send('Parameters missing');
            return;
        }
    
        if (!authentication.require_authentication(req, res))
        {
            return;
        }
    
        const is_liked = await db.is_liked(req.session.credentials.user.id, req.session.credentials.user.is_company,
            post_id, content_name);
        res.status(200).send(JSON.stringify({
            "is_liked": is_liked
        }));
    });
});

API_router.post('/like', function(req, res) {
    new Promise(async function(resolve, reject) {
        const content_id = req.headers.content_id;
        const content_name = req.headers.content_name;

        let content_exists = true;
        if (content_name == 'post')
            content_exists = await db.post_exists(content_id);
        else if (content_name == 'comment')
            content_exists = await db.comment_exists(content_id);
        else
        {
            reject('Invalid content_type');
            return;
        }

        if (!content_exists)
        {
            reject('Post has been deleted');
            return;
        }

        if (!authentication.require_authentication(req, res))
        {
            reject("Forbidden");
            return;
        }

        const user_info = req.session.user;
        resolve({
            "content_id": content_id,
            "content_name": content_name,
            "user": user_info
        });
    }).then(async function(data) {
        data['is_liked'] = await db.is_liked(data.user.id, data.user.is_company, data.content_id, data.content_name);
        return data
    }).then(async function(data) {
        if (data.is_liked)
        {
            await db.unlike(data.user, data.content_id, data.content_name);
        }
        else
        {
            await db.like(data.user, data.content_id, data.content_name);
        }
        return !data.is_liked;
    }).then(function(is_liked) {
        res.status(200).send(is_liked);
    }).catch(function(reason) {
        if (reason == 'Forbidden')
            res.status(403).send();
        else
            res.status(400).send();
    });
});

module.exports = API_router;