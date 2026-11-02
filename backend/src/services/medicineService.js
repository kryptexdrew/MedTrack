const mongoose = require('mongoose');
const Medicine = require('../models/Medicine');
const { mockMedicines } = require('../store');

const isMongoConnected = () => mongoose.connection.readyState === 1;

class MedicineService {
  async getMedicines(userId, filter = {}) {
    if (isMongoConnected()) {
      const query = { userId };
      if (filter.status) query.status = filter.status;
      if (filter.form && filter.form !== 'All') query.form = filter.form;
      return await Medicine.find(query).sort({ createdAt: -1 });
    } else {
      let medicines = mockMedicines.filter(m => m.userId === userId || m.userId?.toString() === userId?.toString());
      if (filter.status) medicines = medicines.filter(m => m.status === filter.status);
      if (filter.form && filter.form !== 'All') medicines = medicines.filter(m => m.form === filter.form);
      return medicines;
    }
  }

  async getMedicineById(id, userId) {
    if (isMongoConnected() && mongoose.isValidObjectId(id)) {
      return await Medicine.findOne({ _id: id, userId });
    } else {
      const medicine = mockMedicines.find(m => m.id === id && (m.userId === userId || m.userId?.toString() === userId?.toString()));
      return medicine || null;
    }
  }

  async createMedicine(userId, medicineData) {
    if (isMongoConnected()) {
      const newMed = new Medicine({ ...medicineData, userId });
      await newMed.save();
      return newMed;
    } else {
      const newMed = {
        id: 'med_' + Date.now(),
        userId,
        ...medicineData,
        status: medicineData.status || 'active'
      };
      mockMedicines.unshift(newMed);
      return newMed;
    }
  }

  async updateMedicine(id, userId, updateData) {
    if (isMongoConnected() && mongoose.isValidObjectId(id)) {
      return await Medicine.findOneAndUpdate({ _id: id, userId }, updateData, { new: true });
    } else {
      const idx = mockMedicines.findIndex(m => m.id === id && (m.userId === userId || m.userId?.toString() === userId?.toString()));
      if (idx === -1) return null;
      mockMedicines[idx] = { ...mockMedicines[idx], ...updateData };
      return mockMedicines[idx];
    }
  }

  async deleteMedicine(id, userId) {
    if (isMongoConnected() && mongoose.isValidObjectId(id)) {
      return await Medicine.findOneAndDelete({ _id: id, userId });
    } else {
      const idx = mockMedicines.findIndex(m => m.id === id && (m.userId === userId || m.userId?.toString() === userId?.toString()));
      if (idx !== -1) {
        mockMedicines.splice(idx, 1);
        return true;
      }
      return false;
    }
  }
}

module.exports = new MedicineService();
