import * as eventModel from '../models/EventModel.js';

export async function createEvent(req, res) {
  try {
    const filename = req.file?.filename;
    const ownerId = req.user.id;
    if (!filename) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const requiredFields = ['title', 'category', 'description'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        fields: missingFields 
      });
    }
     const dates = req.body.dates ? JSON.parse(req.body.dates) : [];
     const pricingTiers = req.body.pricingTiers ? JSON.parse(req.body.pricingTiers) : [];
      const eventData = {
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      ownerId,
      image: `/uploads/${filename}`,
      dates,
      pricingTiers,
    };

    const event = await eventModel.createEvent(eventData);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' });
  }
}

export async function editEvent(req, res) {
  try {
    const filename = req.file?.filename;
    const ownerId = req.user.id;
    const { id } = req.params;

    const requiredFields = ['title', 'category', 'description'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        fields: missingFields 
      });
    }
    const dates = req.body.dates ? JSON.parse(req.body.dates) : [];
    const pricingTiers = req.body.pricingTiers ? JSON.parse(req.body.pricingTiers) : [];
    const updateData = {
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      dates,
      pricingTiers,
    };
    if (filename) {
      updateData.image = `/uploads/${filename}`;
    }
    const result = await eventModel.editEvent(id, ownerId, updateData);
    if (result.count === 0) {
      return res.status(404).json({ error: 'Event not found or not owned by you' });
    }

    res.json({ 
      message: 'Event updated successfully',
      updatedEvent: result.updatedEvent 
    });
  } catch (error) {
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
    res.status(500).json({ error: 'Failed to delete event' });
  }
}

export async function getAllEvents(req, res) {
  try {
    const events = await eventModel.getAllEvents();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get events' });
  }
}

export async function getEventsByOwner(req, res) {
  try {
    const ownerId = req.user.id;
    const events = await eventModel.getEventsByOwnerId(ownerId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get your events' });
  }
}

export async function getEventById(req, res) {
  try {
    const { id } = req.params;

    const event = await eventModel.getEventById(id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found or not owned by you' });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get event' });
  }
}
