const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getPosts, createPost, reactToPost,
  prayForPost, commentOnPost, deletePost
} = require('../controllers/postController');

const router = express.Router();

router.get('/', auth, getPosts);
router.post('/', auth, upload.single('media'), createPost);
router.post('/:id/react', auth, reactToPost);
router.post('/:id/pray', auth, prayForPost);
router.post('/:id/comment', auth, commentOnPost);
router.delete('/:id', auth, deletePost);

module.exports = router;
