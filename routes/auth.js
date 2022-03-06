const express = require("express");
const { body } = require("express-validator");

const router = express.Router();

const User = require("../models/user");
const AuthController = require("../controllers/auth");

// signup
router.put(
  "/signup",
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Given email is not valid.")
      .custom((value, { req }) => {
        return User.findOne({ email: req.body.email })
          .then((user) => {
            if (user) {
              return Promise.reject("Email is invalid or already taken.");
            }
          })
          .catch((err) => Promise.reject(err));
      })
      .normalizeEmail(),
    body("password").trim().isLength({ min: 6 }),
    body("name").trim().not().isEmpty(),
  ],
  AuthController.signup
);

// login
router.post("/login", AuthController.login);

// is-auth
router.post("/is-auth", AuthController.isAuth);

module.exports = router;
