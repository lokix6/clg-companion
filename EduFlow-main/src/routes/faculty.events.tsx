import { createFileRoute } from "@tanstack/react-router";
import { AdminEventsPage } from "./admin.events";

export const Route = createFileRoute("/faculty/events")({
  component: AdminEventsPage,
});
