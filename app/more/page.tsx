"use client";

import Link from "next/link";
import {
  Bell,
  CreditCard,
  FileText,
  Home,
  Users,
  Wrench,
  CalendarDays,
} from "lucide-react";

const mainLinks = [
  {
    href: "/",
    title: "Dashboard",
    description: "View today’s summary and business overview.",
    icon: Home,
  },
  {
    href: "/clients",
    title: "Clients",
    description: "Manage customer details and contact information.",
    icon: Users,
  },
  {
    href: "/jobs",
    title: "Jobs",
    description: "Create, update, and track handyman jobs.",
    icon: Wrench,
  },
  {
    href: "/calendar",
    title: "Calendar",
    description: "View today’s schedule and upcoming appointments.",
    icon: CalendarDays,
  },
];

const moreLinks = [
  {
    href: "/payments",
    title: "Payments",
    description: "Record payments and check outstanding balances.",
    icon: CreditCard,
  },
  {
    href: "/notifications",
    title: "Notifications",
    description: "Send SMS, WhatsApp, and email reminders.",
    icon: Bell,
  },
  {
    href: "/invoices",
    title: "Invoices",
    description: "View job invoices and print or save PDF copies.",
    icon: FileText,
  },
];

export default function MorePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">More</h1>
        <p className="text-gray-500">
          Quick access to the rest of your HandyFlow tools.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold">Main Menu</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {mainLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className="card flex items-start gap-4 hover:bg-gray-50"
              >
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Icon size={24} />
                </div>

                <div>
                  <h3 className="font-bold">{link.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {link.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold">Business Tools</h2>

        <div className="grid gap-4 md:grid-cols-2">
          {moreLinks.map((link) => {
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className="card flex items-start gap-4 hover:bg-gray-50"
              >
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                  <Icon size={24} />
                </div>

                <div>
                  <h3 className="font-bold">{link.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {link.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}