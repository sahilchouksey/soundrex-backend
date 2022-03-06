const {
  extractYoutube,
  extractFromYtdlCore,
  extractFromInvidious,
  extractFromBeatbump,
  extractFromAlltube249,
  extractFromAlltube250,
  extractFromAlltube251,
} = require("../../helper/extractYoutube");
// const { promisify } = require("util");
// const stream = require("stream");
// const pipeline = promisify(stream.pipeline);

const memoryClient = require("../../lib/cache/memory");

let httpProxy = require("http-proxy");
let proxy = httpProxy.createProxyServer({ ignorePath: true });
const https = require("https");
const fs = require("fs");

const {
  create_return_error,
  objectIsEmpty,
} = require("../../helper/functions");
const YtMusic = require("../../lib/youtubeMusicApi");
const Parser = require("../../lib/parser.api");
const { queueAddEndpoint } = require("../../lib/parser.api");
const asyncAsync = require("async");

const audioServers = [
  {
    function: extractFromYtdlCore,
    isDefault: true,
    name: "extractFromYtdlCore",
    isSelected: false,
  },
  {
    function: extractFromBeatbump,
    name: "extractFromBeatbump",
    isSelected: false,
  },
  {
    function: extractFromInvidious,
    name: "extractFromInvidious",
    isSelected: false,
  },
  {
    function: extractFromAlltube251,
    name: "extractFromAlltube251",
    isSelected: false,
  },
  {
    function: extractFromAlltube250,
    name: "extractFromAlltube250",
    isSelected: false,
  },
  {
    function: extractFromAlltube249,
    name: "extractFromAlltube249",
    isSelected: false,
  },
  {
    function: extractYoutube,
    name: "extractYoutube",
    isSelected: false,
  },
];

const changeToNextAudioServer = () => {
  const totalServers = audioServers.length;

  // const selectedServer = audioServers.find(s => s.isSelected) || audioServers.find(s => s.isDefault);
  const selectedServerIndex = audioServers.findIndex((s) => s.isSelected);

  const currentSelectedServerIndex =
    selectedServerIndex >= 0
      ? selectedServerIndex
      : audioServers.findIndex((s) => s.isDefault);

  const nextServerIndex = currentSelectedServerIndex + 1;

  let nextSelServerIndex;

  if (nextServerIndex >= totalServers) {
    nextSelServerIndex = 0;
  } else {
    nextSelServerIndex = nextServerIndex;
  }

  // audioServers.forEach((s) => (s.isSelected = false));
  for (let i = 0; i < totalServers; i++) {
    if (i === nextSelServerIndex) {
      audioServers[i].isSelected = true;
    } else {
      audioServers[i].isSelected = false;
    }
  }

  console.log(
    "\n\n\nChanging audio server from ",
    currentSelectedServerIndex,
    " to ",
    nextSelServerIndex,
    audioServers[nextSelServerIndex]
  );
};

const currentAudioServer = () => {
  const selectedServer = audioServers.findIndex((s) => s.isSelected);

  const currentSelectedServerIndex =
    selectedServer >= 0
      ? selectedServer
      : audioServers.findIndex((s) => s.isDefault);

  console.info(
    "getting audio from : " + audioServers[currentSelectedServerIndex].name
  );

  return audioServers[currentSelectedServerIndex];
};

