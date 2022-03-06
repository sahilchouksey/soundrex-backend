const User = require("../models/user");
const Song = require("../models/song");

exports.likeSong = async (req, res, next) => {
  try {
    const { title, thumbnail, id } = req.body;

    if (!title || !thumbnail || !id) {
      const error = new Error("Invalid data.");
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 401;
      throw error;
    }

    const existingSong = await Song.findById(id);

    // if (existingSong) {
    //   existingSong.likers.push(user._id);
    //   await existingSong.save();
    // }

    const newSong = new Song({
      _id: id,
      title,
      thumbnail,
      videoId: req?.body?.videoId || undefined,
      browseId: req?.body?.browseId || undefined,

      // likers: [user._id],
    });

    const song = !existingSong ? await newSong.save() : existingSong;

    if (!song) {
      const error = new Error("Song not found.");
      error.statusCode = 401;
      throw error;
    }

    // user.library = !user.library && [];

    const ID = song?.videoId || song?.browseId;
    const userAlreadyLikedThisSong = user.library.includes(ID);

    if (userAlreadyLikedThisSong) {
      const error = new Error("Already liked .");
      error.statusCode = 401;
      throw error;
    }

    user.library.push(song);

    await user.save();

    return res.status(201).json({
      message: "Library updated sucessfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.removeLikeFromSong = async (req, res, next) => {
  try {
    const { id } = req.body;

    if (!id) {
      const error = new Error("ID not found.");
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 401;
      throw error;
    }

    const isLiked = user.library.includes(id);

    if (!isLiked) {
      const error = new Error("Data not found .");
      error.statusCode = 401;
      throw error;
    }

    user.library.pull(id);

    await user.save();

    return res.status(201).json({
      message: "Removed from library.",
    });
  } catch (error) {
    next(error);
  }
};

exports.getLibrary = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId }).populate("library");

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 401;
      throw error;
    }

    // const populatedLibrary = await user;

    return res.status(200).json({
      library: user.library,
      message: "Library fetched sucessfully.",
    });
  } catch (error) {
    next(error);
  }
};

exports.isLiked = async (req, res, next) => {
  try {
    const { id } = req.body;

    if (!id) {
      const error = new Error("ID not found.");
      error.statusCode = 401;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 401;
      throw error;
    }

    const isLiked = user.library.includes(id);

    return res.status(200).json({
      isLiked,
      message: isLiked ? "Liked." : "Not liked.",
    });
  } catch (error) {
    next(error);
  }
};
