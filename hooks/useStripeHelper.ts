// hooks/useStripeHelper.ts

export const useStripeHelper = () => {
  return {
    // We added "params: any" here so TypeScript knows it is allowed to accept the configuration object
    initPaymentSheet: async (params: any) => ({ 
      error: { message: "Stripe Mobile is not supported on web browsers. Please test payments on a real phone or emulator." } 
    }),
    presentPaymentSheet: async () => ({ 
      error: { message: "Stripe Mobile is not supported on web browsers." } 
    })
  };
};