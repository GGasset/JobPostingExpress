const express = require('express');
const sanitize = require("sanitize-html");

const authentication = require('../public/server_side/authentication');
const db = require('../models/db');

const main_router = express.Router();

const rendered_posts = 100;
main_router.get('/', (req, res) => {
	new Promise(async (resolve, reject) => {
		let posts = [];
		if (!authentication.is_authenticated(req))
		{
			posts = await db.get_latest_posts(rendered_posts);
		}
		else
		{
			posts = await db.get_relevant_posts(req, rendered_posts);
		}
		resolve(posts);
	})
	.then((posts) => {
		res.status(200).render('index.html', {
			"posts": posts,
			"req": req,
		});
	});
});

main_router.post('/post', (req, res) => {
	// Create post
	new Promise(async (resolve, reject) => {
		if (!authentication.require_authentication(req, res)) {
			reject();
			return;
		}

		const text = req.body.text;

		const as_company = req.session.as_company;
		const user_id = as_company ? req.session.company.id : req.session.user.id;

		db.insert_post(user_id, as_company, text)
		.catch((reason) => {
			if (reason === "Error while inserting post")
				res.status(500).send();
		}).then(function(value) {
			res.redirect('/');
		});
	}).catch(function (reason) {

	});
});

main_router.get('/post/:post_id', (req, res) => {
	new Promise((resolve, reject) => {
		const post_id = req.params.post_id;
		resolve(post_id);
	}).then(async function(post_id) {
		let user_info = undefined;
		if (authentication.is_authenticated(req))
			user_info = req.session.user;

		let post = await db.get_post(post_id, req);
		return post;

	}).then(function(post) {
		res.status(200).render('post.html', {
			'req': req,
			'post': post
		});
	});
});

main_router.post('/post/:post_id', async (req, res) => {
	const post_id = req.params.post_id;
	const text = req.body.text;

	if (!authentication.require_authentication(req, res))
		return;

	const as_company = req.session.as_company;
	let user_info = as_company ? req.session.company : req.session.user;
	await db.comment_on_post(user_info.id, as_company, post_id, text);
	

	res.redirect(`/post/${post_id}`);
});

module.exports = main_router;