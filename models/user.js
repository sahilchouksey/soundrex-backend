const mongoose = require("mongoose");

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      required: true,
      type: String,
    },
    password: {
      required: true,
      type: String,
    },
    name: {
      required: true,
      type: String,
    },
    library: [
      {
        type: String,
        ref: "Song",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