/*
exports.getYtcoreAudio = async (req, res, next) => {
  let { id } = req.query;
  try {
    const data = await extractFromYtdlCore(id, "audio");
    return res.json(data);
    // const cache = await memoryClient.get(`/audio`, id);

    // let audio;
    // if (cache) {
    //   audio = cache;
    // } else {
    //   audio = await extractYoutube(id, "audio");
    // }

    // if (!audio || (audio && objectIsEmpty(audio))) {
    //   next(create_return_error("No audio found", 404));
    // }

    // res.setHeader(
    //   "Content-disposition",
    //   "inline; filename=videoplayback." + audio.container || "webm_dash"
    // );
    // // res.setHeader('Content-disposition', 'attachment; filename=videoplayback.'+audio.container);
    // res.setHeader("Content-type", audio.mimeType || "audio/webm");

    // if (!cache) await memoryClient.set(`/audio`, id, audio, 2); // 2 hour

    // return proxy.web(req, res, {
    //   target: audio?.url || audio,
    //   changeOrigin: true,
    // });
  } catch (error) {
    console.error(error);
  }
};

exports.getInvidiousAudio = async (req, res, next) => {
  let { id } = req.query;
  try {
    const data = await extractFromInvidious(id, "audio");
    return res.json(data);
    // const cache = await memoryClient.get(`/audio`, id);

    // let audio;
    // if (cache) {
    //   audio = cache;
    // } else {
    //   audio = await extractYoutube(id, "audio");
    // }

    // if (!audio || (audio && objectIsEmpty(audio))) {
    //   next(create_return_error("No audio found", 404));
    // }

    // res.setHeader(
    //   "Content-disposition",
    //   "inline; filename=videoplayback." + audio.container || "webm_dash"
    // );
    // // res.setHeader('Content-disposition', 'attachment; filename=videoplayback.'+audio.container);
    // res.setHeader("Content-type", audio.mimeType || "audio/webm");

    // if (!cache) await memoryClient.set(`/audio`, id, audio, 2); // 2 hour

    // return proxy.web(req, res, {
    //   target: audio?.url || audio,
    //   changeOrigin: true,
    // });
  } catch (error) {
    console.error(error);
  }
};
*/

const getAudioFromYt = async (id) => {
  try {
    // const cache = await memoryClient.get(`/audio`, id);

    // let audio;
    // if (cache) {
    //   audio = cache;
    // } else {
    const audio = await currentAudioServer().function(id, "audio");
    // }

    if (!audio || (audio && objectIsEmpty(audio))) {
      throw create_return_error("No audio found", 404);
    }

    // if (!cache) await memoryClient.set(`/audio`, id, audio, 2); // 2 hour

    return audio;
  } catch (error) {
    console.error(error);
    changeToNextAudioServer();
    // next(error);
    let status = error?.status || 404;
    const stderr = error?.stderr;
    let msg;
    if (stderr) {
      const errorTextInd = stderr.indexOf("ERROR");
      msg = stderr.substr(errorTextInd);
      const newLineInd = msg.indexOf("\n");
      msg = msg.substr(0, newLineInd);
      throw new Error(msg);
    }

    throw error;

    // await memoryClient.set(`/audio`, id, false, 0); // 0 hour
    // const message = error?.stderr.substr();
    // return res.status(status).json(msg ? { message: msg } : error);
  }
};

exports.getAudio = async (req, res, next) => {
  let { id } = req.query;
  try {
    const cache = false;
    // await memoryClient.get(`/audio`, id);

    let audio;
    if (cache) {
      audio = cache;
      if (!audio || (audio && objectIsEmpty(audio))) {
        next(create_return_error("No audio found", 404));
      }

      const container =
        audio?.container || "webm_dash" || "mp3" || "webm" || "mp4a";

      const mimeType =
        audio?.mimeType || audio?.type || 'audio/webm; codecs="opus"';
      res.setHeader(
        "Content-disposition",
        `inline; filename=${id}.` + container
      );
      res.setHeader("Content-type", mimeType);

      return proxy.web(req, res, {
        target: audio?.url || audio,
        changeOrigin: true,
      });
    } else {
      return asyncAsync.retry(
        7,
        getAudioFromYt.bind(null, id),
        async function (err, result) {
          try {
            if (err) {
              console.log(err);
              throw err;
            }

            audio = result;

            if (!audio || (audio && objectIsEmpty(audio))) {
              throw create_return_error("No audio found", 404);
            }

            await memoryClient.set(`/audio`, id, audio, 2); // 2 hour

            const container =
              audio?.container || "webm_dash" || "mp3" || "webm" || "mp4a";

            const mimeType =
              audio?.mimeType || audio?.type || 'audio/webm; codecs="opus"';
            res.setHeader(
              "Content-disposition",
              `inline; filename=${id}.` + container
            );
            // res.setHeader('Content-disposition', 'attachment; filename=videoplayback.'+audio.container);
            res.setHeader("Content-type", mimeType);

            const final = audio?.url || audio;
            return proxy.web(req, res, {
              target: final,
              changeOrigin: true,
            });
          } catch (error) {
            next(err);
          }
        }
      );
    }
  } catch (error) {
    // await memoryClient.set(`/audio`, id, false, 0); // 0 hour
    // const message = error?.stderr.substr();
    // return res.json(error);
    next(error);
  }
};

