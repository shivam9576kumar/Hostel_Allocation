/**
 * Generate an 8-character alphanumeric pairing code (A-Z, 0-9)
 * Example: "A7K2P9X4"
 */
function generatePairingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate Redis key for a room's pairing code
 */
function generateRoomKey(roomId) {
  return `room:code:${roomId}`;
}

module.exports = {
  generatePairingCode,
  generateRoomKey,
};
