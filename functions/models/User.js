const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 32,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Recipe'
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    settings: {
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'light'
        },
        accessibilityMode: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true,
    autoIndex: process.env.NODE_ENV !== 'production'
});

userSchema.index({ email: 1, username: 1 });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(8);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function() {
    return {
        id: this._id,
        username: this.username,
        email: this.email,
        createdAt: this.createdAt
    };
};

const User = mongoose.model('User', userSchema);

User.createIndexes().catch(console.error);

module.exports = User; 