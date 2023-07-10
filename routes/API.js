const express = require('express');
const jwt = require('jsonwebtoken');

const authentication = require('../public/server_side/authentication');
const db = require('../public/server_side/db');

const API_router = express.Router();

API_router.get('/is_liked', async function(req, res) {
    const post_id = req.params.post_id;
    const is_comment = req.params.is_comment;

    if (post_id === undefined || is_comment === undefined ||
        user_id === undefined || accessToken === undefined)
    {
        res.status(400).contentType('text/html').send('Parameters missing');
        return;
    }

    if (!authentication.require_authentication(req, res))
    {
        return;
    }

    const is_liked = db.is_liked(user_id, post_id, is_comment)
    res.status(200).send(JSON.stringify({
        "is_liked": is_liked
    }));
});

module.exports = API_router;