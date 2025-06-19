import Stripe from 'stripe';
import { configDotenv } from "dotenv";

configDotenv();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default stripe;