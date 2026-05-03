// components/StripeWrapper.tsx
import React from 'react';

export default function StripeWrapper({ children }: { children: React.ReactNode }) {
  // On the web, we just pass the app through safely!
  return <>{children}</>;
}