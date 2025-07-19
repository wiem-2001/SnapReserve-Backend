import { create ,findTicketsBySessionId,getAllTickets} from '../models/TicketModel.js';
import {findTicketsById,reduceCapacity , findTier} from '../models/PricingTier.js';
import {findUserById} from '../models/UserModel.js';
import { getEventById } from '../models/EventModel.js';
import { stripe } from '../utils/stripe.js';
import { sendTicketEmail } from '../utils/mailer.js';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

export const createCheckoutSession = async (req, res) => {
  const { eventId, tierQuantities, date } = req.body; 
  const userId = req.user.id;

  try {
    const validationPromises = tierQuantities.map(async ({ tierId, quantity }) => {
      const tier = await findTicketsById(tierId)
      if (!tier) {
        throw new Error(`Tier ${tierId} not found`);
      }
      const availableTickets = tier.capacity - tier._count.tickets;
      if (availableTickets < quantity) {
        throw new Error(`Only ${availableTickets} tickets available for tier ${tier.name}`);
      }
      return {
        tier,
        quantity
      };
    });

    const validatedTiers = await Promise.all(validationPromises);
    const line_items = validatedTiers.map(({ tier, quantity }) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${tier.name} Ticket - ${new Date(date).toLocaleDateString()}`,
          metadata: {
            eventId,
            date,
          },
        },
        unit_amount: Math.round(tier.price * 100), 
      },
      quantity: quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/purchase/cancel`,
      metadata: {
        userId,
        eventId,
        date,
        tierQuantities: JSON.stringify(tierQuantities) 
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Checkout session error:', err);
    res.status(400).json({ error: err.message });
  }
};

export const generateQrCodeData = async (text) => {
  try {
    const pngDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      width: 300,
      margin: 2,
      color: {
        dark: '#021529',
        light: '#ffffff'
      }
    });

    const asciiQR = await new Promise((resolve) => {
      qrcodeTerminal.generate(text, { small: true }, (code) => {
        resolve(code);
      });
    });

    return {
      pngUrl: pngDataUrl,
      asciiQR: asciiQR,
      textUrl: text
    };
  } catch (err) {
    console.error('QR generation failed:', err);
    throw err;
  }
};

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
   
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.payment_status === 'paid') {
      const { userId, eventId, date, tierQuantities } = session.metadata;
      const tiers = JSON.parse(tierQuantities);
      
      try {
        const user = await findUserById(userId);
        if (!user) {throw new Error('User not found');}
        const event = await getEventById(eventId);

        if (!event) {throw new Error('Event not found');}
        const eventDate = event.dates[0];

        const createdTickets = [];
        const ticketsMap = new Map();

        for (const { tierId, quantity } of tiers) {
          const tier = await findTier(tierId);

          await reduceCapacity(tier.id);

          if (!tier) {throw new Error('Pricing tier not found');}

          for (let i = 0; i < quantity; i++) {
            const ticketUUID = uuidv4();
            const { pngUrl, asciiQR, textUrl } = await generateQrCodeData(ticketUUID);
            const stripeSessionId = session.id;

            const ticket = await create (eventId, tierId, date, userId, stripeSessionId,ticketUUID,pngUrl) ;
            if (!ticketsMap.has(tierId)) {
              ticketsMap.set(tierId, {
                tierName: tier.name,
                price: tier.price,
                quantity: 0,
                qrCodeUrls: [],
                asciiQRs: [],
                textUrls: [],
                ticketIds: [],
                eventTitle: event.title,
                eventDate: eventDate.date,
                eventLocation: eventDate.location
              });
            }

            const group = ticketsMap.get(tierId);
            group.quantity += 1;
            group.qrCodeUrls.push(pngUrl);
            group.asciiQRs.push(asciiQR);
            group.textUrls.push(`${process.env.FRONTEND_URL}/purchased-tickets/${ticketUUID}`);
            group.ticketIds.push(ticketUUID);

            createdTickets.push(ticket);
          }
        }

        const ticketsToSend = Array.from(ticketsMap.values());
        const totalPaid = ticketsToSend.reduce((sum, t) => sum + t.price * t.quantity, 0);
        
        await sendTicketEmail({
          to: user.email,
          userName: user.full_name || user.email,
          tickets: ticketsToSend,
          orderId: session.id,
          orderDate: new Date(),
          totalAmount: totalPaid,
        });

      } catch (err) {
        console.error('Error processing webhook:', err);
      }
    }
  }
  res.json({ received: true });
};

export const getOrderDetails = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const tickets = await findTicketsBySessionId(sessionId,userId);

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'No tickets found for this order.' });
    }
    const firstTicket = tickets[0];
    const eventInfo = {
      id: firstTicket.event.id,
      title: firstTicket.event.title,
      description: firstTicket.event.description,
      category: firstTicket.event.category,
      image: firstTicket.event.image,
      organizer: firstTicket.event.owner.full_name,
      dates: firstTicket.event.dates.map(date => ({
        date: date.date,
        location: date.location
      }))
    };
    const itemsMap = new Map();
    tickets.forEach(ticket => {
      const key = ticket.tier.id;
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          name: `${ticket.tier.name} Ticket`,
          quantity: 0,
          price: ticket.tier.price,
          tickets: [] 
        });
      }
      const group = itemsMap.get(key);
      group.quantity += 1;
      group.tickets.push({
        id: ticket.id,
        date: ticket.date,
        qrCodeUrl: ticket.qrCodeUrl,
        pdfUrl: ticket.pdfUrl,
        ticketUuid: ticket.uuid
      });
    });

    const items = Array.from(itemsMap.values());
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const orderDetails = {
      orderId: sessionId,
      date: firstTicket.createdAt,
      email: req.user.email,
      event: eventInfo,
      items,
      total,
    };

    res.json(orderDetails);
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllTicketsByUserIdGroupByCreatedDate = async (req,res) => {
  try {
     const userId  = req.user.id;
      if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const tickets = await getAllTickets(userId.stringify);
    const result = {};
    
    tickets.forEach(ticket => {
      const year = new Date(ticket.createdAt).getFullYear();
      if (!result[year]) {
        result[year] = [];
      }
      result[year].push(ticket);
    });

    const descendingYears = Object.keys(result).sort((a, b) => b - a);
    const finalResult = {};
    
    descendingYears.forEach(year => {
      finalResult[year] = result[year];
    });

      res.status(200).json(finalResult);
  } catch (error) {
   console.error('Error fetching tickets:', error);
     res.status(500).json({ error: 'Failed to fetch tickets' });
  }
}