const express = require("express");
const router = express.Router();

const path = require("path");

const constants = require("../constants");

router.get("/", (req, res) => res.render(path.join(__dirname, "..", "views/index"), constants));

module.exports = router;