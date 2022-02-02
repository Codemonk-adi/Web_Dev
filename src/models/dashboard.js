const mongoose = require("mongoose");
const user = require("./user");

const dashboardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: user,
      required: true,
    },
    managers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: user,
      },
    ],
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: user,
      },
    ],
    files: [
      {
        type: Object,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// userSchema.virtual("fullName").get(function () {
//   return `${this.firstName} ${this.lastName}`;
// });

// userSchema.methods = {
//   authenticate: async function (password) {
//     return await bcrypt.compare(password, this.hash_password);
//   },
// };

// dashboardSchema.statics = {
//   getAccess: async function (dashboardId, userId) {
//     this.findById(dashboardId).exec((error, dashboard) => {
//       if (error)
//         return error;
//       if (!dashboard) {
//         return { error: "Dashboard not found." };
//       }
//       if (dashboard.owner == userId) {
//         return "owner";
//       } else if (dashboard.managers.includes(userId)) {
//         return "manager";
//       } else if (dashboard.viewers.includes(userId)) {
//         return "viewer";
//       } else {
//         return "none";
//       }
//     });
//     // if (this.find({_id: dashboardId, owner:userId})) {
//     //   return "owner";
//     // }
//     // else if (this.find({_id: dashboardId, managers:userId}))
//     //   return "manager";
//     // else if (this.find({_id: dashboardId, viewers:userId}))
//     //   return "viewer";
//     // else return "none";
//     // if (this.owner == userId) return "owner";
//     // else if (this.managers.includes(userId)) return "manager";
//     // else if (this.viewers.includes(userId)) return "viewer";
//     // else return "none";
//   },
// }

dashboardSchema.methods = {
  getAccess: function (userId) {
    if (this.owner == userId) return "owner";
    else if (this.managers.includes(userId)) return "manager";
    else if (this.viewers.includes(userId)) return "viewer";
    else return "none";
  }
}

module.exports = mongoose.model("Dashboard", dashboardSchema);
