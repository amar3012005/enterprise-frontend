"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function EnterpriseDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isHiveMind = pathname?.includes("/hivemind");

    return (
        <DashboardLayout
            showHeader={!isHiveMind}
            fullWidth={isHiveMind}
        >
            {children}
        </DashboardLayout>
    );
}
