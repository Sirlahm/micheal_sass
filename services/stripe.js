import stripe from '../config/stripe.js';

export const createStripeAccount = async (user) => {
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      business_type: 'individual',
      individual: {
        first_name: user.name.split(' ')[0],
        last_name: user.name.split(' ')[1] || '',
        email: user.email,
      },
      business_profile: {
        name: user.businessName,
        product_description: user.businessDescription || 'E-commerce products/services',
        mcc: '5734', // Computer Software Stores
        url: process.env.FRONTEND_URL,
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
      metadata: {
        userId: user._id.toString(),
        userEmail: user.email,
      },
    });

    return account;
  } catch (err) {
    console.error('Stripe account creation error:', err);
    throw new Error(`Failed to create Stripe account: ${err.message}`);
  }
};

export const createAccountLink = async (accountId) => {
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.CLIENT_URL}/vendor/onboarding?status=restarted`,
      return_url: `${process.env.CLIENT_URL}/vendor/onboarding?status=completed`,
      type: 'account_onboarding',
    });

    return accountLink;
  } catch (err) {
    console.error('Stripe account link creation error:', err);
    throw new Error(`Failed to create onboarding link: ${err.message}`);
  }
};

export const getAccountStatus = async (accountId) => {
  try {
    const account = await stripe.accounts.retrieve(accountId);
    return {
      detailsSubmitted: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
      currentlyDue: account.requirements?.currently_due || [],
    };
  } catch (err) {
    console.error('Stripe account status error:', err);
    throw new Error(`Failed to get account status: ${err.message}`);
  }
};
