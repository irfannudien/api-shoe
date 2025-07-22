const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// CREATE APP
const app = express();

// CREATE URL DEBUGGER for CHECK URL MESSAGE
const urlLogger = (req, res, next) => {
  console.log(req.method + ":" + req.url);
  next();
};

// CONFIG MIDDLEWARE - SECURITY
// const corsOptions = {
//   origin: ["http://localhost:2000"],
//   method: ["GET", "POST", "PATCH", "DELETE"],
//   allowHeaders: ["Authorization", "x-type", "Content-type"],
//   credentials: true,
// };

app.use(cors());
app.use(bodyParser.json());
app.use(urlLogger);
app.use(express.static("./public"));

// CONFIG API ROUTER
const {
  userRouter,
  cartRouter,
  productRouter,
  rajaOngkirRouter,
  newsRouter,
} = require("./router");

app.use("/api", userRouter);
app.use("/api", cartRouter);
app.use("/api", productRouter);
app.use("/api", rajaOngkirRouter);
app.use("/api", newsRouter);

app.get("/", (req, res) => {
  res
    .status(200)
    .send('<div style="text-align:center;">Shoeshop API Connected</div>');
});

const PORT = 2000;
app.listen(PORT, () => {
  console.log(`Server is running at ${PORT}`);
});
