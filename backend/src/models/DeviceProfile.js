const mongoose = require('mongoose');

const DeviceProfileSchema = new mongoose.Schema({
  cardholderName: { type: String, required: true },
  deviceHash: { type: String, required: true },
  ipAddresses: [{ type: String }],
  userAgents: [{ type: String }],
  trustScore: { type: Number, default: 1.0 }, // 0.0 to 1.0
  lastUsed: { type: Date, default: Date.now },
  transactionCount: { type: Number, default: 1 }
});

const MongoDeviceProfile = mongoose.model('DeviceProfile', DeviceProfileSchema);

// Mock Storage
const mockDeviceProfiles = [];

class DeviceProfileModel {
  static getMongoModel() {
    return MongoDeviceProfile;
  }

  static async findOne(query) {
    if (!global.useMockDB) {
      try {
        return await MongoDeviceProfile.findOne(query);
      } catch (err) {}
    }
    return mockDeviceProfiles.find(d => {
      for (let key in query) {
        if (d[key] !== query[key]) return false;
      }
      return true;
    });
  }

  static async create(profileData) {
    if (!global.useMockDB) {
      try {
        const profile = new MongoDeviceProfile(profileData);
        return await profile.save();
      } catch (err) {}
    }

    const newProfile = {
      _id: 'dev_' + Math.random().toString(36).substr(2, 9),
      ...profileData,
      ipAddresses: profileData.ipAddresses || [],
      userAgents: profileData.userAgents || [],
      lastUsed: new Date()
    };
    mockDeviceProfiles.push(newProfile);
    return newProfile;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    if (!global.useMockDB) {
      try {
        return await MongoDeviceProfile.findOneAndUpdate(query, update, options);
      } catch (err) {}
    }

    let profile = mockDeviceProfiles.find(d => {
      for (let key in query) {
        if (d[key] !== query[key]) return false;
      }
      return true;
    });

    if (!profile) {
      if (options.upsert) {
        // Create new
        const newProfile = {
          _id: 'dev_' + Math.random().toString(36).substr(2, 9),
          ...query,
          ...update,
          ipAddresses: update.ipAddresses || [],
          userAgents: update.userAgents || [],
          lastUsed: new Date()
        };
        mockDeviceProfiles.push(newProfile);
        return newProfile;
      }
      return null;
    }

    // Apply updates
    if (update.$inc) {
      for (let k in update.$inc) {
        profile[k] = (profile[k] || 0) + update.$inc[k];
      }
    }
    if (update.$push) {
      for (let k in update.$push) {
        if (!profile[k]) profile[k] = [];
        // Handle $each or single value
        const val = update.$push[k];
        if (val && val.$each) {
          profile[k].push(...val.$each);
        } else {
          profile[k].push(val);
        }
        // Deduplicate
        profile[k] = [...new Set(profile[k])];
      }
    }
    if (update.$set) {
      for (let k in update.$set) {
        profile[k] = update.$set[k];
      }
    }

    profile.lastUsed = new Date();
    return profile;
  }
}

module.exports = DeviceProfileModel;
