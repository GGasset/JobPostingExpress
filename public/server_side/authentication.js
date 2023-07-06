const express = require('express');
const jwt = require('jsonwebtoken');

const is_authenticated = (req) => {
    let result = false;
    if (!req.session.authorization)
        return false

    jwt.verify(req.session.authorization.accessToken, process.env.JWTSecret, (err, user) => {
        if (err)
            result = false;
        else
            result = true;
    })
    return result;
}

const require_authentication = (req, res) => {
    if (!is_authenticated(req))
    {
        res.status(403).send();
        return false;
    }
    return true
}

const get_user_email = (req) => {
    if (!req.session.authorization)
        return false;
    return req.session.authorization.email;
}

module.exports.is_authenticated = is_authenticated;
module.exports.require_authentication = require_authentication;
module.exports.get_user_email = get_user_email;
