const axios = require("axios");
const { create_return_error, objectIsEmpty } = require("../helper/functions");

class YoutubeMusicAPI {
  static request = {
    baseUrl: "https://music.youtube.com/youtubei/v1",
    urlParams: "?alt=json&key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30",
    getUrl: (path) => {
      return this.request.baseUrl + path + this.request.urlParams;
    },
    headers: {
      "X-YouTube-Client-Name": "67",
      "X-YouTube-Client-Version": "0.1",
      Origin: "https://music.youtube.com",
      Referer: "music.youtube.com",
      "Content-Type": "application/json",
    },
    body: {
      context: {
        client: {
          clientName: "WEB_REMIX",
          clientVersion: "1.20241016.01.00",
          hl: "en",
          gl: "US",
          experimentIds: [],
          experimentsToken: "",
          utcOffsetMinutes: 0,
          locationInfo: {},
          musicAppInfo: {},
        },
        capabilities: {},
        request: {
          internalExperimentFlags: [],
          sessionIndex: {},
        },
        activePlayers: {},
        user: {
          enableSafetyMode: false,
        },
      },
      getSuggestStats: (query) => {
        return {
          context: {
            client: {
              clientName: "WEB_REMIX",
              clientVersion: "1.20241016.01.00",
            },
          },
          suggestStats: {
            validationStatus: "VALID",
            parameterValidationStatus: "VALID_PARAMETERS",
            clientName: "youtube-music",
            searchMethod: "CLICKED_SUGGESTION",
            inputMethod: "KEYBOARD",
            originalQuery: query,
            assistedQueryInfo: {
              index: 1,
              type: 25,
            },
            availableSuggestions: [
              {
                index: 0,
                type: 25,
              },
              {
                index: 1,
                type: 25,
              },
              {
                index: 2,
                type: 25,
              },
              {
                index: 3,
                type: 25,
              },
              {
                index: 4,
                type: 25,
              },
              {
                index: 5,
                type: 25,
              },
              {
                index: 6,
                type: 25,
              },
            ],
            zeroPrefixEnabled: true,
            firstEditTimeMsec: 5739,
            lastEditTimeMsec: 16895,
          },
        };
      },
    },
  };

  static next_songs = async (id, params, playlistId, idx, continuation) => {
    const body = params
      ? {
          ...this.request.body,
          enablePersistentPlaylistPanel: true,
          continuation,
          tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
          videoId: id,
          isAudioOnly: true,
          index: Number(idx) || 0,
          params: params,
        }
      : {
          ...this.request.body,
          enablePersistentPlaylistPanel: true,
          continuation,
          tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
          videoId: id,
          isAudioOnly: true,
          index: Number(idx) || 0,

          params: "mgMDCNgE",
        };

    if (playlistId) body["playlistId"] = playlistId;

    const config = {
      method: "POST",
      url: this.request.getUrl("/next"),
      headers: this.request.headers,
      data: JSON.stringify(body),
    };

    try {
      const { data: response } = await axios(config);

      return response;
    } catch (error) {
      create_return_error(error.message, 500);
    }
  };

  static browse = async (id, params) => {
    const body = params
      ? {
          ...this.request.body,
          browseId: id,
          params: params,
        }
      : {
          ...this.request.body,
          browseId: id,
          params: "Eg-KAQwIARAAGAAgACgAMABqChAEEAUQAxAKEAk%3D",
        };

    const config = {
      method: "POST",
      url: this.request.getUrl("/browse"),
      headers: this.request.headers,
      data: JSON.stringify(body),
    };

    try {
      const { data: response } = await axios(config);

      return response;
    } catch (error) {
      create_return_error(error.message, 500);
    }
  };

  static browse_home = async (id, filter_country_content) => {
    const body = filter_country_content
      ? {
          ...this.request.body,
          browseId: id,
          // formData: { selectedValues: [filter_country_content] },
          context: {
            client: {
              clientName: "WEB_REMIX",
              clientVersion: "1.20241016.01.00",
            },
          },
        }
      : {
          ...this.request.body,
          browseId: id,
          context: {
            client: {
              clientName: "WEB_REMIX",
              clientVersion: "1.20241016.01.00",
            },
          },
        };

    const config = {
      method: "POST",
      url: this.request.getUrl("/browse"),
      headers: this.request.headers,
      data: JSON.stringify(body),
    };

    console.info("config", config);
    try {
      const { data: response } = await axios(config);

      return response;
    } catch (error) {
      create_return_error(error.message, 500);
    }
  };

  static search_query = async (query, params) => {
    const body = params
      ? {
          ...this.request.body,
          query: query,
          params: params,
          ...this.request.body.getSuggestStats(query),
        }
      : {
          ...this.request.body,
          query: query,
          ...this.request.body.getSuggestStats(query),
        };

    const config = {
      method: "POST",
      url: this.request.getUrl("/search"),
      headers: this.request.headers,
      data: JSON.stringify(body),
    };

    try {
      const { data: response } = await axios(config);

      return response;
    } catch (error) {
      create_return_error(error.message, 500);
    }
  };

  static next_search_result = async (queries) => {
    try {
      if (objectIsEmpty(queries)) create_return_error("No queries found", 404);

      const params = new URLSearchParams(queries);

      const body = this.request.body;

      const config = {
        method: "POST",
        url: this.request.getUrl("/search") + "&" + params.toString(),
        headers: this.request.headers,
        data: JSON.stringify(body),
      };

      const { data: response } = await axios(config);

      return response;
    } catch (error) {
      create_return_error(error.message, 500);
    }
  };

  static get_queue = async (videoIds, playlistId) => {
    const body =
      videoIds?.length > 0
        ? {
            ...this.request.body,
            videoIds: videoIds,
          }
        : {
            ...this.request.body,
            playlistId: playlistId,
          };

    const config = {
      method: "POST",
      url: this.request.getUrl("/music/get_queue"),
      headers: this.request.headers,
      data: JSON.stringify(body),
    };

    try {
      const { data: response } = await axios(config);

      return response;
    } catch (error) {
      create_return_error(error.message, 500);
    }
  };

  static search_suggestions = async (keyword, params) => {
    const body = params
      ? {
          ...this.request.body,
          input: keyword,
          params: params,
        }
      : {
          ...this.request.body,
          input: keyword,
        };

    const config = {
      method: "POST",
      url: this.request.getUrl("/music/get_search_suggestions"),
      headers: this.request.headers,
      data: JSON.stringify(body),
    };

    try {
      const { data: response } = await axios(config);

      return response;
    } catch (error) {
      create_return_error(error.message, 500);
    }
  };
}

module.exports = YoutubeMusicAPI;
