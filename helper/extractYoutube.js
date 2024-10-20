const ytdl = require("@distube/ytdl-core");
const youtubedl = require("youtube-dl-exec");
const axios = require("axios");

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

exports.extractFromYoutubeRaw = async (videoId) => {
  const apiKey = "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc";
  //const apiKey = process.env.YOUTUBE_API_KEY;
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

  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers,
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

exports.extractFromInvidious = async (id, dataType) => {
  const invidiousServer = "https://invidious.jing.rocks";
  try {
    const { data: info } = await axios.get(
      `${invidiousServer}/api/v1/videos/${id}?fields=adaptiveFormats,title,description`,
    );
    let audioFormats = filterFormats(info.adaptiveFormats, "audioonly");

    if (!audioFormats || audioFormats.length === 0) {
      throw new Error("No audio formats found.");
    }

    if (dataType === "audio") {
      const format = highestBitrate(audioFormats);
      return format;
    } else if (dataType === "info") {
      return {
        title: info.title,
        description: info.description,
        formats: audioFormats,
      };
    }
  } catch (error) {
    console.error("Error in extractFromInvidious:", error);
    throw error;
  }
};

const { HttpsProxyAgent } = require("https-proxy-agent");

exports.extractFromYtdlCore = async (id, dataType) => {
  try {
    const proxyUrl = "http://122.200.19.103:80";
    const agent = new HttpsProxyAgent(proxyUrl);

    let info = await ytdl.getInfo(BASE_URL(id), {
      requestOptions: agent,
    });
    let audioFormats = ytdl.filterFormats(info.formats, "audioonly");

    if (!info || !audioFormats || (audioFormats && audioFormats.length === 0))
      throw new Error("No data found.");

    if (dataType == "audio") {
      const format = highestBitrate(audioFormats);

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
