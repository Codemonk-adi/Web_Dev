const Dashboard = require("../models/dashboard");
const User = require("../models/user");
const XLSX = require('xlsx');
const bcrypt = require("bcrypt");
require("dotenv").config();
const shortid = require("shortid");
const nanoid = require('nanoid');
const sendMail = require("../helpers/mail");
const { generateJwtToken } = require("../helpers/jwt");

exports.getAllDashboardsByUser = (req, res) => {
  const { userId } = req.params;
  User.findById(userId).exec((error, user) => {
    if (error)
      return res.status(500).json({
        error: error,
        message: "Oops! Something went wrong. Please try again",
      });

    if (!user)
      return res.status(500).json({
        error: "Invalid userId. Please verify the userId entered and try again.",
        message: "Invalid userId. Please verify the userId entered and try again.",
      });

    Promise.all([
      Dashboard.find({ owner: userId }).populate({ path: "owner managers viewers", select: "-hash_password" }),
      Dashboard.find({ managers: userId }).populate({ path: "owner managers viewers", select: "-hash_password" }),
      Dashboard.find({ viewers: userId }).populate({ path: "owner managers viewers", select: "-hash_password" }),
    ])
      .then((results) => {
        const [own, manage, view] = results;
        res.status(200).json({
          message: "Dashboards fetched",
          dashboard: { own, manage, view },
        });
      })
      .catch((err) => {
        return res.status(500).json({
          error: err,
          message: "Oops! Something went wrong. Please try again",
        });
      });
  });
};

exports.addManager = (req, res) => {
  const { managerId, dashboardId } = req.body;

  if (!managerId || !dashboardId)
    return res.status(500).json({
      error: "managerId and dashboardId required",
      message: "managerId and dashboardId required",
    });

  const userId = req.user._id;
  //Using the addToSet operator takes care of duplicate values
  Dashboard.findOneAndUpdate(
    { owner: userId, _id: dashboardId },
    { $addToSet: { managers: managerId } }
  ).exec((error, dashboard) => {
    if (error)
      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again",
      });
    if (!dashboard)
      return res.status(500).json({
        error: "Dashboard not found.",
        message: "Could not find dashboard with that id."
      });
    res.status(200).json({
      dashboard,
      message: "Manager added.",
    });
  });
};

exports.deleteManager = (req, res) => {
  const { managerId, dashboardId } = req.body;

  if (!managerId || !dashboardId)
    return res.status(500).json({
      error: "managerId and dashboardId required",
      message: "managerId and dashboardId required",
    });

  const userId = req.user._id;

  Dashboard.findOneAndUpdate(
    { owner: userId, _id: dashboardId },
    { $pull: { managers: managerId } }
  ).exec((error, newDashboard) => {
    if (error)
      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again",
      });
    res.status(200).json({
      newDashboard,
      message: "Manager removed.",
    });
  });
};

exports.addViewer = (req, res) => {
  const { viewerId, dashboardId } = req.body;

  if (!viewerId || !dashboardId)
    return res.status(500).json({
      error: "viewerId and dashboardId required",
      message: "viewerId and dashboardId required",
    });

  const userId = req.user._id;
  Dashboard.findOneAndUpdate(
    {
      $and: [
        {
          $or: [{ owner: userId }, { managers: userId }],
        },
        {
          _id: dashboardId,
        },
      ],
    },
    {
      $addToSet: { viewers: viewerId },
    }
  ).exec((error, dashboard) => {
    if (error)
      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again",
      });
    res.status(200).json({
      dashboard,
      message: "Viewer added.",
    });
  });
};

exports.deleteViewer = (req, res) => {
  const { viewerId, dashboardId } = req.body;

  if (!viewerId || !dashboardId)
    return res.status(500).json({
      error: "viewerId and dashboardId required",
      message: "viewerId and dashboardId required",
    });

  const userId = req.user._id;
  Dashboard.findOneAndUpdate(
    {
      $and: [
        {
          $or: [{ owner: userId }, { managers: userId }],
        },
        {
          _id: dashboardId,
        },
      ],
    },
    {
      $pull: { viewers: viewerId },
    }
  ).exec((error, dashboard) => {
    if (error)
      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again",
      });
    res.status(200).json({
      dashboard,
      message: "Viewer removed.",
    });
  });
};

