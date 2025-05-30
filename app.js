const PORT = process.env.PORT || 8080;
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

// const { client } = require("./lib/redis");
const deleteCacheCron = require("./lib/services");
const pipedHealthService = require("./lib/pipedHealthService");
const { getProxyYtdlExtractor } = require("./helper/extractYoutube");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const songRoutes = require("./routes/song");

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
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

      // Start Piped health monitoring service
      setTimeout(() => {
        console.log("🚀 Starting Piped health monitoring service...");
        pipedHealthService.start();
      }, 5000); // Wait 5 seconds after server start

      // Initialize proxy service
      setTimeout(async () => {
        try {
          console.log("🔧 Initializing Proxy Service...");
          const proxyExtractor = getProxyYtdlExtractor();
          await proxyExtractor.initialize();
          console.log("✅ Proxy Service initialized successfully");

          // Schedule periodic proxy refresh (every 30 minutes)
          setInterval(async () => {
            try {
              console.log("🔄 Scheduled proxy refresh...");
              await proxyExtractor.refreshProxies();
              console.log("✅ Scheduled proxy refresh completed");
            } catch (error) {
              console.error("❌ Scheduled proxy refresh failed:", error.message);
            }
          }, 30 * 60 * 1000); // 30 minutes

        } catch (error) {
          console.error("❌ Failed to initialize Proxy Service:", error.message);
        }
      }, 8000); // Wait 8 seconds after server start
    });
  })
  .catch((err) => console.log(err));
