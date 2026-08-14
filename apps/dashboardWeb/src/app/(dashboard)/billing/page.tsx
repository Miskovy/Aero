'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function BillingRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const paramsString = searchParams.toString();
    const targetUrl = paramsString
      ? `/settings/subscriptions?${paramsString}`
      : '/settings/subscriptions';
    router.replace(targetUrl);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center p-20">
      <div className="throbber" />
    </div>
  );
}
