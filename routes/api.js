const express = require("express");

const router = express.Router();
const browseController = require("../controllers/api/browseController");
const searchController = require("../controllers/api/searchController");
const audioController = require("../controllers/api/audioController");

const isAuth = require("../middlewares/is-auth");

// ? browse routes
router.get("/home/browse/all", browseController.browseHomeAll);
router.get("/home/browse/:type", browseController.browseHome);
router.get("/lyrics/browse", isAuth, browseController.browseLyrics);
router.get("/genre/browse", browseController.browseGenre);
router.get(
  "/browse",
  // isAuth,
  browseController.browseId,
);

// ? search routes
router.get("/search", isAuth, searchController.search);
router.get("/search_next", isAuth, searchController.search_next_results);
router.get("/search_suggestions", isAuth, searchController.search_suggestions);

// ? audio router
// added -> getYtcoreAudio, getInvidiousAudio
router.get("/audio", audioController.getAudio);
// router.get("/ytdl/audio", audioController.getYtcoreAudio);
// router.get("/invidious/audio", audioController.getInvidiousAudio);

router.get("/audio-download", audioController.audioDownload);
// * fixed
router.get("/audio/next", isAuth, audioController.getNextSongs);
router.post("/audio/get_queue", audioController.getQueue);
router.get("/change-server", audioController.changeAudioServer);
router.get("/server-stats", audioController.getServerStatus);

module.exports = router;
