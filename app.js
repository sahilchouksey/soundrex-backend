const PORT = process.env.PORT || 8080;
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

// const { client } = require("./lib/redis");
const deleteCacheCron = require("./lib/services");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const songRoutes = require("./routes/song");

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://soundrex.netlify.app",
      "https://master--soundrex.netlify.app",
    ],
    credentials: true,
  })
);

// app.set("Access-Control-Allow-Origin", "http://localhost:3000");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api/v1", apiRoutes);
app.use("/auth", authRoutes);
app.use("/soundrex", songRoutes);

app.use((error, req, res, next) => {
  const message = error.message.toLowerCase().includes("mongodb")
    ? "Opps! something went wrong.  "
    : error.message || "Something went wrong.";
  const status = error.statusCode || 500;
  console.log(error);
  return res.status(status).json({ message, status });
});

deleteCacheCron();

mongoose
  .connect(process.env.MONGODB_SERVER)
  .then(() => {
    app.listen(PORT, () => {
      console.log("starting server");
      // client.flushall();
      console.log("Server is listing to port: " + PORT);
    });
  })
  .catch((err) => console.log(err));
