const memoryClient = require("../../lib/cache/memory");

const { create_return_error, objectHas } = require("../../helper/functions");
const YtMusic = require("../../lib/youtubeMusicApi");
const Parser = require("../../lib/parser.api");

exports.search = async (req, res, next) => {
  // const { query, params } = req.body;
  const { query, params, rawParams } = req.query;

  let encodedParams;
  if (params) {
    encodedParams = Parser.getSearchParams(params);
  }
  if (rawParams) {
    encodedParams = rawParams;
  }

  // use validation
  try {
    const cache = await memoryClient.get(`/search`, query + params + rawParams);

    if (cache) {
      return res.json(cache);
    }

    const result = encodedParams
      ? await YtMusic.search_query(query, encodedParams)
      : await YtMusic.search_query(query);

    // return res.json(result);

    let resultsList;
    if (result?.contents?.tabbedSearchResultsRenderer) {
      resultsList = Parser.tabbedSearchResultsRenderer(
        result.contents.tabbedSearchResultsRenderer
      );
    } else if (result?.contents?.sectionListRenderer) {
      resultsList = Parser.sectionListRenderer(
        result.contents.sectionListRenderer
      );
    }

    if (!resultsList || (resultsList && resultsList.length <= 0)) {
      next(create_return_error("No results found.", 404));
    }

    let musicShelfRendererList = [];
    for (let i of resultsList) {
      if (i?.musicShelfRenderer)
        musicShelfRendererList.push(
          Parser.musicShelfRenderer(i.musicShelfRenderer, params, true)
        );
      if (i?.itemSectionRenderer) {
        const list = Parser.itemSectionRenderer(i.itemSectionRenderer, false);

        for (let i of list?.list) {
          if (i?.messageRenderer)
            musicShelfRendererList.push(
              Parser.messageRenderer(i.messageRenderer)
            );

          if (i?.showingResultsForRenderer)
            musicShelfRendererList.push(
              Parser.showingResultsForRenderer(i.showingResultsForRenderer)
            );

          if (i?.didYouMeanRenderer)
            musicShelfRendererList.push(
              Parser.didYouMeanRenderer(i.didYouMeanRenderer)
            );
        }
      }
    }

    if (
      !musicShelfRendererList ||
      (musicShelfRendererList && musicShelfRendererList.length <= 0)
    ) {
      next(create_return_error("No results found.", 404));
    }

    let final = [];
    for (let i of musicShelfRendererList) {
      const data = {};
      data.title = i?.title;
      data.list = [];

      // development only
      data.next = i?.next;

      i?.list?.length > 0 &&
        i.list.forEach((i) => {
          if (i?.musicResponsiveListItemRenderer) {
            data.list.push(
              Parser.musicResponsiveListItemRenderer(
                i.musicResponsiveListItemRenderer
              )
            );
          }
        });

      if (
        i?.messageRenderer ||
        i?.showingResultsForRenderer ||
        i?.didYouMeanRenderer
      ) {
        data.list.push(i);
      }
      // pushing to final arr
      final.push(data);
    }

    const finalData = {
      title: params || "Search results",
      list: final,
    };

    await memoryClient.set(`/search`, query + params + rawParams, finalData, 2); // 2 hour

    return res.json(finalData);
  } catch (error) {
    next(error);
  }
};

exports.search_next_results = async (req, res, next) => {
  const { ctoken, continuation, type, itct } = req.query;

  // add validation
  try {
    const cache = await memoryClient.get(
      `/search/next_results`,
      ctoken + continuation + type + itct
    );

    if (cache) {
      return res.json(cache);
    }

    const result = await YtMusic.next_search_result({
      ctoken,
      continuation,
      type,
      itct,
    });

    // return res.json(result);

    if (!result?.continuationContents)
      next(create_return_error("no results found", 404));

    // getting musicShelfContinuation contents || next continuation (maybe)

    const musicShelfContinuation = Parser.continuationContents(
      result.continuationContents,
      true
    );

    // error handling
    if (
      !musicShelfContinuation ||
      (musicShelfContinuation && musicShelfContinuation.length === 0)
    ) {
      next(create_return_error("musicShelfContinuation is empty", 404));
    }

    let final = {};
    final.list = [];
    final.next = musicShelfContinuation?.next;
    for (let i of musicShelfContinuation.list) {
      if (i?.musicResponsiveListItemRenderer)
        final.list.push(
          Parser.musicResponsiveListItemRenderer(
            i.musicResponsiveListItemRenderer
          )
        );
    }

    // error handling
    if (!final || (final && final.length === 0)) {
      next(create_return_error("List is empty", 404));
    }

    // return res.json({
    //   title: "Next results",
    //   list: [final],
    // });

    await memoryClient.set(
      `/search/next_results`,
      ctoken + continuation + type + itct,
      final,
      2
    ); // 2 hour

    return res.json(final);
  } catch (error) {
    next(error);
  }
};

exports.search_suggestions = async (req, res, next) => {
  const { query, params } = req.query;

  let encodedParams;
  if (params) {
    encodedParams = Parser.getSearchParams(params);
  }

  // use validation
  try {
    const cache = await memoryClient.get(`/search_suggestions`, query + params);

    if (cache) {
      return res.json(cache);
    }

    const result = encodedParams
      ? await YtMusic.search_suggestions(query, encodedParams)
      : await YtMusic.search_suggestions(query);

    // return res.json(result);

    const list = Parser.getSearchSuggestionsSectionRenderer(result?.contents);

    if (!list || (list && list.length <= 0)) {
      next(create_return_error("No results found.", 404));
    }

    let final = [];
    for (let i of list) {
      if (i?.searchSuggestionRenderer)
        final.push(Parser.searchSuggestionRenderer(i.searchSuggestionRenderer));
    }

    if (!final || (final && final.length <= 0)) {
      next(create_return_error("No results found.", 404));
    }

    const finalData = { list: final };

    await memoryClient.set(`/search_suggestions`, query + params, finalData, 2); // 2 hour

    return res.json(finalData);
  } catch (error) {
    next(error);
  }
};