exports.audioDownload = async (req, res, next) => {
  let { id, title } = req.query;
  // try {
  //   const cache = await memoryClient.get(`/audio`, id);

  //   let audio;
  //   if (cache) {
  //     audio = cache;
  //   } else {
  //     audio = await extractYoutube(id, "audio");
  //   }

  //   if (!audio || (audio && objectIsEmpty(audio))) {
  //     // next(create_return_error("No audio found", 404));
  //   }

  //   res.setHeader(
  //     "Content-disposition",
  //     `attachment; filename=${title.trim() || id}.mp3`
  //   );
  //   // res.setHeader('Content-disposition', 'attachment; filename=videoplayback.'+audio.container);
  //   res.setHeader("Content-type", audio.mimeType || "audio/mp3");

  //   //    return https.get(audio, (response) => {
  //   //      response.pipe(res)
  //   //    })

  //   if (!cache) await memoryClient.set(`/audio`, id, audio, 2); // 2 hour

  //   return proxy.web(req, res, {
  //     target: audio?.url || audio,
  //     changeOrigin: true,
  //   });
  // } catch (error) {
  //   console.error(error);
  //   // next(error);
  //   let status = error?.status || 404;
  //   const stderr = error?.stderr;
  //   let msg;
  //   if (stderr) {
  //     const errorTextInd = stderr.indexOf("ERROR");
  //     msg = stderr.substr(errorTextInd);
  //     const newLineInd = msg.indexOf("\n");
  //     msg = msg.substr(0, newLineInd);
  //   }

  //   // await memoryClient.set(`/audio`, id, false, 0); // 0 hour

  //   // const message = error?.stderr.substr();
  //   return res.status(status).json(msg ? { message: msg } : error);
  // }

  try {
    const cache = false;
    // await memoryClient.get(`/audio`, id);

    if (cache) {
      audio = cache;
      if (!audio || (audio && objectIsEmpty(audio))) {
        next(create_return_error("No audio found", 404));
      }

      const container =
        audio?.container || "webm_dash" || "mp3" || "webm" || "mp4a";

      const mimeType =
        audio?.mimeType || audio?.type || 'audio/webm; codecs="opus"';
      res.setHeader(
        "Content-disposition",
        `attachment; filename=${title.trim() || id}.mp3`
      );
      res.setHeader("Content-type", mimeType);

      return proxy.web(req, res, {
        target: audio?.url || audio,
        changeOrigin: true,
      });
    } else {
      return asyncAsync.retry(
        7,
        getAudioFromYt.bind(null, id),
        async function (err, result) {
          try {
            if (err) {
              console.log(err);
              throw err;
            }

            audio = result;

            if (!audio || (audio && objectIsEmpty(audio))) {
              throw create_return_error("No audio found", 404);
            }

            await memoryClient.set(`/audio`, id, audio, 2); // 2 hour

            const container =
              audio?.container || "webm_dash" || "mp3" || "webm" || "mp4a";

            const mimeType =
              audio?.mimeType || audio?.type || 'audio/webm; codecs="opus"';
            res.setHeader(
              "Content-disposition",
              `attachment; filename=${title.trim() || id}.mp3`
            );
            res.setHeader("Content-type", mimeType);

            const final = audio?.url || audio;
            return proxy.web(req, res, {
              target: final,
              changeOrigin: true,
            });
          } catch (error) {
            next(err);
          }
        }
      );
    }
  } catch (error) {
    // await memoryClient.set(`/audio`, id, false, 0); // 0 hour
    // const message = error?.stderr.substr();
    // return res.json(error);
    next(error);
  }
};

