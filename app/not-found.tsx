import { redirect } from 'next/navigation';

export default function NotFound() {
  // Rather than showing an ugly 404 error page, we immediately 
  // redirect any non-existent paths straight back to the main storefront.
  redirect('/');
}
