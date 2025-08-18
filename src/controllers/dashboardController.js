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

    const thisMonthRevenue = await ticketModel.countRevenueOfCurrentMonth(userId); 
    const prevMonthRevenue = await ticketModel.countLastMonthRevenue(userId); 
    const upcomingEvents = await eventModel.countUpcomingEventsByOwnerId(userId);
    const countCompletionAndCancelation = await ticketModel.completionAndCancelationRate(userId);
    const total = countCompletionAndCancelation.total_tickets || 0;
    const cancelled = countCompletionAndCancelation.cancelled_tickets || 0;
    const completed = countCompletionAndCancelation.completed_tickets || 0; 
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
      completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) : "0.00", 
      cancellationRate: total > 0 ? ((cancelled / total) * 100).toFixed(2) : "0.00",
    });

  } catch (error) {
    res.status(500).json({ message: 'Failed to load stats', error: error.message });
  }
}

export async function ticketBenMarking(req, res) {
  try {
    const userId = req.user.id;
    const trends = await ticketModel.getTicketsBenMarking(userId);
     res.status(200).json({ 
      trends : trends
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function eventPerformance(req, res) {
  const userId = req.user.id;

  try {
    const events = await eventModel.getAllEventsByOwnerID(userId);
    
    const performance = events.map((event) => {
      const allPricingTiers = event.dates.flatMap(date => date.pricingTiers || []);
      
      const revenue = event.tickets.reduce((sum, ticket) => {
        const tier = allPricingTiers.find(t => t.id === ticket.tierId);
        return sum + (tier?.price || 0);
      }, 0);
      
      return {
        event: event.title,
        bookings: event.tickets.length,
        revenue,
      };
    });

    const sortedPerformance = performance
      .sort((a, b) => b.revenue - a.revenue)
      .map((item, index) => ({ ...item, rank: index + 1 }));

     res.status(200).json({ 
      sortedPerformance : sortedPerformance
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to load event performance', 
      error: error.message 
    });
  }
}

export async function getTopEventByOwner(req, res) {
  try {
    const userId = req.user.id;
    const events = await eventModel.getAllEventsByOwnerID(userId);

    const enriched = events.map(event => {
      const allPricingTiers = event.dates.flatMap(date => date.pricingTiers);
      
      const revenue = event.tickets.reduce((sum, ticket) => {
        const tier = allPricingTiers.find(t => t.id === ticket.tierId);
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

      res.status(200).json({ 
      topEvent : topEvent
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch top event' });
  }
}
