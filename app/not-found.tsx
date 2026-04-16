'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Rather than showing an ugly 404 error page, we immediately 
    // redirect any non-existent paths straight back to the main storefront.
    router.replace('/');
  }, [router]);

  return null;
}
