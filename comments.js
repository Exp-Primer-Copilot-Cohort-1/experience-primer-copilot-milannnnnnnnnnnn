// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');
const { randomBytes } = require('crypto');
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Get comments for post
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create comment for post
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;
  // Get comments for post
  const comments = commentsByPostId[req.params.id] || [];
  // Add new comment to post
  comments.push({ id: commentId, content, status: 'pending' });
  // Update comments for post
  commentsByPostId[req.params.id] = comments;
  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });
  res.status(201).send(comments);
});

// Receive event from event bus
app.post('/events', async (req, res) => {
  console.log('Received Event', req.body.type);
  const { type, data } = req.body;
  // Check type of event
  if (type === 'CommentModerated') {
    // Get comments for post
    const comments = commentsByPostId[data.postId];
    // Find comment in post
    const comment = comments.find((comment) => comment.id === data.id);
    // Update comment status
    comment.status = data.status;
    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: { id: data.id, content: data.content, postId: data.postId, status: data.status },
    });
  }
  res.send({});
});

// Listen on port 4001
app.listen(4001, () => {
  console.log('Listening on 4001');
});