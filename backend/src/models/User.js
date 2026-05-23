const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['admin', 'operator'], default: 'operator' },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

const MongoUser = mongoose.model('User', UserSchema);

// In-memory mock storage
const mockUsers = [];

// Seed default admin in-memory
const seedDefaultAdmin = async () => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);
  mockUsers.push({
    _id: 'usr_admin',
    username: 'admin',
    password: hashedPassword,
    email: 'admin@fraudshield.ai',
    role: 'admin',
    status: 'active',
    createdAt: new Date()
  });
};
seedDefaultAdmin();

class UserModel {
  static getMongoModel() {
    return MongoUser;
  }

  static async findOne(query) {
    if (!global.useMockDB) {
      try {
        return await MongoUser.findOne(query);
      } catch (err) {
        console.log("Mongoose lookup failed, using mock fallback.");
      }
    }
    return mockUsers.find(u => {
      for (let key in query) {
        if (u[key] !== query[key]) return false;
      }
      return true;
    });
  }

  static async findById(id) {
    if (!global.useMockDB) {
      try {
        return await MongoUser.findById(id);
      } catch (err) {
        console.log("Mongoose lookup failed, using mock fallback.");
      }
    }
    return mockUsers.find(u => u._id === id);
  }

  static async create(userData) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    if (!global.useMockDB) {
      try {
        const user = new MongoUser({
          ...userData,
          password: hashedPassword
        });
        return await user.save();
      } catch (err) {
        console.log("Mongoose save failed, saving to mock instead.");
      }
    }

    const newUser = {
      _id: 'usr_' + Math.random().toString(36).substr(2, 9),
      username: userData.username,
      password: hashedPassword,
      email: userData.email,
      role: userData.role || 'operator',
      status: userData.status || 'active',
      createdAt: new Date()
    };
    mockUsers.push(newUser);
    return newUser;
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  }

  static async find(query = {}) {
    if (!global.useMockDB) {
      try {
        return await MongoUser.find(query);
      } catch (err) {}
    }
    return mockUsers;
  }
}

module.exports = UserModel;
