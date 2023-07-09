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

module.exports.is_authenticated = is_authenticated;
module.exports.require_authentication = require_authentication;