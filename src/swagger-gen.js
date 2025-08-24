import swaggerAutogen from 'swagger-autogen';
import dotenv from 'dotenv';

dotenv.config();

const doc = {
  info: {
    title: 'Snap Reserve API',
    description: 'This API powers SnapReserve — a platform for event management, ticketing, and personalized recommendations.',
  },
  host: process.env.API_HOST || 'localhost:4000',
  schemes: ['http'], 
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'token', 
        description: 'JWT authentication token stored in HTTP-only cookie',
      },
    },
  },
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./app.js'];

swaggerAutogen()(outputFile, endpointsFiles, doc);
