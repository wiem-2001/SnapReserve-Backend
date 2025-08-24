import { create ,
  findTicketsBySessionId,
  getAllTickets ,
  getLastUserTicket,
  countFailedAttemptsForUser ,
  createFailedAttempt,
  findTicket,
  updatedTicketsStatus,
  findManyTickets,
  updateTicket,
  } from '../models/TicketModel.js';
import {findTicketsById,reduceCapacity , findTier} from '../models/PricingTier.js';
import {findUserById,updateFirstLoginGiftStatus} from '../models/UserModel.js';
import { getEventById } from '../models/EventModel.js';
import { addPoints, createUserPoints, getAllUserPoints, updateAvailableAmountDiscount } from '../models/pointsModel.js';
import { stripe } from '../utils/stripe.js';
import { sendTicketEmail , sendSuspiciousActivityEmail , sendRefundConfirmationEmail} from '../utils/mailer.js';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import axios from 'axios';
import {sendFraudAlert} from '../sockets/index.js';
import { saveNotification } from '../models/NotificationModel.js';
import { RefundStatus,RefundType  } from '../utils/prisma.js';
export const getAvailableTierWithQuantity = async (tierId) => {
  const tier = await findTicketsById(tierId);
  if (!tier) {throw new Error(`Tier ${tierId} not found`);}
  
  const availableTickets = tier.capacity - tier._count.tickets;
  return { tier, availableTickets };
};

