import * as eventModel from '../models/EventModel.js';

export async function createEvent(req, res) {
  try {
    
    const ownerId = req.user.id; 
    const eventData = { ...req.body, ownerId };

    const event = await eventModel.createEvent(eventData);
    res.status(201).json(event);
  } catch (error) {
    console.error('Create Event Error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
}

export async function editEvent(req, res) {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    const result = await eventModel.editEvent(id, ownerId, updateData);
    if (result.count === 0) {
      return res.status(404).json({ error: 'Event not found or not owned by you' });
    }

    res.json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Edit Event Error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
}

export async function deleteEvent(req, res) {
  try {
    const ownerId = req.user.id;
    const { id } = req.params;

    const result = await eventModel.deleteEvent(id, ownerId);
    if (result.count === 0) {
      return res.status(404).json({ error: 'Event not found or not owned by you' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete Event Error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
}

export async function getAllEvents(req, res) {
  try {
    const events = await eventModel.getAllEvents();
    res.json(events);
  } catch (error) {
    console.error('Get All Events Error:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
}

export async function getEventsByOwner(req, res) {
  try {
    const ownerId = req.user.id;
    const events = await eventModel.getEventsByOwnerId(ownerId);
    res.json(events);
  } catch (error) {
    console.error('Get Owner Events Error:', error);
    res.status(500).json({ error: 'Failed to get your events' });
  }
}

export async function getEventByIdAndOwner(req, res) {
  try {
    const { id } = req.params;

    const event = await eventModel.getEventById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found or not owned by you' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get Event By ID Error:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
}
