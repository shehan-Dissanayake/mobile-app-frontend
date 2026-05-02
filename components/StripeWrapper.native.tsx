// components/StripeWrapper.native.tsx
import { StripeProvider } from '@stripe/stripe-react-native';
import React from 'react';

export default function StripeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <StripeProvider publishableKey="pk_test_51TL770Axgv4sFwCFcW5pgTkJa1uDlweZqH6Jwy5eyDAMVHTPYteSd0qBcbwvevM3a3pNhPyqlORKV2L3FMb6TZpG00Orsk6fCk">
      {/* We wrap children in an empty fragment to make TypeScript happy! */}
      <>{children}</>
    </StripeProvider>
  );
}