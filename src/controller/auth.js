const User = require("../models/user");
const bcrypt = require("bcrypt");
const shortid = require("shortid");
require("dotenv").config();
const axios = require("axios");
const sendMail = require("../helpers/mail");
const {generateJwtToken} = require("../helpers/jwt");

exports.signup = async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    password,
    companyName
  } = req.body;
  const hash_password = await bcrypt.hash(password, 10);
  const user = new User({
    firstName,
    lastName,
    email,
    companyName,
    hash_password,
    username: shortid.generate(),
  });

  user.save((error, user) => {
    if (error) {
      if (error.name === 'MongoError' && error.code === 11000) {
        // Duplicate email
        return res.status(422).json({ error: error, message: 'A user with that email already exists! Please try a different email.' });
      }

      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again"
      });
    }

    if (user) {
      const token = generateJwtToken(user._id);
      const { _id, firstName, lastName, email, companyName, fullName, isVerified } = user;
      return res.status(201).json({
        token,
        user: {
          _id,
          firstName,
          lastName,
          email,
          companyName,
          fullName,
          isVerified
        },
        message: "Signed up successfully✔",
      });
    }
  });
}

exports.getCurrentUser = (req, res) => {
  const userId = req.user._id;
  User.findById(userId).select("-hash_password").exec((error, user) => {
    if (error)
      return res.status(500).json({
        error,
      });
    if (!user)
      return res.status(500).json({
        error: "User not found",
        message: "User not found"
      });
    res.status(200).json({
      user,
      message: `User ${user.firstName} found!`
    });
  });
}

exports.signin = (req, res) => {
  User.findOne({
    email: req.body.email,
  }).exec(async (error, user) => {
    if (error)
      return res.status(500).json({
        error,
      });
    if (user) {
      const isPassword = await user.authenticate(req.body.password);
      if (isPassword) {
        const token = generateJwtToken({_id: user._id, isVerified: user.isVerified});
        const { _id, firstName, lastName, email, companyName, fullName, isVerified } = user;
        res.status(200).json({
          token,
          user: {
            _id,
            firstName,
            lastName,
            email,
            companyName,
            fullName,
            isVerified
          },
          message: "Logged in successfully! ✔",
        });
      } else {
        return res.status(401).json({
          message:
            "Wrong credentials. Verify your email and password and try again.",
        });
      }
    } else {
      return res.status(401).json({
        message: "Wrong credentials. Verify your email and password and try again.",
      });
    }
  });
};

/**
 * @async
 * @param  {HTTP Request} req - Expects {token, password} in the body
 * @param  {HTTP Response} res - JSON response returned
 * @returns {HTTP Response} - Status 500 if there is an error in updating the user's password.; Status 200 if password update is successful.
 */

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const user = jwt.verify(token, process.env.EMAIL_SECRET);
  const hash_password = await bcrypt.hash(password, 10);
  const _user = await User.findByIdAndUpdate(user._id, {
    hash_password: hash_password,
  }).select("-hash_password").catch((error) => {
    return res.status(500).json({
      error,
      message: "Oops! Something went wrong. Please try again",
    });
  });
  res.status(200).json({
    user: _user,
    message:
      "Your password has been changed successfully. Please sign in and try again.",
  });
};

/**
 * @async
 * @param  {HTTP Request} req - Expects {email} in the body.
 * @param  {HTTP Response} res - JSON response returned.
 * @returns {HTTP Response} - Status 500 if there is an error in updating the user's password.; Status 200 if password update is successful.
 */

exports.sendPasswordResetMail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({
    email: email,
  }).catch((error) => {
    return res.status(500).json({
      error,
      message: "Oops! Something went wrong. Please try again",
    });
  });
  if (!user) {
    return res.status(500).json({
      error: "No user found with this email. Verify your email and try again.",
      message:
        "No user found with this email. Verify your email and try again.",
    });
  }
  // console.log(user);

  const token = generateJwtToken(user._id, process.env.EMAIL_SECRET);
  //const fullUrl = req.protocol + "://" + req.get("host");
  const fullUrl = process.env.FRONT_END;

  const emailBody = `Click on this link to reset your account password - <a href=${fullUrl}/reset/${token}>Reset Password</a>`;

  // console.log(emailBody);
  await sendMail(email, emailBody, "Reset Password").catch((error) => {
    return res.status(500).json({
      error,
      message : "Failed to send email."
    });
  });

  res.status(200).json({
    message:
      "Congrats, your password reset link has been sent successfully. Please check your email to reset your password.",
  });
};

/**
 * POST Request
 * Takes in the email, firstName, lastName, companyName in the request body.
 * @param  {HTTP Request} req
 * @param  {HTTP Response} res
 * @returns {HTTP Response} - Status 500 if there is an error in updating the user's profile.; Status 200 if profile update is successful.
 */

exports.editProfile = (req, res) => {
  let { email, firstName, lastName, companyName } = req.body;

  const updateData = { email, firstName, lastName, companyName };

  for (let update in updateData) {
    if (!updateData[update]) {
      delete updateData[update];
    }
  }

  updateData.isVerified = true;

  User.findByIdAndUpdate({ _id: req.user._id }, updateData, { new :true }).select("-hash_password").exec((error, newUser) => {
    if (error) {
      if (error.name === 'MongoError' && error.code === 11000) {
        // Duplicate email
        return res.status(422).json({ error: error, message: 'The email you have entered is already in use.' });
      }

      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again"
      });
    }

    const token = generateJwtToken({_id: newUser._id, isVerified: newUser.isVerified});

    res.status(200).json({
      token,
      user: newUser,
      message: "Profile updated successfully!"
    });
  });
};