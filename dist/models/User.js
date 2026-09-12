import mongoose, { Schema } from "mongoose";
const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    role: {
        type: String,
        enum: ["Admin", "Project Manager", "Developer"],
        default: "Developer",
    },
}, {
    timestamps: true,
});
export const User = mongoose.model("User", userSchema);
//# sourceMappingURL=User.js.map