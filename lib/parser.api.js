const {
  create_return_error,
  objectHas,
  objectIsEmpty,
} = require("../helper/functions");

const supportedMenuRendererChildrenTitle = [
  "shuffle play",
  // "play",
  "MUSIC_SHUFFLE",
  "start radio",
  // "radio",
  "play next",
  "QUEUE_PLAY_NEXT",
  "add to queue",
  "to queue",
  "ADD_TO_REMOTE_QUEUE",
  "go to album",
  "go to artist",
  "go to",
];

class Parser {
  // API reuseable parser
  static getSearchParams = (type) => {
    let params;

    switch (type) {
      case "SONGS":
        params = "Eg-KAQwIARAAGAAgACgAMABqChAEEAUQAxAKEAk%3D";
        break;
      case "VIDEOS":
        params = "Eg-KAQwIABABGAAgACgAMABqChAEEAUQAxAKEAk%3D";
        break;
      case "ALBUMS":
        params = "Eg-KAQwIABAAGAEgACgAMABqChAEEAUQAxAKEAk%3D";
        break;
      case "PLAYLISTS":
        params = "Eg-KAQwIABAAGAAgACgBMABqChAEEAUQAxAKEAk%3D";
        break;
      case "ARTISTS":
        params = "Eg-KAQwIABAAGAAgASgAMABqChAEEAUQAxAKEAk%3D";
        break;
      default:
        params = null;
        break;
    }

    return params;
  };

  static getVideoOrPlaylistId = (obj) => {
    if (obj?.thumbnailOverlay) {
      const thumbnailOverlay = obj.thumbnailOverlay;
      const path = this.musicItemThumbnailOverlayRenderer(
        thumbnailOverlay?.musicItemThumbnailOverlayRenderer,
      );

      let endpoint;
      if (path.hasOwnProperty("watchPlaylistEndpoint"))
        endpoint = "watchPlaylistEndpoint";
      else if (path.hasOwnProperty("watchEndpoint")) endpoint = "watchEndpoint";

      const final =
        (Object.keys(path[endpoint]).length > 0 && path[endpoint]) || null;

      return final;
    } else {
      return null;
    }
  };

  static findNavigationEndpoint = (obj, hasBody = false, body) => {
    if (
      obj?.navigationEndpoint ||
      obj?.endpoint ||
      hasBody ||
      obj?.watchEndpoint
    ) {
      const isWatchEndpointAvailable = obj?.navigationEndpoint?.watchEndpoint;
      const isBrowseEndpointAvailable = obj?.navigationEndpoint?.browseEndpoint;

      const isSearchEndpointAvailable = hasBody
        ? body?.searchEndpoint
        : obj?.navigationEndpoint?.searchEndpoint;

      const isWatchPlaylistEndpointAvailable =
        obj?.navigationEndpoint?.watchPlaylistEndpoint;
      const isEndpoint = obj?.endpoint?.browseEndpoint?.browseId;

      if (isBrowseEndpointAvailable) return isBrowseEndpointAvailable;
      else if (isSearchEndpointAvailable) return isSearchEndpointAvailable;
      else if (isWatchEndpointAvailable) return isWatchEndpointAvailable;
      else if (isWatchPlaylistEndpointAvailable)
        return isWatchPlaylistEndpointAvailable;
      else if (isEndpoint) return isEndpoint;
    } else {
      return null;
    }
  };

  static getServiceEndpoint = (serviceEndpoint, isQueueAddEndpoint) => {
    const queueAddEndpoint = serviceEndpoint?.queueAddEndpoint;
    if (isQueueAddEndpoint && queueAddEndpoint)
      return this.queueAddEndpoint(queueAddEndpoint);
    return queueAddEndpoint;
  };

  static queueAddEndpoint = (queueAddEndpoint) => {
    const queueTargeted = queueAddEndpoint?.queueTarget;

    const isPlaylist = queueTargeted?.playlistId && true;
    const isVideo = queueTargeted?.videoId && true;

    // queueAddEndpoint?.queueTarget?.playlistId ||
    // queueAddEndpoint?.queueTarget?.videoId;
    // const isValid =  queueTargeted;
    return {
      isPlaylist,
      isVideo,
      queueTarget: queueTargeted,
      queueInsertPosition: queueAddEndpoint?.queueInsertPosition || null,
    };
  };

  static getTextDetailsFromArray = (arr, key_text = "text") => {
    return arr.map((item) => {
      const result = {};
      const navigationEndpoint = this.findNavigationEndpoint(item);
      navigationEndpoint ? (result["navigate"] = navigationEndpoint) : null;
      result[key_text] = (item?.text && item.text) || null;
      return result;
    });
  };

  // header renderers
  static musicHeaderRenderer = (musicHeaderRenderer) => {
    return {
      title:
        musicHeaderRenderer?.title?.runs?.length > 0 &&
        this.getTextDetailsFromArray(musicHeaderRenderer.title.runs),
    };
  };

  static musicImmersiveHeaderRenderer = (musicImmersiveHeaderRenderer) => {
    const final = {};

    final.title =
      musicImmersiveHeaderRenderer?.title?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicImmersiveHeaderRenderer.title.runs);

