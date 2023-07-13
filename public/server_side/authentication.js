const express = require('express');
const jwt = require('jsonwebtoken');

const is_authenticated = (req) => {
    let result = false;
    if (!req.session.credentials)
        return false

    jwt.verify(req.session.credentials.accessToken, process.env.JWTSecret, (err, user) => {
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

const is_authenticated_as_company = function(req)
{
    if (!is_authenticated(req))
    {
        return false;
    }

    if (!req.session.credentials.companyAccessToken)
    {
        return false;
    }

    let is_verified = true;
    jwt.verify(req.session.credentials.companyAccessToken, process.env.JWTSecret, function(err, company_data) {
        if (err) {
            is_verified = false;
        }
    });
    return is_verified;
}

const require_company_authentication = function(req, res)
{
    if (!is_authenticated_as_company(req))
    {
        res.status(403).send();
        return false;
    }
    return true;
}

module.exports.is_authenticated_as_company = is_authenticated_as_company
module.exports.require_company_authentication = require_company_authentication;