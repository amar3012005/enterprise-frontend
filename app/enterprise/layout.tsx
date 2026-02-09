'use client';

import TaraOverlay from '@/components/overlay/TaraOverlay';

export default function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* TARA Visual Co-Pilot Widget - appears on all dashboard pages */}
      <TaraOverlay />
    </>
  );
}
