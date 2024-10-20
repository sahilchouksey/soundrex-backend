const cron = require("node-cron");

// const { redis_client } = require("../../lib/redis.403");
const memoryClient = require("../../lib/cache/memory");

const {
  create_return_error,
  objectHas,
  objectIsEmpty,
} = require("../../helper/functions");
const YtMusic = require("../../lib/youtubeMusicApi");
const Parser = require("../../lib/parser.api");

const defaults = {
  album: {
    inside: "payload",
    startWith: "MPREb",
  },
  playlist: {
    startWith: ["VLPL", "OL", "PL", "RDCL"],
  },
  artist: {
    startWith: "UC",
  },
  lyrics: {
    startWith: "MPLY",
  },
  relatedMusic: {
    // startWith: "MPTR",
    startWith: "MPT",
  },
  moods_and_genres: {
    startWith: "FE",
  },
};

const supportedMusicArtistsProfileShelfs = {
  musicShelfRenderer: {
    hasArgs: true,
    args: [null, false, true],
    function: Parser.musicShelfRenderer,
  },
  musicCarouselShelfRenderer: {
    hasArgs: true,
    args: [true],
    function: Parser.musicCarouselShelfRenderer,
  },
  musicDescriptionShelfRenderer: {
    hasArgs: false,
    function: Parser.musicDescriptionShelfRenderer,
  },
  itemSectionRenderer: {
    hasArgs: false,
    function: Parser.itemSectionRenderer,
  },
};

