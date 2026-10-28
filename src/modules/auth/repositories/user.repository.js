const User = require('../models/user.model');

class UserRepository {
  findByEmail(email, { session } = {}) {
    return User.findOne({ email: String(email).toLowerCase() }).session(session);
  }

  findByEmailWithPassword(email, { session } = {}) {
    return User.findOne({ email: String(email).toLowerCase() })
      .select('+passwordHash')
      .session(session);
  }

  findById(id, { session } = {}) {
    return User.findById(id).session(session);
  }

  create(data, { session } = {}) {
    return User.create([data], { session }).then((docs) => docs[0]);
  }
}

module.exports = UserRepository;
