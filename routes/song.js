const express = require("express");

const router = express.Router();

const isAuth = require("../middlewares/is-auth");

const SongController = require("../controllers/song");

// like-song
router.post("/like", isAuth, SongController.likeSong);
router.post("/remove-like", isAuth, SongController.removeLikeFromSong);

router.post("/is-liked", isAuth, SongController.isLiked);

router.get("/favourites", isAuth, SongController.getLibrary);

module.exports = router;
