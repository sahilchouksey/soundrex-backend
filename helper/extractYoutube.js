const ytdl = require("@distube/ytdl-core");
const youtubedl = require("youtube-dl-exec");
const axios = require("axios");
const { PipedInstanceManager } = require("../lib/pipedInstances");
const ProxyYtdlExtractor = require("../lib/proxyYtdlExtractor");

// Initialize Piped instance manager
const pipedManager = new PipedInstanceManager();

// Initialize Proxy YTDL Extractor
const proxyYtdlExtractor = new ProxyYtdlExtractor();

const BASE_URL = (vid) => `https://www.youtube.com/watch?v=${vid}`;

const audioFormats = [
  // 258, MP4
  251,
  // 22, MP4
  // 256, MP4
  140, 250,
  // 18, MP4
  249, 139,
];

const typeStartText = "audio";

const formatsSet = new Set(audioFormats);
//const filterFormats = (formats, type, filterWithText, ...args) => {
//  if (type === "audioonly") {
//    // return formats.filter((format) => format?.ext?.toLowerCase() === "webm");
//
//    if (filterWithText) {
//      return formats.filter((format) => {
//        const mimeType = format.type || format.mimeType;
//
//        return mimeType?.toLowerCase()?.includes(typeStartText);
//      });
//    }
//
//    return formats.filter((format) =>
//      formatsSet.has(Number(format?.format_id)),
//    );
//  } else if (type === "findById") {
//    return formats.filter(
//      (format) =>
//        formatsSet.has(Number(format?.format_id)) &&
//        String(format.id) === String(args.id),
//    );
//  }
//};
//
//const highestBitrate = (formats) => {
//  let highestBitrateFormat;
//  let prevBitrate = 0;
//  for (let format of formats) {
//    if (prevBitrate < Number(format.bitrate)) {
//      highestBitrateFormat = format;
//    }
//
//    prevBitrate = Number(format.bitrate);
//  }
//
//  return highestBitrateFormat;
//};
const filterFormats = (formats, type) => {
  if (type === "audioonly") {
    return formats.filter((format) => {
      const mimeType = format.mimeType || format.type;
      return mimeType && mimeType.toLowerCase().includes("audio");
    });
  }
  return formats;
};

const highestBitrate = (formats) => {
  return formats.reduce((highest, format) => {
    return format.bitrate > highest.bitrate ? format : highest;
  });
};

const invidiousServer = "https://invidious.osi.kr"; // https://redirect.invidious.io/api/v1/videos/aqz-KE-bpKQ?fields=videoId,title,description&pretty=1

//   `https://music.youtube.com/watch?v=${vid}&list=RDAMVM${vid}`;

exports.extractYoutube = async (id, dataType) => {
  try {
    const info = await youtubedl(BASE_URL(id), {
      dumpSingleJson: true,
      extractAudio: true,
      audioFormat: "best",
      noCheckCertificate: true,
      preferFreeFormats: true,
      addHeader: ["referer:youtube.com", "user-agent:Mozilla/5.0"],
    });

    if (dataType === "audio") {
      let audioFormats = filterFormats(info.formats, "audioonly");
      const format = highestBitrate(audioFormats);
      return format;
    } else if (dataType === "info") {
      return info;
    }
  } catch (error) {
    console.error("Error in extractYoutube:", error);
    throw error;
  }
};

const { HttpsProxyAgent } = require("https-proxy-agent");
//const fetch = require("node-fetch"); // Ensure you have node-fetch installed
// const fetch = require("cross-fetch"); // Alternatively, you can use cross-fetch

