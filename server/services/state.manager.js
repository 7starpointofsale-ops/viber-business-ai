const state = {};

function get(userId) {
  return state[userId] || {};
}

function set(userId, data) {
  state[userId] = { ...get(userId), ...data };
}

function clear(userId) {
  delete state[userId];
}

module.exports = { get, set, clear };