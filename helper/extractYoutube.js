const ytdl = require("ytdl-core");

const cookie = require("./cookie");

const youtubedl = require("youtube-dl-exec");
const { default: axios } = require("axios");

/*
const COOKIE =
  "Authorization=SAPISIDHASH 1639394668_04f8f3e6953162ead582c1f932f4cb2eaa91785d; ";
module.exports = async function extractYoutube(id, dataType) {
  try {
    const info = await ytdl.getInfo(id, {
      // requestOptions: {
      //   headers: {
      //     Authorization:
      //       "SAPISIDHASH 1639394668_04f8f3e6953162ead582c1f932f4cb2eaa91785d",
      //     cookie:
      //       "VISITOR_INFO1_LIVE=S8b_3wLid6A; PREF=tz=Asia.Kolkata&f6=40000000&volume=90; SID=Egij9ROoJLluCCXBI0OWS_YgrE-ar_zWaCc3bKr5IDgM2T4o8kabgAZyrDFFHl3rkaJhaQ.; __Secure-1PSID=Egij9ROoJLluCCXBI0OWS_YgrE-ar_zWaCc3bKr5IDgM2T4okosfUfw2DW1jtYOIMEr5hw.; __Secure-3PSID=Egij9ROoJLluCCXBI0OWS_YgrE-ar_zWaCc3bKr5IDgM2T4opZjO0EpWxevbp3k4MOb22A.; HSID=Asmr6-yonTB2LLGlj; SSID=Afwn7tt6RmYvrsKGf; APISID=XxVkQ9cFq6lTAt7Q/A5cmmf-o7ba7GOq7_; SAPISID=fSF_WDWxUkVsXcQ0/AGXf3MC3RmF5qh1TZ; __Secure-1PAPISID=fSF_WDWxUkVsXcQ0/AGXf3MC3RmF5q…6xpAqU27g%22%2C%22watchEndpointSupportedOnesieConfig%22%3A%7B%22html5PlaybackOnesieConfig%22%3A%7B%22commonConfig%22%3A%7B%22url%22%3A%22https%3A%2F%2Fr1---sn-5hnekn7z.googlevideo.com%2Finitplayback%3Fsource%3Dyoutube%26orc%3D1%26oeis%3D1%26c%3DWEB%26oad%3D3200%26ovd%3D3200%26oaad%3D11000%26oavd%3D11000%26ocs%3D700%26oewis%3D1%26oputc%3D1%26ofpcc%3D1%26msp%3D1%26odeak%3D1%26odepv%3D1%26osfc%3D1%26id%3D026eb1a40a94dbb8%26ip%3D89.38.97.132%26initcwndbps%3D472500%26mt%3D1639374771%26oweuc%3D%22%7D%7D%7D%7D%7D",
      //     "x-youtube-identity-token":
      //       "QUFFLUhqbEdGTU5IWkVIRC1zd0VmLURhMmNjMzZtLUd0Z3w=",
      //     // Optional. If not given, ytdl-core will try to find it.
      //     // You can find this by going to a video's watch page, viewing the source,
      //     // and searching for "ID_TOKEN".
      //     // 'x-youtube-identity-token': 1324,
      //   },
      // },
    });

    console.log(info);
    if (dataType == "audio") {
      let audioFormats = ytdl.filterFormats(info.formats, "audioonly");

      audioFormats = audioFormats.sort(
        (a, b) => b.audioBitrate - a.audioBitrate
      );
      console.log(audioFormats);
      return audioFormats[0];
    } else if (dataType == "info") {
      return info.videoDetails;
    }
  } catch (error) {
    console.log(error);
  }
};
*/

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
const filterFormats = (formats, type, filterWithText, ...args) => {
  if (type === "audioonly") {
    // return formats.filter((format) => format?.ext?.toLowerCase() === "webm");

    if (filterWithText) {
      return formats.filter((format) => {
        const mimeType = format.type || format.mimeType;

        return mimeType?.toLowerCase()?.includes(typeStartText);
      });
    }

    return formats.filter((format) =>
      formatsSet.has(Number(format?.format_id))
    );
  } else if (type === "findById") {
    return formats.filter(
      (format) =>
        formatsSet.has(Number(format?.format_id)) &&
        String(format.id) === String(args.id)
    );
  }
};

const highestBitrate = (formats) => {
  let highestBitrateFormat;
  let prevBitrate = 0;
  for (let format of formats) {
    if (prevBitrate < Number(format.bitrate)) {
      highestBitrateFormat = format;
    }

    prevBitrate = Number(format.bitrate);
  }

  return highestBitrateFormat;
};

const invidiousServer = "https://invidious.osi.kr"; // https://redirect.invidious.io/api/v1/videos/aqz-KE-bpKQ?fields=videoId,title,description&pretty=1

// const BASE = "https://music.youtube.com";
const BASE = "https://youtube.com";

const BASE_URL = (vid) => `${BASE}/watch?v=${vid}`;

//   `https://music.youtube.com/watch?v=${vid}&list=RDAMVM${vid}`;

exports.extractYoutube = async (id, dataType) => {
  try {
    const info = await youtubedl(BASE_URL(id), {
      // dumpSingleJson: true,
      extractAudio: true,

      audioQuality: 0,
      getUrl: true,
      rmCacheDir: true,

      // referer: `https://music.youtube.com/watch?v=${id}`,

      // noWarnings: true,
      // noCallHome: true,
      // noCheckCertificate: true,
      // preferFreeFormats: true,
      // youtubeSkipDashManifest: true,
      // audioFormat: "mp3",
      ///verbose: true,
      // noPlaylist: true,
      // playlistStart: 1,
      addHeader: `Cache-Control: no-cache; `,
      // cookies: cookie?.cookie || cookie.default,
    });

    if (dataType == "audio") {
      /*
      let audioFormats = filterFormats(info.formats, "audioonly");
      // let audioFormats = filterFormats(info.entries, "findById", id);

      audioFormats = audioFormats.sort((a, b) => b.abr - a.abr);
      console.log(audioFormats);

      // 140 reg supported
      const hasYtmusicAudioFormat = audioFormats.find(
        (f) => Number(f.format_id) === 140
      );

      const format = hasYtmusicAudioFormat || audioFormats[0];
*/
      const format = info;

      return format;
    } else if (dataType == "info") {
      return info.videoDetails;
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
};

exports.extractFromYtdlCore = async (id, dataType) => {
  try {
    let info = await ytdl.getInfo(BASE_URL(id));
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

//  https://invidious.osi.kr/api/v1/videos/Ei8UnOPJX7w?fields=adaptiveFormats
exports.extractFromInvidious = async (id, dataType) => {
  try {
    let { data: info } = await axios.get(
      `${invidiousServer}/api/v1/videos/${id}?fields=adaptiveFormats`
    );
    let audioFormats = filterFormats(info.adaptiveFormats, "audioonly", true);

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

exports.extractFromAlltube249 = async (id, dataType) => {
  try {
    let { data: audio } = await axios.get(
      `https://alltubedownload.net/download?url=https://www.youtube.com/watch?v=${id}&format=249`
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
      `https://alltubedownload.net/download?url=https://www.youtube.com/watch?v=${id}&format=250`
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
      `https://alltubedownload.net/download?url=https://www.youtube.com/watch?v=${id}&format=251`
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
