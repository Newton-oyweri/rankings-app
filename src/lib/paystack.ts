// src/config/paystack.ts

export const PAYSTACK_CONFIG = {
  // Replace with your actual Paystack Public Key from your Paystack Dashboard
  // (Use 'pk_test_...' for development/testing, 'pk_live_...' for production)
  PUBLIC_KEY: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
  
  // Default currency (KES for Kenya, NGN for Nigeria, GHS for Ghana, USD, etc.)
  CURRENCY: 'KES',
  
  // Base configuration options for Paystack transactions
  CHANNELS: ['card', 'mobile_money', 'bank'],
};