// skapar en server som lyssnar på port 5500
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const mysql = require("mysql");
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
//promisify
const { promisify } = require("util");
//jwt
const jwt = require("jsonwebtoken");

const axios = require("axios");

app.use(cors({ origin: true }));
app.use(express.urlencoded({ extended: true }));
const http = require("http");

const publicDirectory = path.join(__dirname, "./www");
app.use(express.static(publicDirectory));
app.use(express.json());
app.set("view engine", "hbs");
const server = http.createServer(app);

// socket.io
const { Server } = require("socket.io");
const io = new Server(server);

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
});
db.connect((error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("MySQL connected!");
  }
});

app.get("/", function (req, res) {
  if (req.cookies.jwt) {
    console.log("tes");
    res.redirect("/check-token");
  } else {
    res.redirect("/logout");
  }
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
  socket.on("chat message", (msg) => {
    msg = JSON.parse(msg);
    console.log(msg);
    db.query(
      "INSERT INTO `messages`(`channal_id`, `user_id`, `user_name`, `message`,`created_at`, `deleted_at`, `edited_at`) VALUES (?,?,?,?,?,?,?)",
      [
        parseInt(msg.channal_id),
        msg.userid ? parseInt(msg.userid) : null,
        msg.username,
        msg.message,
        new Date(msg.date),
        null,
        null,
      ],
      (error, result) => {
        io.emit(
          "chat message",
          JSON.stringify({ id: result.insertId, ...msg })
        );
      }
    );
  });

  socket.on("get all channal messages", (msg) => {
    msg = JSON.parse(msg);
    db.query(
      "select * from messages where channal_id = ?",
      [msg.channal_id],
      (error, result) => {
        io.emit(`all${msg.listen_id}`, JSON.stringify(result));
      }
    );
  });
  socket.on("edit message", (msg) => {
    msg = JSON.parse(msg);
    db.query(
      "update  messages set message=?, edited_at=? where id = ?",
      [msg.message, new Date(), msg.message_id],
      (error, result) => {
        db.query(
          "select * from messages where id = ? limit 1",
          [msg.message_id],
          (error, _re) => {
            console.log(error);
            io.emit(`edit message`, JSON.stringify({ ..._re[0] }));
          }
        );
      }
    );
  });

  socket.on("delete message", (msg) => {
    msg = JSON.parse(msg);
    console.log("msg", msg);
    db.query(
      "update messages set deleted_at=? where id = ?",
      [new Date(), msg.message_id],
      (error, result) => {
        console.log("msg", msg);

        io.emit(`delete message`, JSON.stringify(msg));
      }
    );
  });
  socket.on("new channal", (msg) => {
    msg = JSON.parse(msg);
    db.query(
      "INSERT INTO `channals`(`id`, `channal_name`, `private`) VALUES (?,?,?)",
      [null, msg.channal_name, msg.private ? 1 : 0],
      (error, result) => {
        io.emit("new channal", JSON.stringify(msg));
      }
    );
  });
});
app.get("/check-token", async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      db.query(
        "SELECT * FROM users WHERE id = ?",
        [decoded.id],
        (error, result) => {
          if (result == "") {
          }
          req.user = result[0];
          global.user = req.user;

          db.query("select id, channal_name from channals", (err, channals) => {
            console.log("channals", channals);
            res.render("home", { channals, ...req.user });
          });
        }
      );
    } catch (error) {
      res.redirect("/login");
      console.log(error);
    }
  }
});

app.get("/register", function (req, res) {
  if (req.cookies.jwt) {
    db.query("select id,channal_name from channals", (err, channals) => {
      res.render("home", { channals, ...req.user });
    });
  } else {
    res.render("register");
  }
});

app.get("/login", function (req, res) {
  if (req.cookies.jwt) {
    db.query("select id,channal_name from channals", (err, channals) => {
      res.render("home", { channals, ...req.user });
    });
  } else {
    res.render("login");
  }
});

app.get("/logout", function (req, res) {
  res.clearCookie("jwt");
  db.query(
    "select id,channal_name from channals where private=0",
    (err, channals) => {
      res.render("guest", { channals });
    }
  );
});

app.use("/auth", require("./routes/auth.js"));

// Startar servern, lyssnar på port 5500
server.listen(5500);
