const express = require('express');
const fs = require('fs');

const resources_router = express.Router();

const extension_dict = {
    ".js": "application/javascript",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".css": "text/css"
};

resources_router.get('/:resource', (req, res) => {
    new Promise((resolve, reject) => {
        const resource = req.params.resource;
        while (resource.includes('..'))
            resource.replace('..', '');
        const resource_path = `./public/${resource}`;
        resolve(resource_path);
    }).then((path) => {
        if (!fs.existsSync(path))
            throw "file not found";

        const path_separated_by_dots = path.split('.');
        const extension = `.${path_separated_by_dots[path_separated_by_dots.length - 1]}`;
        return {"path":path, "extension": extension};
    }).then((path_extension) => {
    const content_type = extension_dict[path_extension['extension']];
    if (content_type === undefined)
        throw "content_type not found";

    fs.readFile(path_extension['path'], function(err, data) {
        if (err)
            throw err;
        
        res.status(200).contentType(content_type).end(data);
    });
    }).catch((reason) => {
        if (reason === "file not found")
            res.status(404).send();
        else if (reason === "content_type not found")
        {
            console.log(`resource extension not found. requested path: ${req.url}`);
            res.status(500).send();
        }
        else if (reason === "content forbidden for users")
        {
            res.status(403).send();
        }
    });
});

module.exports = resources_router;