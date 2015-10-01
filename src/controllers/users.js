import mongoose from 'mongoose';
import Promise from 'bluebird';
import debug from 'debug';

import { createCommand } from '../sockets';
import { GenericError } from '../errors';

const ObjectId = mongoose.Types.ObjectId;
const log = debug('uwave:api:v1:users');

export const getUsers = function getUsers(mongo) {
  const User = mongo.model('User');

  return User.find();
};

export const getUser = function getUser(id, mongo) {
  const User = mongo.model('User');

  return User.findOne(ObjectId(id));
};

export const banUser = function banUser(moderatorID, id, time, exiled, uwave) {
  const User = uwave.mongo.model('User');

  return User.findOne(ObjectId(id))
  .then(user => {
    if (!user) throw new GenericError(404, `user with ID ${id} not found`);

    user.banned = time;
    user.exiled = exiled;

    return user.save();
  })
  .then(user => {
    return new Promise((resolve, reject) => {
      if (user.banned !== time) {
        return reject(new Error(`couldn't ${time > 0 ? 'ban' : 'unban'} user`));
      }
      if (user.exiled !== exiled) {
        return reject(new Error(`couldn't ${exiled ? 'exile' : 'unban'} user`));
      }

      if (time !== 0) {
        uwave.redis.publish('v1', createCommand(time > 0 ? 'ban' : 'unban', {
          'moderatorID': moderatorID,
          'userID': user.id,
          'banned': user.banned,
          'exiled': user.exiled
        }));
      }
      resolve(user);
    });
  });
};

export const muteUser = function muteUser(moderatorID, id, time, uwave) {
  const User = uwave.mongo.model('User');

  return User.findOne(ObjectId(id))
  .then(user => {
    if (!user) throw new GenericError(404, `user with ID ${id} not found`);

    uwave.redis.set(`mute:${id}`, 'expire', Date.now() + time);

    return new Promise(resolve => {
      uwave.redis.publish('v1', createCommand(time > 0 ? 'mute' : 'unmute', {
        'moderatorID': moderatorID,
        'userID': id,
        'expires': time
      }));
      resolve(time > 0 ? true : false);
    });
  });
};

export const changeRole = function changeRole(moderatorID, id, role, uwave) {
  const User = uwave.mongo.model('User');

  return User.findOne(ObjectId(id))
  .then(user => {
    if (!user) throw new GenericError(404, `user with ID ${id} not found`);

    user.role = Math.max(Math.min(role, 6), 0);

    uwave.redis.publish('v1', createCommand('roleChange', {
      'moderatorID': moderatorID,
      'userID': user.id,
      'role': user.role
    }));
    return user.save();
  });
};

export const changeUsername = function changeUsername(moderatorID, id, name, uwave) {
  const User = uwave.mongo.model('User');

  return User.findOne(ObjectId(id))
  .then(user => {
    if (!user) throw new GenericError(404, `user with ID ${id} not found`);
    if (user.id !== id && user.role < 3) {
      throw new GenericError(403, 'you need to be at least a bouncer to do this');
    }

    user.username = name;
    user.slug = name.toLowerCase();

    uwave.redis.publish('v1', createCommand('nameChange', {
      'moderatorID': moderatorID,
      'userID': id,
      'username': user.username
    }));

    return user.save();
  });
};

export const setStatus = function setStatus(id, status, redis) {
  redis.publish('v1', createCommand('statusChange', {
      'userID': id,
      'status': Math.max(Math.min(status, 3), 0)
    }));
};