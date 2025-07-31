import * as eventModel from '../models/EventModel.js';
import axios from 'axios';

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
    let imagePath;
    if (req.file) {
 
      imagePath = `/uploads/${req.file.filename}`;
    } else if (req.body.image) {
      imagePath = req.body.image;
    }

    const updateData = {
      title: req.body.title,
      category: req.body.category,
      description: req.body.description,
      dates,
      pricingTiers
    };
    if (imagePath !== undefined) {
      updateData.image = imagePath;
    }

    const updatedEvent = await eventModel.editEvent(id, ownerId, updateData);
    
    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found or not owned by you' });
    }

    res.json({
      message: 'Event updated successfully',
      updatedEvent
    });

  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      error: 'Failed to update event',
      details: error.message 
    });
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
    const filters = req.query;
    const events = await eventModel.getAllEventByFilter(filters);
    console.log("eventssss",events)
    res.status(200).json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to get events' });
  }
}

export async function getEventsByOwner(req, res) {
  try {
    const ownerId = req.user.id;
    const { keyword, category, dateRange } = req.query;
    const events = await eventModel.getEventsByOwnerIdWithFilters(ownerId, {
      keyword,
      category,
      dateRange,
    });

    res.json(events);
  } catch (error) {
    console.error('Error fetching owner events:', error);
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

export async function getRecommendedEvents(req, res) {
  const user = req.user;
  const n = parseInt(req.query.n) || 5;

  if (!user.id) {
    return res.status(400).json({ error: 'userId query parameter is required' });
  }
  try {
    const recResponse = await axios.post(`${process.env.FAST_API_URL}/recommended-events`, { user_id: user.id, n });
    const recommendedEventIds = recResponse.data.recommended_event_ids;

    if (!recommendedEventIds || recommendedEventIds.length === 0) {
      return res.json({ events: [] });
    }

    const events = await eventModel.getEventsByIds(recommendedEventIds);
    const eventsMap = new Map(events.map(e => [e.id, e]));
    const sortedEvents = recommendedEventIds
      .map(id => eventsMap.get(id))
      .filter(event => event !== undefined); 

    return res.json({ events: sortedEvents });

  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return res.status(500).json({ error: 'Failed to get recommendations' });
  }
}