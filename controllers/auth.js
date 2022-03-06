const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");

const User = require("../models/user");

const { getDecodedJWT } = require("../lib/is-auth");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  try {
    if (!errors.isEmpty()) {
      const msg = errors.array()?.[0]?.msg;
      const error = new Error(
        msg || "Validation failed! please enter valid input."
      );
      error.statusCode = 422;
      throw error;
    }

    const { email, password, name } = req.body;

    const salt = await bcrypt.genSalt(10);
    const hashPwd = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashPwd,
    });

    const newUser = await user.save();

    return res.status(200).json({
      message: "Account created successfully.",
      user: {
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email });
    // .populate("library");

    if (!user) {
      const error = new Error("User not found.");
      error.statusCode = 401;
      throw error;
    }

    const isAuthenticated = await bcrypt.compare(password, user.password);

    if (!isAuthenticated) {
      const error = new Error("Wrong Email or Password.");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      process.env.SECRET_KEY_JWT,
      // { expiresIn: "1h" }

      { expiresIn: "1h" }
    );

    return res.status(200).json({
      token,
      userId: user._id.toString(),
      username: user.name,

      // library: user.library,
    });
  } catch (error) {
    next(error);
  }
};

exports.isAuth = async (req, res, next) => {
  try {
    const authorization = req.get("authorization");

    if (!authorization) {
      const error = new Error("Unauthorized");
      error.statusCode = 401;
      throw error;
    }

    const token = authorization?.split(" ")?.[1];

    if (!token) {
      const error = new Error("Unauthorized");
      error.statusCode = 401;
      throw error;
    }

    // let decodedToken;

    const decodedToken = getDecodedJWT(token);

    const user = await User.findById(decodedToken.userId);
    // .populate("library");

    if (!user) {
      const error = new Error("Unauthorized");
      error.statusCode = 401;
      throw error;
    }

    return res.status(200).json({
      decodedToken,
      username: user.name,
      // library: user.library
    });
  } catch (error) {
    next(error);
  }
};
