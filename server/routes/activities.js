const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/storage');

const router = express.Router();

const typeNames = {
  practice: '小型练习会',
  duet: '二重奏',
  ensemble: '合奏排练',
  offline: '线下交流'
};

router.get('/', (req, res) => {
  const activities = readJSON('activities.json', []);
  const users = readJSON('users.json', []);
  const { type, status, organizerId, currentUserId, keyword } = req.query;

  let result = [...activities];

  if (type) {
    result = result.filter(a => a.type === type);
  }
  if (status) {
    result = result.filter(a => a.status === status);
  }
  if (organizerId) {
    result = result.filter(a => a.organizerId === organizerId);
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    result = result.filter(a =>
      a.title.toLowerCase().includes(kw) ||
      a.description.toLowerCase().includes(kw) ||
      (a.pieces && a.pieces.some(p => p.toLowerCase().includes(kw)))
    );
  }

  const enriched = result.map(activity => {
    const organizer = users.find(u => u.id === activity.organizerId) || null;
    const signedUpCount = activity.participants.filter(p => p.status === 'confirmed').length;
    const isOrganizer = currentUserId === activity.organizerId;
    const isParticipant = activity.participants.some(p => p.userId === currentUserId);
    const myStatus = activity.participants.find(p => p.userId === currentUserId)?.status || null;

    return {
      ...activity,
      organizer,
      signedUpCount,
      isOrganizer,
      isParticipant,
      myStatus
    };
  });

  enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(enriched);
});

router.get('/:id', (req, res) => {
  const activities = readJSON('activities.json', []);
  const users = readJSON('users.json', []);
  const { currentUserId } = req.query;

  const activity = activities.find(a => a.id === req.params.id);
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const organizer = users.find(u => u.id === activity.organizerId) || null;
  const participantsWithInfo = activity.participants.map(p => ({
    ...p,
    user: users.find(u => u.id === p.userId) || null
  }));

  const signedUpCount = activity.participants.filter(p => p.status === 'confirmed').length;
  const isOrganizer = currentUserId === activity.organizerId;
  const isParticipant = activity.participants.some(p => p.userId === currentUserId);
  const myStatus = activity.participants.find(p => p.userId === currentUserId)?.status || null;

  res.json({
    ...activity,
    organizer,
    participants: participantsWithInfo,
    signedUpCount,
    isOrganizer,
    isParticipant,
    myStatus
  });
});

router.post('/', (req, res) => {
  const activities = readJSON('activities.json', []);
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  const { type, title, description, pieces, meetTime, endTime, location, latitude, longitude, neededInstruments, maxParticipants, notes } = req.body;

  if (!type || !title || !meetTime || !location) {
    return res.status(400).json({ error: '请填写必填信息' });
  }

  const newActivity = {
    id: 'act' + uuidv4().slice(0, 8),
    type,
    typeName: typeNames[type] || '其他活动',
    title,
    description: description || '',
    organizerId: userId,
    pieces: pieces || [],
    meetTime,
    endTime: endTime || '',
    location,
    latitude: latitude || 39.9042,
    longitude: longitude || 116.4074,
    neededInstruments: neededInstruments || [],
    maxParticipants: maxParticipants || 10,
    participants: [
      {
        userId,
        instrument: '',
        joinedAt: new Date().toISOString(),
        status: 'confirmed'
      }
    ],
    status: 'recruiting',
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  activities.push(newActivity);
  writeJSON('activities.json', activities);

  res.json({ success: true, activity: newActivity });
});

router.put('/:id', (req, res) => {
  const activities = readJSON('activities.json', []);
  const userId = req.headers['x-user-id'];
  const idx = activities.findIndex(a => a.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: '活动不存在' });
  }

  if (activities[idx].organizerId !== userId) {
    return res.status(403).json({ error: '只有组织者可以编辑活动' });
  }

  const updates = req.body;
  if (updates.type) {
    updates.typeName = typeNames[updates.type] || activities[idx].typeName;
  }

  activities[idx] = {
    ...activities[idx],
    ...updates,
    id: activities[idx].id,
    organizerId: activities[idx].organizerId,
    createdAt: activities[idx].createdAt
  };

  writeJSON('activities.json', activities);
  res.json({ success: true, activity: activities[idx] });
});

router.post('/:id/join', (req, res) => {
  const activities = readJSON('activities.json', []);
  const userId = req.headers['x-user-id'];
  const idx = activities.findIndex(a => a.id === req.params.id);

  if (!userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  if (idx === -1) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const activity = activities[idx];

  if (activity.status !== 'recruiting') {
    return res.status(400).json({ error: '活动已停止招募' });
  }

  const confirmedCount = activity.participants.filter(p => p.status === 'confirmed').length;
  if (confirmedCount >= activity.maxParticipants) {
    return res.status(400).json({ error: '活动人数已满' });
  }

  const existing = activity.participants.find(p => p.userId === userId);
  if (existing) {
    if (existing.status === 'confirmed') {
      return res.status(400).json({ error: '您已报名此活动' });
    }
    existing.status = 'confirmed';
  } else {
    const { instrument } = req.body;

    if (instrument && activity.neededInstruments && activity.neededInstruments.length > 0) {
      const needed = activity.neededInstruments.find(n => n.instrument === instrument);
      if (needed) {
        if ((needed.signedUp || 0) >= needed.count) {
          return res.status(400).json({ error: `「${instrument}」名额已满，请选择其他乐器` });
        }
      }
    }

    activity.participants.push({
      userId,
      instrument: instrument || '',
      joinedAt: new Date().toISOString(),
      status: 'confirmed'
    });

    if (instrument && activity.neededInstruments) {
      const needed = activity.neededInstruments.find(n => n.instrument === instrument);
      if (needed) {
        needed.signedUp = (needed.signedUp || 0) + 1;
      }
    }
  }

  writeJSON('activities.json', activities);
  res.json({ success: true, activity: activities[idx] });
});

router.post('/:id/leave', (req, res) => {
  const activities = readJSON('activities.json', []);
  const userId = req.headers['x-user-id'];
  const idx = activities.findIndex(a => a.id === req.params.id);

  if (!userId) {
    return res.status(401).json({ error: '请先登录' });
  }

  if (idx === -1) {
    return res.status(404).json({ error: '活动不存在' });
  }

  const activity = activities[idx];

  if (activity.organizerId === userId) {
    return res.status(400).json({ error: '组织者不能退出自己创建的活动' });
  }

  const participantIdx = activity.participants.findIndex(p => p.userId === userId);
  if (participantIdx === -1) {
    return res.status(400).json({ error: '您未报名此活动' });
  }

  const participant = activity.participants[participantIdx];
  if (participant.instrument && activity.neededInstruments) {
    const needed = activity.neededInstruments.find(n => n.instrument === participant.instrument);
    if (needed && needed.signedUp > 0) {
      needed.signedUp -= 1;
    }
  }

  activity.participants.splice(participantIdx, 1);

  writeJSON('activities.json', activities);
  res.json({ success: true, activity: activities[idx] });
});

router.delete('/:id', (req, res) => {
  const activities = readJSON('activities.json', []);
  const userId = req.headers['x-user-id'];
  const idx = activities.findIndex(a => a.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: '活动不存在' });
  }

  if (activities[idx].organizerId !== userId) {
    return res.status(403).json({ error: '只有组织者可以删除活动' });
  }

  activities.splice(idx, 1);
  writeJSON('activities.json', activities);
  res.json({ success: true });
});

module.exports = router;