export const createCheckoutSession = async (req, res) => {
  const { eventId, tierQuantities, date } = req.body; 
  const user = req.user;
  const userId = req.user.id;
  try {
    const isEligibleForDiscount = user.first_login_gift === true && 
                                 user.welcome_gift_expiry && 
                                 new Date() < user.welcome_gift_expiry;

    const validatedTiers = await Promise.all(tierQuantities.map(async ({ tierId, quantity }) => {
      const { tier, availableTickets } = await getAvailableTierWithQuantity(tierId);
      if (availableTickets < quantity) {
        throw new Error(`Only ${availableTickets} tickets available for tier ${tier.name}`);
      }
      return { tier, quantity };
    }));

    const line_items = validatedTiers.map(({ tier, quantity }) => {
      let unitPrice = tier.price;
      if (isEligibleForDiscount) {
        unitPrice = tier.price * 0.8; 
      }

      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${tier.name} Ticket - ${new Date(date).toLocaleDateString()}`,
            metadata: { eventId, date }
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      };
    });

    const totalAmount = validatedTiers.reduce((sum, { tier, quantity }) => {
      let price = tier.price;
      if (isEligibleForDiscount) {
        price = tier.price * 0.8;
      }
      return sum + price * quantity;
    }, 0);

    const userPoints = await getAllUserPoints(userId);
    let pointsDiscountToApply = 0;
    
    if (userPoints.availableDiscountAmount > 0) {
      if (userPoints.availableDiscountAmount <= totalAmount) {
        pointsDiscountToApply = userPoints.availableDiscountAmount;
      } else {
        pointsDiscountToApply = totalAmount;
      }
    }

    const totalQuantity = tierQuantities.reduce((sum, t) => sum + t.quantity, 0);
    const lastTicket = await getLastUserTicket(user.id);
    let timeSinceLastPurchase = 24.0;
    if (lastTicket) {
      const diffMs = Date.now() - new Date(lastTicket.createdAt).getTime();
      timeSinceLastPurchase = diffMs / (1000 * 60 * 60);
    }

    const failedAttempts = await countFailedAttemptsForUser(user.id);
    const features = [totalAmount, totalQuantity, timeSinceLastPurchase, failedAttempts];

    try {
      const predictionRes = await axios.post(`${process.env.FAST_API_URL}/predict/ocsvm`, { features });
      const prediction = predictionRes.data.prediction;

      if (prediction === -1) {
        if (req.user.email) {
          await sendSuspiciousActivityEmail(req.user.email);
          const tierNames = validatedTiers.map(v => v.tier.name).join(', ');
          const formattedDate = new Date(date).toLocaleDateString();

          sendFraudAlert(user.id, {
            message: 'Transaction blocked due to suspicious activity',
            timestamp: new Date(),
          });
          saveNotification(
            user.id,
            `We noticed something unusual with your transaction for ${tierNames} tickets on ${formattedDate} and couldn't complete it. ` +
            'If you believe this was a mistake, please ignore this and try again. ' +
            'If not, we recommend securing your account and checking your credit card activity immediately.'
          );
        }
        return res.status(403).json({
          error: "Suspicious activity detected. Transaction blocked. Please contact support."
        });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }

    const sessionMetadata = {
      userId,
      eventId,
      date,
      tierQuantities: JSON.stringify(tierQuantities),
      wasWelcomeDiscountApplied: isEligibleForDiscount.toString(),
      pointsDiscountAmount: pointsDiscountToApply.toString() 
    };

    const sessionOptions = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/purchase/cancel`,
      metadata: sessionMetadata,
      payment_intent_data: {
        metadata: {
          userId,
          eventId,
          wasWelcomeDiscountApplied: isEligibleForDiscount.toString(),
          pointsDiscountAmount: pointsDiscountToApply.toString()
        }
      }
    };

    if (pointsDiscountToApply > 0) {
      sessionOptions.discounts = [{
        coupon: await createStripeCoupon(pointsDiscountToApply)
      }];
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    if (isEligibleForDiscount) {
      await updateFirstLoginGiftStatus(userId);
    }

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

async function createStripeCoupon(discountAmount) {
  const coupon = await stripe.coupons.create({
    amount_off: Math.round(discountAmount * 100),
    currency: 'usd',
    duration: 'once',
  });
  return coupon.id;
}

export const generateQrCodeData = async (text) => {
  
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
};

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const eventType = event.type;

  if (eventType === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    const metadata = intent.metadata || {};
    const userId = metadata.userId;
    const eventId = metadata.eventId;
    
      if (userId) {
        await createFailedAttempt({ userId, eventId, intent });
      } 
    
    return res.json({ received: true });
  }
 
if (eventType === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, eventId, date, tierQuantities, wasWelcomeDiscountApplied } = session.metadata || {};
    if (session.payment_status === 'paid') {
      try {
        const tiers = JSON.parse(tierQuantities || '[]');
        const user = await findUserById(userId);
        if (!user) { throw new Error('User not found'); }

        const event = await getEventById(eventId);
        if (!event) { throw new Error('Event not found'); }

        const eventDate = event.dates[0];
        const createdTickets = [];
        const ticketsMap = new Map();
        let totalTicketsPurchased = 0; 

        for (const { tierId, quantity } of tiers) {
          const tier = await findTier(tierId);
          if (!tier) { throw new Error('Pricing tier not found'); }

          await reduceCapacity(tier.id, quantity);
          totalTicketsPurchased += quantity; 

          for (let i = 0; i < quantity; i++) {
            const ticketUUID = uuidv4();
            const { pngUrl, asciiQR } = await generateQrCodeData(ticketUUID);
            const stripeSessionId = session.id;
            const paymentIntentId = session.payment_intent;

            const ticket = await create(eventId, tierId, date, userId, stripeSessionId, paymentIntentId, ticketUUID, pngUrl);
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
        
        const pointsEarned = totalTicketsPurchased * 10;
        await addPoints(userId, pointsEarned, eventId, createdTickets[0]?.id); 

        let totalPaid = ticketsToSend.reduce((sum, t) => sum + t.price * t.quantity, 0);
        const originalTotal = totalPaid;
        const discountWasApplied = wasWelcomeDiscountApplied === 'true';
        
        if (discountWasApplied) {
          totalPaid = totalPaid * 0.8; 
        }

        const userPoints = await getAllUserPoints(userId);

        let discountAmountLeft = userPoints.availableDiscountAmount || 0;
        let pointsDiscountApplied = 0;

        if (userPoints.availableDiscountAmount > 0) {
          if (userPoints.availableDiscountAmount <= totalPaid) {
            pointsDiscountApplied = userPoints.availableDiscountAmount;
            totalPaid = totalPaid - pointsDiscountApplied;
            discountAmountLeft = 0;
          } else {
            pointsDiscountApplied = totalPaid;
            totalPaid = 0;
            discountAmountLeft = userPoints.availableDiscountAmount - pointsDiscountApplied;
          }
         
          await updateAvailableAmountDiscount(userId,discountAmountLeft);
        }
        await sendTicketEmail({
          to: user.email,
          userName: user.full_name || user.email,
          tickets: ticketsToSend,
          orderId: session.id,
          orderDate: new Date(),
          totalAmount: originalTotal,
          wasDiscountApplied: discountWasApplied || pointsDiscountApplied > 0,
          originalTotal: (discountWasApplied || pointsDiscountApplied > 0) ? originalTotal : null, 
          welcomeDiscount: discountWasApplied ? originalTotal * 0.2 : 0,
          pointsDiscount: pointsDiscountApplied,
          finalAmount: totalPaid
        });
        if (discountWasApplied && user.first_login_gift === true) {
          await updateFirstLoginGiftStatus(userId);
        }

      } catch (error) {
        console.error('Error processing successful payment:', error);
      }
    }
    return res.json({ received: true });
  }
  
  return res.json({ received: true });
};

export const getOrderDetails = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;

  try {
    const tickets = await findTicketsBySessionId(sessionId, userId);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'No tickets found for this order.' });
    }

    const firstTicket = tickets[0];
    
    let wasWelcomeDiscountApplied = false;
    let pointsDiscount = 0;
    let originalTotal = 0;
    let finalAmount = 0;
    const pointsEarned = tickets.length * 10;
    
    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items.data.price.product'] 
      });

      wasWelcomeDiscountApplied = stripeSession.metadata?.wasWelcomeDiscountApplied === 'true';
      pointsDiscount = parseFloat(stripeSession.metadata?.pointsDiscountAmount || '0');
      originalTotal = tickets.reduce((sum, ticket) => sum + ticket.tier.price, 0);
      let tempAmount = originalTotal;
      
      if (wasWelcomeDiscountApplied) {
        tempAmount = tempAmount * 0.8; 
      }
      
      if (pointsDiscount > 0) {
        tempAmount = Math.max(0, tempAmount - pointsDiscount); 
      }
      
      finalAmount = tempAmount;
      
    } catch (stripeError) {
      console.error('Stripe session retrieval error:', stripeError);
      originalTotal = tickets.reduce((sum, ticket) => sum + ticket.tier.price, 0);
      finalAmount = originalTotal;
      wasWelcomeDiscountApplied = false;
      pointsDiscount = 0;
    }
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
    
    const welcomeDiscount = wasWelcomeDiscountApplied ? originalTotal * 0.2 : 0;  
    const orderDetails = {
      orderId: sessionId,
      date: firstTicket.createdAt,
      email: req.user.email,
      event: eventInfo,
      items,
      total: finalAmount, 
      finalAmount: finalAmount,
      wasDiscountApplied: wasWelcomeDiscountApplied,
      pointsDiscount: pointsDiscount,
      welcomeDiscount: welcomeDiscount,
      originalTotal: originalTotal,
      pointsEarned: pointsEarned
    };

    res.json(orderDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllTicketsByUserIdGroupByCreatedDate = async (req,res) => {
  try {
     const userId  = req.user.id;
      if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    const tickets = await getAllTickets(userId);
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
     res.status(500).json({ error: error.message });
  }
}

const calculateRefundAmount = async (ticket) => {
  const tier = await findTier(ticket.tierId);
  switch (tier.refundType) {
    case RefundType.FULL_REFUND:
      return tier.price;
    case RefundType.PARTIAL_REFUND:
      return tier.price * (tier.refundPercentage / 100);
    default:
      return 0;
  }
};

const validateRefund = async (ticketId) => {
  const ticket = await findTicket(ticketId);
  
  if (!ticket) {
    throw new Error('Ticket not found');
  }

  const tier = await findTier(ticket.tierId);

  if (ticket.refundStatus !== RefundStatus.NONE) {
    throw new Error('Refund already processed or requested');
  }

  if (new Date() > new Date(ticket.date)) {
    throw new Error('Event already occurred');
  }

  if (tier.refundType === RefundType.NO_REFUND) {
    throw new Error('Refunds not allowed for this ticket');
  }

  if ([RefundType.FULL_REFUND, RefundType.PARTIAL_REFUND].includes(tier.refundType)) {
    const refundDeadline = new Date(ticket.date);
    refundDeadline.setDate(refundDeadline.getDate() - tier.refundDays);

    if (new Date() > refundDeadline) {
      throw new Error(`Refund deadline passed (${refundDeadline.toLocaleString()})`);
    }
  }

  return { ticket, tier }; 
};

export const processStripeRefund = async (ticket, amount) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      ticket.stripePaymentId,
      { expand: ['latest_charge'] }
    );

    if (!paymentIntent.latest_charge) {
      throw new Error('Payment not completed or charge missing');
    }

    const charge = await stripe.charges.retrieve(paymentIntent.latest_charge.id, {
      expand: ['refunds.data']
    });
    const amountRefunded = charge.refunds?.data.reduce(
      (sum, refund) => sum + refund.amount, 
      0
    ) || 0;
    const amountRemaining = paymentIntent.amount - amountRefunded;
    const amountInCents = Math.round(amount * 100);
    if (amountInCents > amountRemaining) {
      throw new Error(`Only $${(amountRemaining/100).toFixed(2)} available for refund`);
    }

    return await stripe.refunds.create({
      charge: charge.id,
      amount: amountInCents,
      metadata: {
        ticketId: ticket.id,
        eventId: ticket.eventId
      }
    });
  } catch (error) {
    throw new Error(`Payment processing failed: ${error.message}`);
  }
};

export const refundTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { ticket, tier } = await validateRefund(ticketId);
    const amountToRefund = await calculateRefundAmount(ticket);
    const refund = await processStripeRefund(ticket, amountToRefund);

    await updateTicket(ticketId, {
      refundStatus: 'PROCESSED',
      refundAmount: amountToRefund,
      refundProcessDate: new Date()
    });

    const siblingTickets = await findManyTickets({
      stripePaymentId: ticket.stripePaymentId,
      id: { not: ticketId }
    });
    if (siblingTickets.length > 0) {
      await updatedTicketsStatus({
        where: {
          stripePaymentId: ticket.stripePaymentId,
          refundStatus: RefundStatus.NONE
        },
        data: {
          refundStatus: RefundType.PARTIAL_REFUND
        }
      });
    }

    const event = await getEventById(ticket.eventId);
    await saveNotification(req.user.id,`Your refund for ticket (${tier.name}) to "${event.title}" has been processed. 
            Amount refunded: $${amountToRefund.toFixed(2)}. `)
    await sendRefundConfirmationEmail(req.user.email, {
      eventTitle: event.title,
      ticketType: tier.name,
      amount: amountToRefund,
      policyType: event.refundType,
      remainingTickets: siblingTickets.length
    });

    res.status(200).json({ 
      success: true, 
      refund,
      amountRefunded: amountToRefund
    });

  } catch (error) {
    res.status(400).json({ 
      success: false,
      error: error.message,
      code: error.code 
    });
  }
};