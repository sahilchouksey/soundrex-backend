const mongoose = require("mongoose");

const { Schema } = mongoose;

const songSchema = new Schema(
  {
    _id: {
      type: String,
    },

    title: {
      required: true,
      type: String,
    },
    thumbnail: {
      required: true,
      type: String,
    },
    videoId: {
      type: String,
    },
    browseId: {
      type: String,
    },

    // likers: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "User",
    //   },
    // ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Song", songSchema);
