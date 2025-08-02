const multer = require("multer");
const path = require("path");

module.exports.upload = (folder) => {
  // CONFIG SAVE FILE
  const storage = multer.diskStorage({
    destination: folder,
    filename: (req, file, cb) => {
      // FILE NAME: IMG-timeStamp.ext
      console.log("MULTER IS RUNNING");
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname)
      );
    },
  });

  // FILTER FILE CAN UPLOAD
  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
      cb(null, true);
    } else {
      cb(new Error("File format does not supported"));
    }
  };

  // RETURN MIDDLEWARE UPLOAD
  return multer({
    storage: storage, // DIR SAVE FILE
    limits: { fileSize: 5 * 1024 * 1024 }, // MAX 5MB
    fileFilter: fileFilter, // FILTER FILE TYPE
  }).single("IMG"); // ONLY 1 FILE, FILE NAME IMG
};
