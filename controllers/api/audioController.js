const {
  extractYoutube,
  extractFromYtdlCore,
  extractFromInvidious,
  extractFromBeatbump,
  extractFromAlltube249,
  extractFromAlltube250,
  extractFromAlltube251,
  extractFromYoutubeRaw,
  extractFromPipeDaAPI,
  extractFromProxyYtdl,
  getPipedManager,
  pipedHealthCheck,
  resetPipedInstances,
  getPipedInstancesStatus,
  getProxyYtdlExtractor,
  getProxyYtdlStats,
  refreshProxyList,
  testProxyExtraction,
} = require("../../helper/extractYoutube");

const memoryClient = require("../../lib/cache/memory");
const httpProxy = require("http-proxy");
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  ignorePath: true,
  secure: false,
  followRedirects: true,
});
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
    function: extractFromProxyYtdl,
    name: "extractFromProxyYtdl",
    isActive: true,
  },
  {
    function: extractFromPipeDaAPI,
    name: "extractFromPipeDaAPI",
    isActive: true,
  },
  {
    function: extractFromYtdlCore,
    name: "extractFromYtdlCore",
    isActive: true,
  },
  {
    function: extractFromYoutubeRaw,
    name: "extractFromYoutubeRaw",
    isActive: true,
  },
  {
    function: extractFromInvidious,
    name: "extractFromInvidious",
    isActive: true,
  },
  {
    function: extractFromBeatbump,
    name: "extractFromBeatbump",
    isActive: true,
  },
  {
    function: extractFromAlltube251,
    name: "extractFromAlltube251",
    isActive: true,
  },
  {
    function: extractFromAlltube250,
    name: "extractFromAlltube250",
    isActive: true,
  },
  {
    function: extractFromAlltube249,
    name: "extractFromAlltube249",
    isActive: true,
  },
  {
    function: extractYoutube,
    name: "extractYoutube",
    isActive: true
  },
];

let currentServerIndex = 0;

const getNextActiveServer = () => {
  const startIndex = currentServerIndex;
  do {
    currentServerIndex = (currentServerIndex + 1) % audioServers.length;
    if (audioServers[currentServerIndex].isActive) {
      console.log(
        `Changing audio server to: ${audioServers[currentServerIndex].name}`,
      );
      return audioServers[currentServerIndex];
    }
  } while (currentServerIndex !== startIndex);

  throw new Error("No active audio servers available");
};


