const fs = require("fs");
const { Readable } = require("stream");
const { finished } = require("stream/promises");

async function getInfo(videoId) {
  const apiKey = "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc";
  const headers = {
    "X-YouTube-Client-Name": "5",
    "X-YouTube-Client-Version": "19.09.3",
    Origin: "https://www.youtube.com",
    "User-Agent":
      "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
    "content-type": "application/json",
  };

  const b = {
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

  const res = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key${apiKey}&prettyPrint=false`,
    { method: "POST", body: JSON.stringify(b), headers },
  );
  // throw an error when failed to get info
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const json = await res.json();
  return json;
}

(async function () {
  // get video info by id
  const info = await getInfo("oDAw7vW7H0c");
  // check playability status
  if (info.playabilityStatus.status !== "OK")
    throw new Error(info.playabilityStatus.reason);

  // get formats
  const formats = info.streamingData.adaptiveFormats;
  const selectedFormat = formats[2];
  const ext = selectedFormat.mimeType.match(/^\w+\/(\w+)/)[1];
  // create filename for video
  const filename = `${info.videoDetails.title}-${info.videoDetails.videoId}.${ext}`;

  // download video
  console.log(`Downloading ${filename}`);
  const writer = fs.createWriteStream(filename);
  const res = await fetch(selectedFormat.url);
  // throw an error when failed to download
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  // waiting for download is finished
  await finished(Readable.fromWeb(res.body).pipe(writer));
  console.log(`Downloaded ${filename}`);
})();
