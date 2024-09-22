import mongoose from "mongoose";
import { ApplicationError } from "../../error/applicationError.js";
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    minlength: [3, 'Name must be at least 3 characters long'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    match: [/\S+@\S+\.\S+/, 'Please enter a valid email address'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    validate: {
      validator: function (v) {
        return (
          /[A-Z]/.test(v) &&  
          /[a-z]/.test(v) &&  
          /[0-9]/.test(v) &&  
          /[\W]/.test(v)      
        );
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  },
  contacts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  groups: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  avatar: {
    type: String, // URL to avatar image
    default: ''
  },
  status: {
    type: String,
    default: 'Hey there! I am using the app!'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date
  },
  socketId: {
    type: String, // For real-time communication (WebSocket ID)
    default: null
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Call history (optional for voice/video)
  callHistory: [{
    callType: {
      type: String, // 'audio' or 'video'
      required: true
    },
    callWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    status: {
      type: String, // 'missed', 'answered', 'declined'
      default: 'answered'
    }
  }],
}, { timestamps: true });
UserSchema.pre('save', async function (next) {
  const user = this;
  try {
    // Check if the email already exists
    if (user.isModified('email')) {
      const existingUser = await mongoose.models.user.findOne({ email: user.email });
      if (existingUser) {
        throw new ApplicationError('Email already exists', 409);
      }
    }
    next();
  } catch (err) {
    // Pass the error to the next middleware 
    next(err);
  }
});

export default mongoose.model('user', UserSchema);