exports.getNextSongs = async (req, res, next) => {
  const { id, params, playlistId, idx, continuation } = req.query;

  try {
    const cache = await memoryClient.get(
      `/nextSongs`,
      id + params + playlistId + idx + continuation
    );

    if (cache) {
      return res.json(cache);
    }

    const result = await YtMusic.next_songs(
      id,
      params,
      playlistId,
      idx,
      continuation
    );

    // if (continuation) {
    //   return res.json(result);
    // }
    // error handling
    if (
      !continuation &&
      (!result ||
        (result &&
          objectIsEmpty(
            result?.contents?.singleColumnMusicWatchNextResultsRenderer
          )))
    ) {
      next(create_return_error("No result found", 404));
    }

    let songData = Parser.singleColumnMusicWatchNextResultsRenderer(
      result.contents.singleColumnMusicWatchNextResultsRenderer
    );

    songData.currentVideoEndpoint =
      result?.currentVideoEndpoint &&
      Parser.findNavigationEndpoint({
        navigationEndpoint: result.currentVideoEndpoint,
      });

    // error handling
    if (
      !continuation &&
      (!songData || (songData && objectIsEmpty(songData?.next_songs?.list)))
    ) {
      next(create_return_error("No result found", 404));
    }

    // * development only
    let status = 200;
    if (
      !continuation &&
      ((songData && songData.next_songs.list?.list?.length <= 0) ||
        !songData.next_songs.list?.title)
    ) {
      // return res.json(result);
      // List is empty
      songData.hack = true;
      songData.message = "Up next list is empty.";
      // status = 204;
    }

    if (
      (continuation && !result?.continuationContents) ||
      (result?.continuationContents &&
        objectIsEmpty(result?.continuationContents))
    ) {
      next(create_return_error("No result found", 404));
    }

    if (continuation) {
      songData.next_songs.list = Parser.continuationContents(
        result.continuationContents,
        false,
        true
      );
    }

    await memoryClient.set(
      `/nextSongs`,
      id + params + playlistId + idx + continuation,
      songData,
      4
    ); // 2 hour

    return res.status(status).json(songData);
  } catch (error) {
    next(error);
  }
};

exports.getQueue = async (req, res, next) => {
  const { videoIds, playlistId } = req.body;

  try {
    if (videoIds?.length === 0 && !playlistId) {
      create_return_error("INVALID ID", 404);
    }

    const memoid = videoIds?.join("") || "";

    const cache = await memoryClient.get(`/queue`, memoid + playlistId);

    if (cache) {
      return res.json(cache);
    }

    const result = await YtMusic.get_queue(videoIds, playlistId);

    // error handling
    if (!result || (result && result?.queueDatas?.length <= 0)) {
      next(create_return_error("Unable to add to queue", 404));
    }

    const final = { queue: [] };

    for (let item of result?.queueDatas) {
      const playlistPanelVideoRenderer =
        item?.content?.playlistPanelVideoRenderer;
      if (playlistPanelVideoRenderer) {
        final.queue.push(
          Parser.playlistPanelVideoRenderer(playlistPanelVideoRenderer)
        );
      }
    }

    final.queue = final.queue.slice(0, 40);

    await memoryClient.set(`/queue`, memoid + playlistId, final, 4); // 4 hour

    return res.json(final);
  } catch (error) {
    next(error);
  }
};

exports.changeAudioServer = async (req, res, next) => {
  let { s, key } = req.query;

  try {
    if (key !== process.env.CHANGE_COOKIE_KEY) {
      throw create_return_error("Fuck Off!");
    }

    const server = audioServers.find((ser) => ser.name === s);
    if (!server) {
      throw create_return_error("Server not found!");
    }

    const totalServers = audioServers.length;

    for (let i = 0; i < totalServers; i++) {
      if (audioServers[i].name === s) {
        audioServers[i].isSelected = true;
      } else {
        audioServers[i].isSelected = false;
      }
    }

    return res.json({ updatedServers: audioServers });
  } catch (error) {
    next(error);
  }
};
