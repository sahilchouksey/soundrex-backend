const { getDecodedJWT } = require("../lib/is-auth");

module.exports = (req, res, next) => {
  let decodedToken;
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

    decodedToken = getDecodedJWT(token);
    req.userId = decodedToken.userId;
    next();
  } catch (error) {
    next(error);
  }
};
