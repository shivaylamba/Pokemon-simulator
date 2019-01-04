const redis = require("redis");
const client = redis.createClient();

// Add a user by socket id in hset
function addUser(id, username, room) {
  return new Promise((resolve, reject) => {
    client.hmset(id, "username", username, "room", room, "id", id, function(
      err,
      res
    ) {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });
}

// remove a user by id or remove a room by name
function deleteKey(key) {
  return new Promise((resolve, reject) => {
    client.del(key, function(err, res) {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });
}

// remove a room and users in it
async function deleteRoom(room) {
  const userList = await getUsersByRoom(room);
  const promiseArr = userList.map(id => deleteKey(id));
  await Promise.all(promiseArr);
  await deleteKey(room);
}

// Find len of list
function userCount(room) {
  return new Promise((resolve, reject) => {
    client.llen(room, function(err, length) {
      if (err) {
        return reject(err);
      }
      resolve(length);
    });
  });
}
async function checkUserCount(room) {
  const length = await userCount(room);
  if (length >= 2) {
    return false;
  }
  return true;
}

// create a room using a list with socket ids
async function addUserInRoom(room, id) {
  const flag = await checkUserCount(room);
  if (!flag) {
    return Promise.reject("Room is full");
  }
  return new Promise((resolve, reject) => {
    client.lpush(room, id, function(err, res) {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });
}

// Get all users in room
function getUsersByRoom(room) {
  return new Promise((resolve, reject) => {
    client.lrange(room, 0, -1, async function(err, list) {
      if (err) {
        return reject(err);
      }
      const promiseArr = list.map(async id => await getUser(id));
      const res = await Promise.all(promiseArr);
      resolve(res);
    });
  });
}

// get a user by socket id
function getUser(id) {
  return new Promise((resolve, reject) => {
    client.hgetall(id, function(err, res) {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });
}

module.exports = {
  addUser,
  deleteKey,
  deleteRoom,
  addUserInRoom,
  getUsersByRoom,
  getUser,
  userCount
};
