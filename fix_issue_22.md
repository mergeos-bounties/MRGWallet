# Fix for Issue #22

```javascript
class WalletProfileManager {
  constructor() {
    this.storageKey = 'mergeos_wallet_profiles';
    this.currentProfileId = null;
    this.profiles = {};
    this.init();
  }

  async init() {
    try {
      const storedProfiles = localStorage.getItem(this.storageKey);
      if (storedProfiles) {
        this.profiles = JSON.parse(storedProfiles);
      }
      
      // Check for current profile in session storage or local storage
      let savedCurrentId = sessionStorage.getItem('mergeos_current_profile');
      if (!savedCurrentId) {
        savedCurrentId = localStorage.getItem('mergeos_current_profile');
      }
      
      this.currentProfileId = savedCurrentId;
    } catch (error) {
      console.error('Failed to initialize wallet profiles:', error);
    }
  }

  createProfile(name, workerIdentityData) {
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.profiles[id] = {
      id: id,
      name: name,
      data: workerIdentityData,
      createdAt: new Date().toISOString(),
      isActive: false
    };

    if (!this.currentProfileId) {
      this.setActiveProfile(id);
    }

    this.save();
    return id;
  }

  setActiveProfile(profileId) {
    const profile = this.profiles[profileId];
    
    if (profile && !profile.isActive) {
      // Deactivate all profiles
      Object.values(this.profiles).forEach(p => p.isActive = false);
      
      // Activate selected profile
      profile.isActive = true;
      this.currentProfileId = profileId;
      
      this.save();
      return true;
    }
    
    return false;
  }

  getActiveProfile() {
    if (!this.currentProfileId) return null;
    return this.profiles[this.currentProfileId] || null;
  }

  updateProfileData(profileId, newData) {
    const profile = this.profiles[profileId];
    if (profile) {
      profile.data = { ...profile.data, ...newData };
      this.save();
      return true;
    }
    return false;
  }

  deleteProfile(profileId) {
    if (this.currentProfileId === profileId && Object.keys(this.profiles).length > 1) {
      // Switch to another profile before deleting current one
      const otherProfiles = Object.values(this.profiles).filter(p => p.id !== profileId);
      if (otherProfiles.length > 0) {
        this.currentProfileId = otherProfiles[0].id;
      } else {
        this.currentProfileId = null;
      }
    }

    delete this.profiles[profileId];
    this.save();
    
    // Clear current profile if it was deleted and no others exist
    if (!this.currentProfileId && Object.keys(this.profiles).length === 0) {
      this.currentProfileId = null;
    }
    
    return true;
  }

  getAllProfiles() {
    return Object.values(this.profiles);
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.profiles));
      
      if (this.currentProfileId) {
        sessionStorage.setItem('mergeos_current_profile', this.currentProfileId);
      } else {
        sessionStorage.removeItem('mergeos_current_profile');
      }
    } catch (error) {
      console.error('Failed to save profiles:', error);
    }
  }

  // Test suite
  runTests() {
    const tests = [];
    
    // Clean up before testing
    localStorage.removeItem(this.storageKey);
    sessionStorage.removeItem('mergeos_current_profile');
    
    const testResults = [];

    // Test 1: Create Profile
    try {
      const id = this.createProfile('Test Worker', { workerId: 'test-001' });
      if (id && this.profiles[id] && this.profiles[id].name === 'Test Worker') {
        testResults.push({ name: 'Create Profile', passed: true });
      } else {
        throw new Error('Profile creation failed');
      }
    } catch (e) {
      testResults.push({ name: 'Create Profile', passed: false, error: e.message });
    }

    // Test 2: Set Active Profile
    try {
      const id = this.createProfile('Active Worker', { workerId: 'active-001' });
      if (this.setActiveProfile(id) && this.currentProfileId === id) {
        testResults.push({ name: 'Set Active Profile', passed: true });
      } else {
        throw new Error('Failed to set active profile');
      }
    } catch (e) {
      testResults.push({ name: 'Set Active Profile', passed: false, error: e.message });
    }

    // Test 3: Get Active Profile
    try {
      const active = this.getActiveProfile();
      if (active && active.workerId === 'active-001') {
        testResults.push({ name: 'Get Active Profile', passed: true });
      } else {
        throw new Error('Failed to get active profile');
      }
    } catch (e) {
      testResults.push({ name: 'Get Active Profile', passed: false, error: e.message });
    }

    // Test 4: Persistence - LocalStorage
    try {
      const profilesBefore = JSON.parse(localStorage.getItem(this.storageKey));
      if (profilesBefore && Object.keys(profilesBefore).length > 0) {
        testResults.push({ name: 'Persistence Check', passed: true });
      } else {
        throw new Error('Profiles not persisted in localStorage');
      }
    } catch (e) {
      testResults.push({ name: 'Persistence Check', passed: false, error: e.message });
    }

    // Test 5: Update Profile Data
    try {
      const id = this.createProfile('Update Worker', { workerId: 'update-001' });
      if (this.updateProfileData(id, { status: 'active', balance: 100 })) {
        const updated = this.profiles[id];
        if (updated.status === 'active' && updated.balance === 100) {
          testResults.push({ name: 'Update Profile Data', passed: true });
        } else {
          throw new Error('Profile data not updated correctly');
        }
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (e) {
      testResults.push({