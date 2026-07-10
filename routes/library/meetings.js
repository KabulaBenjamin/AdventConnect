const express = require('express');
const router = express.Router();

router.get('/session', (req, res) => {
  const { roomId } = req.query;
  if (!roomId) {
    return res.status(400).json({ error: "Room ID parameter is required" });
  }
  const sanitizedRoom = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '');

  res.json({
    roomName: `AdventConnect-${sanitizedRoom}`,
    domain: "meet.jit.si",
    configOverwrite: {
      startWithAudioMuted: true,
      startWithVideoMuted: false,
      enableWelcomePage: false,
      prejoinPageEnabled: false,
      hideConferenceSubject: true
    },
    interfaceConfigOverwrite: {
      TOOLBAR_BUTTONS: [
        'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
        'fodeviceselection', 'hangup', 'profile', 'chat', 'settings', 'raisehand'
      ]
    }
  });
});

module.exports = router;