    final.description =
      musicImmersiveHeaderRenderer?.description?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        musicImmersiveHeaderRenderer.description.runs,
      );

    final.thumbnails =
      musicImmersiveHeaderRenderer?.thumbnail?.musicThumbnailRenderer &&
      this.musicThumbnailRenderer(
        musicImmersiveHeaderRenderer.thumbnail.musicThumbnailRenderer,
      );

    final.playButton =
      musicImmersiveHeaderRenderer?.playButton?.buttonRenderer &&
      this.buttonRenderer(
        musicImmersiveHeaderRenderer.playButton.buttonRenderer,
      );

    return final;
  };

  static musicVisualHeaderRenderer = (musicVisualHeaderRenderer) => {
    const final = {};

    final.title =
      musicVisualHeaderRenderer?.title?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicVisualHeaderRenderer.title.runs);

    final.thumbnails =
      musicVisualHeaderRenderer?.thumbnail?.musicThumbnailRenderer &&
      this.musicThumbnailRenderer(
        musicVisualHeaderRenderer.thumbnail.musicThumbnailRenderer,
      );

    final.foregroundThumbnail =
      musicVisualHeaderRenderer?.foregroundThumbnail?.musicThumbnailRenderer &&
      this.musicThumbnailRenderer(
        musicVisualHeaderRenderer.foregroundThumbnail.musicThumbnailRenderer,
      );

    final.playButton =
      musicVisualHeaderRenderer?.playButton?.buttonRenderer &&
      this.buttonRenderer(musicVisualHeaderRenderer.playButton.buttonRenderer);

    return final;
  };

  static musicDetailHeaderRenderer = (musicDetailHeaderRenderer) => {
    let final = {};

    final.thumbnails =
      musicDetailHeaderRenderer?.thumbnail?.croppedSquareThumbnailRenderer &&
      this.croppedSquareThumbnailRenderer(
        musicDetailHeaderRenderer.thumbnail.croppedSquareThumbnailRenderer,
      );

    final.title =
      musicDetailHeaderRenderer?.title?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicDetailHeaderRenderer.title.runs);

    final.subtitle =
      musicDetailHeaderRenderer?.subtitle?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicDetailHeaderRenderer.subtitle.runs);

    final.description =
      musicDetailHeaderRenderer?.description?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicDetailHeaderRenderer.description.runs);

    final.secondSubtitle =
      musicDetailHeaderRenderer?.secondSubtitle?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        musicDetailHeaderRenderer.secondSubtitle.runs,
      );

    final.menu =
      musicDetailHeaderRenderer?.menu?.menuRenderer &&
      this.menuRenderer(musicDetailHeaderRenderer.menu.menuRenderer, true);

    return { ...final, ...final.menu };
  };

  static gridHeaderRenderer = (gridHeaderRenderer) => {
    return (
      gridHeaderRenderer?.title?.runs &&
      this.getTextDetailsFromArray(gridHeaderRenderer.title.runs)
    );
  };

  static musicCarouselShelfBasicHeaderRenderer = (
    musicCarouselShelfBasicHeaderRenderer /*, D */,
  ) => {
    // if (D && D == 'all') {
    //   if (moreContentButton) {
    //   }
    //   return
    // }
    const title =
      musicCarouselShelfBasicHeaderRenderer?.title?.runs?.length > 0
        ? this.getTextDetailsFromArray(
            musicCarouselShelfBasicHeaderRenderer.title.runs,
          )
        : null;

    const strapline =
      musicCarouselShelfBasicHeaderRenderer?.strapline?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        musicCarouselShelfBasicHeaderRenderer.strapline.runs,
      );

    const thumbnail =
      musicCarouselShelfBasicHeaderRenderer?.thumbnail
        ?.musicThumbnailRenderer &&
      this.musicThumbnailRenderer(
        musicCarouselShelfBasicHeaderRenderer.thumbnail.musicThumbnailRenderer,
      );

    return {
      title,
      strapline: strapline || false,
      thumbnail: thumbnail || false,
    };
  };

  // standard yt api functions / renderer
  static singleColumnBrowseResultsRenderer = (
    singleColumnBrowseResultsRenderer,
    show_next_results = false,
  ) => {
    // new releases
    // console.log(singleColumnBrowseResultsRenderer);

    const list = this.tabRenderer(
      singleColumnBrowseResultsRenderer?.tabs[0]?.tabRenderer,
      true,
      show_next_results,
    );

    if (list) {
      return list;
    } else {
      return [];
    }
  };

  static singleColumnMusicWatchNextResultsRenderer = (
    singleColumnMusicWatchNextResultsRenderer,
  ) => {
    const tabs = this.tabbedRenderer(
      singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer,
      true,
    );

    if (!tabs || tabs.length === 0) return null;

    let tabRenderersContent = {
      hasLyrics: true,
      next_songs: null,
    };
    for (let tab of tabs) {
      if (tab?.tabRenderer) {
        const title = tab.tabRenderer?.title;
        if (title.toLowerCase().includes("lyric")) {
          tabRenderersContent.hasLyrics = !tab.tabRenderer?.unselectable;
          tabRenderersContent.lyrics = {
            browseId: this.findNavigationEndpoint(tab.tabRenderer),
          };
          // development only
          tabRenderersContent.lyrics.url =
            process.env.baseURL +
            "/api/v1/browse?id=" +
            tabRenderersContent.lyrics.browseId;
        } else if (title.toLowerCase().includes("next")) {
          tabRenderersContent.next_songs = {
            title,
            list: this.tabRenderer(tab.tabRenderer),
          };
        } else if (title.toLowerCase().includes("relate")) {
          tabRenderersContent.hasRelated = Boolean(
            this.findNavigationEndpoint(tab.tabRenderer),
          );
          tabRenderersContent.related = {
            browseId: this.findNavigationEndpoint(tab.tabRenderer),
          };
          // development only
          tabRenderersContent.related.url =
            process.env.baseURL +
            "/api/v1/browse?id=" +
            tabRenderersContent.related.browseId;
        }
      }
    }

    if (
      !tabRenderersContent.next_songs ||
      objectIsEmpty(tabRenderersContent?.next_songs?.list) ||
      !tabRenderersContent?.next_songs?.list?.hasOwnProperty(
        "musicQueueRenderer",
      )
    ) {
      return null;
    }

    const getSelectedSong = (selectedSong) => {
      tabRenderersContent.hasSelectedSong = true;
      tabRenderersContent.selectedSong = selectedSong;
    };

    // const tabRenderersList = {...tabRenderersContent.next_songs.list}
    tabRenderersContent.next_songs.list = this.musicQueueRenderer(
      tabRenderersContent.next_songs.list.musicQueueRenderer,
      true,
      getSelectedSong,
    );

    return tabRenderersContent;
  };

  static musicShelfRenderer = (
    musicShelfRenderer,
    listTitle,
    searching = false,
    contentsHasMusicResponsiveListItemRenderer = false,
  ) => {
    const title =
      musicShelfRenderer?.title?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicShelfRenderer?.title.runs);

    const list =
      musicShelfRenderer?.contents?.length > 0 && musicShelfRenderer?.contents;

    // if musicShelfRenderer = {contents: [...musicResponsiveListItemRenderer]}
    const filteredList = [];
    if (
      list &&
      list?.length > 0 &&
      contentsHasMusicResponsiveListItemRenderer
    ) {
      for (let i of list) {
        if (i?.musicResponsiveListItemRenderer) {
          filteredList.push(
            Parser.musicResponsiveListItemRenderer(
              i.musicResponsiveListItemRenderer,
            ),
          );
        }
      }

      return {
        title: title || listTitle,
        list: filteredList || [],
      };
    }

    let otherProps = {};
    if (searching && musicShelfRenderer?.continuations) {
      const data = musicShelfRenderer?.continuations?.[0]?.nextContinuationData;
      if (data) {
        otherProps.next = {
          ctoken: data?.continuation,
          continuation: data?.continuation,
          type: "next",
          itct: data?.clickTrackingParams,
        };
        // development only
        const params = new URLSearchParams(otherProps.next);
        otherProps.next.url =
          process.env.baseURL + "/api/v1/search_next?" + params.toString();
      }
    }

    return {
      title: title || listTitle,
      list: list || [],
      ...otherProps,
    };
  };

  static musicDescriptionShelfRenderer = (
    musicDescriptionShelfRenderer,
    isLyrics = false,
  ) => {
    const hasDescription =
      musicDescriptionShelfRenderer?.description?.runs?.length > 0;

    const description =
      musicDescriptionShelfRenderer?.description?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        musicDescriptionShelfRenderer.description.runs,
      );

    const footer =
      musicDescriptionShelfRenderer?.footer?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicDescriptionShelfRenderer.footer.runs);

    if (isLyrics) {
      return {
        hasLyrics: hasDescription,
        lyrics: description,
        footer: footer,
      };
    }

    const title =
      musicDescriptionShelfRenderer?.header?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicDescriptionShelfRenderer.header.runs);

    const subtitle =
      musicDescriptionShelfRenderer?.subheader?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        musicDescriptionShelfRenderer.subheader.runs,
      );

    return {
      title,
      subtitle,
      description,
      footer,
    };
  };

  static gridRenderer = (gridRenderer, listTitle) => {
    let title,
      list = [];

    // error handling
    if (gridRenderer?.header) {
      title =
        gridRenderer?.header?.gridHeaderRenderer &&
        this.gridHeaderRenderer(gridRenderer?.header.gridHeaderRenderer);
    }

    if (gridRenderer?.items && gridRenderer?.items.length > 0) {
      for (let item of gridRenderer?.items) {
        // only filter items with 'musicTwoRowItemRenderer' || 'musicNavigationButtonRenderer' key
        if (item?.musicTwoRowItemRenderer) {
          list.push(this.musicTwoRowItemRenderer(item.musicTwoRowItemRenderer));
        } else if (item?.musicNavigationButtonRenderer) {
          list.push(
            this.musicNavigationButtonRenderer(
              item.musicNavigationButtonRenderer,
            ),
          );
        }
      }
    }

    const isRectangleBox = listTitle?.toLowerCase().includes("genre");

    return {
      isRectangleBox,
      title: title || listTitle,
      list: list || [],
    };
  };

  static musicTwoRowItemRenderer = (musicTwoRowItemRenderer) => {
    const thumbnails = this.thumbnailRenderer(
      musicTwoRowItemRenderer?.thumbnailRenderer,
    );

    const navigationEndpoint = this.findNavigationEndpoint(
      musicTwoRowItemRenderer,
    );

    const display = {
      title:
        musicTwoRowItemRenderer?.title?.runs?.length &&
        this.getTextDetailsFromArray(musicTwoRowItemRenderer?.title.runs),
      subtitle:
        musicTwoRowItemRenderer?.subtitle?.runs?.length &&
        this.getTextDetailsFromArray(musicTwoRowItemRenderer?.subtitle.runs),
    };

    const videoId = this.getVideoOrPlaylistId(musicTwoRowItemRenderer);

    // development only
    const url =
      videoId && videoId.hasOwnProperty("videoId")
        ? {
            url: `${process.env.baseURL}/api/getAudio?id=${videoId.videoId}`,
          }
        : {};

    // TESTING
    // const { browseId } = navigationEndpoint;

    // const browse = `${process.env.baseURL}/api/v1/browse?id=${browseId}`;
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const menu =
      musicTwoRowItemRenderer?.menu?.menuRenderer &&
      this.menuRenderer(musicTwoRowItemRenderer.menu.menuRenderer, true);

    return {
      thumbnails,
      ...navigationEndpoint,
      ...display,
      ...videoId,
      ...url,
      ...menu, // browse,
    };
  };

  static musicCarouselShelfRenderer = (
    musicCarouselShelfRenderer,
    parseArtist = false,
  ) => {
    let isRectangleBox;
    const supported = {
      musicTwoRowItemRenderer: {
        type: "musicTwoRowItemRenderer",
        function: this.musicTwoRowItemRenderer,
      },
      musicResponsiveListItemRenderer: {
        type: "musicResponsiveListItemRenderer",
        function: this.musicResponsiveListItemRenderer,
      },
      // musicTwoRowItemRenderer: {
      //   type: "musicResponsiveListItemRenderer",
      //   function: this.musicResponsiveListItemRenderer,
      // },
    };

    let header = {};

    if (
      musicCarouselShelfRenderer?.header.hasOwnProperty(
        "musicCarouselShelfBasicHeaderRenderer",
      )
    ) {
      header = this.musicCarouselShelfBasicHeaderRenderer(
        musicCarouselShelfRenderer.header.musicCarouselShelfBasicHeaderRenderer,
      );
    }

    const { title: titleArr, strapline, thumbnail } = header;

    const title = titleArr?.[0];

    let list = [];
    const filteredTitle = title?.text && title.text.toLowerCase();
    musicCarouselShelfRenderer?.contents.forEach((i) => {
      const shelfName = Object.keys(i)[0];

      const filter = {
        type: "",
        function: null,
      };

      if (!parseArtist) {
        if (filteredTitle.includes("videos")) {
          filter.type = "musicTwoRowItemRenderer";
          filter.function = this.musicTwoRowItemRenderer;
        } else if (filteredTitle.includes("artists")) {
          filter.type = "musicResponsiveListItemRenderer";
          filter.function = this.musicResponsiveListItemRenderer;
          isRectangleBox = true;
        } else if (filteredTitle.includes("trend")) {
          filter.type = "musicResponsiveListItemRenderer";
          filter.function = this.musicResponsiveListItemRenderer;
        } else {
          filter.type = "musicTwoRowItemRenderer";
          filter.function = this.musicTwoRowItemRenderer;
        }
      } else if (supported.hasOwnProperty(shelfName)) {
        filter.type = supported[shelfName].type;
        filter.function = supported[shelfName].function;
      } else {
        filter.type = "musicTwoRowItemRenderer";
        filter.function = this.musicTwoRowItemRenderer;
      }

      const result =
        i.hasOwnProperty(filter.type) && filter.function(i[filter.type]);
      result && list.push(result);
    });

    return {
      isRectangleBox,
      title: title || null,
      strapline,
      thumbnail,
      list: list,
      carouselRenderer: true,
    };
  };

  static musicResponsiveListItemRenderer = (
    musicResponsiveListItemRenderer,
  ) => {
    const final = {};

    final.thumbnails =
      musicResponsiveListItemRenderer?.thumbnail?.musicThumbnailRenderer &&
      this.musicThumbnailRenderer(
        musicResponsiveListItemRenderer?.thumbnail.musicThumbnailRenderer,
      );

    const columns =
      musicResponsiveListItemRenderer?.flexColumns?.length > 0 &&
      musicResponsiveListItemRenderer.flexColumns;

    const fixedColumns =
      musicResponsiveListItemRenderer?.fixedColumns?.length > 0 &&
      musicResponsiveListItemRenderer.fixedColumns;

    let display = [];
    if (columns) {
      for (let c of columns) {
        if (c.hasOwnProperty("musicResponsiveListItemFlexColumnRenderer")) {
          display.push(
            this.musicResponsiveListItemFlexColumnRenderer(
              c.musicResponsiveListItemFlexColumnRenderer,
            ),
          );
        }
      }
    }

    const fixedCols = [];
    if (fixedColumns) {
      for (let c of fixedColumns) {
        if (c.hasOwnProperty("musicResponsiveListItemFixedColumnRenderer")) {
          fixedCols.push(
            ...this.musicResponsiveListItemFlexColumnRenderer(
              c.musicResponsiveListItemFixedColumnRenderer,
            ),
          );
        }
      }
    }

    let endpoint = {};
    if (musicResponsiveListItemRenderer?.navigationEndpoint)
      endpoint.browseId =
        musicResponsiveListItemRenderer?.navigationEndpoint?.browseEndpoint?.browseId;
    if (musicResponsiveListItemRenderer?.playlistItemData)
      endpoint = musicResponsiveListItemRenderer?.playlistItemData;

    const [title, subtitle, otherText] = display;
    final.title = (title?.length > 0 && title) || null;
    final.subtitle = (subtitle?.length > 0 && subtitle) || null;
    final.otherText = (otherText?.length > 0 && otherText) || null;
    final.fixedColumns = (fixedCols?.length > 0 && fixedCols) || null;

    final.menu =
      musicResponsiveListItemRenderer?.menu?.menuRenderer &&
      this.menuRenderer(
        musicResponsiveListItemRenderer.menu.menuRenderer,
        true,
      );

    return { ...final, ...final.menu, ...endpoint };
  };

  // list renderer
  static sectionListRenderer = (
    sectionListRenderer,
    show_next_results = false,
  ) => {
    if (
      show_next_results &&
      sectionListRenderer?.contents &&
      sectionListRenderer?.continuations
    )
      return {
        contents: sectionListRenderer.contents,
        continuations: sectionListRenderer.continuations,
      };
    else if (
      show_next_results &&
      sectionListRenderer?.contents &&
      !sectionListRenderer?.continuations
    )
      return {
        contents: sectionListRenderer.contents,
      };

    return sectionListRenderer?.contents;
  };

  // tab renderer
  static watchNextTabbedResultsRenderer = (watchNextTabbedResultsRenderer) => {
    return watchNextTabbedResultsRenderer?.tabs;
  };

  static tabbedRenderer = (
    tabbedRenderer,
    getWatchNextTabbedResultsRenderer = false,
  ) => {
    if (getWatchNextTabbedResultsRenderer)
      return this.watchNextTabbedResultsRenderer(
        tabbedRenderer?.watchNextTabbedResultsRenderer,
      );
    return tabbedRenderer;
  };

  static musicResponsiveHeaderRenderer = (musicResponsiveHeaderRenderer) => {
    const final = {};
    final.title =
      musicResponsiveHeaderRenderer?.title?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicResponsiveHeaderRenderer.title.runs);
    final.subtitle =
      musicResponsiveHeaderRenderer?.subtitle?.runs?.length > 0 &&
      this.getTextDetailsFromArray(musicResponsiveHeaderRenderer.subtitle.runs);
    final.secondSubtitle =
      musicResponsiveHeaderRenderer?.secondSubtitle?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        musicResponsiveHeaderRenderer.secondSubtitle.runs,
      );
    final.thumbnails =
      musicResponsiveHeaderRenderer?.thumbnail?.musicThumbnailRenderer &&
      this.thumbnailRenderer(musicResponsiveHeaderRenderer.thumbnail);
    const musicPlayButtonRenderer =
      musicResponsiveHeaderRenderer?.buttons?.find(
        (b) => b?.musicPlayButtonRenderer,
      );
    const menuRenderer = musicResponsiveHeaderRenderer?.buttons?.find(
      (b) => b?.menuRenderer,
    );
    final.menu =
      menuRenderer && this.menuRenderer(menuRenderer.menuRenderer, true);
    const parsedMusicPlayButtonRenderer = this.musicPlayButtonRenderer(
      musicPlayButtonRenderer.musicPlayButtonRenderer,
    );
    const navigate = parsedMusicPlayButtonRenderer?.watchEndpoint?.videoId;

    final.playButton = {
      text: "PLAY",
      navigate: navigate && {
        ...parsedMusicPlayButtonRenderer?.watchEndpoint,
      },
    };
    return final;
  };

  static tabRenderer = (
    tabRenderer,
    getSectionListRenderer = false,
    show_next_results,
  ) => {
    // usually a tab renderer contains list of sections
    if (getSectionListRenderer)
      return this.sectionListRenderer(
        tabRenderer?.content?.sectionListRenderer,
        show_next_results,
      );
    return tabRenderer?.content;
  };

  static tabbedSearchResultsRenderer = (tabbedSearchResultsRenderer) => {
    return (
      tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer &&
      this.tabRenderer(tabbedSearchResultsRenderer.tabs[0].tabRenderer, true)
    );
  };

  // thumbnail renderers
  static croppedSquareThumbnailRenderer = (croppedSquareThumbnailRenderer) => {
    return croppedSquareThumbnailRenderer?.thumbnail?.thumbnails;
  };

  static thumbnailRenderer = (thumbnailRenderer) => {
    return (
      thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
    );
  };

  static musicThumbnailRenderer = (musicThumbnailRenderer) => {
    return musicThumbnailRenderer?.thumbnail?.thumbnails || [];
  };

  // menu renderer
  // use Menu in musicResponsiveListItemRenderer

  static menuRenderer = (menuRenderer, filterChildren) => {
    const supportedMenuRendererChildren = {
      menuNavigationItemRenderer: this.menuNavigationItemRenderer,
      menuServiceItemRenderer: this.menuServiceItemRenderer,
    };

    const items = menuRenderer?.items;
    const menuOptions = {
      buttons: [],
      menu: [],
    };
    if (items?.length > 0) {
      if (!filterChildren) {
        return items;
      }

      for (let menuItem of items) {
        const key = Object.keys(menuItem)?.[0];
        const isSupported = supportedMenuRendererChildren.hasOwnProperty(key);

        if (isSupported && menuItem?.[key]) {
          const result = supportedMenuRendererChildren[key](menuItem[key]);
          if (result) menuOptions.menu.push(result);
        }
      }
    }

    if (menuRenderer?.topLevelButtons) {
      for (const button of menuRenderer.topLevelButtons) {
        if (button?.buttonRenderer) {
          menuOptions.buttons.push(this.buttonRenderer(button.buttonRenderer));
        }
      }
    }

    return menuOptions;
  };

  static menuNavigationItemRenderer = (menuNavigationItemRenderer) => {
    const text =
      menuNavigationItemRenderer?.text?.runs?.length > 0 &&
      this.getTextDetailsFromArray(menuNavigationItemRenderer.text.runs)?.[0]
        ?.text;

    const iconName = menuNavigationItemRenderer?.icon?.iconType;

    if (text || iconName) {
      const isSupported = supportedMenuRendererChildrenTitle.find(
        (c) =>
          c?.toLowerCase()?.includes(text.toLowerCase()) ||
          c?.toLowerCase()?.includes(iconName.toLowerCase()),
      );

      if (isSupported) {
        const navigate = this.findNavigationEndpoint(
          menuNavigationItemRenderer,
        );

        return {
          navigate,
          text,
        };
        // const
      }
    }
  };

  static menuServiceItemRenderer = (menuServiceItemRenderer) => {
    const text =
      menuServiceItemRenderer?.text?.runs?.length > 0 &&
      this.getTextDetailsFromArray(menuServiceItemRenderer.text.runs)?.[0]
        ?.text;

    const iconName = menuServiceItemRenderer?.icon?.iconType;

    if (text || iconName) {
      const isSupported = supportedMenuRendererChildrenTitle.find((c) => {
        return (
          c?.toLowerCase()?.includes(text.toLowerCase()) ||
          c?.toLowerCase()?.includes(iconName.toLowerCase())
        );
      });

      console.log(isSupported);
      if (isSupported) {
        const service =
          menuServiceItemRenderer?.serviceEndpoint &&
          this.getServiceEndpoint(
            menuServiceItemRenderer.serviceEndpoint,
            true,
          );

        return {
          service,
          text,
        };
        // const
      }
    }
  };

  // playlist renderer
  static playlistPanelVideoRenderer = (
    playlistPanelVideoRenderer,
    enteredTitle,
    getSelectedSong,
  ) => {
    const { ...rest } = playlistPanelVideoRenderer;

    const thumbnails = playlistPanelVideoRenderer?.thumbnail?.thumbnails;

    const newTitle =
      playlistPanelVideoRenderer?.title?.runs?.length > 0 &&
      this.getTextDetailsFromArray(playlistPanelVideoRenderer.title.runs);

    const newShortBylineText =
      playlistPanelVideoRenderer?.shortBylineText?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        playlistPanelVideoRenderer.shortBylineText.runs,
      );

    const newLongBylineText =
      playlistPanelVideoRenderer?.longBylineText?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        playlistPanelVideoRenderer.longBylineText.runs,
      );

    const newLengthText =
      playlistPanelVideoRenderer?.lengthText?.runs?.length > 0 &&
      this.getTextDetailsFromArray(playlistPanelVideoRenderer.lengthText.runs);

    const newVideoId = !playlistPanelVideoRenderer?.videoId
      ? this.findNavigationEndpoint(rest)?.videoId
      : playlistPanelVideoRenderer?.videoId;

    const navigate = this.findNavigationEndpoint(playlistPanelVideoRenderer);

    // development only
    const data = {
      thumbnails,
      title: newTitle || enteredTitle,
      shortBylineText: newShortBylineText,
      longBylineText: newLongBylineText,
      lengthText: newLengthText,
      videoId: newVideoId,
      ...navigate,
      // TESTING
      url: `${process.env.baseURL}/api/v1/audio?id=${newVideoId}`,
    };

    if (playlistPanelVideoRenderer?.selected) {
      getSelectedSong(data);
    }

    return data;
  };

  static playlistPanelRenderer = (
    playlistPanelRenderer,
    getPlaylistPanelVideoRenderers = false,
    getSelectedSong,
    getAutomixPreviewVideoRenderer,
  ) => {
    let final = {};
    final.title = playlistPanelRenderer?.title;

    final.list = [];
    if (getPlaylistPanelVideoRenderers) {
      if (playlistPanelRenderer?.contents) {
        for (let c of playlistPanelRenderer.contents) {
          if (c?.playlistPanelVideoRenderer) {
            final.list.push(
              this.playlistPanelVideoRenderer(
                c.playlistPanelVideoRenderer,
                final.title,
                getSelectedSong,
              ),
            );
          }

          if (c?.automixPreviewVideoRenderer) {
            final.playlist = this.automixPreviewVideoRenderer(
              c.automixPreviewVideoRenderer,
              true,
            );
          }
        }
      }
    } else {
      final.list = playlistPanelRenderer?.contents;
    }
    if (playlistPanelRenderer?.continuations) {
      const data =
        playlistPanelRenderer?.continuations?.[0]?.nextRadioContinuationData;
      final.next = {
        ctoken: data?.continuation,
        continuation: data?.continuation,
        type: "next",
        itct: data?.clickTrackingParams,
      };
      // development only
      // const params = new URLSearchParams(final.next);
      // final.next.url =
      //   process.env.baseURL + "/api/v1/search_next?" + params.toString();
    }

    final.playlistId = playlistPanelRenderer?.playlistId;

    return final;
  };

  static musicPlaylistShelfRenderer = (
    musicPlaylistShelfRenderer,
    hasMusicResponsiveListItemRenderer = false,
  ) => {
    const final = {};
    final.list = musicPlaylistShelfRenderer?.contents;
    final.playlistId = musicPlaylistShelfRenderer?.playlistId;
    final.collapsedItemCount = musicPlaylistShelfRenderer?.collapsedItemCount;
    if (!hasMusicResponsiveListItemRenderer) {
      return final;
    }

    if (!final.list || (final.list && final.list?.length <= 0)) {
      final.list = [];
      return final;
    }

    const list = [];

    for (let i of final.list) {
      if (i?.musicResponsiveListItemRenderer) {
        list.push(
          this.musicResponsiveListItemRenderer(
            i.musicResponsiveListItemRenderer,
          ),
        );
      }
    }
    final.list = list;

    return final;
  };

  // other renderer

  static messageSubtextRenderer = (messageSubtextRenderer) => {
    return {
      subtext:
        messageSubtextRenderer?.text?.runs?.length > 0 &&
        this.getTextDetailsFromArray(messageSubtextRenderer.text.runs),
    };
  };

  static messageRenderer = (messageRenderer, getSubtitle = true) => {
    const text =
      messageRenderer?.text?.runs?.length > 0 &&
      this.getTextDetailsFromArray(messageRenderer.text.runs);
    if (!getSubtitle) return { messageRenderer: true, text };
    const subtext =
      messageRenderer?.subtext?.messageSubtextRenderer &&
      this.messageSubtextRenderer(
        messageRenderer.subtext.messageSubtextRenderer,
      );
    return {
      messageRenderer: true,
      text,
      ...subtext,
    };
  };

  static showingResultsForRenderer = (showingResultsForRenderer) => {
    let final = {};
    final.showingResultsFor =
      showingResultsForRenderer?.showingResultsFor?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        showingResultsForRenderer.showingResultsFor.runs,
      );
    final.correctedQuery =
      showingResultsForRenderer?.correctedQuery?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        showingResultsForRenderer.correctedQuery.runs,
      );
    final.correctedQueryEndpoint =
      showingResultsForRenderer?.correctedQueryEndpoint &&
      this.findNavigationEndpoint(
        null,
        true,
        showingResultsForRenderer.correctedQueryEndpoint,
      );

    final.searchInsteadFor =
      showingResultsForRenderer?.searchInsteadFor?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        showingResultsForRenderer.searchInsteadFor.runs,
      );
    final.originalQuery =
      showingResultsForRenderer?.originalQuery?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        showingResultsForRenderer.originalQuery.runs,
      );
    final.originalQueryEndpoint =
      showingResultsForRenderer?.originalQueryEndpoint &&
      this.findNavigationEndpoint(
        null,
        true,
        showingResultsForRenderer.originalQueryEndpoint,
      );

    final.showingResultsForRenderer = true;
    return final;
  };

  static didYouMeanRenderer = (didYouMeanRenderer) => {
    let final = {};
    final.didYouMean =
      didYouMeanRenderer?.didYouMean?.runs?.length > 0 &&
      this.getTextDetailsFromArray(didYouMeanRenderer.didYouMean.runs);
    final.correctedQuery =
      didYouMeanRenderer?.correctedQuery?.runs?.length > 0 &&
      this.getTextDetailsFromArray(didYouMeanRenderer.correctedQuery.runs);
    final.correctedQueryEndpoint =
      didYouMeanRenderer?.correctedQueryEndpoint &&
      this.findNavigationEndpoint(
        null,
        true,
        didYouMeanRenderer.correctedQueryEndpoint,
      );

    final.didYouMeanRenderer = true;

    return final;
  };

  static musicQueueRenderer = (
    musicQueueRenderer,
    getPlaylistPanelRenderer = false,
    getSelectedSong,
  ) => {
    if (getPlaylistPanelRenderer)
      return this.playlistPanelRenderer(
        musicQueueRenderer?.content?.playlistPanelRenderer,
        true,
        getSelectedSong,
      );
    return musicQueueRenderer?.content;
  };

  static musicItemThumbnailOverlayRenderer = (
    musicItemThumbnailOverlayRenderer,
  ) => {
    return (
      musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer &&
      this.musicPlayButtonRenderer(
        musicItemThumbnailOverlayRenderer.content.musicPlayButtonRenderer,
      )
    );
  };

  static musicResponsiveListItemFlexColumnRenderer = (
    musicResponsiveListItemFlexColumnRenderer,
  ) => {
    const text =
      musicResponsiveListItemFlexColumnRenderer?.text?.runs?.length > 0 &&
      musicResponsiveListItemFlexColumnRenderer.text.runs;
    if (!text) return null;
    return this.getTextDetailsFromArray(text);
  };

  static musicNavigationButtonRenderer = (musicNavigationButtonRenderer) => {
    const title =
      musicNavigationButtonRenderer?.buttonText?.runs?.length > 0 &&
      this.getTextDetailsFromArray(
        musicNavigationButtonRenderer.buttonText.runs,
      );
    const endpoint =
      musicNavigationButtonRenderer?.clickCommand?.browseEndpoint;

    // development only
    endpoint.browse = `${process.env.baseURL}/api/v1/browse?id=${endpoint.browseId}&params=${endpoint.params}`;

    return {
      title,
      ...endpoint,
    };
  };

  static musicPlayButtonRenderer = (musicPlayButtonRenderer) => {
    return musicPlayButtonRenderer?.playNavigationEndpoint;
  };

  static buttonRenderer = (buttonRenderer) => {
    const final = {};
    final.text =
      buttonRenderer?.text?.runs?.length > 0 &&
      this.getTextDetailsFromArray(buttonRenderer.text.runs);

    final.navigate = buttonRenderer?.navigationEndpoint
      ? this.findNavigationEndpoint(buttonRenderer)
      : {};

    return {
      text: final.text,
      ...final.navigate,
    };
  };

  // search renderer
  static searchSuggestionsSectionRenderer = (
    searchSuggestionsSectionRenderer,
  ) => {
    return searchSuggestionsSectionRenderer?.contents;
  };

  static searchSuggestionRenderer = (searchSuggestionRenderer) => {
    const { ...rest } = searchSuggestionRenderer;
    const suggestions =
      searchSuggestionRenderer?.suggestion?.runs?.length > 0 &&
      this.getTextDetailsFromArray(searchSuggestionRenderer.suggestion.runs);

    const text = this.findNavigationEndpoint(rest) || {};

    // development only
    const full_text = encodeURIComponent(
      suggestions.reduce((prev, curr) => prev + curr.text, ""),
    );

    const songs_search = `${process.env.baseURL}/api/v1/search?query=${full_text}&params=SONGS`;
    const albums_search = `${process.env.baseURL}/api/v1/search?query=${full_text}&params=ALBUMS`;
    const playlists_search = `${process.env.baseURL}/api/v1/search?query=${full_text}&params=PLAYLISTS`;
    const artists_search = `${process.env.baseURL}/api/v1/search?query=${full_text}&params=ARTISTS`;

    return {
      suggestions,
      ...text,
      songs: songs_search,
      albums: albums_search,
      playlists: playlists_search,
      artists: artists_search,
    };
  };

  // other methods
  static automixPlaylistVideoRenderer = (automixPlaylistVideoRenderer) => {
    return this.findNavigationEndpoint(automixPlaylistVideoRenderer);
  };

  static automixPreviewVideoRenderer = (
    automixPreviewVideoRenderer,
    hasAutomixPlaylistVideoRenderer = false,
  ) => {
    const content = automixPreviewVideoRenderer?.content;
    if (
      hasAutomixPlaylistVideoRenderer &&
      content?.automixPlaylistVideoRenderer
    ) {
      return this.automixPlaylistVideoRenderer(
        content.automixPlaylistVideoRenderer,
      );
    }
    return content;
  };

  static getSearchSuggestionsSectionRenderer = (contents) => {
    return this.searchSuggestionsSectionRenderer(
      contents?.[0]?.searchSuggestionsSectionRenderer,
    );
  };

  static continuationContents = (
    continuationContents,
    isMusicShelfContinuation,
    playlistPanelContinuation,
  ) => {
    if (playlistPanelContinuation) {
      return this.playlistPanelRenderer(
        continuationContents?.playlistPanelContinuation,
        true,
        true,
      );
    }
    if (isMusicShelfContinuation)
      return this.musicShelfContinuation(
        continuationContents?.musicShelfContinuation,
      );
    return continuationContents?.musicShelfContinuation;
  };

  static itemSectionRenderer = (
    itemSectionRenderer,
    hasMessageRenderer = true,
  ) => {
    let contents = [];
    if (!itemSectionRenderer?.contents) return { list: [] };

    if (hasMessageRenderer) {
      for (let c of itemSectionRenderer.contents) {
        if (c?.messageRenderer) {
          contents.push(this.messageRenderer(c.messageRenderer));
        }
      }
    } else {
      contents = itemSectionRenderer.contents;
    }

    return { list: contents };
  };

  // musicShelfRenderer
  static musicShelfContinuation = (musicShelfContinuation) => {
    const list =
      musicShelfContinuation?.contents?.length > 0 &&
      musicShelfContinuation.contents;

    const continuation = {};
    const data =
      musicShelfContinuation?.continuations?.[0]?.nextContinuationData;
    if (data) {
      continuation.next = {
        ctoken: data?.continuation,
        continuation: data?.continuation,
        type: "next",
        itct: data?.clickTrackingParams,
      };
      // development only
      const params = new URLSearchParams(continuation.next);
      continuation.next.url =
        process.env.baseURL + "/api/v1/search_next?" + params.toString();
    }

    return {
      list: list || [],
      ...continuation,
    };
  };
}

module.exports = Parser;