exports.createDashboard = (req, res) => {
  const { name, description } = req.body;
  const userId = req.user._id;
  const dashboard = new Dashboard({ name, description, owner: userId });
  dashboard.save((error, dashboard) => {
    if (error) {
      if (error.name === 'MongoError' && error.code === 11000) {
        // Duplicate email
        return res.status(422).json({ error: error, message: 'A dashboard with that name already exists! Please try a different name for your dashboard.' });
      }

      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again!"
      });
    }
    res.status(200).json({
      dashboard,
      message: "New dashboard created successfully!",
    });
  });
};

exports.deleteDashboard = (req, res) => {
  const { dashboardId } = req.body;
  const userId = req.user._id;
  if (!dashboardId) {
    return res.status(500).json({
      error: "dashboardId is required.",
      message: "Oops! Something went wrong. Please try again",
    });
  }
  Dashboard.findById(dashboardId).exec((error, dashboard) => {
    if (error)
      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again",
      });

    if (!dashboard)
      return res.status(500).json({
        error: "Dashboard not found.",
        message: "Could not find dashboard with that id."
      });

    let access = dashboard.getAccess(userId);
    if (access == "owner") {
      Dashboard.findByIdAndDelete(dashboardId).exec((error, dashboard) => {
        if (error)
          return res.status(500).json({
            error,
            message: "Oops! Something went wrong. Please try again",
          });

        if (!dashboard)
          return res.status(500).json({
            error: "Dashboard not found.",
            message: "Could not find dashboard with that id."
          });
        return res.status(200).json({
          dashboard,
          message: `Dashboard ${dashboard.name} deleted successfully`
        });
      });
    } else if (access == "manager") {
      Dashboard.findByIdAndUpdate(dashboardId, { $set: { files: [] } }).exec((error, dashboard) => {
        if (error)
          return res.status(500).json({
            error,
            message: "Oops! Something went wrong. Please try again",
          });

        if (!dashboard)
          return res.status(500).json({
            error: "Dashboard not found.",
            message: "Could not find dashboard with that id."
          });
        return res.status(200).json({
          dashboard,
          message: `Dashboard ${dashboard.name} cleared successfully`
        });
      });
    } else {
      return res.status(500).json({
        error: "Insufficient Privileges",
        message: "You are not authorized to make any changes."
      });
    }
  })
};

exports.uploadFiles = (req, res) => {
  const {
    dashboardId
  } = req.body;

  if (!dashboardId) {
    return res.status(500).json({
      error: "dashboardId required",
      message: "dashboardId required",
    });
  }

  const userId = req.user._id;

  const files = req.files;
  let jsonFiles = [];
  files.forEach(file => {
    console.log(file.originalname);
    const workbook = XLSX.read(file.buffer);
    var sheet_name_list = workbook.SheetNames;
    const workbookJSON = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
    console.log(workbookJSON);
    jsonFiles.push(workbookJSON);
  });
  Dashboard.findOneAndUpdate(
    {
      $and: [
        {
          $or: [{ owner: userId }, { managers: userId }],
        },
        {
          _id: dashboardId,
        },
      ],
    },
    {
      $push: { files: { $each: jsonFiles } },
    }).exec(
      (error, dashboard) => {
        if (error) {
          console.log(error);
          return res.status(500).json({
            error,
            message: "Oops! Something went wrong. Please try again",
          });
        }
        if (!dashboard) {
          return res.status(500).json({
            error: "Dashboard doesn't exist",
            message: "Oops! Something went wrong. Please try again",
          });
        }

        res.status(200).json({ message: "File(s) uploaded" });
      }
    );
}

exports.deleteAllFiles = (req, res) => {
  const {
    dashboardId
  } = req.body;
  Dashboard.findOneAndUpdate(
    {
      $and: [
        {
          $or: [{ owner: userId }, { managers: userId }],
        },
        {
          _id: dashboardId,
        },
      ],
    },
    {
      $set: { files: [] },
    }
  ).exec((error, dashboard) => {
    if (error)
      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again",
      });
    if (!dashboard)
      return res.status(500).json({
        error: "Dashboard not found.",
        message: "Either the dashboard doesn't exist or you don't have sufficient privileges.",
      });
    res.status(200).json({
      dashboard,
      message: `Deleted all files from dashboard ${dashboard.name}`,
    });
  });
}

