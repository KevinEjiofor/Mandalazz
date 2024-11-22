const express = require("express");
const userController = require("../user/controllers/user.controller");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/signup", userController.userSignUp);
router.post("/login", userController.userLogin);
router.post("/forgot-password",authMiddleware.protectUser, userController.forgotPassword);


// router.get("/profile", authMiddleware.protectUser, userController.getProfile);




module.exports = router;