const getAudioFromYt = async (id, retryCount = 0) => {
  const maxRetries = audioServers.length; // Try each server once

  if (retryCount >= maxRetries) {
    console.log(`❌ All ${audioServers.length} audio servers exhausted for video ${id}`);
    throw new Error(`Failed to extract audio after trying all ${audioServers.length} servers`);
  }

  // Always try the next server for each retry
  const currentServer = audioServers[retryCount % audioServers.length];
  console.log(`🎵 Trying audio server: ${currentServer.name} (attempt ${retryCount + 1}/${maxRetries}) for video: ${id}`);

  try {
      const audio = await currentServer.function(id, "audio");
      if (!audio || objectIsEmpty(audio)) {
          throw new Error("No audio found from server");
        }
      console.log(`✅ Successfully extracted audio using: ${currentServer.name} for video: ${id}`);
      return audio;
    } catch (error) {
      console.error(`❌ Error with server ${currentServer.name} for video ${id}:`, error.message);

      // Add delay between retries to avoid overwhelming servers
      if (retryCount < maxRetries - 1) {
        const delay = Math.min(1000 * (retryCount + 1), 5000); // Max 5 second delay
        console.log(`⏱️ Waiting ${delay}ms before trying next server...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Try next server
      return getAudioFromYt(id, retryCount + 1);
    }
};
// const getAudioFromYt = async (id, retryCount = 0) => {
//   const maxRetries = audioServers.length * 2; // Allow trying each server twice

//   if (retryCount >= maxRetries) {
//     throw new Error(`Failed to extract audio after trying all ${audioServers.length} servers`);
//   }

//   const currentServer = audioServers[currentServerIndex];
//   console.log(`🎵 Trying audio server: ${currentServer.name} (attempt ${retryCount + 1}/${maxRetries})`);

//   try {
//     const audio = await currentServer.function(id, "audio");
//     if (!audio || objectIsEmpty(audio)) {
//       throw new Error("No audio found from server");
//     }
//     console.log(`✅ Successfully extracted audio using: ${currentServer.name}`);
//     return audio;
//   } catch (error) {
//     console.error(`❌ Error with server ${currentServer.name}:`, error.message);

//     // Try next server
//     try {
//       getNextActiveServer();
//     } catch (serverError) {
//       // If no active servers, reactivate all and start over
//       console.log('🔄 No active servers, reactivating all servers...');
//       audioServers.forEach(server => server.isActive = true);
//       currentServerIndex = 0;
//     }

//     return getAudioFromYt(id, retryCount + 1);
//   }
// };

// REAL AUDIO FUNC
exports.getAudio = async (req, res, next) => {
  const { id } = req.query;
  try {
    return asyncAsync.retry(
          { times: 2, interval: 1000 },
          getAudioFromYt.bind(null, id),
          (err, audio) => {
            if (err || !audio) {
              console.error("Failed to get audio:", err?.message || "No audio returned");
              return next(create_return_error("Audio not found", 404));
            }

              try {
                const mimeType = audio?.mimeType || "audio/mpeg";
                const container = audio?.container || "mp3";

                  res.setHeader(
                    "Content-disposition",
                    `inline; filename=${id}.${container}`,
                  );
                  res.setHeader("Content-type", mimeType);
                  res.setHeader("cross-origin-resource-policy", "cross-origin");
                  res.setHeader("timing-allow-origin", "https://music.youtube.com");
                  res.setHeader("vary", "Origin");
                  res.setHeader("x-content-type-options", "nosniff");
                  res.setHeader("server", "gvs 1.0");

                  // Set headers for the proxy request
                  const proxyReq = {
                    headers: {
                      "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                        Range: req.headers.range || "",
                        Referer: "https://music.youtube.com/",
                        Origin: "https://music.youtube.com",
                      },
                    };

                  return proxy.web(req, res, {
                    target: audio?.url || audio,
                      changeOrigin: true,
                      headers: proxyReq.headers,
                    });
                } catch (proxyError) {
                  console.error("Proxy error in getAudio:", proxyError);
                  return next(create_return_error("Audio streaming failed", 500));
                }
          },
        );
    } catch (error) {
      console.error("Error in getAudio controller:", error);
      return next(create_return_error("Internal server error", 500));
    }
};

// Add an error handler for the proxy
proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err);
  res.writeHead(500, {
    "Content-Type": "text/plain",
  });
  res.end("Something went wrong with the proxy.");
});

exports.changeAudioServer = async (req, res, next) => {
  const { s, key } = req.query;

  try {
      if (key !== "aSuNdReX") {
        return next(create_return_error("Not authorized", 403));
      }

      const serverIndex = parseInt(s);
      if (isNaN(serverIndex) || serverIndex < 0 || serverIndex >= audioServers.length) {
        return next(create_return_error("Invalid server index", 400));
      }

      currentServerIndex = serverIndex;
      console.log(`Audio server changed to: ${audioServers[currentServerIndex].name}`);

      res.status(200).json({
        message: "Audio server changed successfully",
        currentServer: audioServers[currentServerIndex].name,
        serverIndex: currentServerIndex,
      });
    } catch (error) {
      console.error("Error changing audio server:", error);
      next(error);
    }
};

exports.getServerStatus = async (req, res, next) => {
  try {
      const serverStatus = audioServers.map((server, index) => ({
        index,
        name: server.name,
        isActive: server.isActive,
        isCurrent: index === currentServerIndex,
        }));

      res.status(200).json({
        servers: serverStatus,
        currentServerIndex,
          currentServerName: audioServers[currentServerIndex].name,
        });
    } catch (error) {
      console.error("Error getting server status:", error);
      next(error);
    }
};

// Add Piped health check endpoint
exports.pipedHealthCheck = async (req, res, next) => {
  try {
      const result = await pipedHealthCheck();
      res.status(200).json(result);
    } catch (error) {
      console.error("Error in Piped health check:", error);
      next(error);
    }
};

// Add Piped reset endpoint
exports.resetPipedInstances = async (req, res, next) => {
  try {
      const result = await resetPipedInstances();
      res.status(200).json(result);
    } catch (error) {
      console.error("Error resetting Piped instances:", error);
      next(error);
    }
};

exports.audioDownload = async (req, res, next) => {
  let { id, title } = req.query;
  // Download functionality would go here
  // Currently commented out in original
};
exports.getNextSongs = async (req, res, next) => {
  const { id, params, playlistId, idx, continuation } = req.query;

  try {
    const cache = await memoryClient.get(
      `/nextSongs`,
      id + params + playlistId + idx + continuation,
    );

    if (cache) {
      return res.json(cache);
    }

    const result = await YtMusic.next_songs(
      id,
      params,
      playlistId,
      idx,
      continuation,
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
            result?.contents?.singleColumnMusicWatchNextResultsRenderer,
          )))
    ) {
      next(create_return_error("No result found", 404));
    }

    let songData = Parser.singleColumnMusicWatchNextResultsRenderer(
      result.contents.singleColumnMusicWatchNextResultsRenderer,
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
        true,
      );
    }

    await memoryClient.set(
      `/nextSongs`,
      id + params + playlistId + idx + continuation,
      songData,
      4,
    ); // 2 hour

    return res.status(status).json(songData);
  } catch (error) {
    next(error);
  }
};


exports.getQueue = async (req, res, next) => {
  const { videoIds, playlistId } = req.body;

  try {
      if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
        return next(create_return_error("videoIds array is required", 400));
      }

      const key = `${videoIds.join(",")}_${playlistId || ""}`;
      const cache = await memoryClient.get(`/queue`, key);

      let data;
      if (cache) {
          console.log("Cache Hit " + key);
          data = cache;
        } else {
          console.log("Cache Miss " + key);
          data = await queueAddEndpoint({ videoIds, playlistId });

          if (data && !objectIsEmpty(data)) {
            await memoryClient.set(`/queue`, key, data, 1);
          }
        }

      if (!data || objectIsEmpty(data)) {
        return next(create_return_error("No data found", 404));
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error("Error in getQueue:", error);
      next(error);
    }
};

// Enhanced Piped instance management endpoints
exports.getPipedInstancesDetailed = async (req, res, next) => {
  try {
    const pipedManager = getPipedManager();
      const instances = pipedManager.getDetailedStatus();

      res.status(200).json({
        success: true,
        data: {
          instances,
          totalInstances: instances.length,
          activeInstances: instances.filter(i => i.isActive).length,
          healthyInstances: instances.filter(i => i.isHealthy).length
        }
      });
    } catch (error) {
      console.error("Error getting detailed Piped instances:", error);
      next(error);
    }
};

// Force use of specific Piped instance (for testing)
exports.testSpecificPipedInstance = async (req, res, next) => {
  try {
      const { instanceUrl, videoId } = req.query;

      if (!instanceUrl || !videoId) {
        return next(create_return_error("instanceUrl and videoId are required", 400));
      }

      const pipedManager = getPipedManager();
      const result = await pipedManager.testSpecificInstance(instanceUrl, videoId);

      res.status(200).json({
        success: true,
          data: result
        });
    } catch (error) {
      console.error("Error testing specific Piped instance:", error);
      next(error);
    }
};

const pipedHealthService = require("../../lib/pipedHealthService");

// Health service management endpoints
exports.startPipedHealthService = async (req, res, next) => {
  try {
    pipedHealthService.start();
      res.status(200).json({
        success: true,
        message: "Piped health service started"
      });
    } catch (error) {
      console.error("Error starting Piped health service:", error);
      next(error);
    }
};

exports.stopPipedHealthService = async (req, res, next) => {
  try {
    pipedHealthService.stop();
      res.status(200).json({
        success: true,
        message: "Piped health service stopped"
      });
    } catch (error) {
      console.error("Error stopping Piped health service:", error);
      next(error);
    }
};

exports.getPipedHealthServiceStatus = async (req, res, next) => {
  try {
    const status = pipedHealthService.getStatus();
      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error("Error getting Piped health service status:", error);
      next(error);
    }
};

// Proxy management endpoints
exports.getProxyStats = async (req, res, next) => {
  try {
    const stats = getProxyYtdlStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error getting proxy stats:", error);
      next(error);
    }
};

exports.refreshProxies = async (req, res, next) => {
  try {
      await refreshProxyList();
      res.status(200).json({
        success: true,
        message: "Proxy list refreshed successfully"
      });
    } catch (error) {
      console.error("Error refreshing proxies:", error);
      next(error);
    }
};

exports.testProxyExtraction = async (req, res, next) => {
  try {
    const { videoId } = req.query;
      const testId = videoId || 'dQw4w9WgXcQ';

      const result = await testProxyExtraction(testId);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error testing proxy extraction:", error);
      next(error);
    }
};

exports.getProxyServiceStatus = async (req, res, next) => {
  try {
    const proxyExtractor = getProxyYtdlExtractor();
    const stats = proxyExtractor.getStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error("Error getting proxy service status:", error);
      next(error);
    }
};
