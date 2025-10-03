const { model } = require('mongoose');
const { projectSchema } = require('./projectSchema');

module.exports = model('Project', projectSchema);
