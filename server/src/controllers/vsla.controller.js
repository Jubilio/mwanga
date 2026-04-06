const vslaService = require('../services/vsla.service');
const logger = require('../utils/logger');

const vslaController = {
  createGroup: async (req, res) => {
    try {
      const { householdId, id: userId } = req.user;
      const group = await vslaService.createGroup(householdId, userId, req.body);
      res.status(201).json({ status: 'success', data: group });
    } catch (error) {
      logger.error('Error creating VSLA group:', error.message);
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  getGroups: async (req, res) => {
    try {
      const { id: userId } = req.user;
      const groups = await vslaService.getGroupsForUser(userId);
      res.json({ status: 'success', data: groups });
    } catch (error) {
      logger.error('Error fetching VSLA groups:', error.message);
      res.status(500).json({ status: 'error', message: error.message });
    }
  },

  getGroupDetails: async (req, res) => {
    try {
      const { id: groupId } = req.params;
      const { id: userId } = req.user;
      const details = await vslaService.getGroupDetails(groupId, userId);
      res.json({ status: 'success', data: details });
    } catch (error) {
      logger.error(`Error fetching details for VSLA group ${req.params.id}:`, error.message);
      const status = error.message.includes('Not a member') ? 403 : 500;
      res.status(status).json({ status: 'error', message: error.message });
    }
  }
};

module.exports = vslaController;