exports.extractFromYoutubeRaw = async (videoId) => {
  const apiKey = "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc";
  // const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YouTube API key is not set in environment variables.");
  }

  const headers = {
    "X-YouTube-Client-Name": "5",
    "X-YouTube-Client-Version": "19.09.3",
    Origin: "https://www.youtube.com",
    "User-Agent":
      "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
    "Content-Type": "application/json",
  };

  const body = {
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "19.09.3",
        deviceModel: "iPhone14,3",
        userAgent:
          "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
        hl: "en",
        timeZone: "UTC",
        utcOffsetMinutes: 0,
      },
    },
    videoId,
    playbackContext: {
      contentPlaybackContext: { html5Preference: "HTML5_PREF_WANTS" },
    },
    contentCheckOk: true,
    racyCheckOk: true,
  };

  const url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`;

  // **Proxy Configuration Starts Here**
  const proxyUrl = "http://122.200.19.103:80"; // Replace with your proxy URL
  const agent = new HttpsProxyAgent(proxyUrl);
  // **Proxy Configuration Ends Here**

  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers,
    agent, // Add the proxy agent to the fetch options
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Failed to fetch video info: ${res.status} ${res.statusText} - ${errorText}`,
    );
  }

  const json = await res.json();

  // Fetch video info
  const info = json;

  // Check playability
  if (info.playabilityStatus.status !== "OK") {
    throw new Error(info.playabilityStatus.reason || "Video is not playable.");
  }

  // Get adaptive formats
  const formats = info.streamingData.adaptiveFormats;
  if (!formats || formats.length === 0) {
    throw new Error("No adaptive formats available for this video.");
  }

  // Select the best audio format (highest bitrate)
  const audioFormats = formats.filter(
    (format) => format.mimeType && format.mimeType.startsWith("audio"),
  );
  if (audioFormats.length === 0) {
    throw new Error("No audio formats available.");
  }

  // Sort audio formats by bitrate in descending order and select the best one
  audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
  const selectedFormat = audioFormats[0];

  if (!selectedFormat.url) {
    throw new Error("Selected format does not have a URL.");
  }
  console.log(selectedFormat.url);

  // Determine file extension from mimeType
  const extMatch = selectedFormat.mimeType.match(/audio\/(\w+)/);
  const ext = extMatch ? extMatch[1] : "webm";

  // Create a safe filename
  const sanitizedTitle = info.videoDetails.title
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();
  const filename = `${sanitizedTitle}-${info.videoDetails.videoId}.${ext}`;
  return selectedFormat;
};

exports.extractFromPipeDaAPI = async (id) => {
  try {
    console.log(`🎵 Attempting Piped extraction for video: ${id}`);
    const startTime = Date.now();

    const result = await pipedManager.extractAudioFromPiped(id);

    const extractionTime = Date.now() - startTime;
    console.log(`✅ Piped extraction successful in ${extractionTime}ms for ${id} from ${result.instance}`);

    return result;
  } catch (error) {
    console.error(`❌ Piped extraction failed for ${id}:`, error.message);
    throw error;
  }
};

exports.extractFromYtdlCore = async (id, dataType) => {
  try {
    console.log(`🎵 Attempting ytdl-core extraction for video: ${id}`);

    // Use different proxy or remove proxy altogether to avoid bot detection
    let info = await ytdl.getInfo(BASE_URL(id), {
      // Remove proxy agent to avoid bot detection
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Origin: "https://www.youtube.com",
        Referer: "https://www.youtube.com",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
    });

    let audioFormats = ytdl.filterFormats(info.formats, "audioonly");

    if (!info || !audioFormats || (audioFormats && audioFormats.length === 0))
      throw new Error("No audio data found from ytdl-core.");

    if (dataType == "audio") {
      const format = highestBitrate(audioFormats);
      console.log(`✅ ytdl-core extraction successful for ${id}`);
      return format;
    }

    return format;
  } catch (error) {
    console.error(`❌ ytdl-core extraction failed for ${id}:`, error.message);

    // If it's a bot detection error, throw a specific error
    if (error.message.includes("Sign in to confirm") || error.message.includes("bot")) {
      throw new Error("YouTube bot detection - ytdl-core blocked");
    }

    throw error;
  }
};

// Invidious instances for rotation
const invidiousInstances = [
  "https://invidious.io.lol",
  "https://invidious.privacydev.net",
  "https://invidious.protokolla.fi",
  "https://invidious.slipfox.xyz",
  "https://invidious.weblibre.org",
  "https://invidious.namazso.eu",
  "https://invidious.tiekoetter.com",
  "https://invidious.nerdvpn.de",
  "https://inv.riverside.rocks",
  "https://invidious.flokinet.to"
];

let currentInvidiousIndex = 0;

const getNextInvidiousInstance = () => {
  const instance = invidiousInstances[currentInvidiousIndex];
  currentInvidiousIndex = (currentInvidiousIndex + 1) % invidiousInstances.length;
  return instance;
};

exports.extractFromInvidious = async (id, dataType) => {
  let lastError;

  // Try up to 3 different Invidious instances
  for (let attempts = 0; attempts < 3; attempts++) {
    const invidiousServer = getNextInvidiousInstance();
    console.log(`🎬 Trying Invidious instance: ${invidiousServer} (attempt ${attempts + 1}/3)`);

    try {
      return {
        url: `${invidiousServer}/api/v1/videos/${id}?fields=adaptiveFormats,title,description`,
      };
    } catch (error) {
      console.error(`❌ Invidious instance ${invidiousServer} failed:`, error.message);
      lastError = error;
      continue;
    }
  }

  console.error("❌ All Invidious instances failed");
  throw lastError || new Error("All Invidious instances failed");
};

// https://beatbump.ml/api/player.json?videoId=Ei8UnOPJX7w

