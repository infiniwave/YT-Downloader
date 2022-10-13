const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { getWsClient, ffmpegPath } = require("../utils");
const { validateURL, getVideoID } = require("../public/shared/shared");
const { download } = require("../wrapper");

const serialKiller = require("tree-kill");
const { validate: validateUUID } = require("uuid");

router.get("/", (req, res) => {
  if (!fs.existsSync(path.join(process.cwd(), "./tmp"))) fs.mkdirSync(path.join(process.cwd(), "./tmp"));

  const url = req.query.url;
  const info = JSON.parse(req.query.info);
  const downloadId = req.query.id;

  if (url == null || !validateURL(url)) return res.sendStatus(400);
  if (!validateUUID(downloadId)) return res.sendStatus(400);

  const downloader = download(url, info, downloadId);

  const status = {
    downloadDone: false,
    postProccessDone: false,
    processingCancelled: false,
    workingFilePath: null,
    worker: null,
  };

  res.once("close", () => {
    if (!status.done) {
      const killed = downloader.cancel();
      console.log(killed);
    }
    if (info.advancedOptionsEnabled && !status.postProccessDone && status.worker != null) {
      status.processingCancelled = true;
      const killed = serialKiller(status.worker.pid, (err) => {
        if (err) {
          return err;
        } else {
          if (fs.existsSync(status.workingFilePath)) {
            setTimeout(() => {
              fs.unlinkSync(status.workingFilePath);
            }, 2000);
          }
        }
      });

      console.log(killed);
    }
  });

  const client = getWsClient(req.cookies["YTDL_CLIENT_ID"]);

  downloader.emitter.once("begin", ({ id, title }) => {
    if (client == null) return;

    client.send(
      JSON.stringify({
        type: "begin",
        id,
        title,
      })
    );
  });

  downloader.emitter.on("downloaded", ({ id, status }) => {
    if (client == null) return;

    if (status.video) {
      client.send(
        JSON.stringify({
          type: "downloaded",
          id,
          format: "video",
        })
      );
    } else if (status.audio) {
      client.send(
        JSON.stringify({
          type: "downloaded",
          id,
          format: "audio",
        })
      );
    }
  });

  downloader.emitter.once("post", (id) => {
    if (client == null) return;

    client.send(
      JSON.stringify({
        type: "beginPost",
        id,
      })
    );
  });

  downloader.emitter.on("progress", (id, progress) => {
    if (client == null) return;

    client.send(
      JSON.stringify({
        type: "progress",
        id,
        progress,
      })
    );
  });

  downloader.emitter.on("error", (id) => {
    res.status(500).send(id);
  });

  downloader.emitter.once("finish", async (dest, id) => {
    done = true;

    const absPath = path.join(process.cwd(), "./tmp");
    const absFilePath = path.join(absPath, dest);

    if (res.closed) return;

    if (info.advancedOptionsEnabled) {
      dest = await new Promise((resolve, reject) => {
        const args = [];

        const processedFile = path.parse(dest).name + " [processed]." + info.container;
        status.workingFilePath = path.join(absPath, processedFile);

        if (Object.keys(info.advancedOptions.trim).length !== 0) {
          if (
            info.advancedOptions.trim.start > info.advancedOptions.trim.end ||
            info.advancedOptions.trim.end < info.advancedOptions.trim.start ||
            info.advancedOptions.trim.start < 0
          )
            return res.sendStatus(400); // Needs one more check on end length

          if (info.advancedOptions.trim.start) args.push("-ss", info.advancedOptions.trim.start);
          if (info.advancedOptions.trim.end) args.push("-t", info.advancedOptions.trim.end);
        }

        args.push("-c:v", info.advancedOptions.encoding.video ?? "copy");
        args.push("-c:a", info.advancedOptions.encoding.audio ?? "copy");

        const worker = spawn(ffmpegPath, ["-i", absFilePath, "-y", ...args, processedFile], {
          cwd: absPath,
        });
        worker.stdout.setEncoding("utf8");
        worker.stderr.setEncoding("utf8");

        worker.stdout.on("data", (data) => {
          console.log(data.toString());
        });
        worker.stderr.on("data", (data) => {
          console.log(data.toString());
        });

        worker.on("close", (code) => {
          if (code === 0) {
            resolve(processedFile);
            postProccessDone = true;
          } else {
            reject(code);
          }
        });

        status.worker = worker;
      }).catch((err) => {
        if (status.processingCancelled) return;
        console.log(err);
      });
    }

    if (status.processingCancelled) return;

    res.header("Filename", dest);
    res.header("Id", id);
    res.sendFile(dest, { root: absPath }, (err) => {
      if (err) {
        console.error(err);
      } else {
        if (process.env.NODE_ENV === "production") {
          fs.unlinkSync(absFilePath);
        }
      }
    });
  });
});

module.exports = router;
