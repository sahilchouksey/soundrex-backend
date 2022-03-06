const jwt = require("jsonwebtoken");

exports.getDecodedJWT = (jsonwebtoken) => {
  let decodedToken;

  try {
    decodedToken = jwt.verify(jsonwebtoken, process.env.SECRET_KEY_JWT);
  } catch (error) {
    throw error;
  }

  if (!decodedToken) {
    const error = new Error("Not authenticated");
    error.statusCode = 401;
    throw error;
  }

  return decodedToken;
};
