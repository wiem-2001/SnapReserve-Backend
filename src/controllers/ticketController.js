import { create, findOneTicket ,findTicketsBySessionId} from '../models/TicketModel.js';
import { stripe } from '../utils/stripe.js';
import { sendTicketEmail } from '../utils/mailer.js';
import { prisma } from '../utils/prisma.js';

export const createCheckoutSession = async (req, res) => {
  const { eventId, tierQuantities, date } = req.body; 
  const userId = req.user.id;

  try {
    const validationPromises = tierQuantities.map(async ({ tierId, quantity }) => {
      const tier = await prisma.pricingTier.findUnique({
        where: { id: tierId },
        include: {
          _count: {
            select: { tickets: true }
          }
        }
      });

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
        const createdTickets = [];
        
        for (const { tierId, quantity } of tiers) {
          for (let i = 0; i < quantity; i++) {
            const ticket = await create(eventId, tierId, date, userId, session.id);
            createdTickets.push(ticket);
          }
        }
        console.log(`Created ${createdTickets.length} tickets for session ${session.id}`);
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
    console.log('🔍 sessionId:', sessionId);
    console.log('🔍 userId:', userId);

  try {
    const tickets = await findTicketsBySessionId(sessionId,userId)
    console.log("tickets" , tickets);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'No tickets found for this order.' });
    }
    const itemsMap = new Map();

    tickets.forEach(ticket => {
      const key = ticket.tier.id;
      if (!itemsMap.has(key)) {
        itemsMap.set(key, {
          name: `${ticket.tier.name} Ticket - ${new Date(ticket.date).toLocaleDateString()}`,
          quantity: 0,
          price: ticket.tier.price,
          qrCodeUrl: ticket.qrCodeUrl,
          pdfUrl: ticket.pdfUrl,
        });
      }
      itemsMap.get(key).quantity += 1;
    });

    const items = Array.from(itemsMap.values());
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orderDetails = {
      orderId: sessionId,
      date: tickets[0].createdAt,
      email: req.user.email,
      items,
      total,
    };
    res.json(orderDetails);
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
