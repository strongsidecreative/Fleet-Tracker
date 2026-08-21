export type TourStep = {
  /** Unique id, used for keys only. */
  id: string;
  /**
   * CSS selector for the element to spotlight, e.g. `[data-tour="nav-home"]`.
   * Leave undefined for a centered welcome/finish slide with no spotlight.
   */
  target?: string;
  /**
   * Route this step's target lives on. If the tour is on a different page
   * when this step is reached, the tour engine will navigate there first.
   */
  path?: string;
  title: string;
  content: string;
  /** Preferred popover position relative to the target. Defaults to "auto". */
  placement?: "top" | "bottom" | "left" | "right" | "auto";
};

export const driverTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Fleet Tracker",
    content:
      "Kia ora! This quick tour will show you how to book a vehicle, check one out, log a trip, and report anything that needs attention. It only takes a minute — use Next and Back to move around, or Skip if you'd rather explore on your own.",
  },
  {
    id: "dashboard-scan",
    path: "/",
    target: "[data-tour='driver-scan-card']",
    title: "Start or finish a trip",
    content:
      "This card shows whether you currently have a vehicle checked out. Tap Scan Vehicle QR to check one out, or Scan to Finish to end your current trip — just scan the QR code stuck to the vehicle.",
    placement: "bottom",
  },
  {
    id: "dashboard-stats",
    path: "/",
    target: "[data-tour='driver-stats']",
    title: "Your driving stats",
    content: "These tiles track how many kilometres you've driven this week, this month, and in total — handy for keeping an eye on your usage.",
    placement: "bottom",
  },
  {
    id: "dashboard-actions",
    path: "/",
    target: "[data-tour='driver-quick-actions']",
    title: "Quick actions",
    content:
      "From here you can book a vehicle in advance, run a vehicle check (required before some trips), or report an incident like damage or a breakdown.",
    placement: "top",
  },
  {
    id: "nav-home",
    path: "/",
    target: "[data-tour='nav-home']",
    title: "Home",
    content: "Takes you back to your dashboard — your current trip, recent stats, and quick actions.",
    placement: "top",
  },
  {
    id: "nav-trips",
    path: "/",
    target: "[data-tour='nav-trips']",
    title: "My Trips",
    content: "A full history of every trip you've logged, with start and end odometer readings.",
    placement: "top",
  },
  {
    id: "nav-bookings",
    path: "/",
    target: "[data-tour='nav-bookings']",
    title: "Bookings",
    content: "Reserve a vehicle ahead of time so it's available when you need it, and see bookings awaiting admin approval.",
    placement: "top",
  },
  {
    id: "nav-vehicles",
    path: "/",
    target: "[data-tour='nav-vehicles']",
    title: "Vehicles",
    content: "Browse every vehicle in the fleet, including which ones are currently available.",
    placement: "top",
  },
  {
    id: "nav-account",
    path: "/",
    target: "[data-tour='nav-account']",
    title: "Account",
    content: "Your profile, licence details, and notification settings live here. You can also replay this tour any time from this page.",
    placement: "top",
  },
  {
    id: "finish",
    title: "You're all set",
    content:
      "That's the full tour. If you ever want to see it again, just open Account and tap \"Replay Tour\" near the top of the page. For install instructions or anything this tour didn't cover, the full driver guide is at /guide/driver, no login needed.",
  },
];