exports.extractFromBeatbump = async (id, dataType) => {
  try {
    const config = {
      method: "get",
      url: `https://beatbump.ml/api/player.json?videoId=${id}`,
      headers: {
        "User-Agent":
          " Mozilla/5.0 (X11; Linux x86_64; rv:96.0) Gecko/20100101 Firefox/96.0",
        Accept:
          " text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": " en-US,en;q=0.5",
      },
    };

    let { data: info } = await axios(config);

    let audioFormats = info?.streamingData?.adaptiveFormats;

    const formats = filterFormats(audioFormats, "audioonly", true);

    if (!info || !audioFormats?.length || !formats?.length)
      throw new Error("No data found.");

    if (dataType == "audio") {
      const format = highestBitrate(formats);

      return format;
    }
    //  else if (dataType == "info") {
    //   return info.videoDetails;
    // }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.extractFromAlltube249 = async (id, dataType) => {
  try {
    let { data: audio } = await axios.get(
      `https://alltubedownload.net/download?url=https://www.youtube.com/watch?v=${id}&format=249`,
    );
    if (!audio) throw new Error("No data found.");

    if (dataType == "audio") {
      // const format = highestBitrate(audioFormats);

      return audio;
    }
    //  else if (dataType == "info") {
    //   return info.videoDetails;
    // }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.extractFromAlltube250 = async (id, dataType) => {
  try {
    let { data: audio } = await axios.get(
      `https://alltubedownload.net/download?url=https://www.youtube.com/watch?v=${id}&format=250`,
    );
    if (!audio) throw new Error("No data found.");

    if (dataType == "audio") {
      // const format = highestBitrate(audioFormats);

      return audio;
    }
    //  else if (dataType == "info") {
    //   return info.videoDetails;
    // }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.extractFromAlltube251 = async (id, dataType) => {
  try {
    let { data: audio } = await axios.get(
      `https://alltubedownload.net/download?url=https://www.youtube.com/watch?v=${id}&format=251`,
    );
    if (!audio) throw new Error("No data found.");

    if (dataType == "audio") {
      // const format = highestBitrate(audioFormats);

      return audio;
    }
    //  else if (dataType == "info") {
    //   return info.videoDetails;
    // }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

// Proxy-enabled YTDL extraction
exports.extractFromProxyYtdl = async (id, dataType) => {
  try {
    console.log(`🔄 Attempting proxy YTDL extraction for video: ${id}`);
    const startTime = Date.now();

    if (!proxyYtdlExtractor.isInitialized) {
      console.log('🔧 Initializing proxy extractor...');
      await proxyYtdlExtractor.initialize();
    }

    const result = await proxyYtdlExtractor.extractAudioWithProxy(id);

    const extractionTime = Date.now() - startTime;
    console.log(`✅ Proxy YTDL extraction successful in ${extractionTime}ms for ${id}`);

    if (dataType === "audio") {
      return {
        url: result.url,
        mimeType: result.mimeType,
        bitrate: result.bitrate,
        contentLength: result.contentLength,
        container: result.container,
        quality: result.quality,
        source: 'proxy-ytdl',
        proxy: result.proxy,
        videoDetails: result.videoDetails
      };
    }

    return result;
  } catch (error) {
    console.error(`❌ Proxy YTDL extraction failed for ${id}:`, error.message);
    // Don't re-throw immediately, let the main audio controller try other methods
    throw new Error(`Proxy YTDL failed: ${error.message}`);
  }
};

// Get proxy extractor instance for external access
exports.getProxyYtdlExtractor = () => proxyYtdlExtractor;

// Get proxy extractor statistics
exports.getProxyYtdlStats = () => {
  return proxyYtdlExtractor.getStats();
};

// Refresh proxy list
exports.refreshProxyList = async () => {
  return await proxyYtdlExtractor.refreshProxies();
};

// Test proxy extraction
exports.testProxyExtraction = async (testVideoId) => {
  return await proxyYtdlExtractor.testExtraction(testVideoId);
};

// Export Piped manager for external access
exports.getPipedManager = () => pipedManager;

// Health check function for Piped instances
exports.pipedHealthCheck = async () => {
  return await pipedManager.healthCheck();
};

// Reset all Piped instances
exports.resetPipedInstances = () => {
  pipedManager.resetAllInstances();
};

// Get Piped instances status
exports.getPipedInstancesStatus = () => {
  return {
    total: pipedManager.instances.length,
    active: pipedManager.getActiveInstances().length,
    instances: pipedManager.instances.map((instance) => ({
      host: instance.host,
      isActive: instance.isActive,
      failureCount: instance.failureCount,
      lastUsed: instance.lastUsed,
    })),
  };
};