// supported types
const supportedTypes = ["home", "new_releases", "charts", "genres"]; // ! add genres
const browseHomeAll = async (country) => {
  try {
    const final = [];
    for (let type of supportedTypes) {
      const result = await browseHome(type, country);
      final.push(result);
    }

    return { home: final };
  } catch (error) {
    throw error;
  }
};
const browseHome = async (type, country) => {
  let id;
  if (type === supportedTypes[0]) id = "FEmusic_home";
  if (type === supportedTypes[1]) id = "FEmusic_new_releases_albums";
  if (type === supportedTypes[2]) id = "FEmusic_charts";
  if (type === supportedTypes[3]) id = "FEmusic_moods_and_genres";

  if (!id) throw create_return_error("Invalid params.", 403);

  try {
    const cache = await memoryClient.get(`/browse/home?id=${id}`, id);

    console.log("cache");
    console.log((cache && true) || false);

    if (cache) {
      return cache;
    }

    const result = country
      ? await YtMusic.browse_home(id, country)
      : await YtMusic.browse_home(id);

    // error handling
    if (!result) {
      create_return_error("No data found", 404);
    }

    let final;
    if (type == "new_releases") {
      const singleColumnBrowseResultsRenderer =
        result?.contents &&
        objectHas(result.contents, "singleColumnBrowseResultsRenderer");
      // error handling
      if (!singleColumnBrowseResultsRenderer) {
        throw create_return_error("List is empty", 404);
      }
      // parsing new releases
      const list = Parser.singleColumnBrowseResultsRenderer(
        singleColumnBrowseResultsRenderer,
      );
      // error handling
      if (!list || (list && list.length === 0)) {
        throw create_return_error("List is empty", 404);
      }

      const data = Parser.gridRenderer(list[0].gridRenderer, type);
      if (data?.list?.length > 0) {
        final = data;
      }
    } else if (type === "charts") {
      const singleColumnBrowseResultsRenderer =
        result?.contents &&
        objectHas(result.contents, "singleColumnBrowseResultsRenderer");
      // error handling
      if (!singleColumnBrowseResultsRenderer) {
        throw create_return_error("List is empty", 404);
      }
      // parsing new releases
      const list = Parser.singleColumnBrowseResultsRenderer(
        singleColumnBrowseResultsRenderer,
      );
      // error handling
      if (!list || (list && list.length === 0)) {
        throw create_return_error("List is empty", 404);
      }

      // musicShelfRenderer contains <form/> data :ignore musicShelfRenderer
      const musicCarouselShelfRenderers = list.filter((i) =>
        i.hasOwnProperty("musicCarouselShelfRenderer"),
      );
      // error handling
      if (musicCarouselShelfRenderers.length <= 0) {
        throw create_return_error("musicCarouselShelfRenderer not found", 404);
      }

      // final = list;
      const finalList = musicCarouselShelfRenderers.map((i) =>
        Parser.musicCarouselShelfRenderer(i.musicCarouselShelfRenderer),
      );

      if (finalList?.length > 0) {
        final = {
          title: type,
          hasAdditionalLists: true,
          list: finalList,
        };
      }
    } else if (type === "genres") {
      const singleColumnBrowseResultsRenderer =
        result?.contents &&
        objectHas(result.contents, "singleColumnBrowseResultsRenderer");
      // error handling
      if (!singleColumnBrowseResultsRenderer) {
        throw create_return_error("List is empty", 404);
      }
      // parsing new releases
      const list = Parser.singleColumnBrowseResultsRenderer(
        singleColumnBrowseResultsRenderer,
      );
      // error handling
      if (!list || (list && list.length === 0)) {
        throw create_return_error("List is empty", 404);
      }

      const gridRenderers = list;

      const finalList = gridRenderers.map((i) =>
        Parser.gridRenderer(i.gridRenderer, type),
      );

      if (finalList?.length > 0) {
        final = {
          title: type,
          hasAdditionalLists: true,

          list: finalList,
        };
      }
    } else if (type == "home") {
      const singleColumnBrowseResultsRenderer =
        result?.contents &&
        objectHas(result.contents, "singleColumnBrowseResultsRenderer");
      // error handling
      if (!singleColumnBrowseResultsRenderer) {
        throw create_return_error("List is empty", 404);
      }
      // parsing new releases
      const listSingleColumnBrowseResults =
        Parser.singleColumnBrowseResultsRenderer(
          singleColumnBrowseResultsRenderer,
          true,
        );
      // error handling
      if (
        !listSingleColumnBrowseResults ||
        !listSingleColumnBrowseResults?.contents
      ) {
        throw create_return_error(
          "SingleColumnBrowseResultsRenderer is empty",
          404,
        );
      }

      const list = listSingleColumnBrowseResults?.contents;

      if (!list || (list && result?.length <= 0)) {
        throw create_return_error("No data found", 404);
      }

      final = [];

      for (let i of list) {
        const supportedKey =
          i?.musicImmersiveCarouselShelfRenderer ||
          i?.musicCarouselShelfRenderer;
        if (supportedKey) {
          const data = Parser.musicCarouselShelfRenderer(supportedKey);

          if (data?.list?.length > 0) {
            final.push(data);
          }
        }
      }

      // final = Parser.gridRenderer(list[0].gridRenderer, type);
    }

    // setting cache
    // final.list.splice(10)
    await memoryClient.set(`/browse/home?id=${id}`, id, final, 24); // 24 hour

    return final;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// cron.schedule("* */1 * * *", () => {
cron.schedule("0 */2 * * *", () => {
  browseHomeAll();
  // console.log("running a task every minute");
  console.log("running a task every two hours");
});

exports.browseHomeAll = async (req, res, next) => {
  const { country } = req.query;

  try {
    const final = [];
    for (let type of supportedTypes) {
      const result = await browseHome(type, country);
      if (type === "home") {
        final.push(...result);
      } else {
        final.push(result);
      }
    }

    return res.json({ home: final });
  } catch (error) {
    console.error("error", error);
    next(error);
  }
};

exports.browseHome = async (req, res, next) => {
  const { type } = req.params;
  const { country } = req.query;

  try {
    const result = await browseHome(type, country);
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.browseGenre = async (req, res, next) => {
  const { id, params } = req.query;

  if (!id || (id && id.startsWith(defaults.moods_and_genres.startsWith))) {
    next(create_return_error("Invalid Id", 400));
  }

  try {
    const cache = await memoryClient.get(`/browse/genre`, id + params);

    if (cache) {
      return res.json(cache);
    }

    const result = await YtMusic.browse(id, params);
    // return res.json(result);

    // error handling
    if (
      !result ||
      (result &&
        objectIsEmpty(result?.contents?.singleColumnBrowseResultsRenderer))
    ) {
      next(create_return_error("No data found", 404));
    }

    let final = {};

    if (result?.header?.musicHeaderRenderer)
      final.header = Parser.musicHeaderRenderer(
        result.header.musicHeaderRenderer,
      );

    const Renderers = Parser.singleColumnBrowseResultsRenderer(
      result?.contents.singleColumnBrowseResultsRenderer,
    );

    let list = [];
    if (Renderers && Renderers?.length > 0) {
      for (let i of Renderers) {
        if (i?.gridRenderer) {
          list.push(Parser.gridRenderer(i.gridRenderer));
        }
        if (i?.musicCarouselShelfRenderer) {
          list.push(
            Parser.musicCarouselShelfRenderer(i.musicCarouselShelfRenderer),
          );
        }
      }
    }

    if (list.length > 0) {
      final.contents = list;
    }

    await memoryClient.set(`/browse/genre`, id + params, final, 2); // 2 hour

    return res.json(final);
  } catch (error) {
    next(error);
  }
};

exports.browseLyrics = async (req, res, next) => {
  const { id, params } = req.query;

  if (!id || (id && !id.startsWith(defaults.lyrics.startWith))) {
    next(create_return_error("Invalid Id", 400));
  }

  try {
    const cache = await memoryClient.get(`/browse/lyrics`, id + params);

    if (cache) {
      return res.json(cache);
    }

    const result = await YtMusic.browse(id, params);
    // return res.json(result);

    // error handling
    if (!result || (result && objectIsEmpty(result?.contents))) {
      next(create_return_error("No lyrics found", 404));
    }

    let final = {};

    // * Lyrics available
    if (result?.contents?.sectionListRenderer) {
      const list = Parser.sectionListRenderer(
        result?.contents.sectionListRenderer,
      );
      if (!list || (list && result?.length <= 0)) {
        next(create_return_error("No lyrics found", 404));
      }

      final.title = "lyrics";
      final.list = [];
      list.forEach((e) => {
        if (e?.musicDescriptionShelfRenderer)
          final.list.push(
            Parser.musicDescriptionShelfRenderer(
              e.musicDescriptionShelfRenderer,
              true,
            ),
          );
      });
    }

    // ! Lyrics not available
    if (result?.contents?.messageRenderer) {
      const msg = Parser.messageRenderer(result?.contents.messageRenderer);
      if (!msg || (msg && objectIsEmpty(msg))) {
        next(create_return_error("No lyrics found", 404));
      }

      final.title = "message";
      final.message = msg;
    }

    // error handling
    if (!final || (final && objectIsEmpty(final))) {
      next(create_return_error("No lyrics found", 404));
    }

    await memoryClient.set(`/browse/lyrics`, id + params, final, 2); // 2 hour

    return res.json(final);
  } catch (error) {
    next(error);
  }
};

exports.browseId = async (req, res, next) => {
  const { id, params } = req.query;

  let filteredId = id.startsWith(
    defaults.playlist.startWith[0].substring(2, 4).trim(),
  )
    ? defaults.playlist.startWith[0].substring(0, 2) + id
    : id;

  filteredId = id.startsWith(defaults.playlist.startWith[1].trim())
    ? defaults.playlist.startWith[0].substring(0, 2) + id
    : filteredId;

  filteredId = id.startsWith(defaults.playlist.startWith[2].trim())
    ? defaults.playlist.startWith[0].substring(0, 2) + id
    : filteredId;

  filteredId = id.startsWith(defaults.playlist.startWith[3].trim())
    ? defaults.playlist.startWith[0].substring(0, 2) + id
    : filteredId;

  try {
    const cache = await memoryClient.get(`/browse/id`, id + params);

    if (cache) {
      return res.json(cache);
    }

    const result = params
      ? await YtMusic.browse(filteredId, params)
      : await YtMusic.browse(filteredId);

    // return res.json(result);

    // return res.send(
    //   (result?.contents?.singleColumnBrowseResultsRenderer && true) || false
    // );

    // error handling
    const hasSingleColumnBrowseResultsRenderer =
      result?.contents?.singleColumnBrowseResultsRenderer &&
      objectIsEmpty(result.contents.singleColumnBrowseResultsRenderer);
    const hasSectionListRenderer =
      result?.contents?.sectionListRenderer &&
      objectIsEmpty(result.contents.sectionListRenderer);

    if (
      !result ||
      (result && hasSingleColumnBrowseResultsRenderer) ||
      hasSectionListRenderer
    ) {
      next(create_return_error("No result found", 404));
    }

    let filteredList;

    if (result?.contents?.singleColumnBrowseResultsRenderer) {
      filteredList = Parser.singleColumnBrowseResultsRenderer(
        result?.contents.singleColumnBrowseResultsRenderer,
      );
    }

    if (result?.contents?.sectionListRenderer) {
      filteredList = Parser.sectionListRenderer(
        result?.contents.sectionListRenderer,
      );
    }

    if (
      result?.contents?.twoColumnBrowseResultsRenderer?.secondaryContents
        ?.sectionListRenderer
    ) {
      filteredList = Parser.sectionListRenderer(
        result.contents?.twoColumnBrowseResultsRenderer.secondaryContents
          .sectionListRenderer,
      );
    }

    console.info(result.contents);
    //return res.json(result.contents);

    // error handling
    if (!filteredList || (filteredList && filteredList?.length <= 0)) {
      next(create_return_error("List is empty", 404));
    }

    // return res.json(filteredList);

    const header = result?.header;

    // * filter data *
    const final = {};
    // filter albums
    if (filteredId.startsWith(defaults.album.startWith)) {
      // filtering header
      if (header && header?.musicDetailHeaderRenderer) {
        final.header = Parser.musicDetailHeaderRenderer(
          header.musicDetailHeaderRenderer,
        );
      }
      final.contents = filterAlbums(filteredList);
    }

    // filter playlists
    if (
      filteredId.startsWith(defaults.playlist.startWith[0]) ||
      filteredId.startsWith(defaults.playlist.startWith[0].substring(0, 2))
    ) {
      // filtering header
      if (header && header?.musicDetailHeaderRenderer) {
        final.header = Parser.musicDetailHeaderRenderer(
          header.musicDetailHeaderRenderer,
        );
      }
      final.contents = filterPlaylists(filteredList);
    }

    // filter artists
    if (filteredId.startsWith(defaults.artist.startWith)) {
      // filtering header
      if (header) {
        // have public music content
        if (header?.musicImmersiveHeaderRenderer) {
          final.header = Parser.musicImmersiveHeaderRenderer(
            header?.musicImmersiveHeaderRenderer,
          );
        }

        // does not have any public music content
        if (header?.musicVisualHeaderRenderer) {
          final.header = Parser.musicVisualHeaderRenderer(
            header?.musicVisualHeaderRenderer,
          );
        }
      }

      final.contents = filterArtists(filteredList);
    }

    // filter related songs
    if (filteredId.startsWith(defaults.relatedMusic.startWith)) {
      final.contents = filterRelatedMusic(filteredList);
    }

    if (!final?.header) {
      final.header = {};
      if (result?.contents?.twoColumnBrowseResultsRenderer?.tabs) {
        for (const tab of result.contents.twoColumnBrowseResultsRenderer.tabs) {
          const tabs = Parser.tabRenderer(tab?.tabRenderer, true);

          for (const _tab of tabs) {
            console.info("TAB", _tab.musicResponsiveHeaderRenderer);
            if (_tab?.musicResponsiveHeaderRenderer) {
              final.header = Parser.musicResponsiveHeaderRenderer(
                _tab.musicResponsiveHeaderRenderer,
              );
            }
          }
        }
      }
    }

    // return res.json(final);

    // error handling
    if (!final || (final && objectIsEmpty(final?.contents))) {
      next(create_return_error("List is empty", 404));
    }

    await memoryClient.set(`/browse/id`, id + params, final, 2); // 2 hour

    return res.json(final);
  } catch (error) {
    next(error);
  }
};

const filterAlbums = (list) => {
  const final = [];
  for (let i of list) {
    if (i?.musicShelfRenderer) {
      const contents = Parser.musicShelfRenderer(i.musicShelfRenderer)?.list;

      // error handling
      if (!contents || (contents && contents?.length <= 0)) return false;

      for (let c of contents) {
        if (c?.musicResponsiveListItemRenderer) {
          final.push(
            Parser.musicResponsiveListItemRenderer(
              c.musicResponsiveListItemRenderer,
            ),
          );
        }
      }
    }
  }

  return final;
};

const filterPlaylists = (list) => {
  const final = [];
  for (let i of list) {
    if (i?.musicPlaylistShelfRenderer) {
      final.push(
        Parser.musicPlaylistShelfRenderer(i.musicPlaylistShelfRenderer, true),
      );
    }
  }

  return final;
};

const filterArtists = (list) => {
  const final = [];

  // const result = [];
  for (let i of list) {
    const shelfName = Object.keys(i)[0];
    const hasShelf = objectHas(supportedMusicArtistsProfileShelfs, shelfName);

    if (hasShelf) {
      final.push(
        supportedMusicArtistsProfileShelfs[shelfName].hasArgs
          ? supportedMusicArtistsProfileShelfs[shelfName].function(
              i[shelfName],
              ...supportedMusicArtistsProfileShelfs[shelfName].args,
            )
          : supportedMusicArtistsProfileShelfs[shelfName].function(
              i[shelfName],
            ),
      );
    }
  }

  return final;
};

const filterRelatedMusic = (list) => {
  const final = [];

  // const result = [];
  for (let i of list) {
    const shelfName = Object.keys(i)[0];
    const hasShelf = objectHas(supportedMusicArtistsProfileShelfs, shelfName);

    if (hasShelf) {
      final.push(
        supportedMusicArtistsProfileShelfs[shelfName].hasArgs
          ? supportedMusicArtistsProfileShelfs[shelfName].function(
              i[shelfName],
              ...supportedMusicArtistsProfileShelfs[shelfName].args,
            )
          : supportedMusicArtistsProfileShelfs[shelfName].function(
              i[shelfName],
            ),
      );
    }
  }

  return final;
};