export const adminTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Fleet Tracker Admin",
    content:
      "This quick tour walks through every section of the admin console — from the dashboard to reports and audit logs. Use Next and Back to move around, or Skip if you'd rather dive in yourself.",
  },
  {
    id: "dashboard-stats",
    path: "/admin",
    target: "[data-tour='admin-stats']",
    title: "Fleet at a glance",
    content: "These tiles summarise vehicles in use, kilometres driven, and top usage — a quick health check for the whole fleet.",
    placement: "bottom",
  },
  {
    id: "dashboard-alerts",
    path: "/admin",
    target: "[data-tour='admin-alerts']",
    title: "Vehicle alerts",
    content: "Vehicles needing attention — WOF, rego, RUC, or servicing due soon — are flagged here, sorted by urgency.",
    placement: "top",
  },
  {
    id: "nav-dashboard",
    path: "/admin",
    target: "[data-tour='nav-admin-dashboard']",
    title: "Dashboard",
    content: "Your home base — fleet stats, weekly KM chart, and vehicle alerts.",
    placement: "auto",
  },
  {
    id: "nav-vehicles",
    path: "/admin",
    target: "[data-tour='nav-admin-vehicles']",
    title: "Vehicles",
    content: "Add, edit, and manage every vehicle in the fleet, including WOF, rego, and service dates, and print QR codes for each one.",
    placement: "auto",
  },
  {
    id: "nav-scan",
    path: "/admin",
    target: "[data-tour='nav-admin-scan']",
    title: "Scan Vehicle",
    content: "Admins are drivers too — scan a vehicle's QR code here to start or finish your own trip, same as anyone else.",
    placement: "auto",
  },
  {
    id: "nav-mytrips",
    path: "/admin",
    target: "[data-tour='nav-admin-mytrips']",
    title: "My Trips",
    content: "Your own trip history, separate from the fleet-wide records further down.",
    placement: "auto",
  },
  {
    id: "nav-people",
    path: "/admin",
    target: "[data-tour='nav-admin-people']",
    title: "People",
    content: "Manage drivers and admins from one place — switch between the two with the toggle at the top, add new people, and update driver licence details.",
    placement: "auto",
  },
  {
    id: "nav-bookings",
    path: "/admin",
    target: "[data-tour='nav-admin-bookings']",
    title: "Bookings",
    content: "Approve or decline vehicle booking requests from drivers. A badge here shows how many are waiting on you.",
    placement: "auto",
  },
  {
    id: "nav-incidents",
    path: "/admin",
    target: "[data-tour='nav-admin-incidents']",
    title: "Incidents",
    content: "Review incidents drivers have reported — damage, breakdowns, or anything else worth flagging.",
    placement: "auto",
  },
  {
    id: "nav-checks",
    path: "/admin",
    target: "[data-tour='nav-admin-checks']",
    title: "Vehicle Checks",
    content: "See the pre-trip vehicle checks drivers have submitted, and drill into any that need follow-up.",
    placement: "auto",
  },
  {
    id: "nav-reports",
    path: "/admin",
    target: "[data-tour='nav-admin-reports']",
    title: "Reports",
    content: "Generate weekly, monthly, or custom-range reports on fleet usage, and export them.",
    placement: "auto",
  },
  {
    id: "nav-records",
    path: "/admin",
    target: "[data-tour='nav-admin-records']",
    title: "Records",
    content: "A searchable log of every trip across the whole fleet, exportable to CSV. Any vehicle still checked out shows at the top so you can close it out.",
    placement: "auto",
  },
  {
    id: "nav-audit",
    path: "/admin",
    target: "[data-tour='nav-admin-audit']",
    title: "Audit",
    content: "A record of key changes made in the system, for accountability and troubleshooting.",
    placement: "auto",
  },
  {
    id: "nav-notifications",
    path: "/admin",
    target: "[data-tour='nav-admin-notifications']",
    title: "Notifications",
    content: "Alerts that need your attention — new bookings, overdue vehicles, and more.",
    placement: "auto",
  },
  {
    id: "nav-account",
    path: "/admin",
    target: "[data-tour='nav-admin-account']",
    title: "Account",
    content: "Your admin profile and settings. You can also replay this tour any time from this page.",
    placement: "auto",
  },
  {
    id: "finish",
    title: "You're all set",
    content:
      "That covers every section of the admin console. If you ever want to see this tour again, open Account and tap \"Replay Tour\" near the top of the page. For install instructions or a written reference, the full admin guide is at /guide/admin, no login needed.",
  },
];
