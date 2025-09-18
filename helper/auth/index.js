const jwt = require("jsonwebtoken");

const generateToken = (payload, expiresIn = "1h") => {
  const options = expiresIn === "never" ? {} : { expiresIn };
  const token = jwt.sign(payload, process.env.JWT_SECRET, options);

  return { token, expiresIn };
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader?.split(" ")[1];
  const secretKey = process.env.JWT_SECRET;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or token expired" });
  }
};

module.exports = { generateToken, authenticateToken };
