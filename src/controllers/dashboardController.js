import * as eventModel from '../models/EventModel.js'
import * as ticketModel from '../models/TicketModel.js'

export async function stats(req, res) {
  try {
    const userId = req.user.id;

    const events = await eventModel.getAllEventsByOwnerID(userId);
    const allTickets = events.flatMap(event => event.tickets);
    const totalAttendees = new Set(allTickets.map(t => t.userId)).size;

    const totalRevenue = await ticketModel.countTotalRevenueThisYear(userId); 
    const lastYearRevenue = await ticketModel.countLastYearRevenue(userId); 

    const thisMonthRevenue = await ticketModel.countLastMonthRevenueThisMonth(userId); 
    const prevMonthRevenue = await ticketModel.countRevenueOfMonthBeforeLast(userId); 
    const upcomingEvents = await eventModel.countUpcomingEventsByOwnerId(userId);

    res.json({
      earnings: {
        thisYear: totalRevenue,
        lastYear: lastYearRevenue,
        yearChange: ((totalRevenue - lastYearRevenue) / (lastYearRevenue || 1)) * 100,

        thisMonth: thisMonthRevenue,
        lastMonth: prevMonthRevenue,
        monthChange: ((thisMonthRevenue - prevMonthRevenue) / (prevMonthRevenue || 1)) * 100,
      },
      attendees: {
        total: totalAttendees,
      },
      events: {
        total: events.length,
        upcoming: upcomingEvents,
      },
      completionRate: 91.5, 
      cancellationRate: 8.5,
    });

  } catch (error) {
    console.error('Error in stats:', error);
    res.status(500).json({ message: 'Failed to load stats', error: error.message });
  }
}

export async function ticketBenMarking(req, res) {
  try {
    const userId = req.user.id;
    const trends = await ticketModel.getTicketsBenMarking(userId);
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function eventPerformance (req, res) {
  const userId = req.user.id;

  const events = await eventModel.getAllEventsByOwnerID(userId);

  const performance = events.map((event, index) => {
    const totalBookings = event.tickets.length;
    const revenue = event.tickets.reduce((sum, ticket) => {
      const tier = event.pricingTiers.find(t => t.id === ticket.tierId);
      return sum + (tier?.price || 0);
    }, 0);
    return {
      event: event.title,
      bookings: totalBookings,
      revenue,
      rank: index + 1
    };
  });

  res.json(performance.sort((a, b) => b.revenue - a.revenue));
}

export async function getTopEventByOwner(req,res)  {
    try {
  const userId = req.user.id;
  const events = await eventModel.getAllEventsByOwnerID(userId);

    const enriched = events.map(event => {
      const revenue = event.tickets.reduce((sum, ticket) => {
        const tier = event.pricingTiers.find(t => t.id === ticket.tierId);
        return sum + (tier?.price || 0);
      }, 0);

      return {
        eventTitle: event.title,
        bookings: event.tickets.length,
        revenue,
      };
    });

    enriched.sort((a, b) => b.revenue - a.revenue);

    const topEvent = enriched[0] || null;

    res.json(topEvent);
  } catch (error) {
    console.error('Error fetching top event:', error);
    res.status(500).json({ message: 'Failed to fetch top event' });
  }
}
