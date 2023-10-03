const express = require("express");

const jobs_router = express.Router();

jobs_router.get("/latest_jobs/:page", (req, res) => {
     const n_page = req.params.page;
         
});

module.exports = jobs_router;