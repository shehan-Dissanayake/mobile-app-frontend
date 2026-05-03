// hooks/useStripeHelper.native.ts
import { useStripe } from '@stripe/stripe-react-native';

export const useStripeHelper = () => {
  return useStripe();
};