const addUserHelper = (userId, dashboardId, role, newUserId) => {
  let update = {};
  let filter = {};
  switch (role) {
    case "manager":
      update = {
        $addToSet: { managers: newUserId }
      };
      filter = {
        owner: userId,
        _id: dashboardId
      };
      break;
    case "viewer":
      update = {
        $addToSet: { viewers: newUserId }
      };
      filter = {
        $and: [
          {
            $or: [{ owner: userId }, { managers: userId }],
          },
          {
            _id: dashboardId,
          },
        ],
      };
      break;
  }
  return Dashboard.findOneAndUpdate(filter, update);
}

exports.sendInviteEmail = async (req, res) => {
  const {
    email,
    dashboardId,
    role
  } = req.body;
  const userId = req.user._id;
  let newUserId = null;
  User.findOne({ email: email }).exec(async (error, user) => {
    if (error)
      return res.status(500).json({
        error,
        message: "Oops! Something went wrong. Please try again",
      });

    if (!user) {
      const password = nanoid(14);
      console.log({ password });
      const hash_password = await bcrypt.hash(password, 10);

      //User does not exist
      const tempUser = new User({
        firstName: "NA",
        lastName: "NA",
        email: email,
        companyName: "NA",
        hash_password: hash_password,
        username: shortid.generate(),
        isVerified: false,
      });

      tempUser.save((error, newTempUser) => {
        if (error) {
          if (error.name === 'MongoError' && error.code === 11000) {
            // Duplicate email
            return res.status(422).json({ error: error, message: 'A user with this email already exists! Please try a different email.' });
          }

          return res.status(500).json({
            error,
            message: "Oops! Something went wrong. Please try again"
          });
        }

        if (newTempUser) {
          newUserId = newTempUser._id;
          addUserHelper(userId, dashboardId, role, newUserId).exec(async (error, dashboard) => {
            if (error)
              return res.status(500).json({
                error,
                message: "Oops! Something went wrong. Please try again",
              });
            if (!dashboard)
              return res.status(500).json({
                error: "Dashboard not found.",
                message: "Could not find dashboard with that id."
              });

            const token = generateJwtToken({ _id: newUserId, isVerified: false }, process.env.JWT_SECRET);

            const emailBody = `You have been invited as a ${role} on ${dashboard.name}. Click <a href="${process.env.FRONT_END}/createProfile/${token}">here</a> to go to your new dashboard. Since you don't have you an account yet, you can login using these credentials - <br> Email - ${email} <br> Password - ${password}. It is advised to change the password after your first login.`

            const emailSubject = `ChangeVU Invite`;

            console.log(emailBody);

            await sendMail(email, emailBody, emailSubject).catch((error) => {
              return res.status(500).json({
                error,
                message: "Failed to send email invite."
              });
            });

            res.status(200).json({
              dashboard,
              message: `${(role == "manager") ? "Manager" : "Viewer"} added.`,
            });
          });
        }
      });
    } else {
      //User
      newUserId = user._id;
      addUserHelper(userId, dashboardId, role, newUserId).exec(async (error, dashboard) => {
        if (error)
          return res.status(500).json({
            error,
            message: "Oops! Something went wrong. Please try again",
          });
        if (!dashboard)
          return res.status(500).json({
            error: "Dashboard not found.",
            message: "Could not find dashboard with that id."
          });

        const emailBody = `You have been invited as a ${role} on ${dashboard.name}. Click <a href="${process.env.FRONT_END}/dashboard/${dashboardId}">here</a> to go to your new dashboard.`

        const emailSubject = `ChangeVU Invite`;

        console.log(emailBody);

        await sendMail(email, emailBody, emailSubject).catch((error) => {
          return res.status(500).json({
            error,
            message: "Failed to send email invite."
          });
        });

        res.status(200).json({
          dashboard,
          message: `${(role == "manager") ? "Manager" : "Viewer"} added.`,
        });
      });
    }
  })
}